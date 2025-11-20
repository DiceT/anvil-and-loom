import { useEffect, useState } from "react";
import DiceExpression, { type DiceExpressionWarning } from "../lib/dice/DiceExpression";
import DiceRoller, { type RollResult } from "../lib/dice/DiceRoller";
import diceBoxValueProvider from "../lib/dice/diceBoxAdapter";
import { annotateRollResult, type RollHighlight } from "../lib/dice/rollHighlights";
import { setDiceFadeDuration } from "../lib/diceEngine";
import type { LogicalRollType, RollAdvantageMode } from "../lib/diceEngine";
import {
  Triangle,
  Diamond,
  Pentagon,
  Percent,
  Swords,
  Layers,
  TrendingDown,
  Eraser,
  Play,
  BookCheck,
} from "lucide-react";

interface DiceTrayProps {
  onRollResult?: (html: string) => void;
  fadeDurationMs?: number;
}

type DiceIcon = (props: { size?: number; strokeWidth?: number }) => JSX.Element;

const LOCAL_STORAGE_KEY = "anvil-dice-saved-expressions";

interface SavedExpression {
  id: string;
  name: string;
  formula: string;
}

function formatResultAsHtml(result: RollResult): string {
  const term = getPrimaryTerm(result);
  if (!term) return "";
  const toggleId = `dice-log-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

  if (term.type === "challenge") {
    const actionSegments: string[] = [`${term.actionDie}`];
    if (term.actionModifier) {
      actionSegments.push(`${term.actionModifier >= 0 ? "+" : ""}${term.actionModifier}`);
    }
    if (typeof term.actionScore === "number") {
      actionSegments.push(`= ${term.actionScore}`);
    }
    const actionText = actionSegments.join(" ");
    const challengeText = term.challengeScore.length ? term.challengeScore.join(", ") : "-";
    const resultText = `${term.outcome}${term.boon ? " (Boon)" : ""}${
      term.complication ? " (Complication)" : ""
    }`;
    const outcomeColor = getChallengeOutcomeColor(term.outcome);

    return `
      <div class="dice-card dice-card-inline dice-log-card">
        <input type="checkbox" id="${toggleId}" class="dice-log-toggle" />
        <label for="${toggleId}" class="dice-card-title dice-log-header">
          <span>CHALLENGE ROLL</span>
          <span class="dice-log-caret" aria-hidden="true"></span>
        </label>
        <div class="dice-card-body dice-log-body">
          <div class="dice-card-detail">
            <span>Action Roll:</span> <strong>${actionText || "-"}</strong>
          </div>
          <div class="dice-card-detail">
            <span>Challenge Roll:</span> <strong>${challengeText}</strong>
          </div>
        </div>
        <div class="dice-card-highlight dice-log-footer">
          <span class="dice-log-footer-label">Result:</span>
          <span class="dice-card-inline-result" style="color:${outcomeColor}">
            <strong>${resultText}</strong>
          </span>
        </div>
      </div>
    `.trim();
  }

  if (term.type === "dice") {
    const label = `ROLLED d${term.term.sides}`;
    const rollsDisplay = term.dice
      .map((die) => (die.dropped ? `(${die.value})` : `${die.value}`))
      .join(", ");
    const detailText = `Rolls: ${rollsDisplay || "-"}`;
    const selectionTag = term.term.selection
      ? ` (${term.term.selection.mode.replace("-", " ")})`
      : "";
    const headerInner = [
      `<span>${label}${selectionTag}</span>`,
      '<span class="dice-log-caret" aria-hidden="true"></span>',
    ].join("");

    return `
      <div class="dice-card dice-card-inline dice-log-card">
        <input type="checkbox" id="${toggleId}" class="dice-log-toggle" />
        <label for="${toggleId}" class="dice-card-title dice-log-header">${headerInner}</label>
        <div class="dice-card-body dice-log-body">
          <div class="dice-card-detail">${detailText}</div>
        </div>
        <div class="dice-card-highlight dice-log-footer">
          <span class="dice-log-footer-label">Result:</span>
          <span class="dice-card-inline-result">
            <strong>${term.total}</strong>
          </span>
        </div>
      </div>
    `.trim();
  }

  return "";
}

function getPrimaryTerm(result: RollResult) {
  return result.terms.find((term) => term.type !== "constant") ?? result.terms[0] ?? null;
}

function getChallengeOutcomeColor(outcome: string) {
  switch (outcome) {
    case "Strong Hit":
      return "#22c55e";
    case "Weak Hit":
      return "#d97706";
    case "Miss":
      return "#ef4444";
    default:
      return "var(--text-main)";
  }
}

const SquareIcon: DiceIcon = ({ size = 20, strokeWidth = 2 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="4" y="4" width="16" height="16" rx="2" />
  </svg>
);

const ThinDiamondIcon: DiceIcon = ({ size = 20, strokeWidth = 2 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polygon points="12 1 18 12 12 23 6 12" />
  </svg>
);

const HexagonIcon: DiceIcon = ({ size = 20, strokeWidth = 2 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polygon points="7 2 17 2 22 12 17 22 7 22 2 12" />
  </svg>
);

export function DiceTray({ onRollResult, fadeDurationMs = 3000 }: DiceTrayProps) {
  const [expressionText, setExpressionText] = useState("1d20");
  const [builderMode, setBuilderMode] = useState<RollAdvantageMode>("normal");
  const [isRolling, setIsRolling] = useState(false);
  const [lastRoll, setLastRoll] = useState<RollResult | null>(null);
  const [warnings, setWarnings] = useState<DiceExpressionWarning[]>([]);
  const [rollError, setRollError] = useState<string | null>(null);
  const [savedExpressions, setSavedExpressions] = useState<SavedExpression[]>([]);
  const [saveName, setSaveName] = useState("");
  const [selectedSaveId, setSelectedSaveId] = useState<string | null>(null);
  const [logToEntry, setLogToEntry] = useState(true);

  useEffect(() => {
    const stored =
      typeof window !== "undefined" ? window.localStorage.getItem(LOCAL_STORAGE_KEY) : null;
    if (stored) {
      try {
        setSavedExpressions(JSON.parse(stored) as SavedExpression[]);
      } catch {
        // ignore corrupt storage
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(savedExpressions));
  }, [savedExpressions]);

  useEffect(() => {
    setDiceFadeDuration(fadeDurationMs);
  }, [fadeDurationMs]);

  const diceOptions: Array<{ type: LogicalRollType; icon: DiceIcon; label: string }> = [
    { type: "d4", icon: Triangle, label: "d4" },
    { type: "d6", icon: SquareIcon, label: "d6" },
    { type: "d8", icon: Diamond, label: "d8" },
    { type: "d10", icon: ThinDiamondIcon, label: "d10" },
    { type: "d12", icon: Pentagon, label: "d12" },
    { type: "d20", icon: HexagonIcon, label: "d20" },
    { type: "percentile", icon: Percent, label: "d100" },
  ];

  const appendToExpression = (fragment: string) => {
    setExpressionText((prev) => {
      const trimmed = prev.trim();
      const cleanFragment =
        trimmed.length === 0 ? fragment.replace(/^\+\s*/, "").trimStart() : fragment;
      if (!trimmed) return cleanFragment.trim();
      return `${trimmed} ${cleanFragment}`.trim();
    });
  };

  const handleAddDie = (type: LogicalRollType) => {
    if (type === "percentile") {
      mergeDieIntoExpression(100);
      return;
    }

    if (type.startsWith("d")) {
      const sides = Number.parseInt(type.slice(1), 10);
      if (!Number.isFinite(sides)) return;
      mergeDieIntoExpression(sides);
    }
  };

  const mergeDieIntoExpression = (sides: number) => {
    setExpressionText((prev) => {
      const trimmed = prev.trim();
      const baseline = trimmed.length === 0 || isBaselineExpression(trimmed);
      if (baseline) {
        return buildDieFragment(sides, builderMode, true);
      }
      const bumped = incrementDieInExpression(trimmed, sides);
      if (bumped) return bumped;
      const fragment = buildDieFragment(sides, builderMode, false);
      return `${trimmed} ${fragment}`.trim();
    });
  };

  const handleModifierAdjust = (delta: number) => {
    if (/challenge\s*\(/i.test(expressionText)) {
      const updated = adjustChallengeModifier(expressionText, delta);
      if (updated !== expressionText) {
        setExpressionText(updated);
        return;
      }
    }
    appendToExpression(delta >= 0 ? `+ ${delta}` : `${delta}`);
  };

  const handleTemplate = (template: "challenge" | "pool" | "degrade") => {
    switch (template) {
      case "challenge":
        setExpressionText("challenge(d6 vs 2d10)");
        break;
      case "pool":
        setExpressionText("4d6>=6#3");
        break;
      case "degrade":
        setExpressionText("1d6!<=2");
        break;
    }
  };

  const handleRoll = async () => {
    if (isRolling) return;
    try {
      setIsRolling(true);
      const expression = DiceExpression.parse(expressionText);
      setWarnings(expression.warnings);
      const result = await DiceRoller.rollWithProvider(expression, diceBoxValueProvider);
      setLastRoll(result);
      setRollError(null);
      if (onRollResult && logToEntry) {
        const html = formatResultAsHtml(result);
        if (html.trim().length) {
          onRollResult(html);
        }
      }
    } catch (error) {
      setRollError(
        error instanceof Error ? error.message : "Failed to parse or roll this expression."
      );
    } finally {
      setIsRolling(false);
    }
  };

  const handleSaveExpression = () => {
    const trimmedName = saveName.trim();
    const trimmedFormula = expressionText.trim();
    if (!trimmedName || !trimmedFormula) return;
    setSavedExpressions((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: trimmedName, formula: trimmedFormula },
    ]);
    setSaveName("");
  };

  const handleLoadExpression = (id: string) => {
    const target = savedExpressions.find((expr) => expr.id === id);
    if (!target) return;
    setExpressionText(target.formula);
    setSelectedSaveId(id);
  };

  const handleDeleteSaved = () => {
    if (!selectedSaveId) return;
    setSavedExpressions((prev) => prev.filter((expr) => expr.id !== selectedSaveId));
    setSelectedSaveId(null);
  };

  return (
    <div className="dice-tray">
      <div className="dice-button-row">
        {diceOptions.map((option) => (
          <button
            key={option.type}
            type="button"
            className="dice-icon-button"
            onClick={() => handleAddDie(option.type)}
            aria-label={`Insert ${option.label}`}
            data-tooltip={option.label.toUpperCase()}
          >
            <option.icon size={18} strokeWidth={2.5} />
          </button>
        ))}
      </div>

      <div className="dice-expression-builder">
        <label htmlFor="dice-expression-input">Dice Expression</label>
        <textarea
          id="dice-expression-input"
          className="dice-expression-input"
          rows={2}
          value={expressionText}
          onChange={(event) => setExpressionText(event.target.value)}
          placeholder="Example: 2d20kh1 + 4"
        />
        <div className="dice-expression-actions">
          <button
            type="button"
            className="dice-action-icon"
            onClick={() => setExpressionText("")}
            disabled={!expressionText.trim()}
            aria-label="Clear expression"
            data-tooltip="Clear expression"
          >
            <Eraser size={34} strokeWidth={2.2} />
          </button>
          <button
            type="button"
            className={`dice-action-icon${logToEntry ? " primary" : ""}`}
            onClick={() => setLogToEntry((prev) => !prev)}
            aria-label="Toggle log to entry"
            data-tooltip={logToEntry ? "Logging to entry" : "Not logging to entry"}
          >
            <BookCheck size={34} strokeWidth={2.2} />
          </button>
          <button
            type="button"
            className="dice-action-icon primary"
            onClick={handleRoll}
            disabled={isRolling || !expressionText.trim()}
            aria-label="Roll expression"
            data-tooltip="Roll expression"
          >
            <Play size={34} strokeWidth={2.2} />
          </button>
        </div>
      </div>

      <div className="dice-template-row">
        <button
          type="button"
          className="dice-template-button"
          onClick={() => handleTemplate("challenge")}
          aria-label="Challenge template"
          data-tooltip="Challenge Template"
        >
          <Swords size={18} strokeWidth={2.5} />
        </button>
        <button
          type="button"
          className="dice-template-button"
          onClick={() => handleTemplate("pool")}
          aria-label="Dice pool template"
          data-tooltip="Dice Pool Template"
        >
          <Layers size={18} strokeWidth={2.5} />
        </button>
        <button
          type="button"
          className="dice-template-button"
          onClick={() => handleTemplate("degrade")}
          aria-label="Degrading die template"
          data-tooltip="Degrading Die Template"
        >
          <TrendingDown size={18} strokeWidth={2.5} />
        </button>
      </div>

      <div className="dice-mode-row">
        <button
          type="button"
          className="dice-modifier-pill"
          onClick={() => handleModifierAdjust(-1)}
          aria-label="Subtract 1"
          data-tooltip="-1 modifier"
        >
          -1
        </button>
        <button
          type="button"
          className={`dice-adv-toggle${
            builderMode === "disadvantage" ? " dice-adv-toggle-active" : ""
          }`}
          onClick={() =>
            setBuilderMode((mode) => (mode === "disadvantage" ? "normal" : "disadvantage"))
          }
          data-tooltip="Disadvantage"
          aria-label="Toggle disadvantage"
        >
          DIS
        </button>
        <button
          type="button"
          className={`dice-adv-toggle${
            builderMode === "advantage" ? " dice-adv-toggle-active" : ""
          }`}
          onClick={() => setBuilderMode((mode) => (mode === "advantage" ? "normal" : "advantage"))}
          data-tooltip="Advantage"
          aria-label="Toggle advantage"
        >
          ADV
        </button>
        <button
          type="button"
          className="dice-modifier-pill"
          onClick={() => handleModifierAdjust(1)}
          aria-label="Add 1"
          data-tooltip="+1 modifier"
        >
          +1
        </button>
      </div>

        <div className="dice-save-controls">
          <input
            type="text"
            value={saveName}
            onChange={(event) => setSaveName(event.target.value)}
            placeholder="Save name"
          />
        <button
          type="button"
          onClick={handleSaveExpression}
          disabled={!saveName.trim()}
          aria-label="Save expression"
          data-tooltip="Save expression"
        >
          Save
        </button>
        <select
          value={selectedSaveId ?? ""}
          onChange={(event) => {
            const value = event.target.value;
            setSelectedSaveId(value || null);
            if (value) handleLoadExpression(value);
          }}
          className="dice-saved-select"
        >
          <option value="">Saved expressions</option>
          {savedExpressions.map((expr) => (
            <option key={expr.id} value={expr.id}>
              {expr.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleDeleteSaved}
          disabled={!selectedSaveId}
          aria-label="Delete saved expression"
          data-tooltip="Delete saved expression"
        >
          Delete
        </button>
      </div>

      {warnings.length > 0 && (
        <div className="dice-dev-warning">
          {warnings.map((warning, index) => (
            <div key={`${warning.fragment}-${index}`}>
              {warning.reason}: <code>{warning.fragment}</code>
            </div>
          ))}
        </div>
      )}
      {rollError && <div className="dice-dev-error">{rollError}</div>}

      {lastRoll && renderLastRollCard(lastRoll)}
    </div>
  );
}

function renderLastRollCard(lastRoll: RollResult) {
  const term = getPrimaryTerm(lastRoll);
  if (!term) return null;
  const highlights = annotateRollResult(lastRoll);

  if (term.type === "challenge") {
    const actionSegments: string[] = [`${term.actionDie}`];
    if (term.actionModifier) {
      actionSegments.push(`${term.actionModifier >= 0 ? "+" : ""}${term.actionModifier}`);
    }
    if (typeof term.actionScore === "number") {
      actionSegments.push(`= ${term.actionScore}`);
    }
    const actionText = actionSegments.join(" ");
    const challengeText = term.challengeScore.length ? term.challengeScore.join(", ") : "-";
    const outcomeColor = getChallengeOutcomeColor(term.outcome);

    return (
      <>
        <div className="dice-card">
          <div className="dice-card-title">CHALLENGE ROLL</div>
          <div className="dice-card-body">
            <div className="dice-card-detail">
              <span>Action Roll:</span> <strong>{actionText || "-"}</strong>
            </div>
            <div className="dice-card-detail">
              <span>Challenge Roll:</span> <strong>{challengeText}</strong>
            </div>
          </div>
          <div className="dice-card-highlight">
            Result:{" "}
            <span className="dice-card-inline-result" style={{ color: outcomeColor }}>
              <strong>
                {term.outcome}
                {term.boon && " (Boon)"}
                {term.complication && " (Complication)"}
              </strong>
            </span>
          </div>
        </div>
        <DiceHighlightList highlights={highlights} />
      </>
    );
  }

  if (term.type === "dice") {
    const rollsDisplay = term.dice
      .map((die) => (die.dropped ? `(${die.value})` : `${die.value}`))
      .join(", ");
    const selectionTag = term.term.selection
      ? ` (${term.term.selection.mode.replace("-", " ")})`
      : "";

    return (
      <>
        <div className="dice-card">
          <div className="dice-card-title">{`ROLLED d${term.term.sides}${selectionTag}`}</div>
          <div className="dice-card-body">
            <div className="dice-card-detail">Rolls: {rollsDisplay || "-"}</div>
          </div>
          <div className="dice-card-highlight">
            Result:{" "}
            <span className="dice-card-inline-result">
              <strong>{term.total}</strong>
            </span>
          </div>
        </div>
        <DiceHighlightList highlights={highlights} />
      </>
    );
  }

  return null;
}

function DiceHighlightList({ highlights }: { highlights: RollHighlight[] }) {
  if (!highlights.length) return null;
  return (
    <div className="dice-highlight-list">
      {highlights.map((highlight, index) => (
        <DiceHighlightBadge key={`${highlight.type}-${index}`} highlight={highlight} />
      ))}
    </div>
  );
}

function DiceHighlightBadge({ highlight }: { highlight: RollHighlight }) {
  if (highlight.type === "challenge-outcome") {
    return (
      <div className="dice-chip challenge" style={{ borderColor: highlight.color }}>
        <strong style={{ color: highlight.color }}>{highlight.outcome}</strong>
        {highlight.boon && <span>{` • Boon`}</span>}
        {highlight.complication && <span>{` • Complication`}</span>}
      </div>
    );
  }

  if (highlight.type === "natural-crit") {
    return (
      <div className="dice-chip crit">
        {highlight.crit === "success" ? "Natural 20!" : "Natural 1!"} (die #{highlight.dieIndex + 1})
      </div>
    );
  }

  if (highlight.type === "pool-success") {
    return (
      <div className="dice-chip pool">
        {highlight.successes} success{highlight.successes === 1 ? "" : "es"}
        {typeof highlight.target === "number" && (
          <span>{` / target ${highlight.target} ${highlight.metTarget ? "(met)" : "(not met)"}`}</span>
        )}
      </div>
    );
  }

  if (highlight.type === "degrade") {
    return (
      <div className="dice-chip degrade">
        Die steps down by {highlight.step === 1 ? "1 step" : `${highlight.step} steps`}
      </div>
    );
  }

  return null;
}

function isBaselineExpression(value: string) {
  const trimmed = value.trim();
  return trimmed.length === 0 || trimmed === "1d20";
}

function incrementDieInExpression(expression: string, sides: number): string | null {
  const regex = new RegExp(
    `(\\s|^)([+-]?\\s*)(\\d*)d${sides}(?:([a-z]{2}\\d+))?`,
    "i"
  );
  let replaced = false;
  const result = expression.replace(regex, (match, space, signPart = "", countPart = "", suffix = "") => {
    if (replaced) return match;
    replaced = true;
    const count = countPart ? Number.parseInt(countPart, 10) : 1;
    const prefix = space || "";
    return `${prefix}${signPart}${count + 1}d${sides}${suffix ?? ""}`;
  });
  return replaced ? result.trim().replace(/\s{2,}/g, " ") : null;
}

function adjustChallengeModifier(text: string, delta: number) {
  const regex = /(challenge\(\s*d\d+)([+-]\d+)?(\s*vs)/i;
  if (!regex.test(text)) return text;
  return text.replace(regex, (_, die, modPart = "", vsPart) => {
    const current = modPart ? Number.parseInt(modPart, 10) : 0;
    const next = current + delta;
    let fragment = "";
    if (next > 0) fragment = `+${next}`;
    else if (next < 0) fragment = `${next}`;
    return `${die}${fragment}${vsPart}`;
  });
}

function buildDieFragment(sides: number, mode: RollAdvantageMode, isFirst: boolean) {
  const prefix = isFirst ? "" : "+ ";
  if (mode === "advantage") return `${prefix}2d${sides}kh1`;
  if (mode === "disadvantage") return `${prefix}2d${sides}kl1`;
  return `${prefix}1d${sides}`;
}

export default DiceTray;
