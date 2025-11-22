/**
 * Dice Engine - Centralized dice rolling for Anvil & Loom.
 *
 * This module provides the single source of truth for all dice rolling in the app:
 * - Single dice rolls (d4, d6, d8, d10, d12, d20)
 * - Percentile rolls (d100 for oracle tables)
 * - Challenge dice (Ironsworn-style 1d6 + 2d10 mechanic)
 * - Multi-dice rolls (4d6, custom combinations)
 * - Advantage/Disadvantage modifiers
 *
 * Components should use this module instead of Math.random() directly to ensure
 * consistent randomness behavior across the app.
 */

// Re-export dice appearance functions from the shared appearance module
export {
  setDiceFadeDuration,
  setDiceThemeName,
  setDiceThemeColor,
  setDiceTensThemeColor,
  setDiceTexture,
  setDiceScale,
  getDiceAppearance,
} from './diceAppearance';

/**
 * Standard polyhedral die types.
 */
export type SingleDieType =
  | "d4"
  | "d6"
  | "d8"
  | "d10"
  | "d12"
  | "d20";

/**
 * Logical roll types including composite rolls.
 */
export type LogicalRollType =
  | SingleDieType
  | "four_d6"
  | "percentile"
  | "challenge";

/**
 * Result kind indicating the type of roll performed.
 */
export type DiceEngineResultKind = "number" | "percentile" | "challenge";

/**
 * Advantage/Disadvantage mode for d20 rolls.
 */
export type RollAdvantageMode = "normal" | "advantage" | "disadvantage";

/**
 * Options for modifying dice rolls.
 */
export interface RollOptions {
  /** Roll mode: normal, advantage (roll 2 keep highest), or disadvantage (roll 2 keep lowest) */
  mode?: RollAdvantageMode;
  /** Numeric modifier to add to the result */
  modifier?: number;
}

/**
 * Result of a dice roll with metadata.
 */
export interface DiceEngineResult {
  /** Unique identifier for this roll */
  id: string;
  /** Type of roll performed */
  kind: DiceEngineResultKind;
  /** Human-readable label (e.g., "1d20", "d100") */
  label: string;
  /** Final numeric result (may be undefined for invalid rolls) */
  value?: number;
  /** Detailed explanation of the roll (e.g., "Rolled 2d20 [12, 18] -> highest 18") */
  detail?: string;
  /** Additional metadata (raw rolls, challenge outcome, etc.) */
  meta?: any;
}

/**
 * Simulate dice rolls using Math.random().
 *
 * This is the core RNG function used by all dice rolls in the app.
 * It returns an array of random values, each in the range [1, sides].
 *
 * @param count - Number of dice to roll
 * @param sides - Number of sides on each die
 * @returns Array of roll results
 */
function simulateDice(count: number, sides: number): number[] {
  if (count <= 0 || sides <= 0) return [];
  const rolls: number[] = [];
  for (let i = 0; i < count; i++) {
    const value = Math.floor(Math.random() * sides) + 1;
    rolls.push(Math.max(1, Math.min(sides, value)));
  }
  return rolls;
}

const SINGLE_DIE_CONFIG: Record<SingleDieType, { sides: number; label: string }> = {
  d4: { sides: 4, label: "1d4" },
  d6: { sides: 6, label: "1d6" },
  d8: { sides: 8, label: "1d8" },
  d10: { sides: 10, label: "1d10" },
  d12: { sides: 12, label: "1d12" },
  d20: { sides: 20, label: "1d20" },
};

/**
 * Roll multiple dice of the same type using the 3D DiceBox system.
 *
 * This delegates to lib/dice/diceBoxManager which handles:
 * - 3D dice animations and physics
 * - Audio effects
 * - Theme and appearance settings
 *
 * @param count - Number of dice to roll
 * @param sides - Number of sides on each die
 * @returns Promise resolving to array of roll results
 *
 * @example
 * ```ts
 * const rolls = await rollDiceBoxValues(2, 20); // Roll 2d20 with 3D animation
 * console.log(rolls); // [12, 18]
 * ```
 */
export async function rollDiceBoxValues(count: number, sides: number): Promise<number[]> {
  // Delegate to the DiceBox manager for 3D dice rolls
  const { rollDiceBoxValues: diceBoxRoll } = await import('../../lib/dice/diceBoxManager');
  return diceBoxRoll(count, sides);
}

/**
 * Roll multiple groups of dice (composite roll) using the 3D DiceBox system.
 *
 * Each request is a separate dice pool (count × sides).
 *
 * @param requests - Array of dice specs to roll
 * @returns Promise resolving to array of result arrays (one per request)
 *
 * @example
 * ```ts
 * const results = await rollDiceBoxComposite([
 *   { count: 2, sides: 6 },
 *   { count: 1, sides: 20 }
 * ]);
 * console.log(results); // [[3, 5], [12]]
 * ```
 */
export async function rollDiceBoxComposite(
  requests: Array<{ count: number; sides: number }>
): Promise<number[][]> {
  // Delegate to the DiceBox manager for 3D dice rolls
  const { rollDiceBoxComposite: diceBoxComposite } = await import('../../lib/dice/diceBoxManager');
  return diceBoxComposite(requests);
}

/**
 * Roll a custom list of dice with individual theme colors using the 3D DiceBox system.
 *
 * Used for complex rolls with per-die customization.
 *
 * @param dice - Array of die specifications
 * @returns Promise resolving to array of roll results
 *
 * @example
 * ```ts
 * const results = await rollDiceBoxList([
 *   { sides: 20, themeColor: "#ff0000" },
 *   { sides: 6, themeColor: "#00ff00" }
 * ]);
 * console.log(results); // [14, 3]
 * ```
 */
export async function rollDiceBoxList(
  dice: Array<{ sides: number; themeColor?: string }>
): Promise<number[]> {
  // Delegate to the DiceBox manager for 3D dice rolls
  const { rollDiceBoxList: diceBoxList } = await import('../../lib/dice/diceBoxManager');
  return diceBoxList(dice);
}

/**
 * Roll dice of a given type with optional modifiers.
 *
 * This is the main entry point for dice rolling in the app.
 * Supports single dice, percentile, challenge, and multi-dice rolls.
 *
 * @param type - Type of roll to perform
 * @param options - Roll options (advantage, modifiers, etc.)
 * @returns Promise resolving to a dice result with metadata
 *
 * @example
 * ```ts
 * // Simple d20 roll
 * const result = await rollDice("d20");
 * console.log(result.value); // 14
 *
 * // d20 with advantage
 * const adv = await rollDice("d20", { mode: "advantage" });
 * console.log(adv.value); // 18 (rolled [12, 18], kept highest)
 *
 * // Percentile roll for oracle tables
 * const d100 = await rollDice("percentile");
 * console.log(d100.value); // 67
 *
 * // Challenge roll (Ironsworn)
 * const challenge = await rollDice("challenge", { modifier: 2 });
 * console.log(challenge.meta.outcome); // "Strong Hit"
 * ```
 */
export async function rollDice(
  type: LogicalRollType,
  options: RollOptions = {}
): Promise<DiceEngineResult> {
  if (type in SINGLE_DIE_CONFIG) {
    const config = SINGLE_DIE_CONFIG[type as SingleDieType];
    return rollSingleDie(config.sides, config.label, options);
  }

  switch (type) {
    case "four_d6": {
      const rolls = simulateDice(4, 6);
      const total = rolls.reduce((sum, v) => sum + v, 0);

      return {
        id: createId(),
        kind: "number",
        label: "4d6",
        value: rolls.length ? total : undefined,
        detail: rolls.length
          ? `Rolled 4d6 -> [${rolls.join(", ")}], total = ${total}`
          : "Rolled 4d6 (could not read values)",
      };
    }

    case "percentile": {
      const tensValue = simulateDice(1, 100)[0];
      const onesValue = simulateDice(1, 10)[0];

      const tensIndex = normalizeTensIndex(tensValue);
      const onesIndex = normalizeOnesIndex(onesValue);

      let total = tensIndex * 10 + onesIndex;
      if (total === 0) total = 100;

      const d100Face = tensIndex === 0 ? "00" : String(tensIndex * 10);
      const d10Face = String(onesIndex);

      return {
        id: createId(),
        kind: "percentile",
        label: "d100",
        value: total,
        detail: `d100=${d100Face}, d10=${d10Face} -> ${total}`,
      };
    }

    case "challenge": {
      const actionDie = simulateDice(1, 6)[0];
      const challengeDice = simulateDice(2, 10);
      const baseModifier = 0;
      const userModifier = options.modifier ?? 0;

      let actionScore: number | undefined;
      let quality: "Strong Hit" | "Weak Hit" | "Miss" | null = null;
      let boon = false;
      let complication = false;

      if (typeof actionDie === "number" && challengeDice.length >= 2) {
        const [c1, c2] = challengeDice;
        actionScore = actionDie + baseModifier + userModifier;

        const beats1 = actionScore > c1;
        const beats2 = actionScore > c2;

        if (beats1 && beats2) quality = "Strong Hit";
        else if (beats1 || beats2) quality = "Weak Hit";
        else quality = "Miss";

        const doubles = c1 === c2;
        if (doubles && quality === "Strong Hit") {
          boon = true;
        } else if (doubles && quality === "Miss") {
          complication = true;
        }
      }

      const detail =
        typeof actionDie === "number" && challengeDice.length >= 2 && quality
          ? `Action: ${actionDie}${baseModifier ? ` + ${baseModifier}` : ""}${
              userModifier ? ` + ${userModifier}` : ""
            } = ${actionScore}; Challenge: [${challengeDice.join(", ")}]`
          : "Challenge roll (invalid)";

      return {
        id: createId(),
        kind: "challenge",
        label: "Challenge (1d6+2d10, +2)",
        value: actionScore,
        detail,
        meta: {
          type: "challenge",
          actionDie,
          baseModifier,
          userModifier,
          actionScore,
          challengeDice,
          outcome: quality,
          boon,
          complication,
        },
      };
    }

    default:
      throw new Error(`Unsupported roll type: ${type}`);
  }
}

/**
 * Roll a single die with optional advantage/disadvantage and modifiers.
 *
 * @param sides - Number of sides on the die
 * @param baseLabel - Label for the die (e.g., "1d20")
 * @param options - Roll options
 * @returns Promise resolving to a dice result
 */
async function rollSingleDie(
  sides: number,
  baseLabel: string,
  options: RollOptions
): Promise<DiceEngineResult> {
  const mode: RollAdvantageMode = options.mode ?? "normal";
  const modifier = options.modifier ?? 0;
  const diceCount = mode === "normal" ? 1 : 2;
  const rolls = simulateDice(diceCount, sides);

  const chosen =
    mode === "advantage"
      ? Math.max(...rolls)
      : mode === "disadvantage"
      ? Math.min(...rolls)
      : rolls[0];

  const label =
    mode === "normal"
      ? baseLabel
      : `${baseLabel} (${mode === "advantage" ? "Advantage" : "Disadvantage"})`;

  const detail =
    mode === "normal"
      ? rolls.length
        ? `Rolled ${baseLabel} -> ${chosen}`
        : `Rolled ${baseLabel} (could not read value)`
      : rolls.length >= 2
      ? `Rolled 2d${sides} [${rolls.slice(0, 2).join(", ")}] -> ${
          mode === "advantage" ? "highest" : "lowest"
        } ${chosen}`
      : `Rolled 2d${sides} (could not read values)`;

  const finalValue =
    typeof chosen === "number" && !Number.isNaN(chosen)
      ? chosen + modifier
      : chosen;

  const detailWithModifier =
    modifier && typeof chosen === "number"
      ? `${detail}; modifier ${modifier >= 0 ? "+" : "-"} ${Math.abs(
          modifier
        )} = ${finalValue}`
      : detail;

  return {
    id: createId(),
    kind: "number",
    label,
    value: finalValue,
    detail: detailWithModifier,
    meta: {
      type: "single",
      mode,
      rolls: rolls.slice(0, diceCount),
      chosen,
      sides,
      modifier,
    },
  };
}

/**
 * Normalize tens die value for percentile rolls.
 *
 * Maps raw d100 roll to tens digit (0-9).
 */
function normalizeTensIndex(value: number | undefined): number {
  if (value == null || Number.isNaN(value)) return 0;
  if (value === 0 || value === 100) return 0;
  if (value % 10 === 0 && value >= 10 && value <= 90) {
    return value / 10;
  }
  if (value >= 1 && value <= 9) {
    return value;
  }
  return Math.max(0, Math.min(9, Math.floor(value / 10)));
}

/**
 * Normalize ones die value for percentile rolls.
 *
 * Maps raw d10 roll to ones digit (0-9).
 */
function normalizeOnesIndex(value: number | undefined): number {
  if (value == null || Number.isNaN(value)) return 0;
  if (value === 10 || value === 0) return 0;
  if (value >= 1 && value <= 9) {
    return value;
  }
  const digit = Math.floor(value) % 10;
  return digit < 0 ? digit + 10 : digit;
}

/**
 * Create a unique ID for a dice roll.
 */
function createId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * Context for oracle table rolls.
 */
export interface OracleRollContext {
  /** Unique table identifier */
  tableId: string;
  /** Human-readable table name */
  tableName: string;
  /** Optional source file path */
  sourcePath?: string;
}

/**
 * Roll a d100 for oracle table lookups.
 *
 * This is the primary function used by TablesPane to generate random table results.
 * It uses the centralized dice engine's percentile roll with fallback to Math.random().
 *
 * @param ctx - Oracle roll context (table info)
 * @returns Promise resolving to a number between 1-100
 *
 * @example
 * ```ts
 * const roll = await rollOracleD100({
 *   tableId: "npc-reaction",
 *   tableName: "NPC Reaction",
 *   sourcePath: "/tables/npc.json"
 * });
 * console.log(roll); // 67
 * ```
 */
export async function rollOracleD100(ctx: OracleRollContext): Promise<number> {
  try {
    const res = await rollDice("percentile");
    if (res && typeof res.value === "number") return Math.max(1, Math.min(100, Math.floor(res.value)));
  } catch (e) {
    console.warn("rollOracleD100 failed, falling back to RNG", e);
  }
  // Fallback to Math.random()
  return Math.floor(Math.random() * 100) + 1;
}
