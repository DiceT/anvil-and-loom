import { EditorView, ViewPlugin, ViewUpdate, Decoration, WidgetType } from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";

// Regex: [[dice:EXPRESSION]]
const DICE_REGEX = /\[\[dice:([^\]]+)\]\]/g;

class DiceWidget extends WidgetType {
  constructor(readonly expr: string) {
    super();
  }

  eq(other: DiceWidget) {
    return other.expr === this.expr;
  }

  toDOM(view: EditorView): HTMLElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "dice-widget";
    button.textContent = `🎲 ${this.expr.trim()}`;

    button.onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();

      // Try to call the host app bridge if available.
      const expr = this.expr.trim();
      const bridge = (window as any).anvilAndLoomDice;
      if (bridge && typeof bridge.roll === 'function') {
        try {
          // Allow async handling.
          void bridge.roll(expr);
        } catch (e) {
          console.error('[DiceWidget] roll bridge error', e);
        }
      } else {
        // Fallback to logging for developer convenience.
        console.log("[DiceWidget] roll requested:", expr);
      }
    };

    return button;
  }

  ignoreEvent() {
    // Return false so clicks are handled (we want the click)
    return false;
  }
}

function buildDiceDecorations(view: EditorView): any {
  const builder = new RangeSetBuilder<Decoration>();

  for (const { from, to } of view.visibleRanges) {
    const text = view.state.doc.sliceString(from, to);
    let match: RegExpExecArray | null;

    DICE_REGEX.lastIndex = 0;
    while ((match = DICE_REGEX.exec(text)) !== null) {
      const matchText = match[0];
      const expr = match[1] ?? "";
      const start = from + match.index;
      const end = start + matchText.length;

      const deco = Decoration.replace({
        widget: new DiceWidget(expr),
        inclusive: false,
      });

      builder.add(start, end, deco);
    }
  }

  return builder.finish();
}

const diceWidgetPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildDiceDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = buildDiceDecorations(update.view);
      }
    }
  },
  {
    decorations: (v) => v.decorations,
  }
);

export const diceWidgetExtension = [diceWidgetPlugin];
