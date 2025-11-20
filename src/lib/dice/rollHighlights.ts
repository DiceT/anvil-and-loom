import type {
  ChallengeOutcome,
  DiceTermRollResult,
  RollResult,
  ChallengeTermRollResult,
} from "./DiceRoller";

export type RollHighlight =
  | {
      type: "challenge-outcome";
      outcome: ChallengeOutcome;
      boon: boolean;
      complication: boolean;
      termIndex: number;
      color: string;
    }
  | {
    type: "natural-crit";
    value: number;
    sides: number;
    dieIndex: number;
    termIndex: number;
    crit: "success" | "failure";
    }
  | {
      type: "pool-success";
      successes: number;
      target?: number;
      metTarget?: boolean;
      termIndex: number;
    }
  | {
      type: "degrade";
      step: number;
      termIndex: number;
    };

const CHALLENGE_COLORS: Record<ChallengeOutcome, string> = {
  "Strong Hit": "#22c55e",
  "Weak Hit": "#d97706",
  "Miss": "#ef4444",
};

export function annotateRollResult(result: RollResult): RollHighlight[] {
  const highlights: RollHighlight[] = [];

  result.terms.forEach((termResult, termIndex) => {
    if (termResult.type === "challenge") {
      highlights.push({
        type: "challenge-outcome",
        outcome: termResult.outcome,
        boon: termResult.boon,
        complication: termResult.complication,
        termIndex,
        color: CHALLENGE_COLORS[termResult.outcome] ?? "var(--text-main)",
      });
      return;
    }

    if (termResult.type === "dice") {
      annotateDiceTerm(termResult, termIndex, highlights);
    }
  });

  return highlights;
}

function annotateDiceTerm(
  termResult: DiceTermRollResult,
  termIndex: number,
  highlights: RollHighlight[]
) {
  const term = termResult.term;
  const { dice } = termResult;

  // Natural crit detection (only for d20s)
  if (term.sides === 20) {
    dice.forEach((die) => {
      if (die.dropped) return;
      if (die.value === 20) {
        highlights.push({
          type: "natural-crit",
          value: die.value,
          sides: term.sides,
          dieIndex: die.index,
          termIndex,
          crit: "success",
        });
      } else if (die.value === 1) {
        highlights.push({
          type: "natural-crit",
          value: die.value,
          sides: term.sides,
          dieIndex: die.index,
          termIndex,
          crit: "failure",
        });
      }
    });
  }

  if (typeof termResult.successes === "number" && termResult.successes > 0) {
    highlights.push({
      type: "pool-success",
      successes: termResult.successes,
      target: term.pool?.targetSuccesses,
      metTarget: termResult.metTarget,
      termIndex,
    });
  }

  if (termResult.degradeTriggered) {
    highlights.push({
      type: "degrade",
      step: termResult.degradeStep ?? 1,
      termIndex,
    });
  }
}

export function extractChallengeResults(result: RollResult): ChallengeTermRollResult[] {
  return result.terms.filter(
    (term): term is ChallengeTermRollResult => term.type === "challenge"
  );
}
