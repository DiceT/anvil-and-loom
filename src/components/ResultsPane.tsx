/**
 * Results Display Pane
 *
 * Displays a stack of Entry Result Cards for testing purposes.
 * Newest cards are added to the bottom of the stack.
 */

import { useEffect, useRef } from "react";
import { ResultCard } from "../core/results/ResultCard";
import type { ResultCardModel } from "../core/results/resultTypes";
import { Trash2, FileText } from "lucide-react";

interface ResultsPaneProps {
  results: ResultCardModel[];
  onClearResults?: () => void;
  onCopyToEntry?: (card: ResultCardModel) => void;
}

export function ResultsPane({ results, onClearResults, onCopyToEntry }: ResultsPaneProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new results are added
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [results.length]);

  const handleCopyToEntry = (card: ResultCardModel) => {
    if (onCopyToEntry) {
      onCopyToEntry(card);
    } else {
      // Fallback message for web version
      alert("Copy to Entry is only available in the desktop app.");
    }
  };

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
      <div className="pane-content" style={{ padding: "1rem", overflow: "auto" }} ref={scrollContainerRef}>
        {results.length === 0 ? (
          <p style={{ color: "var(--text-dim)", fontStyle: "italic" }}>
            No results yet. Roll dice, generate tables, or interpret oracles to see Entry Result Cards here.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {results.map((card) => (
              <div key={card.id} style={{ position: "relative" }}>
                <ResultCard card={card} variant="entry" />
                <button
                  onClick={() => handleCopyToEntry(card)}
                  className="icon-button"
                  title="Copy to Entry"
                  style={{
                    position: "absolute",
                    top: "0.7rem",
                    right: "0.5rem",
                    backgroundColor: "var(--bg-elevated)",
                    border: "1px solid var(--border)",
                    padding: "0.25rem",
                    borderRadius: "3px",
                    width: "auto",
                    height: "auto",
                    ["--icon-size" as string]: "14px",
                    ["--icon-stroke" as string]: "1.8px",
                  }}
                >
                  <FileText />
                </button>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>
    </div>
  );
}
