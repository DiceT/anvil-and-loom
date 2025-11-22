/**
 * Results Display Pane
 *
 * Displays a stack of Entry Result Cards for testing purposes.
 * Newest cards are added to the bottom of the stack.
 */

import { ResultCard } from "../core/results/ResultCard";
import type { ResultCardModel } from "../core/results/resultTypes";
import { Trash2 } from "lucide-react";

interface ResultsPaneProps {
  results: ResultCardModel[];
  onClearResults?: () => void;
}

export function ResultsPane({ results, onClearResults }: ResultsPaneProps) {
  return (
    <div className="pane">
      <div className="pane-header">
        <h2>Results (Testing)</h2>
        {results.length > 0 && onClearResults && (
          <button
            onClick={onClearResults}
            className="icon-button"
            title="Clear all results"
          >
            <Trash2 size={18} />
          </button>
        )}
      </div>
      <div className="pane-content" style={{ padding: "1rem" }}>
        {results.length === 0 ? (
          <p style={{ color: "var(--text-dim)", fontStyle: "italic" }}>
            No results yet. Roll dice, generate tables, or interpret oracles to see Entry Result Cards here.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {results.map((card) => (
              <ResultCard key={card.id} card={card} variant="entry" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
