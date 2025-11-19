// src/components/DiceTray.tsx
import { useState } from "react";
import { rollDice } from "../lib/diceEngine";
import type {
  LogicalRollType,
  DiceEngineResult,
} from "../lib/diceEngine";

export function DiceTray() {
  const [lastResult, setLastResult] = useState<DiceEngineResult | null>(null);
  const [isRolling, setIsRolling] = useState(false);

  const handleRoll = async (type: LogicalRollType) => {
    if (isRolling) return; // simple throttle to avoid overlapping animations
    try {
      setIsRolling(true);
      const result = await rollDice(type);
      setLastResult(result);
    } catch (err) {
      console.error("Dice roll error:", err);
    } finally {
      setIsRolling(false);
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <div
        style={{
          marginBottom: 8,
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={() => handleRoll("d20")}
          disabled={isRolling}
        >
          Roll 1d20
        </button>
        <button
          type="button"
          onClick={() => handleRoll("four_d6")}
          disabled={isRolling}
        >
          Roll 4d6
        </button>
        <button
          type="button"
          onClick={() => handleRoll("percentile")}
          disabled={isRolling}
        >
          Roll d100
        </button>
        <button
          type="button"
          onClick={() => handleRoll("challenge")}
          disabled={isRolling}
        >
          Challenge (1d6 vs 2d10)
        </button>
      </div>

      {lastResult && lastResult.kind === "challenge" &&
      lastResult.meta?.type === "challenge" ? (
        // 🔹 Fancy Challenge card
        (() => {
          const meta = lastResult.meta;
          const outcome: string = meta.outcome ?? "Result";
          const actionDie: number | undefined = meta.actionDie;
          const modifier: number | undefined = meta.modifier;
          const actionScore: number | undefined = meta.actionScore;
          const challengeDice: number[] = meta.challengeDice ?? [];
          const boon: boolean = !!meta.boon;
          const complication: boolean = !!meta.complication;

          let outcomeColor = "#e5e5e5";
          if (outcome === "Strong Hit") outcomeColor = "#4ade80"; // green
          else if (outcome === "Weak Hit") outcomeColor = "#eab308"; // yellow
          else if (outcome === "Miss") outcomeColor = "#f97373"; // red

          return (
            <div
              style={{
                marginTop: 8,
                padding: 12,
                borderRadius: 6,
                background: "#1f1f1f",
                border: "1px solid #444",
                fontSize: 13,
              }}
            >
              <div
                style={{
                  fontWeight: 600,
                  marginBottom: 8,
                  fontSize: 14,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                Challenge Roll
              </div>

              <div style={{ marginBottom: 4 }}>
                Action Roll:{" "}
                {typeof actionDie === "number" &&
                typeof modifier === "number" &&
                typeof actionScore === "number" ? (
                  <span>
                    {actionDie} + {modifier} = <strong>{actionScore}</strong>
                  </span>
                ) : (
                  "—"
                )}
              </div>

              <div style={{ marginBottom: 8 }}>
                Challenge Roll:{" "}
                {challengeDice.length >= 2 ? (
                  <span>
                    {challengeDice[0]}, {challengeDice[1]}
                  </span>
                ) : (
                  "—"
                )}
              </div>

              <div
                style={{
                  marginTop: 4,
                  fontSize: 18,
                  fontWeight: 700,
                  color: outcomeColor,
                }}
              >
                Result: {outcome || "—"}
                {boon && " (Boon)"}
                {complication && " (Complication)"}
              </div>
            </div>
          );
        })()
      ) : (
        // 🔹 Generic card for everything else
        lastResult && (
          <div
            style={{
              marginTop: 8,
              padding: 8,
              borderRadius: 6,
              background: "#1f1f1f",
              border: "1px solid #444",
              fontSize: 12,
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 4 }}>
              {lastResult.label}
            </div>

            {(lastResult.kind === "number" ||
              lastResult.kind === "percentile") &&
              typeof lastResult.value === "number" && (
                <div>
                  Result: <strong>{lastResult.value}</strong>
                </div>
              )}

            {lastResult.detail && (
              <div style={{ marginTop: 4 }}>{lastResult.detail}</div>
            )}
          </div>
        )
      )}

    </div>
  );
}
