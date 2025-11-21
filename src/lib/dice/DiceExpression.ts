/**
 * A structured representation of a dice expression (e.g. "4d6dl1 + 2").
 * This is the first building block of the new dice system – every tool
 * should parse user notation into one of these objects before executing a roll.
 */

export type DiceArithmeticOperator = "+" | "-";

/**
 * Supported keep/drop modifiers.
 *
 * The parser only supports a single keep OR drop modifier per term today,
 * but the shape leaves room for expansion (exploding dice, rerolls, etc.).
 */
export type DiceSelectionMode = "keep-highest" | "keep-lowest" | "drop-highest" | "drop-lowest";

export interface DiceSelectionModifier {
  mode: DiceSelectionMode;
  count: number;
}

export type DicePoolComparator = ">=" | "<=" | ">" | "<" | "=";

export interface DicePoolRules {
  /**
   * comparator + threshold define when an individual die counts as a success.
   * Example: comparator >=, threshold 6 → every roll of 6+ counts as one success.
   */
  successComparator: DicePoolComparator;
  successThreshold: number;
  /**
   * Optional target number of successes required (allows the Roller to determine
   * success/failure without additional input).
   */
  targetSuccesses?: number;
}

export interface DiceExplodeRule {
  /**
   * Threshold at which a die explodes (rolls an additional die).
   * Default comparator is >= threshold.
   */
  threshold: number;
}

export interface DiceDegradeRule {
  /**
   * Comparator used to determine when the die should degrade.
   * Example: <= 2 means if any die rolls 1-2, the die should step down next time.
   */
  comparator: DicePoolComparator;
  threshold: number;
  /**
   * How many "steps" to degrade when triggered. The meaning of a single step
   * (e.g., d12→d10) is handled by the system that owns the resource die.
   * Defaults to 1 when omitted.
   */
  stepAmount?: number;
}

export interface DiceTerm {
  type: "dice";
  /** Number of dice to roll (default 1 if omitted in the string). */
  count: number;
  /** Number of sides per die. */
  sides: number;
  /** Optional percentile definition (e.g., d%66 -> tens/ones sides of 6). */
  percentile?: {
    tensSides: number;
    onesSides: number;
    raw: string;
  };
  /** Optional keep/drop modifier. */
  selection?: DiceSelectionModifier;
  /** Optional pool-specific rules (success thresholds, targets). */
  pool?: DicePoolRules;
  /** Optional explode rule (e.g., roll again on 6+). */
  explode?: DiceExplodeRule;
  /** Optional degrade rule (e.g., step die down when rolling <= threshold). */
  degrade?: DiceDegradeRule;
  /** `+` or `-` – determines whether this dice pool adds or subtracts from the roll. */
  operator: DiceArithmeticOperator;
  /**
   * Original snippet of the notation that produced this term.
   * Useful for error messages or debugging.
   */
  source: string;
}

export interface ConstantTerm {
  type: "constant";
  value: number;
  operator: DiceArithmeticOperator;
  source: string;
}

export type DiceExpressionTerm = DiceTerm | ConstantTerm | ChallengeTerm;

export interface DiceExpressionParseOptions {
  /**
   * When true, throws if unknown fragments are found.
   * Otherwise they will be ignored (but reported under `warnings`).
   */
  strict?: boolean;
}

export interface DiceExpressionWarning {
  fragment: string;
  reason: string;
}

export interface ChallengeConfig {
  actionSides: number;
  actionModifier: number;
  challengeSides: number;
  challengeCount: number;
  challengeModifier: number;
}

export interface ChallengeTerm {
  type: "challenge";
  operator: DiceArithmeticOperator;
  config: ChallengeConfig;
  source: string;
}

/**
 * DiceExpression is an immutable container for parsed notation.
 * It stores the list of arithmetic terms (dice pools and constants)
 * and records any warnings produced during parsing.
 */
export class DiceExpression {
  readonly original: string;
  readonly terms: DiceExpressionTerm[];
  readonly warnings: DiceExpressionWarning[];

  private constructor(
    original: string,
    terms: DiceExpressionTerm[],
    warnings: DiceExpressionWarning[]
  ) {
    this.original = original;
    this.terms = terms;
    this.warnings = warnings;
    Object.freeze(this.terms);
    Object.freeze(this.warnings);
    Object.freeze(this);
  }

  /**
   * Main entrypoint: parse a notation string into a DiceExpression.
   */
  static parse(notation: string, options: DiceExpressionParseOptions = {}): DiceExpression {
    const safeNotation = typeof notation === "string" ? notation : String(notation ?? "");
    const trimmed = safeNotation.trim();
    if (!trimmed) {
      return new DiceExpression("", [], []);
    }

    // Split by +/-, preserving the operator with each fragment.
    const fragments = DiceExpression.tokenize(trimmed);
    const terms: DiceExpressionTerm[] = [];
    const warnings: DiceExpressionWarning[] = [];

    for (const fragment of fragments) {
      const parsed =
        DiceExpression.tryParseChallenge(fragment) ??
        DiceExpression.tryParseDice(fragment) ??
        DiceExpression.tryParseConstant(fragment);

      if (parsed) {
        terms.push(parsed);
        continue;
      }

      const warning: DiceExpressionWarning = {
        fragment,
        reason: "Unrecognized dice/number fragment",
      };
      warnings.push(warning);

      if (options.strict) {
        throw new Error(
          `DiceExpression.parse failed: ${warning.reason} ("${fragment}") in "${notation}"`
        );
      }
    }

    return new DiceExpression(notation, terms, warnings);
  }

  /**
   * Convenience helper for UI components that need a human readable summary.
   */
  describe(): string {
    if (!this.terms.length) return "(no dice)";
    return this.terms
      .map((term) => {
        const prefix = term.operator === "+" ? "" : "-";
        if (term.type === "constant") {
          return `${prefix}${Math.abs(term.value)}`;
        }
        if (term.type === "challenge") {
          const { config } = term;
          const actionPart =
            config.actionModifier !== 0
              ? `d${config.actionSides}${config.actionModifier >= 0 ? "+" : ""}${config.actionModifier}`
              : `d${config.actionSides}`;
          const challengePart =
            config.challengeModifier !== 0
              ? `${config.challengeCount}d${config.challengeSides}${config.challengeModifier >= 0 ? "+" : ""}${config.challengeModifier}`
              : `${config.challengeCount}d${config.challengeSides}`;
          return `${prefix}challenge(${actionPart} vs ${challengePart})`;
        }
        const base =
          term.percentile
            ? `${prefix}${term.count === 1 ? "" : term.count}d%${term.percentile.raw}`
            : term.count === 1
              ? `${prefix}d${term.sides}`
              : `${prefix}${term.count}d${term.sides}`;
        let suffix = "";
        if (term.selection) {
          const { mode, count } = term.selection;
          const suffixMap: Record<DiceSelectionMode, string> = {
            "keep-highest": `kh${count}`,
            "keep-lowest": `kl${count}`,
            "drop-highest": `dh${count}`,
            "drop-lowest": `dl${count}`,
          };
          suffix += suffixMap[mode];
        }
        if (term.pool) {
          const pool = term.pool;
          suffix += `${pool.successComparator}${pool.successThreshold}`;
          if (typeof pool.targetSuccesses === "number") {
            suffix += `#${pool.targetSuccesses}`;
          }
        }
        if (term.explode) {
          const explodeSuffix =
            term.explode.threshold && term.explode.threshold !== term.sides
              ? `!${term.explode.threshold}`
              : "!";
          suffix += explodeSuffix;
        }
        if (term.degrade) {
          const { comparator, threshold, stepAmount } = term.degrade;
          suffix += `!${comparator}${threshold}`;
          if (typeof stepAmount === "number") {
            suffix += `:${stepAmount}`;
          }
        }
        if (!suffix) return base;
        return `${base}${suffix}`;
      })
      .join(" + ")
      .replace(/\+\s-\s/g, "- ");
  }

  /**
   * Split a notation into operator-preserving fragments.
   * Example: "4d6dl1 + 2 - d4" -> ["+4d6dl1", "+2", "-d4"]
   */
  private static tokenize(notation: string): string[] {
    const normalized = (typeof notation === "string" ? notation : String(notation ?? "")).replace(/\s+/g, "");
    const fragments: string[] = [];
    let current = "";
    let depth = 0;
    for (let i = 0; i < normalized.length; i++) {
      const char = normalized[i];
      if (char === "(") {
        depth += 1;
        current += char;
        continue;
      }
      if (char === ")") {
        depth = Math.max(0, depth - 1);
        current += char;
        continue;
      }
      if ((char === "+" || char === "-") && current.length > 0 && depth === 0) {
        fragments.push(current);
        current = char;
      } else {
        current += char;
      }
    }
    if (current.length > 0) fragments.push(current);
    // Ensure each fragment has an explicit operator for downstream parsing.
    return fragments.map((frag) => {
      if (frag.startsWith("+") || frag.startsWith("-")) return frag;
      return `+${frag}`;
    });
  }

  private static tryParseConstant(fragment: string): ConstantTerm | null {
    const operator = fragment.startsWith("-") ? "-" : "+";
    const numericPortion = fragment.slice(1);
    const value = Number.parseInt(numericPortion, 10);
    if (Number.isNaN(value)) return null;
    return {
      type: "constant",
      value,
      operator,
      source: fragment,
    };
  }

  private static tryParseChallenge(fragment: string): ChallengeTerm | null {
    const operator: DiceArithmeticOperator = fragment.startsWith("-") ? "-" : "+";
    const body = fragment.slice(1);
    const match = body.match(/^challenge(?:\((.*)\))?$/i);
    if (!match) return null;

    let actionSides = 6;
    let actionModifier = 0;
    let challengeSides = 10;
    let challengeCount = 2;
    let challengeModifier = 0;

    const configText = match[1];
    const safeConfig = typeof configText === "string" ? configText : "";
    if (safeConfig.trim().length) {
      const parts = (safeConfig ?? "")
        .replace(/\s+/g, "")
        .split(/vs/i)
        .map((part) => (typeof part === "string" ? part.trim() : ""));
      const actionPartRaw = parts[0] ?? "";
      const challengePartRaw = parts[1] ?? "";
      if (actionPartRaw) {
        const parsed = DiceExpression.parseSingleDie(actionPartRaw);
        if (parsed) {
          actionSides = parsed.sides;
          actionModifier = parsed.modifier;
        }
      }
      if (challengePartRaw) {
        const parsed = DiceExpression.parseDiceWithCount(challengePartRaw);
        if (parsed) {
          challengeCount = parsed.count;
          challengeSides = parsed.sides;
          challengeModifier = parsed.modifier;
        }
      }
    } else if (configText && typeof configText !== "string") {
      return null;
    }

    return {
      type: "challenge",
      operator,
      config: {
        actionSides,
        actionModifier,
        challengeSides,
        challengeCount,
        challengeModifier,
      },
      source: fragment,
    };
  }

  private static tryParseDice(fragment: string): DiceTerm | null {
    const operator: DiceArithmeticOperator = fragment.startsWith("-") ? "-" : "+";
    const body = fragment.slice(1);
    // Percentile shorthand: d%66, d%88, d%100 (also allow dp66 to avoid any % parsing issues).
    const percentMatch = body.match(/^(\d*)d[%pP](\d+)(.*)$/i);
    if (percentMatch) {
      const [, countStr, percentRaw, modifierPart] = percentMatch;
      const count = countStr ? Number.parseInt(countStr, 10) : 1;
      if (!count) return null;

      const selectionResult = DiceExpression.parseSelectionModifier(modifierPart);
      const selection = selectionResult.selection ?? undefined;
      const poolResult = DiceExpression.parsePoolModifier(selectionResult.rest);
      const pool = poolResult.pool ?? undefined;
      const explodeResult = DiceExpression.parseExplodeModifier(
        poolResult.rest,
        10
      );
      const explode = explodeResult.explode ?? undefined;
      const degradeResult = DiceExpression.parseDegradeModifier(explodeResult.rest);
      const degrade = degradeResult.degrade ?? undefined;

      const trailing = degradeResult.rest?.trim();
      if (trailing) {
        return null;
      }

      // Standard percentile: treat as a d100 term (roller rolls d100 + d10).
      if (percentRaw === "100") {
        return {
          type: "dice",
          count,
          sides: 100,
          selection,
          pool,
          explode,
          degrade,
          operator,
          source: fragment,
        };
      }

      // Custom percentiles use two dice (e.g., d%66 -> 2d6).
      let tensSides: number;
      let onesSides: number;
      if (percentRaw.length === 2) {
        tensSides = Number.parseInt(percentRaw[0], 10);
        onesSides = Number.parseInt(percentRaw[1], 10);
      } else {
        const parsed = Number.parseInt(percentRaw, 10);
        if (!parsed) return null;
        tensSides = parsed;
        onesSides = parsed;
      }

      const effectiveSides = tensSides * 10 + onesSides;

      return {
        type: "dice",
        count,
        sides: effectiveSides,
        percentile: {
          tensSides,
          onesSides,
          raw: percentRaw,
        },
        selection,
        pool,
        explode,
        degrade,
        operator,
        source: fragment,
      };
    }

    const diceMatch = body.match(/^(\d*)d(\d+)(.*)$/i);
    if (!diceMatch) return null;

    const [, countStr, sidesStr, modifierPart] = diceMatch;
    const count = countStr ? Number.parseInt(countStr, 10) : 1;
    const sides = Number.parseInt(sidesStr, 10);
    if (!count || !sides) return null;

    const selectionResult = DiceExpression.parseSelectionModifier(modifierPart);
    const selection = selectionResult.selection ?? undefined;
    const poolResult = DiceExpression.parsePoolModifier(selectionResult.rest);
    const pool = poolResult.pool ?? undefined;
    const explodeResult = DiceExpression.parseExplodeModifier(
      poolResult.rest,
      sides
    );
    const explode = explodeResult.explode ?? undefined;
    const degradeResult = DiceExpression.parseDegradeModifier(explodeResult.rest);
    const degrade = degradeResult.degrade ?? undefined;

    const trailing = degradeResult.rest?.trim();
    if (trailing) {
      // Trailing unknown tokens invalidate this fragment so the caller can warn in strict mode.
      return null;
    }

    return {
      type: "dice",
      count,
      sides,
      selection,
      pool,
      explode,
      degrade,
      operator,
      source: fragment,
    };
  }

  private static parseSingleDie(
    part: string
  ): { sides: number; modifier: number } | null {
    const match = part.match(/^d(\d+)([+-]\d+)?$/i);
    if (!match) return null;
    const sides = Number.parseInt(match[1], 10);
    if (!sides) return null;
    const modifier = match[2] ? Number.parseInt(match[2], 10) : 0;
    return { sides, modifier };
  }

  private static parseDiceWithCount(
    part: string
  ): { count: number; sides: number; modifier: number } | null {
    const match = part.match(/^(\d*)d(\d+)([+-]\d+)?$/i);
    if (!match) return null;
    const count = match[1] ? Number.parseInt(match[1], 10) : 1;
    const sides = Number.parseInt(match[2], 10);
    if (!count || !sides) return null;
    const modifier = match[3] ? Number.parseInt(match[3], 10) : 0;
    return { count, sides, modifier };
  }

  private static parseSelectionModifier(
    part: string | undefined | null
  ): { selection: DiceSelectionModifier | null; rest: string } {
    if (!part) return { selection: null, rest: "" };
    const match = part.match(/^(kh|kl|dh|dl)(\d+)(.*)$/i);
    if (!match) return { selection: null, rest: part };
    const [, tag, countStr] = match;
    const count = Number.parseInt(countStr, 10);
    if (!count) return { selection: null, rest: part };

    const modeMap: Record<string, DiceSelectionMode> = {
      kh: "keep-highest",
      kl: "keep-lowest",
      dh: "drop-highest",
      dl: "drop-lowest",
    };
    const mode = modeMap[tag.toLowerCase()];
    if (!mode) return { selection: null, rest: part };

    return { selection: { mode, count }, rest: match[3] ?? "" };
  }

  private static parsePoolModifier(
    part: string | undefined | null
  ): { pool: DicePoolRules | null; rest: string } {
    if (!part) return { pool: null, rest: "" };
    const successMatch = part.match(/^(>=|<=|>|<|=)(\d+)(.*)$/);
    if (!successMatch) return { pool: null, rest: part };
    const [, comparator, thresholdStr, remainder] = successMatch;
    const threshold = Number.parseInt(thresholdStr, 10);
    if (!threshold) return { pool: null, rest: part };

    let rest = remainder ?? "";
    let targetSuccesses: number | undefined;
    const targetMatch = rest.match(/^#(\d+)(.*)$/);
    if (targetMatch) {
      targetSuccesses = Number.parseInt(targetMatch[1], 10);
      rest = targetMatch[2] ?? "";
    }

    return {
      pool: {
        successComparator: comparator as DicePoolComparator,
        successThreshold: threshold,
        targetSuccesses,
      },
      rest,
    };
  }

  private static parseDegradeModifier(
    part: string | undefined | null
  ): { degrade: DiceDegradeRule | null; rest: string } {
    if (!part) return { degrade: null, rest: "" };
    const match = part.match(/^!(>=|<=|>|<|=)(\d+)(?::(\d+))?(.*)$/);
    if (!match) return { degrade: null, rest: part };
    const [, comparator, thresholdStr, stepStr, remainder] = match;
    const threshold = Number.parseInt(thresholdStr, 10);
    if (!threshold) return { degrade: null, rest: part };
    const stepAmount = stepStr ? Number.parseInt(stepStr, 10) || undefined : undefined;
    return {
      degrade: {
        comparator: comparator as DicePoolComparator,
        threshold,
        stepAmount,
      },
      rest: remainder ?? "",
    };
  }

  private static parseExplodeModifier(
    part: string | undefined | null,
    defaultThreshold: number
  ): { explode: DiceExplodeRule | null; rest: string } {
    if (!part) return { explode: null, rest: "" };
    if (!part.startsWith("!")) return { explode: null, rest: part };
    const second = part[1];
    if (second === ">" || second === "<" || second === "=") {
      return { explode: null, rest: part };
    }
    const match = part.match(/^!(\d+)?(.*)$/);
    if (!match) return { explode: null, rest: part };
    const [, thresholdStr, remainder] = match;
    const threshold = thresholdStr
      ? Number.parseInt(thresholdStr, 10)
      : defaultThreshold || 0;
    if (!threshold) return { explode: null, rest: part };
    return {
      explode: { threshold },
      rest: remainder ?? "",
    };
  }
}

export default DiceExpression;
