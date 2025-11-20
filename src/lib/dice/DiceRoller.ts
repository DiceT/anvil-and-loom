import DiceExpression from "./DiceExpression";
import type {
  DicePoolComparator,
  DicePoolRules,
  DiceTerm,
  DiceDegradeRule,
  ChallengeTerm,
} from "./DiceExpression";

/**
 * Represents a single die rolled from a dice term.
 */
export interface SingleDieResult {
  index: number;
  value: number;
  kept: boolean;
  dropped: boolean;
}

export interface DiceTermRollResult {
  type: "dice";
  term: DiceTerm;
  dice: SingleDieResult[];
  total: number;
  /**
   * Number of successes counted for pool mechanics.
   */
  successes?: number;
  /**
   * True when the pool reached/exceeded its target.
   */
  metTarget?: boolean;
  /**
   * True when at least one die met the degradation rule.
   */
  degradeTriggered?: boolean;
  /**
   * Amount to degrade when triggered (defaults to 1).
   */
  degradeStep?: number;
}

export interface ConstantTermRollResult {
  type: "constant";
  value: number;
}

export type ChallengeOutcome = "Strong Hit" | "Weak Hit" | "Miss";

export interface ChallengeTermRollResult {
  type: "challenge";
  term: ChallengeTerm;
  actionDie: number;
  actionModifier: number;
  actionScore: number | null;
  signedActionScore: number;
  challengeDice: number[];
  challengeModifier: number;
  challengeScore: number[];
  outcome: ChallengeOutcome;
  boon: boolean;
  complication: boolean;
}

export type TermRollResult =
  | DiceTermRollResult
  | ConstantTermRollResult
  | ChallengeTermRollResult;

export interface RollResult {
  expression: DiceExpression;
  total: number;
  successes?: number;
  terms: TermRollResult[];
}

export interface DiceRollerOptions {
  /**
   * Custom RNG factory for deterministic tests. Should return a float in [0, 1).
   */
  random?: () => number;
}

export interface DiceValueProvider {
  rollDice(count: number, sides: number): Promise<number[]>;
  rollComposite?(requests: Array<{ count: number; sides: number }>): Promise<number[][]>;
}

/**
 * Deterministic DiceRoller. It currently uses Math.random by default,
 * but will be wired to DiceBox once the integration layer is ready.
 */
export class DiceRoller {
  static roll(expression: DiceExpression, options: DiceRollerOptions = {}): RollResult {
    const rng = options.random ?? Math.random;
    let total = 0;
    let totalSuccesses: number | undefined;
    const termResults: TermRollResult[] = [];

    for (const term of expression.terms) {
      if (term.type === "constant") {
        const signed = term.operator === "+" ? term.value : -term.value;
        total += signed;
        termResults.push({ type: "constant", value: signed });
        continue;
      }
      if (term.type === "challenge") {
        const challengeResult = DiceRoller.rollChallengeTerm(term, rng);
        total += challengeResult.signedActionScore;
        termResults.push(challengeResult);
        continue;
      }

      const diceResult = DiceRoller.rollDiceTerm(term, rng);
      total += diceResult.total;
      if (typeof diceResult.successes === "number") {
        totalSuccesses = (totalSuccesses ?? 0) + diceResult.successes;
      }
      termResults.push(diceResult);
    }

    return {
      expression,
      total,
      successes: totalSuccesses,
      terms: termResults,
    };
  }

  static async rollWithProvider(
    expression: DiceExpression,
    provider: DiceValueProvider
  ): Promise<RollResult> {
    const compositeValues = provider.rollComposite
      ? await DiceRoller.prepareCompositeRolls(expression, provider)
      : null;
    let total = 0;
    let totalSuccesses: number | undefined;
    const termResults: TermRollResult[] = [];

    for (const [index, term] of expression.terms.entries()) {
      if (term.type === "constant") {
        const signed = term.operator === "+" ? term.value : -term.value;
        total += signed;
        termResults.push({ type: "constant", value: signed });
        continue;
      }
      if (term.type === "challenge") {
        const challengeResult = await DiceRoller.rollChallengeTermWithProvider(term, provider);
        total += challengeResult.signedActionScore;
        termResults.push(challengeResult);
        continue;
      }

      const cachedValues = compositeValues?.get(index);
      const diceResult = cachedValues
        ? DiceRoller.evaluateDiceTerm(term, cachedValues)
        : await DiceRoller.rollDiceTermWithProvider(term, provider);
      total += diceResult.total;
      if (typeof diceResult.successes === "number") {
        totalSuccesses = (totalSuccesses ?? 0) + diceResult.successes;
      }
      termResults.push(diceResult);
    }

    return {
      expression,
      total,
      successes: totalSuccesses,
      terms: termResults,
    };
  }

  private static async rollDiceTermWithProvider(
    term: DiceTerm,
    provider: DiceValueProvider
  ): Promise<DiceTermRollResult> {
    if (term.sides === 100 && term.count > 0) {
      if (provider.rollComposite) {
        const [tensChunk = [], onesChunk = []] = await provider.rollComposite([
          { count: term.count, sides: 100 },
          { count: term.count, sides: 10 },
        ]);
        const values = DiceRoller.combinePercentileValues(tensChunk, onesChunk);
        return DiceRoller.evaluateDiceTerm(term, values);
      }
      const tensRolls = await provider.rollDice(term.count, 100);
      const onesRolls = await provider.rollDice(term.count, 10);
      const values = DiceRoller.combinePercentileValues(tensRolls, onesRolls);
      return DiceRoller.evaluateDiceTerm(term, values);
    }
    const values = await provider.rollDice(term.count, term.sides);
    return DiceRoller.evaluateDiceTerm(term, values);
  }

  private static rollDiceTerm(term: DiceTerm, rng: () => number): DiceTermRollResult {
    const values: number[] = [];
    if (term.sides === 100) {
      for (let index = 0; index < term.count; index++) {
        const tens = DiceRoller.rollSingleDie(100, rng);
        const ones = DiceRoller.rollSingleDie(10, rng);
        values.push(DiceRoller.computePercentileValue(tens, ones));
      }
    } else {
      for (let index = 0; index < term.count; index++) {
        values.push(DiceRoller.rollSingleDie(term.sides, rng));
      }
    }
    return DiceRoller.evaluateDiceTerm(term, values);
  }

  private static evaluateDiceTerm(term: DiceTerm, values: number[]): DiceTermRollResult {
    const dice: SingleDieResult[] = [];
    for (let index = 0; index < term.count; index++) {
      const value = values[index] ?? values[values.length - 1] ?? term.sides;
      dice.push({
        index,
        value,
        kept: true,
        dropped: false,
      });
    }
    DiceRoller.applySelection(term, dice);
    const total = dice.reduce((sum, die) => {
      if (die.dropped) return sum;
      const signedValue = term.operator === "+" ? die.value : -die.value;
      return sum + signedValue;
    }, 0);

    const poolInfo = term.pool ? DiceRoller.evaluatePool(term.pool, dice) : undefined;
    const degradeInfo = term.degrade
      ? DiceRoller.evaluateDegrade(term.degrade, dice)
      : undefined;
    return {
      type: "dice",
      term,
      dice,
      total,
      successes: poolInfo?.successes,
      metTarget: poolInfo?.metTarget,
      degradeTriggered: degradeInfo?.triggered,
      degradeStep: degradeInfo?.stepAmount,
    };
  }

  private static rollSingleDie(sides: number, rng: () => number): number {
    const roll = Math.floor(rng() * sides) + 1;
    return Math.min(Math.max(roll, 1), sides);
  }

  private static applySelection(term: DiceTerm, dice: SingleDieResult[]) {
    if (!term.selection) return;
    const target = Math.min(term.selection.count, dice.length);
    if (target <= 0) return;

    const cmp = (a: SingleDieResult, b: SingleDieResult) => a.value - b.value;
    const sorted = [...dice].sort(cmp);

    switch (term.selection.mode) {
      case "keep-highest": {
        const keep = [...sorted].sort((a, b) => b.value - a.value).slice(0, target);
        DiceRoller.markDice(dice, keep.map((d) => d.index), true);
        break;
      }
      case "keep-lowest": {
        const keep = sorted.slice(0, target);
        DiceRoller.markDice(dice, keep.map((d) => d.index), true);
        break;
      }
      case "drop-highest": {
        const drop = [...sorted].sort((a, b) => b.value - a.value).slice(0, target);
        DiceRoller.markDice(dice, drop.map((d) => d.index), false);
        break;
      }
      case "drop-lowest": {
        const drop = sorted.slice(0, target);
        DiceRoller.markDice(dice, drop.map((d) => d.index), false);
        break;
      }
    }
  }

  private static markDice(dice: SingleDieResult[], indices: number[], indicesAreKept: boolean) {
    const set = new Set(indices);
    dice.forEach((die) => {
      const inSet = set.has(die.index);
      const shouldKeep = indicesAreKept ? inSet : !inSet;
      die.kept = shouldKeep;
      die.dropped = !shouldKeep;
    });
  }

  private static evaluatePool(pool: DicePoolRules, dice: SingleDieResult[]) {
    let successes = 0;
    dice.forEach((die) => {
      if (DiceRoller.compare(die.value, pool.successComparator, pool.successThreshold)) {
        successes += 1;
      }
    });

    return {
      successes,
      metTarget:
        typeof pool.targetSuccesses === "number" ? successes >= pool.targetSuccesses : undefined,
    };
  }

  private static evaluateDegrade(rule: DiceDegradeRule, dice: SingleDieResult[]) {
    const triggered = dice.some((die) =>
      DiceRoller.compare(die.value, rule.comparator, rule.threshold)
    );
    return triggered
      ? {
          triggered: true,
          stepAmount: rule.stepAmount ?? 1,
        }
      : {
          triggered: false,
          stepAmount: rule.stepAmount ?? 1,
        };
  }

  private static compare(value: number, comparator: DicePoolComparator, threshold: number): boolean {
    switch (comparator) {
      case ">":
        return value > threshold;
      case ">=":
        return value >= threshold;
      case "<":
        return value < threshold;
      case "<=":
        return value <= threshold;
      case "=":
        return value === threshold;
      default:
        return false;
    }
  }

  private static rollChallengeTerm(term: ChallengeTerm, rng: () => number): ChallengeTermRollResult {
    const { config } = term;
    const actionDie = DiceRoller.rollSingleDie(config.actionSides, rng);
    const challengeDice: number[] = [];
    for (let i = 0; i < config.challengeCount; i++) {
      challengeDice.push(DiceRoller.rollSingleDie(config.challengeSides, rng));
    }
    return DiceRoller.evaluateChallengeTerm(term, actionDie, challengeDice);
  }

  private static async rollChallengeTermWithProvider(
    term: ChallengeTerm,
    provider: DiceValueProvider
  ): Promise<ChallengeTermRollResult> {
    const { config } = term;
    if (provider.rollComposite) {
      const chunks = await provider.rollComposite([
        { count: 1, sides: config.actionSides },
        { count: config.challengeCount, sides: config.challengeSides },
      ]);
      const actionChunk = chunks[0] ?? [];
      const challengeChunk = chunks[1] ?? [];
      const actionDie =
        actionChunk[0] ?? DiceRoller.rollSingleDie(config.actionSides, Math.random);
      return DiceRoller.evaluateChallengeTerm(term, actionDie, challengeChunk);
    }
    const actionValues = await provider.rollDice(1, config.actionSides);
    const actionDie = actionValues[0] ?? DiceRoller.rollSingleDie(config.actionSides, Math.random);
    const challengeDice = await provider.rollDice(config.challengeCount, config.challengeSides);
    return DiceRoller.evaluateChallengeTerm(term, actionDie, challengeDice);
  }

  private static evaluateChallengeTerm(
    term: ChallengeTerm,
    actionDie: number,
    challengeDice: number[]
  ): ChallengeTermRollResult {
    const { config } = term;
    const actionScore = actionDie + config.actionModifier;
    const challengeScore = challengeDice.map((value) => value + config.challengeModifier);
    const signedActionScore = (actionScore ?? 0) * (term.operator === "+" ? 1 : -1);
    const outcome = DiceRoller.evaluateChallengeOutcome(actionScore, challengeScore);
    const boon = DiceRoller.checkBoon(outcome, challengeScore);
    const complication = DiceRoller.checkComplication(outcome, challengeScore);
    return {
      type: "challenge",
      term,
      actionDie,
      actionModifier: config.actionModifier,
      actionScore,
      signedActionScore,
      challengeDice,
      challengeModifier: config.challengeModifier,
      challengeScore,
      outcome,
      boon,
      complication,
    };
  }

  private static evaluateChallengeOutcome(
    actionScore: number | null,
    challengeScores: number[]
  ): ChallengeOutcome {
    if (actionScore == null || challengeScores.length < 2) {
      return "Miss";
    }
    const beats = challengeScores.map((score) => actionScore > score);
    if (beats.every(Boolean)) return "Strong Hit";
    if (beats.some(Boolean)) return "Weak Hit";
    return "Miss";
  }

  private static checkBoon(outcome: ChallengeOutcome, challengeScores: number[]): boolean {
    if (outcome !== "Strong Hit") return false;
    return new Set(challengeScores).size === 1;
  }

  private static checkComplication(outcome: ChallengeOutcome, challengeScores: number[]): boolean {
    if (outcome !== "Miss") return false;
    return new Set(challengeScores).size === 1;
  }

  private static async prepareCompositeRolls(
    expression: DiceExpression,
    provider: DiceValueProvider
  ): Promise<Map<number, number[]> | null> {
    if (!provider.rollComposite) return null;
    const requests: Array<{ count: number; sides: number }> = [];
    const mapping: Array<
      | { type: "regular"; termIndex: number; primaryChunk: number }
      | { type: "percentile"; termIndex: number; tensChunk: number; onesChunk: number }
    > = [];

    expression.terms.forEach((term, index) => {
      if (term.type !== "dice") return;
      if (term.count <= 0 || term.sides <= 0) return;
      if (term.sides === 100) {
        mapping.push({
          type: "percentile",
          termIndex: index,
          tensChunk: requests.length,
          onesChunk: requests.length + 1,
        });
        requests.push({ count: term.count, sides: 100 });
        requests.push({ count: term.count, sides: 10 });
      } else {
        mapping.push({
          type: "regular",
          termIndex: index,
          primaryChunk: requests.length,
        });
        requests.push({ count: term.count, sides: term.sides });
      }
    });

    if (!requests.length) return null;

    const chunks = await provider.rollComposite(requests);
    const result = new Map<number, number[]>();

    mapping.forEach((mapEntry) => {
      if (mapEntry.type === "regular") {
        result.set(mapEntry.termIndex, chunks[mapEntry.primaryChunk] ?? []);
      } else {
        const tens = chunks[mapEntry.tensChunk] ?? [];
        const ones = chunks[mapEntry.onesChunk] ?? [];
        result.set(mapEntry.termIndex, DiceRoller.combinePercentileValues(tens, ones));
      }
    });

    return result;
  }

  private static combinePercentileValues(tens: number[], ones: number[]): number[] {
    const combined: number[] = [];
    const length = Math.max(tens.length, ones.length);
    for (let i = 0; i < length; i++) {
      const tensValue = tens[i] ?? DiceRoller.rollSingleDie(100, Math.random);
      const onesValue = ones[i] ?? DiceRoller.rollSingleDie(10, Math.random);
      combined.push(DiceRoller.computePercentileValue(tensValue, onesValue));
    }
    return combined;
  }

  private static computePercentileValue(tensRaw: number, onesRaw: number): number {
    const sanitizedTens = tensRaw === 100 ? 0 : tensRaw % 100;
    const tensNormalized = Math.floor(sanitizedTens / 10) * 10;
    const onesNormalized = onesRaw === 10 ? 0 : onesRaw % 10;
    let total = tensNormalized + onesNormalized;
    if (tensNormalized === 0 && onesNormalized === 0) {
      total = 100;
    }
    return total === 0 ? 100 : total;
  }
}

export default DiceRoller;

