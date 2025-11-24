/**
 * Unified Result Card Types for Anvil & Loom
 */

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
    headerBgColor: "#8ed8df", // Light cyan
    headerFontColor: "#1e293b", // Dark font for contrast
  },
  interpretation: {
    headerBgColor: "#5f1e56", // Purple/magenta
    headerFontColor: "#ffffff",
  },
};
