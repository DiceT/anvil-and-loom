import React, { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";

export interface MarkdownViewerProps {
  content: string;
}

function DiceInline({ expr }: { expr: string }) {
  const trimmed = expr.trim();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Call the same bridge we exposed for editor widgets
    const bridge = (window as any).anvilAndLoomDice;
    if (bridge && typeof bridge.roll === "function") {
      void bridge.roll(trimmed);
    } else {
      console.log("[DiceInline] roll requested:", trimmed);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick(e as unknown as React.MouseEvent);
    }
  };

  return (
    <button
      type="button"
      className="dice-widget dice-widget--preview"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      title={trimmed}
      data-tooltip={trimmed}
      aria-label={`Roll ${trimmed}`}
      tabIndex={0}
    >
      🎲 {trimmed}
    </button>
  );
}

export function MarkdownViewer({ content }: MarkdownViewerProps) {
  // Replace [[dice:EXPR]] with an inline HTML button that will be activated via event delegation.
  const transformed = useMemo(() => {
    return content.replace(/\[\[dice:([^\]]+)\]\]/g, (_, expr) => {
      const safeExpr = String(expr).replace(/"/g, "&quot;");
      const escaped = safeExpr.replace(/</g, "&lt;").replace(/>/g, "&gt;");
      return `<button type="button" class="dice-widget dice-widget--preview" data-expr="${escaped}" title="${escaped}" data-tooltip="${escaped}">🎲 ${escaped}</button>`;
    });
  }, [content]);

  // Event delegation: handle clicks on buttons rendered from raw HTML
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleClick = (e: MouseEvent) => {
      // Robustly find the element in case the event target is a text node
      let node: Node | null = e.target as Node | null;
      while (node && node.nodeType !== Node.ELEMENT_NODE) {
        node = node.parentNode;
      }
      const el = node as Element | null;
      if (!el) return;
      const btn = el.closest(".dice-widget--preview") as HTMLElement | null;
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      const expr = btn.getAttribute("data-expr") ?? "";
      const bridge = (window as any).anvilAndLoomDice;
      if (bridge && typeof bridge.roll === "function") {
        void bridge.roll(expr);
      } else {
        console.log("[DiceInline] roll requested:", expr);
      }
    };
    el.addEventListener("click", handleClick);
    return () => el.removeEventListener("click", handleClick);
  }, []);

  return (
    <div className="entry-markdown-view" ref={containerRef}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
        {transformed}
      </ReactMarkdown>
    </div>
  );
}
