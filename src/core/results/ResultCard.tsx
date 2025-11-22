/**
 * Unified Result Card Renderer for Anvil & Loom
 *
 * Renders all result cards (dice, challenge, table, interpretation) with consistent structure.
 *
 * Conceptual structure:
 * - HEADER: Label, icon, high-level context (always visible)
 * - CONTENT: Supporting details (collapsible in "entry" variant)
 * - RESULT: Main outcome (always visible)
 *
 * Variants:
 * - "standard": All regions visible, used in trays/panels/previews
 * - "entry": HEADER and RESULT always visible, CONTENT collapsible via header click
 */

import { useState } from "react";
import type { ResultCardModel } from "./resultTypes";
import { getCardTheme } from "./resultTypes";

export type ResultCardVariant = "standard" | "entry";

export interface ResultCardProps {
  /** The result card data to render */
  card: ResultCardModel;
  /** Display variant: "standard" (always expanded) or "entry" (collapsible) */
  variant: ResultCardVariant;
}

/**
 * Main ResultCard component that renders all result card types with unified structure.
 */
export function ResultCard({ card, variant }: ResultCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Generate unique ID for collapsible toggle
  const toggleId = `card-toggle-${card.id}`;
  
  // Determine if content should be visible
  const showContent = variant === "standard" || isExpanded;
  
  // Get card-specific data
  const { headerText, contentLines, resultText, resultColor, themeClass } = getCardDisplay(card);
  
  // Get theme colors for header
  const theme = getCardTheme(card);
  
  // Header is clickable only in "entry" variant
  const headerClass = variant === "entry" 
    ? "dice-card-title dice-log-header"
    : "dice-card-title";

  return (
    <div className={`dice-card dice-card-inline dice-log-card ${themeClass}`}>
      {variant === "entry" && (
        <input
          type="checkbox"
          id={toggleId}
          className="dice-log-toggle"
          checked={isExpanded}
          onChange={(e) => setIsExpanded(e.target.checked)}
        />
      )}
      
      <label
        htmlFor={variant === "entry" ? toggleId : undefined}
        className={headerClass}
        style={{ 
          cursor: variant === "entry" ? "pointer" : "default",
          backgroundColor: theme.headerBgColor,
          color: theme.headerFontColor,
        }}
      >
        <span>{headerText}</span>
      </label>
      
        {showContent && (
        <div className="dice-card-body dice-log-body">
          {contentLines.map((line, idx) => (
            <div key={idx} className="dice-card-detail">
              {line}
            </div>
          ))}
        </div>
      )}
      
      <div className="dice-card-highlight dice-log-footer">
        {card.kind !== "interpretation" && (
          <span className="dice-log-footer-label">Result:</span>
        )}
        <span
          className="dice-card-inline-result"
          style={resultColor ? { color: resultColor, fontSize: 'inherit' } : { fontSize: 'inherit' }}
        >
          {card.kind === "dice" || card.kind === "challenge" ? <strong>{resultText}</strong> : resultText}
        </span>
      </div>
    </div>
  );
}

/**
 * Extract display information from a result card model.
 */
function getCardDisplay(card: ResultCardModel): {
  headerText: string;
  contentLines: (string | React.ReactNode)[];
  resultText: string;
  resultColor?: string;
  themeClass: string;
} {
  switch (card.kind) {
    case "dice":
    case "challenge": {
      return {
        headerText: card.headerText,
        contentLines: parseContentText(card.contentText),
        resultText: card.resultText,
        resultColor: card.resultColor,
        themeClass: card.theme === "challenge" ? "dice-card--challenge" : "dice-card--dice",
      };
    }
    
    case "table": {
      return {
        headerText: card.headerText,
        contentLines: parseContentText(card.contentText),
        resultText: card.resultText,
        themeClass: "dice-card--table",
      };
    }
    
    case "interpretation": {
      return {
        headerText: card.headerText,
        contentLines: parseInterpretationContent(card.interpretationText),
        resultText: card.snapshotText,
        themeClass: "dice-card--interpretation",
      };
    }
  }
}

/**
 * Parse content text into display lines.
 * Handles both plain text and structured content with labels.
 */
function parseContentText(content: string): (string | React.ReactNode)[] {
  // Split by newlines and handle label: value format
  const lines = content.split('\n').filter(line => line.trim());
  
  return lines.map((line, idx) => {
    const match = line.match(/^([^:]+):\s*(.+)$/);
    if (match) {
      const [, label, value] = match;
      return (
        <span key={idx}>
          <span>{label}:</span> <strong>{value}</strong>
        </span>
      );
    }
    return line;
  });
}

/**
 * Parse interpretation text into bullet points.
 */
function parseInterpretationContent(text: string): (string | React.ReactNode)[] {
  const lines = text.split('\n').filter(line => line.trim());
  
  return lines.map((line) => {
    // Preserve leading bullet hyphen ("- ") so the API-provided bullets remain visible.
    // Trim surrounding whitespace but keep the initial hyphen if present.
    const trimmed = line.trim();
    return trimmed;
  });
}

/**
 * Get color for challenge roll outcomes.
 */
export function getChallengeOutcomeColor(outcome: string): string {
  switch (outcome) {
    case "Strong Hit":
      return "#22c55e";
    case "Weak Hit":
      return "#d97706";
    case "Miss":
      return "#ef4444";
    default:
      return "var(--text-main)";
  }
}

// Small helper to escape HTML when rendering into entry content
function escapeHtml(text: string) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Render a ResultCardModel to HTML suitable for inserting into entry content.
 * This mirrors the structure used by ResultCard component so appearance matches the Results Pane.
 */
export function renderResultCardHtml(card: ResultCardModel): string {
  const theme = getCardTheme(card);
  const headerStyle = `background-color: ${theme.headerBgColor}; color: ${theme.headerFontColor}; padding: 0.35rem 0.5rem; display: block; font-weight: 600;`;

  let contentHtml = '';
  if (card.kind === 'dice' || card.kind === 'challenge') {
    const lines = (card as any).contentText?.split('\n').filter((l: string) => l.trim()) ?? [];
    contentHtml = lines.map((l: string) => `<div class="dice-card-detail">${escapeHtml(l)}</div>`).join('');
  } else if (card.kind === 'table') {
    const lines = (card as any).contentText?.split('\n').filter((l: string) => l.trim()) ?? [];
    contentHtml = lines.map((l: string) => `<div class="dice-card-detail">${escapeHtml(l)}</div>`).join('');
  } else if (card.kind === 'interpretation') {
    // For interpretation cards, keep the interpretation text as-is with bullets preserved and line breaks
    const interp = escapeHtml((card as any).interpretationText || '');
    contentHtml = `<div class="dice-card-detail">${interp.replace(/\n/g, '<br/>')}</div>`;
  }

  const isInterpret = card.kind === 'interpretation';
  const snapshotText = escapeHtml((card as any).snapshotText ?? (card as any).resultText ?? '');
  const footerLabel = isInterpret ? '' : '<span class="dice-log-footer-label">Result:</span>';

  const html = `
    <div class="dice-card dice-card-inline dice-log-card ${isInterpret ? 'dice-card--interpretation' : ''}">
      <label class="dice-card-title dice-log-header" style="${headerStyle}"><span>${escapeHtml((card as any).headerText ?? '')}</span></label>
      ${contentHtml ? `<div class="dice-card-body dice-log-body">${contentHtml}</div>` : ''}
      <div class="dice-card-highlight dice-log-footer">${footerLabel}<span class="dice-card-inline-result">${snapshotText}</span></div>
    </div>
  `;
  return html;
}
