import { useEffect, useMemo, useState } from "react";
import { rollDice, setDiceFadeDuration } from "../lib/diceEngine";
import type {
  LogicalRollType,
  DiceEngineResult,
  RollAdvantageMode,
  SingleDieType,
} from "../lib/diceEngine";
import { Triangle, Diamond, Pentagon, Percent, Swords } from "lucide-react";

interface DiceTrayProps {
  onRollResult?: (html: string) => void;
  fadeDurationMs?: number;
}

type DiceIcon = (props: { size?: number; strokeWidth?: number }) => JSX.Element;

function formatResultAsHtml(result: DiceEngineResult): string {
  const toggleId = `dice-log-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

  if (result.kind === "challenge" && result.meta?.type === "challenge") {
    const meta = result.meta;
    const actionDie = meta.actionDie;
    const actionScore = meta.actionScore;
    const baseModifier = meta.baseModifier;
    const userModifier = meta.userModifier;
    const challengeDice = meta.challengeDice ?? [];
    const mathSegments: string[] = [];

    if (typeof actionDie === "number") mathSegments.push(`${actionDie}`);
    if (typeof baseModifier === "number")
      mathSegments.push(`${baseModifier >= 0 ? "+" : ""}${baseModifier}`);
    if (typeof userModifier === "number")
      mathSegments.push(`${userModifier >= 0 ? "+" : ""}${userModifier}`);
    if (mathSegments.length) {
      mathSegments.push(`= ${typeof actionScore === "number" ? actionScore : "?"}`);
    }

    const actionText =
      mathSegments.length > 0
        ? mathSegments.join(" ")
        : typeof actionScore === "number"
        ? `${actionScore}`
        : "-";
    const challengeText =
      challengeDice.length >= 2 ? `${challengeDice[0]}, ${challengeDice[1]}` : "-";
    const resultText = meta.outcome
      ? `${meta.outcome}${meta.boon ? " (Boon)" : ""}${meta.complication ? " (Complication)" : ""}`
      : "Result";

    let outcomeColor = "var(--text-main)";
    if (meta.outcome === "Strong Hit") outcomeColor = "#22c55e";
    else if (meta.outcome === "Weak Hit") outcomeColor = "#d97706";
    else if (meta.outcome === "Miss") outcomeColor = "#ef4444";

    return `
      <div class="dice-card dice-log-card">
        <input type="checkbox" id="${toggleId}" class="dice-log-toggle" />
        <label for="${toggleId}" class="dice-card-title dice-log-header">
          <span>CHALLENGE ROLL</span>
          <span class="dice-log-caret" aria-hidden="true"></span>
        </label>
        <div class="dice-card-body dice-log-body">
          <div class="dice-card-detail">
            <span>Action Roll:</span> <strong>${actionText}</strong>
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

  const rollsInfo =
    result.meta?.type === "single" &&
    Array.isArray(result.meta.rolls) &&
    result.meta.rolls.length
      ? `${result.meta.rolls.join(", ")} (${result.meta.mode ?? "standard"})`
      : "";
  const detailMarkup = result.detail
    ? `<div class="dice-card-detail">${result.detail}</div>`
    : "";
  const inlineResult =
    (result.kind === "number" || result.kind === "percentile") &&
    typeof result.value === "number"
      ? `<span class="dice-card-inline-result"><strong>${result.value}</strong></span>`
      : "";

  const bodySections: string[] = [];
  if (rollsInfo) {
    bodySections.push(`<div class="dice-card-detail">Rolls: ${rollsInfo}</div>`);
  }
  if (detailMarkup) {
    bodySections.push(detailMarkup);
  }

  const hasBodyContent = bodySections.length > 0;
  const bodyMarkup = hasBodyContent
    ? `<div class="dice-card-body dice-log-body">${bodySections.join("")}</div>`
    : "";
  const headerInner = [
    `<span>ROLLED ${result.label?.toUpperCase() ?? "DICE"}</span>`,
    hasBodyContent ? '<span class="dice-log-caret" aria-hidden="true"></span>' : "",
  ]
    .filter(Boolean)
    .join("");

  return `
    <div class="dice-card dice-log-card">
      ${
        hasBodyContent
          ? `<input type="checkbox" id="${toggleId}" class="dice-log-toggle" />`
          : ""
      }
      ${
        hasBodyContent
          ? `<label for="${toggleId}" class="dice-card-title dice-log-header">${headerInner}</label>`
          : `<div class="dice-card-title dice-log-header dice-log-header-static">${headerInner}</div>`
      }
      ${bodyMarkup}
      ${
        inlineResult
          ? `<div class="dice-card-highlight dice-log-footer"><span class="dice-log-footer-label">Result:</span> ${inlineResult}</div>`
          : ""
      }
    </div>
  `.trim();
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

export function DiceTray({
  onRollResult,
  fadeDurationMs = 3000,
}: DiceTrayProps) {
  const [lastResult, setLastResult] = useState<DiceEngineResult | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [rollMode, setRollMode] = useState<RollAdvantageMode>("normal");
  const [modifier, setModifier] = useState(0);
  useEffect(() => {
    setDiceFadeDuration(Math.max(500, fadeDurationMs));
  }, [fadeDurationMs]);

  const singleDieTypes = useMemo(
    () => new Set<SingleDieType>(["d4", "d6", "d8", "d10", "d12", "d20"]),
    []
  );

  const diceOptions: Array<{
    type: LogicalRollType;
    icon: DiceIcon;
    label: string;
  }> = [
    { type: "d4", icon: Triangle, label: "d4" },
    { type: "d6", icon: SquareIcon, label: "d6" },
    { type: "d8", icon: Diamond, label: "d8" },
    { type: "d10", icon: ThinDiamondIcon, label: "d10" },
    { type: "d12", icon: Pentagon, label: "d12" },
    { type: "d20", icon: HexagonIcon, label: "d20" },
    { type: "percentile", icon: Percent, label: "d100" },
    { type: "challenge", icon: Swords, label: "Challenge Roll" },
  ];

  const handleRoll = async (type: LogicalRollType) => {
    if (isRolling) return;
    try {
      setIsRolling(true);
      const modeToUse: RollAdvantageMode = singleDieTypes.has(type as SingleDieType)
        ? rollMode
        : "normal";
      const result = await rollDice(type, { mode: modeToUse, modifier });
      setLastResult(result);
      if (onRollResult) {
        const html = formatResultAsHtml(result);
        if (html.trim().length) {
          onRollResult(html);
        }
      }
    } catch (err) {
      console.error("Dice roll error:", err);
    } finally {
      setIsRolling(false);
    }
  };

  const adjustModifier = (delta: number) => {
    setModifier((prev) => prev + delta);
  };

  return (
    <div className="dice-tray">
      <div className="dice-toolbar">
        <div className="dice-die-grid">
          {diceOptions.map(({ type, icon: Icon, label }) => (
            <button
              key={type}
              className="dice-die-button"
              type="button"
              disabled={isRolling}
              onClick={() => handleRoll(type)}
              aria-label={label}
              data-tooltip={label.toUpperCase()}
            >
              <Icon size={20} strokeWidth={2} />
            </button>
          ))}
        </div>

        <div className="dice-control-row">
          <button
            type="button"
            className={
              "dice-adv-toggle" +
              (rollMode === "disadvantage" ? " dice-adv-toggle-active" : "")
            }
            onClick={() =>
              setRollMode((prev) =>
                prev === "disadvantage" ? "normal" : "disadvantage"
              )
            }
          >
            DIS
          </button>

          <div className="dice-modifier-control">
            <button
              type="button"
              className="dice-mod-button"
              onClick={() => adjustModifier(-1)}
            >
              -
            </button>
            <input
              type="number"
              className="dice-mod-input"
              value={modifier}
              onChange={(e) =>
                setModifier(Number.parseInt(e.target.value, 10) || 0)
              }
            />
            <button
              type="button"
              className="dice-mod-button"
              onClick={() => adjustModifier(1)}
            >
              +
            </button>
          </div>

          <button
            type="button"
            className={
              "dice-adv-toggle" +
              (rollMode === "advantage" ? " dice-adv-toggle-active" : "")
            }
            onClick={() =>
              setRollMode((prev) => (prev === "advantage" ? "normal" : "advantage"))
            }
          >
            ADV
          </button>
        </div>
      </div>

      {lastResult && lastResult.kind === "challenge" &&
      lastResult.meta?.type === "challenge" ? (
        (() => {
          const meta = lastResult.meta;
          const outcome: string = meta.outcome ?? "Result";
          const actionDie: number | undefined = meta.actionDie;
          const baseModifier: number | undefined = meta.baseModifier;
          const userModifier: number | undefined = meta.userModifier;
          const actionScore: number | undefined = meta.actionScore;
          const challengeDice: number[] = meta.challengeDice ?? [];
          const boon: boolean = !!meta.boon;
          const complication: boolean = !!meta.complication;

          let outcomeColor = "var(--text-main)";
          if (outcome === "Strong Hit") outcomeColor = "#22c55e";
          else if (outcome === "Weak Hit") outcomeColor = "#d97706";
          else if (outcome === "Miss") outcomeColor = "#ef4444";

          return (
            <div className="dice-card">
              <div className="dice-card-title">CHALLENGE ROLL</div>
              <div className="dice-card-body">
                <div className="dice-card-detail">
                  <span>Action Roll:</span>{" "}
                  {typeof actionDie === "number" &&
                  typeof actionScore === "number" ? (
                    <strong>
                      {actionDie}
                      {baseModifier ? ` + ${baseModifier}` : ""}
                      {userModifier ? ` + ${userModifier}` : ""} = {actionScore}
                    </strong>
                  ) : (
                    "-"
                  )}
                </div>

                <div className="dice-card-detail">
                  <span>Challenge Roll:</span>{" "}
                  {challengeDice.length >= 2 ? (
                    <strong>
                      {challengeDice[0]}, {challengeDice[1]}
                    </strong>
                  ) : (
                    "-"
                  )}
                </div>
              </div>
              <div className="dice-card-highlight">
                Result:{" "}
                <span
                  className="dice-card-inline-result"
                  style={{ color: outcomeColor }}
                >
                  <strong>
                    {outcome || "-"}
                    {boon && " (Boon)"}
                    {complication && " (Complication)"}
                  </strong>
                </span>
              </div>
            </div>
          );
        })()
      ) : (
        lastResult && (
          <div className="dice-card">
            <div className="dice-card-title">
              {`ROLLED ${lastResult.label.toUpperCase()}`}
            </div>
            <div className="dice-card-body">
              {lastResult.meta?.type === "single" &&
                Array.isArray(lastResult.meta.rolls) &&
                lastResult.meta.rolls.length >= 1 &&
                lastResult.meta.rolls.length >= 2 && (
                  <div className="dice-card-detail">
                    Rolls: {lastResult.meta.rolls.join(", ")} (
                    {lastResult.meta.mode === "advantage"
                      ? "kept highest"
                      : lastResult.meta.mode === "disadvantage"
                      ? "kept lowest"
                      : "standard"}
                    )
                  </div>
                )}

              {lastResult.detail && (
                <div className="dice-card-detail">{lastResult.detail}</div>
              )}
            </div>
            {(lastResult.kind === "number" ||
              lastResult.kind === "percentile") &&
              typeof lastResult.value === "number" && (
                <div className="dice-card-highlight">
                  Result:{" "}
                  <span className="dice-card-inline-result">
                    <strong>{lastResult.value}</strong>
                  </span>
                </div>
              )}
          </div>
        )
      )}
    </div>
  );
}

