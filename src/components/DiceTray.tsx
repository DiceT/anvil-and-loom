import { useEffect, useState } from "react";
import DiceExpression, { type DiceExpressionWarning } from "../lib/dice/DiceExpression";
import DiceRoller, { type RollResult, type DiceTermRollResult } from "../lib/dice/DiceRoller";
import diceBoxValueProvider from "../lib/dice/diceBoxAdapter";
import { annotateRollResult, type RollHighlight } from "../lib/dice/rollHighlights";
import { setDiceFadeDuration } from "../core/dice/diceEngine";
import type { LogicalRollType, RollAdvantageMode } from "../core/dice/diceEngine";
import type { DiceResultCard } from "../core/results/resultTypes";
import { generateResultCardId } from "../core/results/resultTypes";
import { getChallengeOutcomeColor } from "../core/results/ResultCard";
import {
  Triangle,
  Diamond,
  Pentagon,
  Percent,
  Swords,
  Blocks,
  TrendingDown,
  Bomb,
  Eraser,
  CirclePlay,
  NotebookPen,
  Save,
  Trash2,
} from "lucide-react";

interface DiceTrayProps {
  onRollResult?: (html: string) => void;
  onResultCard?: (card: DiceResultCard) => void;
  fadeDurationMs?: number;
}

type DiceIcon = (props: { size?: number; strokeWidth?: number }) => React.ReactElement;

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
  const constantTotal = getConstantSum(result.terms);

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

    return joinHtml([
      `<div class="dice-card dice-card-inline dice-log-card">`,
      `<input type="checkbox" id="${toggleId}" class="dice-log-toggle" />`,
      `<label for="${toggleId}" class="dice-card-title dice-log-header" style="background-color: #1e3a5f; color: #ffffff;">`,
      `<span>CHALLENGE ROLL</span>`,
      `<span class="dice-log-caret" aria-hidden="true"></span>`,
      `</label>`,
      `<div class="dice-card-body dice-log-body">`,
      `<div class="dice-card-detail"><span>Action Roll:</span> <strong>${actionText || "-"}</strong></div>`,
      `<div class="dice-card-detail"><span>Challenge Roll:</span> <strong>${challengeText}</strong></div>`,
      `</div>`,
      `<div class="dice-card-highlight dice-log-footer">`,
      `<span class="dice-log-footer-label">Result:</span>`,
      `<span class="dice-card-inline-result" style="color:${outcomeColor}"><strong>${resultText}</strong></span>`,
      `</div>`,
      `</div>`,
    ]);
  }

  if (term.type === "dice") {
    // Multiple plain dice terms (e.g., 3d6 + 1d4)
    const simpleDiceTerms = result.terms.filter(
      (t): t is DiceTermRollResult =>
        t.type === "dice" && !t.term.pool && !t.term.explode && !t.term.degrade
    );
    const constantTerms = result.terms.filter((t) => t.type === "constant");
    if (simpleDiceTerms.length > 1) {
      const header = result.expression?.original
        ? `ROLLED ${humanizeSelectionShorthand(result.expression.original)}`
        : "ROLL RESULT";
      const diceLines = simpleDiceTerms.map((t) => {
        const rollsDisplay = t.dice
          .map((die) => (die.dropped ? `(${die.value})` : `${die.value}`))
          .join(", ");
        const label = `${t.term.count}d${t.term.sides}${
          t.term.selection ? ` (${t.term.selection.mode.replace("-", " ")})` : ""
        }`;
        return `<div class="dice-card-detail">${label}: ${rollsDisplay || "-"} = ${t.total}</div>`;
      });
      const constantLines = constantTerms.map(
        (c) => `<div class="dice-card-detail">Modifier: <strong>${c.value}</strong></div>`
      );

      return joinHtml([
        `<div class="dice-card dice-card-inline dice-log-card">`,
        `<input type="checkbox" id="${toggleId}" class="dice-log-toggle" />`,
        `<label for="${toggleId}" class="dice-card-title dice-log-header">`,
        `<span>${header}</span>`,
        `<span class="dice-log-caret" aria-hidden="true"></span>`,
        `</label>`,
        `<div class="dice-card-body dice-log-body">`,
        ...diceLines,
        ...constantLines,
        `</div>`,
        `<div class="dice-card-highlight dice-log-footer">`,
        `<span class="dice-log-footer-label">Result:</span>`,
        `<span class="dice-card-inline-result"><strong>${result.total}</strong></span>`,
        `</div>`,
        `</div>`,
      ]);
    }

    // Dice Pool
    if (term.term.pool) {
      const pool = term.term.pool;
      const threshold = `${pool.successThreshold}`;
      const needed =
        typeof pool.targetSuccesses === "number" ? pool.targetSuccesses : undefined;
      const rollsDisplay = renderPoolRollsInlineHtml(term.dice, pool);
      const successes = term.successes ?? 0;
      const met = term.metTarget ?? (typeof needed === "number" ? successes >= needed : successes > 0);
      const statusText = met ? "PASS" : "FAIL";
      const statusColor = met ? "#22c55e" : "#ef4444";
      const successLabel = `${successes} success${successes === 1 ? "" : "es"}`;
      const poolHeader = `DICE POOL - ${term.term.count}d${term.term.sides} T:${threshold} S:${
        needed !== undefined ? needed : "-"
      }`;

      return joinHtml([
        `<div class="dice-card dice-card-inline dice-log-card">`,
        `<input type="checkbox" id="${toggleId}" class="dice-log-toggle" />`,
        `<label for="${toggleId}" class="dice-card-title dice-log-header">`,
        `<span>${poolHeader}</span>`,
        `<span class="dice-log-caret" aria-hidden="true"></span>`,
        `</label>`,
        `<div class="dice-card-body dice-log-body">`,
        `<div class="dice-card-detail">Rolls: ${rollsDisplay}</div>`,
        `<div class="dice-card-detail">Target: ${threshold}</div>`,
        `<div class="dice-card-detail">Successes Needed: ${needed !== undefined ? needed : "-"}</div>`,
        `</div>`,
        `<div class="dice-card-highlight dice-log-footer">`,
        `<span class="dice-log-footer-label">Result:</span>`,
        `<span class="dice-card-inline-result" style="color:${statusColor}"><strong>${successLabel} - ${statusText}</strong></span>`,
        `</div>`,
        `</div>`,
      ]);
    }

    // Degradation
    if (term.term.degrade) {
      const rollsDisplay = renderDegradeRollsInlineHtml(term.dice);
      const threshold = term.term.degrade?.threshold ?? "-";
      const triggered = term.degradeTriggered ?? false;
      const statusText = triggered ? `${term.total} - DEGRADE` : `${term.total}`;
      const statusColor = triggered ? "#ef4444" : "var(--text-main)";
      const headerText = `DEGRADATION ROLL ${term.term.count}d${term.term.sides} D:${threshold}`;

      return joinHtml([
        `<div class="dice-card dice-card-inline dice-log-card">`,
        `<input type="checkbox" id="${toggleId}" class="dice-log-toggle" />`,
        `<label for="${toggleId}" class="dice-card-title dice-log-header">`,
        `<span>${headerText}</span>`,
        `<span class="dice-log-caret" aria-hidden="true"></span>`,
        `</label>`,
        `<div class="dice-card-body dice-log-body">`,
        `<div class="dice-card-detail">Roll: ${rollsDisplay}</div>`,
        `<div class="dice-card-detail">Threshold: ${threshold}</div>`,
        `</div>`,
        `<div class="dice-card-highlight dice-log-footer">`,
        `<span class="dice-log-footer-label">Result:</span>`,
        `<span class="dice-card-inline-result" style="color:${statusColor}"><strong>${statusText}</strong></span>`,
        `</div>`,
        `</div>`,
      ]);
    }

    if (term.explosions && term.explosions.length) {
      const threshold = term.term.explode?.threshold ?? term.term.sides;
      const explosionCount = term.explosionCount ?? Math.max(0, term.explosions.length - 1);
      const statusColor = explosionCount > 0 ? "#22c55e" : "var(--text-main)";
      const lines = term.explosions
        .map((group, index) => {
          const label = index === 0 ? "ROLL" : "EXPLOSION";
          const values = group
            .map((value) => (value >= threshold ? `<strong>${value}</strong>` : `${value}`))
            .join(", ");
          return `<div class="dice-card-detail"><span>${label}:</span> ${values || "-"}</div>`;
        })
        .join("");
      const header = `EXPLODING ROLL ${term.term.count}d${term.term.sides} T:${threshold}`;
      const resultText = `${term.total}${
        explosionCount > 0 ? ` - ${explosionCount} Explosions` : ""
      }`;

      return joinHtml([
        `<div class="dice-card dice-card-inline dice-log-card">`,
        `<input type="checkbox" id="${toggleId}" class="dice-log-toggle" />`,
        `<label for="${toggleId}" class="dice-card-title dice-log-header">`,
        `<span>${header}</span>`,
        `<span class="dice-log-caret" aria-hidden="true"></span>`,
        `</label>`,
        `<div class="dice-card-body dice-log-body">`,
        `${lines}`,
        `</div>`,
        `<div class="dice-card-highlight dice-log-footer">`,
        `<span class="dice-log-footer-label">Result:</span>`,
        `<span class="dice-card-inline-result" style="color:${statusColor}"><strong>${resultText}</strong></span>`,
        `</div>`,
        `</div>`,
      ]);
    }
    const label = formatDiceLabel(term, {
      modifier: constantTotal,
      expression: result.expression?.original,
    });
    const rollsDisplay = term.dice
      .map((die) => (die.dropped ? `(${die.value})` : `${die.value}`))
      .join(", ");
    const rollsText = rollsDisplay || "-";
    const modifierText =
      constantTotal !== 0
        ? `<div class="dice-card-detail">Modifier: <strong>${
            constantTotal > 0 ? "+" : ""
          }${constantTotal}</strong></div>`
        : "";

    return joinHtml([
      `<div class="dice-card dice-card-inline dice-log-card">`,
      `<input type="checkbox" id="${toggleId}" class="dice-log-toggle" />`,
      `<label for="${toggleId}" class="dice-card-title dice-log-header">`,
      `<span>${label}</span>`,
      `<span class="dice-log-caret" aria-hidden="true"></span>`,
      `</label>`,
      `<div class="dice-card-body dice-log-body">`,
      `<div class="dice-card-detail">Rolls: ${rollsText}</div>`,
      `${modifierText}`,
      `</div>`,
      `<div class="dice-card-highlight dice-log-footer">`,
      `<span class="dice-log-footer-label">Result:</span>`,
      `<span class="dice-card-inline-result"><strong>${result.total}</strong></span>`,
      `</div>`,
      `</div>`,
    ]);
  }

  return "";
}

function convertResultToCard(result: RollResult): DiceResultCard | null {
  const term = getPrimaryTerm(result);
  if (!term) return null;
  const constantTotal = getConstantSum(result.terms);

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

    return {
      id: generateResultCardId(),
      kind: "challenge",
      createdAt: Date.now(),
      headerText: "CHALLENGE ROLL",
      contentText: `Action Roll: ${actionText || "-"}\nChallenge Roll: ${challengeText}`,
      resultText,
      resultColor: outcomeColor,
      theme: "challenge",
    };
  }

  if (term.type === "dice") {
    const simpleDiceTerms = result.terms.filter(
      (t): t is DiceTermRollResult =>
        t.type === "dice" && !t.term.pool && !t.term.explode && !t.term.degrade
    );
    const constantTerms = result.terms.filter((t) => t.type === "constant");
    
    if (simpleDiceTerms.length > 1) {
      const header = result.expression?.original
        ? `ROLLED ${humanizeSelectionShorthand(result.expression.original)}`
        : "ROLL RESULT";
      const diceLines = simpleDiceTerms.map((t) => {
        const rollsDisplay = t.dice
          .map((die) => (die.dropped ? `(${die.value})` : `${die.value}`))
          .join(", ");
        const label = `${t.term.count}d${t.term.sides}${
          t.term.selection ? ` (${t.term.selection.mode.replace("-", " ")})` : ""
        }`;
        return `${label}: ${rollsDisplay || "-"} = ${t.total}`;
      });
      const constantLines = constantTerms.map((c) => `Modifier: ${c.value}`);
      const contentText = [...diceLines, ...constantLines].join("\n");

      return {
        id: generateResultCardId(),
        kind: "dice",
        createdAt: Date.now(),
        headerText: header,
        contentText,
        resultText: `${result.total}`,
        theme: "dice",
      };
    }

    if (term.term.pool) {
      const pool = term.term.pool;
      const threshold = `${pool.successThreshold}`;
      const needed =
        typeof pool.targetSuccesses === "number" ? pool.targetSuccesses : undefined;
      const successes = term.successes ?? 0;
      const met = term.metTarget ?? (typeof needed === "number" ? successes >= needed : successes > 0);
      const statusText = met ? "PASS" : "FAIL";
      const statusColor = met ? "#22c55e" : "#ef4444";
      const successLabel = `${successes} success${successes === 1 ? "" : "es"}`;
      const poolHeader = `DICE POOL - ${term.term.count}d${term.term.sides} T:${threshold} S:${
        needed !== undefined ? needed : "-"
      }`;
      
      const rollsDisplay = term.dice.map(d => d.value).join(", ");
      const contentText = `Rolls: ${rollsDisplay}\nTarget: ${threshold}\nSuccesses Needed: ${needed !== undefined ? needed : "-"}`;

      return {
        id: generateResultCardId(),
        kind: "dice",
        createdAt: Date.now(),
        headerText: poolHeader,
        contentText,
        resultText: `${successLabel} - ${statusText}`,
        resultColor: statusColor,
        theme: "dice",
      };
    }

    if (term.term.degrade) {
      const threshold = term.term.degrade?.threshold ?? "-";
      const triggered = term.degradeTriggered ?? false;
      const statusText = triggered ? `${term.total} - DEGRADE` : `${term.total}`;
      const statusColor = triggered ? "#ef4444" : undefined;
      const headerText = `DEGRADATION ROLL ${term.term.count}d${term.term.sides} D:${threshold}`;
      const rollsDisplay = term.dice.map(d => d.value).join(", ");
      const contentText = `Roll: ${rollsDisplay}\nThreshold: ${threshold}`;

      return {
        id: generateResultCardId(),
        kind: "dice",
        createdAt: Date.now(),
        headerText,
        contentText,
        resultText: statusText,
        resultColor: statusColor,
        theme: "dice",
      };
    }

    if (term.explosions && term.explosions.length) {
      const threshold = term.term.explode?.threshold ?? term.term.sides;
      const explosionCount = term.explosionCount ?? Math.max(0, term.explosions.length - 1);
      const statusColor = explosionCount > 0 ? "#22c55e" : undefined;
      const lines = term.explosions.map((group, index) => {
        const label = index === 0 ? "ROLL" : "EXPLOSION";
        const values = group.join(", ");
        return `${label}: ${values}`;
      });
      const header = `EXPLODING ROLL ${term.term.count}d${term.term.sides} T:${threshold}`;
      const resultText = `${term.total}${
        explosionCount > 0 ? ` - ${explosionCount} Explosions` : ""
      }`;

      return {
        id: generateResultCardId(),
        kind: "dice",
        createdAt: Date.now(),
        headerText: header,
        contentText: lines.join("\n"),
        resultText,
        resultColor: statusColor,
        theme: "dice",
      };
    }

    const label = formatDiceLabel(term, {
      modifier: constantTotal,
      expression: result.expression?.original,
    });
    const rollsDisplay = term.dice
      .map((die) => (die.dropped ? `(${die.value})` : `${die.value}`))
      .join(", ");
    const rollsText = rollsDisplay || "-";
    const contentLines = [`Rolls: ${rollsText}`];
    if (constantTotal !== 0) {
      contentLines.push(`Modifier: ${constantTotal > 0 ? "+" : ""}${constantTotal}`);
    }

    return {
      id: generateResultCardId(),
      kind: "dice",
      createdAt: Date.now(),
      headerText: label,
      contentText: contentLines.join("\n"),
      resultText: `${result.total}`,
      theme: "dice",
    };
  }

  return null;
}

function getPrimaryTerm(result: RollResult) {
  return result.terms.find((term) => term.type !== "constant") ?? result.terms[0] ?? null;
}

function getConstantSum(terms: RollResult["terms"]): number {
  return terms
    .filter((t) => t.type === "constant")
    .reduce((sum, t) => sum + (t.type === "constant" ? t.value : 0), 0);
}

function isPoolSuccessHtml(value: number, pool: PoolRules) {
  const target = pool.successThreshold;
  switch (pool.successComparator) {
    case ">":
      return value > target;
    case "<":
      return value < target;
    case ">=":
      return value >= target;
    case "<=":
      return value <= target;
    case "=":
    case "==":
      return value === target;
    default:
      return value >= target;
  }
}

function renderPoolRollsInlineHtml(
  dice: { value: number; dropped?: boolean }[],
  pool: PoolRules
) {
  if (!dice.length) return "-";
  return dice
    .map((die, index) => {
      const success = !die.dropped && isPoolSuccessHtml(die.value, pool);
      const text = die.dropped ? `(${die.value})` : `${die.value}`;
      const content = success ? `<strong>${text}</strong>` : text;
      const suffix = index < dice.length - 1 ? ", " : "";
      return `${content}${suffix}`;
    })
    .join("");
}

function renderDegradeRollsInlineHtml(dice: { value: number; dropped?: boolean }[]) {
  if (!dice.length) return "-";
  return dice.map((die) => (die.dropped ? `(${die.value})` : `${die.value}`)).join(", ");
}

function joinHtml(parts: Array<string | null | undefined>): string {
  return parts.filter(Boolean).map((p) => p!.trim()).join("");
}

function formatSelectionText(selection?: { mode: string; count: number }) {
  if (!selection) return "";
  const { mode, count } = selection;
  switch (mode) {
    case "keep-highest":
      return `Keep Highest ${count}`;
    case "keep-lowest":
      return `Keep Lowest ${count}`;
    case "drop-highest":
      return `Drop Highest ${count}`;
    case "drop-lowest":
      return `Drop Lowest ${count}`;
    default:
      return "";
  }
}

function humanizeSelectionShorthand(expression: string) {
  return expression.replace(
    /(d\d+)(kh|kl|dh|dl)(\d+)/gi,
    (_match, dice, code, count) => {
      const map: Record<string, string> = {
        kh: "Keep Highest",
        kl: "Keep Lowest",
        dh: "Drop Highest",
        dl: "Drop Lowest",
      };
      const label = map[code.toLowerCase()] ?? code.toUpperCase();
      return `${dice} ${label} ${count}`;
    }
  );
}

function formatDiceLabel(
  diceResult: RollResult["terms"][number],
  options: { modifier?: number; expression?: string } = {}
) {
  if (diceResult.type !== "dice") return "ROLL RESULT";
  const { modifier = 0, expression } = options;
  // If an explicit expression is provided, assume it already contains the modifiers.
  if (expression && expression.trim().length) {
    return `ROLLED ${humanizeSelectionShorthand(expression.trim())}`;
  }

  const selectionText = formatSelectionText(diceResult.term.selection);
  const base = `${diceResult.term.count}d${diceResult.term.sides}`;
  const modifierText = modifier !== 0 ? ` ${modifier > 0 ? `+${modifier}` : modifier}` : "";
  const selectionSuffix = selectionText ? ` ${selectionText}` : "";
  return `ROLLED ${base}${selectionSuffix}${modifierText}`;
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

export function DiceTray({ onRollResult, onResultCard, fadeDurationMs = 3000 }: DiceTrayProps) {
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
      appendToExpression("d%100");
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
      // When using advantage/disadvantage, always append a new fragment rather than
      // merging into an existing die count so the selection (kh/kl) stays intact.
      if (builderMode === "normal") {
        const bumped = incrementDieInExpression(trimmed, sides);
        if (bumped) return bumped;
      }
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
    setExpressionText((prev) => adjustStandardModifier(prev, delta));
  };

  const handleTemplate = (template: "challenge" | "pool" | "degrade" | "explode") => {
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
      case "explode":
        setExpressionText("3d6!6");
        break;
    }
  };

  const handleRoll = async () => {
    if (isRolling) return;
    try {
      setIsRolling(true);
      const expression = DiceExpression.parse(typeof expressionText === "string" ? expressionText : "");
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
      if (onResultCard) {
        const card = convertResultToCard(result);
        if (card) {
          onResultCard(card);
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error("Roll error:", error);
      } else {
        console.error("Roll error (non-error):", error);
      }
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
      <div className="oracles-title" style={{ marginBottom: '0.25rem' }}>
        <span className="settings-section-subtitle">DICE TRAY</span>
      </div>
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
            <option.icon size={22} strokeWidth={2.6} />
          </button>
        ))}
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
            className={`dice-action-icon${logToEntry ? " primary" : ""}`}
            onClick={() => setLogToEntry((prev) => !prev)}
            aria-label="Toggle log to entry"
            data-tooltip={logToEntry ? "Logging to entry" : "Not logging to entry"}
          >
            <NotebookPen size={40} strokeWidth={2.4} />
          </button>
          <div className="dice-expression-actions-right">
            <button
              type="button"
              className="dice-action-icon primary"
              onClick={handleRoll}
              disabled={isRolling || !expressionText.trim()}
              aria-label="Roll Dice!"
              data-tooltip="Roll Dice!"
            >
              <CirclePlay size={40} strokeWidth={2.4} />
            </button>
          </div>
        </div>
      </div>

      <div className="dice-template-row">
          <button
            type="button"
            className="dice-action-icon"
            onClick={() => {
              setExpressionText("");
              setBuilderMode("normal");
            }}
            disabled={!expressionText.trim()}
            aria-label="Clear expression"
            data-tooltip="Clear expression"
          >
            <Eraser size={40} strokeWidth={2.4} />
        </button>
        <div className="dice-template-group">
        <button
          type="button"
          className="dice-template-button"
          onClick={() => handleTemplate("challenge")}
          aria-label="Challenge template"
          data-tooltip="Challenge Template"
        >
          <Swords size={22} strokeWidth={2.6} />
        </button>
        <button
          type="button"
          className="dice-template-button"
          onClick={() => handleTemplate("pool")}
          aria-label="Dice pool template"
          data-tooltip="Dice Pool Template"
        >
          <Blocks size={22} strokeWidth={2.6} />
        </button>
        <button
          type="button"
          className="dice-template-button"
          onClick={() => handleTemplate("degrade")}
          aria-label="Degrading die template"
          data-tooltip="Degrading Die Template"
        >
          <TrendingDown size={22} strokeWidth={2.6} />
        </button>
        <button
          type="button"
          className="dice-template-button"
          onClick={() => handleTemplate("explode")}
          aria-label="Exploding dice template"
          data-tooltip="Exploding Dice Template"
        >
          <Bomb size={22} strokeWidth={2.6} />
        </button>
        </div>
      </div>

        <div className="dice-save-controls">
          <div className="dice-save-row">
            <button
              type="button"
              className="dice-save-icon"
              onClick={handleSaveExpression}
              disabled={!saveName.trim()}
              aria-label="Save expression"
              data-tooltip="Save expression"
            >
              <Save size={38} strokeWidth={2.4} />
            </button>
            <input
              type="text"
              value={saveName}
              onChange={(event) => setSaveName(event.target.value)}
              placeholder="Save name"
            />
          </div>
          <div className="dice-save-row">
            <button
              type="button"
              className="dice-save-icon"
              onClick={handleDeleteSaved}
              disabled={!selectedSaveId}
              aria-label="Delete saved expression"
              data-tooltip="Delete saved expression"
            >
              <Trash2 size={38} strokeWidth={2.4} />
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
          </div>
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
  const nonConstantTerms = lastRoll.terms.filter((t) => t.type !== "constant");
  const constantTotal = getConstantSum(lastRoll.terms);

  if (nonConstantTerms.length > 1) {
    return (
      <>
        <div className="dice-card">
          <div className="dice-card-title">ROLL RESULT</div>
          <div className="dice-card-body">
            {nonConstantTerms.map((t, index) => {
              if (t.type === "dice" && t.term.pool) {
                const rollsDisplay = renderPoolRollsInline(t.dice, t.term.pool);
                const threshold = `${t.term.pool.successThreshold}`;
                const needed =
                  typeof t.term.pool.targetSuccesses === "number"
                    ? t.term.pool.targetSuccesses
                    : "-";
                return (
                  <div key={`term-${index}`} className="dice-card-detail">
                    <span>Dice Pool:</span>{" "}
                    <span className="dice-pool-line">
                      Rolls: {rollsDisplay} | Target: {threshold} | Successes Needed: {needed}
                    </span>
                  </div>
                );
              }
              if (t.type === "dice" && t.term.explode) {
                const threshold = t.term.explode?.threshold ?? t.term.sides;
                const groups =
                  t.explosions && t.explosions.length
                    ? t.explosions
                    : [t.dice.map((die) => die.value)];
                const explosionLines = renderExplosionLines(groups, threshold);
                const header = `Exploding ${t.term.count}d${t.term.sides} T:${threshold}`;
                return (
                  <div key={`term-${index}`} className="dice-card-detail">
                    <div>{header}</div>
                    {explosionLines}
                  </div>
                );
              }
              if (t.type === "dice" && t.term.degrade) {
                const rollsDisplay = renderDegradeRollsInline(t.dice);
                const threshold = t.term.degrade?.threshold ?? "-";
                return (
                  <div key={`term-${index}`} className="dice-card-detail">
                    <span>Degradation:</span>{" "}
                    <span className="dice-pool-line">
                      Roll: {rollsDisplay} | Threshold: {threshold}
                    </span>
                  </div>
                );
              }
              if (t.type === "dice") {
                const rollsDisplay = t.dice
          .map((die) => (die.dropped ? `(${die.value})` : `${die.value}`))
          .join(", ");
        const countLabel = `${t.term.count}d${t.term.sides}`;
        const selectionText = formatSelectionText(t.term.selection);
        const selectionTag = selectionText
          ? ` ${selectionText}`
          : t.term.selection
            ? ` (${t.term.selection.mode.replace("-", " ")})`
            : "";
                return (
                  <div key={`term-${index}`} className="dice-card-detail">
                    <span>
                      {countLabel}
                      {selectionTag}:
                    </span>{" "}
                    <strong>{t.total}</strong> {rollsDisplay ? `(${rollsDisplay})` : ""}
                  </div>
                );
              }
              if (t.type === "challenge") {
                const actionSegments: string[] = [`${t.actionDie}`];
                if (t.actionModifier) {
                  actionSegments.push(`${t.actionModifier >= 0 ? "+" : ""}${t.actionModifier}`);
                }
                if (typeof t.actionScore === "number") {
                  actionSegments.push(`= ${t.actionScore}`);
                }
                const challengeText = t.challengeScore.length ? t.challengeScore.join(", ") : "-";
                return (
                  <div key={`term-${index}`} className="dice-card-detail">
                    <span>Challenge:</span>{" "}
                    <strong>{`${actionSegments.join(" ")} vs ${challengeText}`}</strong>
                  </div>
                );
              }
              return (
                <div key={`term-${index}`} className="dice-card-detail">
                  <span>Term {index + 1}:</span> <strong>{t.total}</strong>
                </div>
              );
            })}
          </div>
          <div className="dice-card-highlight">
            Result:{" "}
            <span className="dice-card-inline-result">
              <strong>{lastRoll.total}</strong>
            </span>
          </div>
        </div>
        <DiceHighlightList highlights={highlights} />
      </>
    );
  }

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

  if (term.type === "dice" && term.term.degrade) {
    const rollsDisplay = renderDegradeRollsInline(term.dice);
    const threshold = term.term.degrade?.threshold ?? "-";
    const triggered = term.degradeTriggered ?? false;
    const statusText = triggered ? `${term.total} - DEGRADE` : `${term.total}`;
    const statusColor = triggered ? "#ef4444" : "var(--text-main)";
    const headerText = `DEGRADATION ROLL ${term.term.count}d${term.term.sides} D:${threshold}`;

    return (
      <>
        <div className="dice-card">
          <div className="dice-card-title" style={{ backgroundColor: "#1e3a5f", color: "#ffffff" }}>{headerText}</div>
          <div className="dice-card-body">
            <div className="dice-card-detail">Roll: {rollsDisplay}</div>
            <div className="dice-card-detail">Threshold: {threshold}</div>
          </div>
          <div className="dice-card-highlight">
            Result:{" "}
            <span className="dice-card-inline-result" style={{ color: statusColor }}>
              <strong>{statusText}</strong>
            </span>
          </div>
        </div>
      </>
    );
  }

  if (term.type === "dice" && term.term.explode) {
    const threshold = term.term.explode?.threshold ?? term.term.sides;
    const groups =
      term.explosions && term.explosions.length
        ? term.explosions
        : [term.dice.map((die) => die.value)];
    const explosionCount = term.explosionCount ?? Math.max(0, groups.length - 1);
    const statusColor = explosionCount > 0 ? "#22c55e" : "var(--text-main)";
    const headerText = `EXPLODING ROLL ${term.term.count}d${term.term.sides} T:${threshold}`;
    const explosionLines = renderExplosionLines(groups, threshold);

    return (
      <>
        <div className="dice-card">
          <div className="dice-card-title" style={{ backgroundColor: "#1e3a5f", color: "#ffffff" }}>{headerText}</div>
          <div className="dice-card-body">{explosionLines}</div>
          <div className="dice-card-highlight">
            Result:{" "}
            <span className="dice-card-inline-result" style={{ color: statusColor }}>
              <strong>
                {term.total}
                {explosionCount > 0 ? ` - ${explosionCount} Explosions` : ""}
              </strong>
            </span>
          </div>
        </div>
      </>
    );
  }

  if (term.type === "dice" && term.term.pool) {
    const rollsDisplay = renderPoolRollsInline(term.dice, term.term.pool);
    const pool = term.term.pool;
    const threshold = `${pool.successThreshold}`;
    const needed =
      typeof pool.targetSuccesses === "number" ? pool.targetSuccesses : undefined;
    const successes = term.successes ?? 0;
    const met = term.metTarget ?? (typeof needed === "number" ? successes >= needed : successes > 0);
    const statusText = met ? "PASS" : "FAIL";
    const statusColor = met ? "#22c55e" : "#ef4444";
    const successLabel = `${successes} success${successes === 1 ? "" : "es"}`;
    const poolHeader = `DICE POOL - ${term.term.count}d${term.term.sides} T:${threshold} S:${
      needed !== undefined ? needed : "-"
    }`;

    return (
      <>
        <div className="dice-card">
          <div className="dice-card-title" style={{ backgroundColor: "#1e3a5f", color: "#ffffff" }}>{poolHeader}</div>
          <div className="dice-card-body">
            <div className="dice-card-detail">Rolls: {rollsDisplay}</div>
            <div className="dice-card-detail">Target: {threshold}</div>
            <div className="dice-card-detail">
              Successes Needed: {needed !== undefined ? needed : "-"}
            </div>
          </div>
          <div className="dice-card-highlight">
            Result:{" "}
            <span className="dice-card-inline-result" style={{ color: statusColor }}>
              <strong>
                {successLabel} - {statusText}
              </strong>
            </span>
          </div>
        </div>
      </>
    );
  }

  if (term.type === "dice") {
    const rollsDisplay = term.dice
      .map((die) => (die.dropped ? `(${die.value})` : `${die.value}`))
      .join(", ");
    const selectionTag = term.term.selection ? ` (${term.term.selection.mode.replace("-", " ")})` : "";
    const headerText = formatDiceLabel(term, {
      modifier: constantTotal,
      expression: lastRoll.expression?.original,
    });

    return (
      <>
        <div className="dice-card">
          <div className="dice-card-title" style={{ backgroundColor: "#1e3a5f", color: "#ffffff" }}>{headerText}</div>
          <div className="dice-card-body">
            <div className="dice-card-detail">Rolls: {rollsDisplay || "-"}</div>
            {constantTotal !== 0 && (
              <div className="dice-card-detail">
                Modifier: <strong>{constantTotal > 0 ? `+${constantTotal}` : constantTotal}</strong>
              </div>
            )}
          </div>
          <div className="dice-card-highlight">
            Result:{" "}
            <span className="dice-card-inline-result">
              <strong>{lastRoll.total}</strong>
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
  const visible = highlights.filter(
    (h) => h.type !== "challenge-outcome" && h.type !== "pool-success" && h.type !== "degrade"
  );
  if (!visible.length) return null;
  return (
    <div className="dice-highlight-list">
      {visible.map((highlight, index) => (
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

type PoolRules = {
  successComparator: string;
  successThreshold: number;
};

function isPoolSuccess(value: number, pool: PoolRules) {
  const target = pool.successThreshold;
  switch (pool.successComparator) {
    case ">":
      return value > target;
    case "<":
      return value < target;
    case ">=":
      return value >= target;
    case "<=":
      return value <= target;
    case "=":
    case "==":
      return value === target;
    default:
      return value >= target;
  }
}

function renderPoolRollsInline(
  dice: { value: number; dropped?: boolean }[],
  pool: PoolRules
) {
  if (!dice.length) return "-";
  return dice.map((die, index) => {
    const success = !die.dropped && isPoolSuccess(die.value, pool);
    const text = die.dropped ? `(${die.value})` : `${die.value}`;
    const content = success ? <strong>{text}</strong> : <span>{text}</span>;
    const suffix = index < dice.length - 1 ? ", " : "";
    return (
      <span key={`pool-roll-${index}`}>
        {content}
        {suffix}
      </span>
    );
  });
}

function renderDegradeRollsInline(dice: { value: number; dropped?: boolean }[]) {
  if (!dice.length) return "-";
  return dice
    .map((die) => (die.dropped ? `(${die.value})` : `${die.value}`))
    .join(", ");
}

function renderExplosionLines(groups: number[][], threshold: number) {
  return groups.map((values, idx) => {
    const label = idx === 0 ? "ROLL" : "EXPLOSION";
    return (
      <div key={`explode-${idx}`} className="dice-card-detail">
        <span>{label}:</span>{" "}
        <span>
          {values.map((value, valueIndex) => {
            const isExploding = value >= threshold;
            const content = isExploding ? <strong>{value}</strong> : <span>{value}</span>;
            const suffix = valueIndex < values.length - 1 ? ", " : "";
            return (
              <span key={`explode-val-${idx}-${valueIndex}`}>
                {content}
                {suffix}
              </span>
            );
          })}
        </span>
      </div>
    );
  });
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

function adjustStandardModifier(expression: string, delta: number): string {
  const trimmed = expression.trim();
  if (!trimmed) {
    return delta >= 0 ? `${delta}` : `${delta}`;
  }
  const modifierMatch = trimmed.match(/([+-]\s*\d+)\s*$/);
  if (modifierMatch) {
    const current = Number.parseInt(modifierMatch[1].replace(/\s+/g, ""), 10);
    const next = current + delta;
    if (next === 0) {
      return trimmed.slice(0, modifierMatch.index).trim();
    }
    const nextFragment = next > 0 ? `+ ${next}` : `${next}`;
    return `${trimmed.slice(0, modifierMatch.index)} ${nextFragment}`.trim();
  }
  const fragment = delta >= 0 ? `+ ${delta}` : `${delta}`;
  return `${trimmed} ${fragment}`.trim();
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
