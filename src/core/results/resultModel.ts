/**
 * Unified Result Card Model for Anvil & Loom
 *
 * Result Cards are the single, unified event log for everything that happens in play:
 * - Dice rolls
 * - Table/oracle results
 * - AI interpretations
 * - System events
 *
 * Each card captures:
 * - Snapshot (result): The outcome the player cares about
 * - Meta (content): How we got there
 *
 * Cards appear in two places:
 * - Results Pane: Quick review (interactive widget)
 * - Active Entry: Long-term journaling (HTML/markdown)
 */

/**
 * Source of the result card.
 * Determines visual styling and filtering behavior.
 */
export type ResultSource =
  | "dice"        // All dice/challenge/pool rolls
  | "table"       // Aspects, Domains, standard oracle tables
  | "oracle"      // Action+Theme, Descriptor+Focus (visually distinct)
  | "interpretation" // AI interpretations of oracle results
  | "system"      // System messages, errors
  | "other";      // Fallback

/**
 * Unified Result Card interface.
 *
 * Single flat structure that replaces the old discriminated union.
 * All card types use this same shape.
 */
export interface ResultCard {
  /** Unique identifier */
  id: string;

  /** ISO timestamp when card was created */
  timestamp: string;

  /** Header text (e.g., "Challenge Roll", "Aspect: Haunted: Atmosphere") */
  header: string;

  /** Snapshot - the final outcome/text the player acts on */
  result: string;

  /** Meta - expression, roll breakdown, raw oracle values, AI reasoning */
  content: string;

  /** Source of this result (determines styling) */
  source?: ResultSource;

  /**
   * Optional metadata for type-specific details.
   * Examples:
   * - resultColor: string (for challenge outcome colors)
   * - tableId: string (for table lookups)
   * - roll: number (d100 value for oracle tables)
   * - personaId: string (for AI interpretations)
   */
  meta?: Record<string, unknown>;
}

/**
 * Generate a unique ID for result cards.
 */
export function generateResultCardId(): string {
  return `card-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}
