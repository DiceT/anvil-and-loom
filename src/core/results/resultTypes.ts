/**
 * Unified Result Card Types for Anvil & Loom
 *
 * All result cards share a three-region conceptual structure:
 * 1. HEADER - Label, icon, high-level context
 * 2. CONTENT - Supporting details (roll breakdown, interpretation bullets, etc.)
 * 3. RESULT - Main outcome or line that matters most at a glance
 *
 * Different card kinds map their data into these regions while sharing
 * the same card chrome and behavior.
 */

import type { OraclePersonaId } from "../ai/oraclePersonas";

/**
 * All possible result card types in the app.
 */
export type ResultCardKind =
  | "dice"          // Generic dice roll
  | "challenge"     // Challenge roll (Ironsworn-style)
  | "table"         // Oracle table roll
  | "interpretation"; // AI oracle interpretation

/**
 * Base properties shared by all result cards.
 */
export interface BaseResultCard {
  /** Unique identifier for this card */
  id: string;
  /** Type of result card */
  kind: ResultCardKind;
  /** Timestamp when card was created */
  createdAt: number;
}

/**
 * Dice and Challenge roll result cards.
 *
 * Maps to three regions:
 * - HEADER: headerText (e.g., "CHALLENGE ROLL", "DICE ROLL")
 * - CONTENT: contentText (roll breakdown, dice values, modifiers)
 * - RESULT: resultText (final outcome like "Strong Hit" or total value)
 */
export interface DiceResultCard extends BaseResultCard {
  kind: "dice" | "challenge";
  /** Text shown in header strip */
  headerText: string;
  /** Optional icon name */
  headerIcon?: string;
  /** Brief description/roll formula/metadata shown in content area */
  contentText: string;
  /** Main outcome displayed in result area */
  resultText: string;
  /** Optional color for result text (e.g., outcome colors for challenge rolls) */
  resultColor?: string;
  /** Theme for header styling */
  theme?: "default" | "challenge" | "dice";
}

/**
 * Oracle table roll result cards.
 *
 * Maps to three regions:
 * - HEADER: headerText (e.g., "TABLE: BLIGHTED, OBJECTIVES")
 * - CONTENT: contentText (table name, roll number, source info)
 * - RESULT: resultText (the table row prompt/result)
 */
export interface TableResultCard extends BaseResultCard {
  kind: "table";
  /** Unique table identifier */
  tableId: string;
  /** Human-readable table name */
  tableName: string;
  /** The d100 roll value */
  roll: number;
  /** The table result prompt */
  resultText: string;
  /** Header text (e.g., "TABLE: DOMAIN, SUBTABLE") */
  headerText: string;
  /** Content text (e.g., "Roll 31 on TableName") */
  contentText: string;
  /** Theme for header styling */
  theme?: "table";
  /** Optional category/tags for the table */
  category?: string;
  /** Optional source file path */
  sourcePath?: string;
}

/**
 * AI Oracle interpretation result cards.
 *
 * Maps to three regions:
 * - HEADER: headerText (e.g., "INTERPRETATION: THE LOOMWRIGHT")
 * - CONTENT: interpretationText (full bullet-point reading)
 * - RESULT: snapshotText (one-line vivid snapshot)
 *
 * In Entry variant:
 * - Collapsed: Shows HEADER + RESULT (snapshot only)
 * - Expanded: Shows HEADER + CONTENT (interpretation bullets) + RESULT (snapshot)
 */
export interface InterpretationResultCard extends BaseResultCard {
  kind: "interpretation";
  /** Oracle persona name */
  oracleName: string;
  /** Oracle persona ID */
  personaId: OraclePersonaId;
  /** Header text (e.g., "INTERPRETATION: THE LOOMWRIGHT") */
  headerText: string;
  /** One-line vivid snapshot (main visible result) */
  snapshotText: string;
  /** Full interpretation with bullets (shown when expanded) */
  interpretationText: string;
  /** Theme for header styling */
  theme?: "interpretation" | "oracle";
}

/**
 * Union type for all result cards.
 */
export type ResultCardModel =
  | DiceResultCard
  | TableResultCard
  | InterpretationResultCard;

/**
 * Theme configuration for result card headers.
 */
export interface ResultCardTheme {
  /** Background color for header */
  headerBgColor: string;
  /** Font color for header text */
  headerFontColor: string;
}

/**
 * Predefined theme colors for different card types.
 */
export const RESULT_CARD_THEMES: Record<string, ResultCardTheme> = {
  dice: {
    headerBgColor: "#1e3a5f", // Midnight blue
    headerFontColor: "#ffffff",
  },
  challenge: {
    headerBgColor: "#1e3a5f", // Midnight blue (same as dice)
    headerFontColor: "#ffffff",
  },
  table: {
    headerBgColor: "#255f1e", // Orange
    headerFontColor: "#ffffff",
  },
  oracle: {
    headerBgColor: "#8b5cf6", // Purple
    headerFontColor: "#ffffff",
  },
  interpretation: {
    headerBgColor: "#5f1e56", // Purple/magenta
    headerFontColor: "#ffffff",
  },
};

/**
 * Get theme for a result card.
 */
export function getCardTheme(card: ResultCardModel): ResultCardTheme {
  switch (card.kind) {
    case "dice":
    case "challenge":
      return RESULT_CARD_THEMES.dice;
    case "table":
      return RESULT_CARD_THEMES.table;
    case "interpretation":
      return RESULT_CARD_THEMES.interpretation;
  }
}

/**
 * Generate a unique ID for result cards.
 */
export function generateResultCardId(): string {
  return `card-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}
