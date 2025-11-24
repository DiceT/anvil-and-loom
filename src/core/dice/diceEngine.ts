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

import type { ResultCard } from "../results/resultModel";
import { convertDiceToCard } from "../results/converters";
import DiceExpression from "../../lib/dice/DiceExpression";
import { diceBoxValueProvider } from "../../lib/dice/diceBoxProvider";
import { DiceRoller } from "../../lib/dice/DiceRoller";

/**
 * Generate a unique ID for dice rolls.
 */
function createId(): string {
  return Math.random().toString(36).substring(2, 15);
}

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
      // Use 3D DiceBox system for 4d6 roll
      const rolls = await rollDiceBoxValues(4, 6);
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
      // Use 3D DiceBox system for percentile roll (single d100)
      const rolls = await rollDiceBoxValues(1, 100);
      const value = rolls[0] ?? Math.floor(Math.random() * 100) + 1;

      return {
        id: createId(),
        kind: "percentile",
        label: "d100",
        value,
        detail: `Rolled d100 -> ${value}`,
      };
    }

    case "challenge": {
      // Use 3D DiceBox system for challenge roll (1d6 + 2d10)
      const results = await rollDiceBoxComposite([
        { count: 1, sides: 6 },   // Action die
        { count: 2, sides: 10 }   // Challenge dice
      ]);

      // Defensive: ensure we got valid results, fall back to RNG if not
      const actionDie = (Array.isArray(results[0]) && results[0].length > 0)
        ? results[0][0]
        : Math.floor(Math.random() * 6) + 1;
      const challengeDice = (Array.isArray(results[1]) && results[1].length >= 2)
        ? results[1]
        : [
          Math.floor(Math.random() * 10) + 1,
          Math.floor(Math.random() * 10) + 1
        ];
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
          ? `Action: ${actionDie}${baseModifier ? ` + ${baseModifier}` : ""}${userModifier ? ` + ${userModifier}` : ""
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

  }
  throw new Error(`Unsupported roll type: ${type}`);
}

/**
 * Roll a single die with options.
 */
async function rollSingleDie(
  sides: number,
  label: string,
  options: RollOptions
): Promise<DiceEngineResult> {
  const { mode = "normal", modifier = 0 } = options;

  // Use 3D DiceBox system
  let rolls: number[];

  if (mode === "advantage" || mode === "disadvantage") {
    // Roll 2 dice for advantage/disadvantage
    rolls = await rollDiceBoxValues(2, sides);
  } else {
    // Normal roll
    rolls = await rollDiceBoxValues(1, sides);
  }

  // Fallback if 3D roll fails (shouldn't happen with proper setup)
  if (rolls.length === 0) {
    rolls = [Math.floor(Math.random() * sides) + 1];
    if (mode !== "normal") {
      rolls.push(Math.floor(Math.random() * sides) + 1);
    }
  }

  let value: number;
  let detail: string;

  if (mode === "advantage") {
    const [r1, r2] = rolls;
    const kept = Math.max(r1, r2);
    value = kept + modifier;
    detail = `Rolled 2${label} (Advantage) -> [${r1}, ${r2}] -> kept ${kept}${modifier ? ` + ${modifier}` : ""} = ${value}`;
  } else if (mode === "disadvantage") {
    const [r1, r2] = rolls;
    const kept = Math.min(r1, r2);
    value = kept + modifier;
    detail = `Rolled 2${label} (Disadvantage) -> [${r1}, ${r2}] -> kept ${kept}${modifier ? ` + ${modifier}` : ""} = ${value}`;
  } else {
    const r1 = rolls[0];
    value = r1 + modifier;
    detail = `Rolled ${label} -> ${r1}${modifier ? ` + ${modifier}` : ""} = ${value}`;
  }

  return {
    id: createId(),
    kind: "number",
    label,
    value,
    detail,
    meta: {
      sides,
      rolls,
      mode,
      modifier,
    },
  };
}

// ============================================================================
// Event System for Result Cards
// ============================================================================

type ResultCardListener = (card: ResultCard) => void;
const listeners: Set<ResultCardListener> = new Set();

/**
 * Subscribe to receive ResultCards whenever a dice roll completes.
 * @param listener Function to call with the new ResultCard
 * @returns Unsubscribe function
 */
export function subscribeToResultCards(listener: ResultCardListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Emit a ResultCard to all subscribers.
 * @param card The ResultCard to emit
 */
export function emitResultCard(card: ResultCard): void {
  listeners.forEach((listener) => {
    try {
      listener(card);
    } catch (error) {
      console.error("Error in result card listener:", error);
    }
  });
}

/**
 * Unified entry point for rolling dice expressions.
 * Parses the expression, rolls the dice (with 3D animation), converts the result
 * to a ResultCard, and emits it to all subscribers.
 * 
 * This is a "fire-and-forget" operation from the caller's perspective.
 * 
 * @param notation The dice notation string (e.g., "1d20+5", "2d6")
 */
export async function rollExpression(notation: string): Promise<void> {
  try {
    // 1. Parse expression
    const expression = DiceExpression.parse(notation);

    // 2. Roll using the DiceRoller with 3D DiceBox integration
    const result = await DiceRoller.rollWithProvider(expression, diceBoxValueProvider);

    // 3. Convert to ResultCard
    const card = convertDiceToCard(result);

    // 4. Emit to subscribers
    if (card) {
      emitResultCard(card);
    }
  } catch (error) {
    console.error("Error in rollExpression:", error);
    // We could emit an error card here if we wanted, but for now just log it
  }
}

/**
 * Roll a d100 for an oracle table.
 * Returns the numeric result directly for use in table lookups.
 * Does NOT emit a ResultCard event automatically (the caller handles that).
 */
export async function rollOracleD100(metadata?: any): Promise<number> {
  const expression = DiceExpression.parse("d100");
  const result = await DiceRoller.rollWithProvider(expression, diceBoxValueProvider);
  return result.total;
}


