import { useMemo, useState } from "react";
import { rollDice } from "../lib/diceEngine";
import type {
  LogicalRollType,
  DiceEngineResult,
  RollAdvantageMode,
  SingleDieType,
} from "../lib/diceEngine";
import { Triangle, Diamond, Pentagon, DiamondPercent, Swords } from "lucide-react";

type DiceIcon = (props: { size?: number; strokeWidth?: number }) => JSX.Element;

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

export function DiceTray() {
  const [lastResult, setLastResult] = useState<DiceEngineResult | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [rollMode, setRollMode] = useState<RollAdvantageMode>("normal");
  const [modifier, setModifier] = useState(0);

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
    { type: "percentile", icon: DiamondPercent, label: "d100" },
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
              <div className="dice-card-title">Challenge Roll</div>
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

                <div className="dice-card-highlight">
                  Result:{" "}
                  <span style={{ color: outcomeColor }}>
                    <strong>
                      {outcome || "-"}
                      {boon && " (Boon)"}
                      {complication && " (Complication)"}
                    </strong>
                  </span>
                </div>
              </div>
            </div>
          );
        })()
      ) : (
        lastResult && (
          <div className="dice-card">
            <div className="dice-card-title">
              {`Rolled ${lastResult.label.toUpperCase()}`}
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

              {(lastResult.kind === "number" ||
                lastResult.kind === "percentile") &&
                typeof lastResult.value === "number" && (
                  <div className="dice-card-highlight">
                    Result:{" "}
                    <strong>{lastResult.value}</strong>
                  </div>
                )}
            </div>
          </div>
        )
      )}
    </div>
  );
}
