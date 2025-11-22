/**
 * Dice Appearance Settings - Shared state for dice visual configuration.
 *
 * This module is imported by both diceEngine and diceBoxManager to avoid
 * circular dependencies while sharing appearance state.
 */

const DEFAULT_FADE_DURATION_MS = 3000;

let diceFadeDurationMs = DEFAULT_FADE_DURATION_MS;
let diceThemeColor = "#ff7f00";
let diceThemeName = "default";
let diceTensThemeColor = "#000000";
let diceTexture = "paper";
let diceScale = 4;

/**
 * Set the fade duration for dice animations.
 *
 * @param durationMs - Duration in milliseconds (min: 500ms)
 */
export function setDiceFadeDuration(durationMs: number) {
  if (Number.isFinite(durationMs)) {
    diceFadeDurationMs = Math.max(500, durationMs);
  }
}

/**
 * Set the dice theme name.
 *
 * @param name - Theme name (e.g., "default", "rust", "gemstone")
 */
export function setDiceThemeName(name: string) {
  if (typeof name === "string" && name.trim().length) {
    diceThemeName = name.trim();
  }
}

/**
 * Set the primary dice theme color.
 *
 * @param color - CSS color string (e.g., "#ff7f00")
 */
export function setDiceThemeColor(color: string) {
  if (typeof color === "string" && color.trim().length) {
    diceThemeColor = color.trim();
  }
}

/**
 * Set the tens die theme color (for percentile rolls).
 *
 * @param color - CSS color string
 */
export function setDiceTensThemeColor(color: string) {
  if (typeof color === "string" && color.trim().length) {
    diceTensThemeColor = color.trim();
  }
}

/**
 * Set the dice texture.
 *
 * @param texture - Texture name (e.g., "paper", "metal")
 */
export function setDiceTexture(texture: string) {
  if (typeof texture === "string" && texture.trim().length) {
    diceTexture = texture.trim();
  }
}

/**
 * Set the dice scale (size multiplier).
 *
 * @param scale - Scale value (1-12)
 */
export function setDiceScale(scale: number) {
  if (Number.isFinite(scale) && scale > 0) {
    diceScale = Math.max(1, Math.min(12, scale));
  }
}

/**
 * Get current dice appearance settings.
 *
 * @returns Object containing all dice appearance settings
 */
export function getDiceAppearance() {
  return {
    fadeDurationMs: diceFadeDurationMs,
    themeColor: diceThemeColor,
    themeName: diceThemeName,
    tensThemeColor: diceTensThemeColor,
    texture: diceTexture,
    scale: diceScale,
  };
}
