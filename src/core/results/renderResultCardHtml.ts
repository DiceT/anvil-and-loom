/**
 * HTML Renderer for Result Cards
 *
 * Generates static HTML blocks for inserting result cards into journal entries.
 * The HTML output mirrors the structure of ResultCardWidget so appearance is consistent.
 *
 * This is the "storage" representation - plain HTML that stays portable and readable.
 */

import type { ResultCard } from "./resultModel";

/**
 * Theme colors for result card headers based on source.
 * (Duplicated from ResultCardWidget for independence)
 */
const SOURCE_THEMES = {
    dice: {
        headerBgColor: "#1e3a5f",
        headerFontColor: "#ffffff",
    },
    table: {
        headerBgColor: "#255f1e",
        headerFontColor: "#ffffff",
    },
    oracle: {
        headerBgColor: "#8ed8df",
        headerFontColor: "#1e293b",
    },
    interpretation: {
        headerBgColor: "#5f1e56",
        headerFontColor: "#ffffff",
    },
    system: {
        headerBgColor: "#475569",
        headerFontColor: "#ffffff",
    },
    other: {
        headerBgColor: "#1e3a5f",
        headerFontColor: "#ffffff",
    },
};

/**
 * Escape HTML special characters for safe insertion.
 */
function escapeHtml(text: string): string {
    if (!text) return "";
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

/**
 * Render a ResultCard to HTML suitable for inserting into entry content.
 *
 * The output includes:
 * - data-result-id attribute for potential future hydration
 * - Inline styles for theme colors
 * - Structure matching ResultCardWidget
 *
 * @param card - The result card to render
 * @returns HTML string
 *
 * @example
 * ```typescript
 * const html = renderResultCardHtml(card);
 * // Insert into entry: entry.content += html;
 * ```
 */
export function renderResultCardHtml(card: ResultCard): string {
    const source = card.source || "other";
    const theme = SOURCE_THEMES[source] || SOURCE_THEMES.other;

    const headerStyle = `background-color: ${theme.headerBgColor}; color: ${theme.headerFontColor}; padding: 0.35rem 0.5rem; display: block; font-weight: 600;`;

    // Parse content into lines
    const contentLines = card.content
        .split("\n")
        .filter((line) => line.trim())
        .map((line) => `<div class="dice-card-detail">${escapeHtml(line)}</div>`)
        .join("");

    const contentHtml = contentLines
        ? `<div class="dice-card-body dice-log-body">${contentLines}</div>`
        : "";

    // Result footer
    const showResultLabel = card.source !== "interpretation";
    const footerLabel = showResultLabel
        ? '<span class="dice-log-footer-label">Result:</span>'
        : "";

    const resultColor = card.meta?.resultColor as string | undefined;
    const resultStyle = resultColor ? ` style="color:${resultColor}"` : "";

    // Bold result for dice/table sources
    const shouldBoldResult = card.source === "dice" || card.source === "table";
    const resultContent = shouldBoldResult
        ? `<strong>${escapeHtml(card.result)}</strong>`
        : escapeHtml(card.result);

    const themeClass = card.source ? `dice-card--${card.source}` : "";

    const html = `
    <div class="dice-card dice-card-inline dice-log-card ${themeClass}" data-result-id="${card.id}">
      <label class="dice-card-title dice-log-header" style="${headerStyle}"><span>${escapeHtml(card.header)}</span></label>
      ${contentHtml}
      <div class="dice-card-highlight dice-log-footer">${footerLabel}<span class="dice-card-inline-result"${resultStyle}>${resultContent}</span></div>
    </div>
  `;

    return html.trim();
}
