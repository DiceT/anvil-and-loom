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
        style={{ cursor: variant === "entry" ? "pointer" : "default" }}
      >
        <span>{headerText}</span>
        {variant === "entry" && (
          <span className="dice-log-caret" aria-hidden="true"></span>
        )}
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
        <span className="dice-log-footer-label">Result:</span>
        <span
          className="dice-card-inline-result"
          style={resultColor ? { color: resultColor } : undefined}
        >
          <strong>{resultText}</strong>
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
    // Remove leading bullets/dashes
    const cleaned = line.replace(/^[-•*]\s*/, '').trim();
    return cleaned || line;
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
