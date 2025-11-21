import DiceExpression from "./DiceExpression";
import { getDiceAppearance } from "../diceEngine";
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
  explosions?: number[][];
  explosionCount?: number;
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
  rollCustomDice?(
    dice: Array<{ sides: number | string; themeColor?: string; data?: string }>
  ): Promise<number[]>;
  setThemeColor?(color: string): void;
  setThemeName?(name: string): void;
  setTensThemeColor?(color: string): void;
  setTexture?(texture: string): void;
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

      const cachedValues = term.explode ? null : compositeValues?.get(index);
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
    if (term.percentile) {
      // If custom dice supported, roll the two dice (first tinted) in one call for animation.
      if (provider.rollCustomDice) {
        const tensColor = getDiceAppearance().tensThemeColor ?? "#000000";
        const dice: Array<{ sides: number | string; themeColor?: string; data?: string }> = [];
        for (let i = 0; i < term.count; i++) {
          dice.push({ sides: term.percentile.tensSides, themeColor: tensColor });
          dice.push({ sides: term.percentile.onesSides });
        }
        const values = await provider.rollCustomDice(dice);
        const combined: number[] = [];
        for (let i = 0; i < values.length; i += 2) {
          combined.push(
            DiceRoller.combineCustomPercentile(
              values[i],
              values[i + 1],
              term.percentile.tensSides,
              term.percentile.onesSides
            )
          );
        }
        return DiceRoller.evaluateDiceTerm(term, combined);
      }
      // Fallback: standard provider path.
      const result = await DiceRoller.rollPercentileWithProvider(term, provider);
      return DiceRoller.evaluateDiceTerm(term, result.values);
    }
    if (term.explode) {
      const explosion = await DiceRoller.rollExplodingWithProvider(term, provider);
      return DiceRoller.evaluateDiceTerm(term, explosion.values, explosion.explosions);
    }
    if (term.sides === 100 && term.count > 0) {
      if (provider.rollCustomDice) {
        const dice: Array<{ sides: number | string; themeColor?: string; data?: string }> = [];
        for (let i = 0; i < term.count; i++) {
          dice.push({ sides: 100 });
        }
        const values = await provider.rollCustomDice(dice);
        return DiceRoller.evaluateDiceTerm(term, values);
      }
      if (provider.rollComposite) {
        const [hundreds = []] = await provider.rollComposite([{ count: term.count, sides: 100 }]);
        const values = Array.isArray(hundreds) ? hundreds : [];
        return DiceRoller.evaluateDiceTerm(term, values);
      }
      const rolls = await provider.rollDice(term.count, 100);
      return DiceRoller.evaluateDiceTerm(term, rolls);
    }
    const values = await provider.rollDice(term.count, term.sides);
    return DiceRoller.evaluateDiceTerm(term, values);
  }

  private static rollDiceTerm(term: DiceTerm, rng: () => number): DiceTermRollResult {
    if (term.percentile) {
      const values = DiceRoller.rollPercentile(term, rng);
      return DiceRoller.evaluateDiceTerm(term, values);
    }
    if (term.explode) {
      const explosion = DiceRoller.rollExploding(term, rng);
      return DiceRoller.evaluateDiceTerm(term, explosion.values, explosion.explosions);
    }
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

  private static evaluateDiceTerm(
    term: DiceTerm,
    values: number[],
    explosions?: number[][]
  ): DiceTermRollResult {
    const dice: SingleDieResult[] = [];
    for (let index = 0; index < values.length; index++) {
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
      explosions,
      explosionCount: explosions ? Math.max(0, explosions.length - 1) : 0,
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

  private static rollExploding(
    term: DiceTerm,
    rng: () => number
  ): { values: number[]; explosions: number[][] } {
    const threshold = term.explode?.threshold ?? term.sides;
    const explosions: number[][] = [];
    let current: number[] = [];
    for (let i = 0; i < term.count; i++) {
      current.push(DiceRoller.rollSingleDie(term.sides, rng));
    }
    explosions.push(current);
    const allValues: number[] = [...current];

    while (true) {
      const toExplode = current.filter((value) => value >= threshold).length;
      if (toExplode <= 0) break;
      const next: number[] = [];
      for (let i = 0; i < toExplode; i++) {
        next.push(DiceRoller.rollSingleDie(term.sides, rng));
      }
      explosions.push(next);
      allValues.push(...next);
      current = next;
    }

    return { values: allValues, explosions };
  }

  private static async rollExplodingWithProvider(
    term: DiceTerm,
    provider: DiceValueProvider
  ): Promise<{ values: number[]; explosions: number[][] }> {
    const threshold = term.explode?.threshold ?? term.sides;
    const explosions: number[][] = [];
    let current = await provider.rollDice(term.count, term.sides);
    explosions.push(current);
    const allValues: number[] = [...current];

    while (true) {
      const toExplode = current.filter((value) => value >= threshold).length;
      if (toExplode <= 0) break;
      const next = await provider.rollDice(toExplode, term.sides);
      explosions.push(next);
      allValues.push(...next);
      current = next;
    }

    return { values: allValues, explosions };
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
      if (term.type !== "dice" || term.explode) return;
      if (term.count <= 0 || term.sides <= 0) return;
      // Percentile-like rolls (d%XX or d100) are handled explicitly in rollDiceTermWithProvider
      // to avoid extra dice being spawned by composite requests.
      if (term.percentile || term.sides === 100) return;
      {
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
        const term = expression.terms[mapEntry.termIndex];
        if (term.type === "dice" && term.percentile) {
          result.set(
            mapEntry.termIndex,
            DiceRoller.combineCustomPercentileArrays(
              tens,
              ones,
              term.percentile.tensSides,
              term.percentile.onesSides
            )
          );
        } else {
          result.set(mapEntry.termIndex, DiceRoller.combinePercentileValues(tens, ones));
        }
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

  private static combineCustomPercentileArrays(
    tens: number[],
    ones: number[],
    tensSides: number,
    onesSides: number
  ): number[] {
    const combined: number[] = [];
    const length = Math.max(tens.length, ones.length);
    for (let i = 0; i < length; i++) {
      combined.push(
        DiceRoller.combineCustomPercentile(
          tens[i] ?? DiceRoller.rollSingleDie(tensSides, Math.random),
          ones[i] ?? DiceRoller.rollSingleDie(onesSides, Math.random),
          tensSides,
          onesSides
        )
      );
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

  private static rollPercentile(term: DiceTerm, rng: () => number): number[] {
    if (!term.percentile) return [];
    const values: number[] = [];
    for (let i = 0; i < term.count; i++) {
      const tens = DiceRoller.rollSingleDie(term.percentile.tensSides, rng);
      const ones = DiceRoller.rollSingleDie(term.percentile.onesSides, rng);
      values.push(
        DiceRoller.combineCustomPercentile(tens, ones, term.percentile.tensSides, term.percentile.onesSides)
      );
    }
    return values;
  }

  private static async rollPercentileWithProvider(
    term: DiceTerm,
    provider: DiceValueProvider
  ): Promise<{ values: number[] }> {
    if (!term.percentile) return { values: [] };
    const { tensSides, onesSides } = term.percentile;
    // Roll tens and ones once each; no extra DiceBox calls.
    const tens = await provider.rollDice(term.count, tensSides);
    const ones = await provider.rollDice(term.count, onesSides);
    const values = tens.map((tensRoll, index) =>
      DiceRoller.combineCustomPercentile(
        tensRoll,
        ones[index] ?? ones[ones.length - 1] ?? onesSides,
        tensSides,
        onesSides
      )
    );
    return { values };
  }

  private static combineCustomPercentile(
    tensRoll: number,
    onesRoll: number,
    tensSides: number,
    onesSides: number
  ): number {
    // Standard percentile: d100 + d10, or 2d10 as fallback (00 -> 100)
    if (
      (tensSides === 100 && onesSides === 10) ||
      (tensSides === 10 && onesSides === 10)
    ) {
      return DiceRoller.computePercentileValue(tensRoll, onesRoll);
    }
    // Custom percentiles (e.g., 2d6 -> 11-66, 2d8 -> 11-88)
    return tensRoll * 10 + onesRoll;
  }
}

export default DiceRoller;

// Dev-only: expose DiceRoller on window for inspection in the console.
if (typeof window !== "undefined") {
  (window as any).DiceRoller = DiceRoller;
}

