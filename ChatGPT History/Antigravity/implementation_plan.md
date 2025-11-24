# Result Card Unification Plan

Migrate from discriminated union (`DiceResultCard | TableResultCard | InterpretationResultCard`) to single flat `ResultCard` interface with `source` discrimination.

---

## Phase 1: Foundation (New Types + Helpers)

Add new types **alongside** old ones to avoid breaking existing code.

### [NEW] [resultModel.ts](file:///e:/Anvil%20and%20Loom/anvil-and-loom/src/core/results/resultModel.ts)

New unified types:
```typescript
export type ResultSource = "dice" | "table" | "oracle" | "interpretation" | "system" | "other";

export interface ResultCard {
  id: string;
  timestamp: string;      // ISO string
  header: string;         // "Challenge Roll", "Aspect: Haunted"
  result: string;         // Snapshot (what you act on)
  content: string;        // Meta (how we got there)
  source?: ResultSource;
  meta?: Record<string, unknown>;
}
```

### [NEW] [createResultCard.ts](file:///e:/Anvil%20and%20Loom/anvil-and-loom/src/core/results/createResultCard.ts)

Single helper with dual responsibility:
```typescript
export function createResultCard(input: {
  header: string;
  result: string;
  content: string;
  source: ResultSource;
  meta?: Record<string, unknown>;
}): ResultCard {
  // 1. Create card object
  // 2. Add to Results Pane state
  // 3. Append HTML to active Entry (if enabled)
  // 4. Return card
}
```

> [!WARNING]
> **Risk**: This helper needs access to app state (Results Pane array, active entry). Options:
> - Accept `setResultCards` and entry append callback as params
> - Use React Context for state access
> - Return card and let caller handle side effects (safer for Phase 1)

**Recommendation**: Phase 1 returns card only, Phase 2 adds side effects.

---

## Phase 2: Renderers

### [NEW] [ResultCardWidget.tsx](file:///e:/Anvil%20and%20Loom/anvil-and-loom/src/components/ResultCardWidget.tsx)

React component for Results Pane:
```typescript
export function ResultCardWidget({ card }: { card: ResultCard }) {
  // Derive theme from card.source
  // Render header/content/result regions
  // Handle collapse/expand
}
```

Can initially **wrap** existing rendering logic from old `ResultCard.tsx` to minimize changes.

### [NEW] [renderResultCardHtml.ts](file:///e:/Anvil%20and%20Loom/anvil-and-loom/src/core/results/renderResultCardHtml.ts)

Pure function for entry storage:
```typescript
export function renderResultCardHtml(card: ResultCard): string {
  // Return HTML block with data-result-id attribute
  // Mirror widget styling but as static HTML
}
```

Replaces current `renderResultCardHtml()` function (already exists but needs update).

---

## Phase 3: Converters

### [NEW] [converters.ts](file:///e:/Anvil%20and%20Loom/anvil-and-loom/src/core/results/converters.ts)

Pure conversion functions that return `ResultCard`:

```typescript
// Dice rolls → ResultCard
export function convertDiceToCard(rollResult: RollResult): ResultCard

// Table/oracle rolls → ResultCard  
export function convertTableToCard(params: {
  tableId: string;
  tableName: string;
  roll: number;
  resultText: string;
  category?: string;
}): ResultCard

// AI interpretations → ResultCard
export function convertInterpretationToCard(params: {
  oracleName: string;
  personaId: string;
  snapshot: string;
  interpretation: string;
}): ResultCard
```

Extract logic from:
- [`App.tsx:2116-2247`](file:///e:/Anvil%20and%20Loom/anvil-and-loom/src/App.tsx#L2116-L2247) (`convertRollToCard`)
- [`TablesPane.tsx`](file:///e:/Anvil%20and%20Loom/anvil-and-loom/src/components/TablesPane.tsx) (table card creation)
- [`InterpretButton.tsx`](file:///e:/Anvil%20and%20Loom/anvil-and-loom/src/components/InterpretButton.tsx) (interpretation cards)

---

## Phase 4: Migrate Tables/Oracles

### [MODIFY] [TablesPane.tsx](file:///e:/Anvil%20and%20Loom/anvil-and-loom/src/components/TablesPane.tsx)

**Before**:
```typescript
// Direct card creation inline
setResultCards(prev => [...prev, {
  kind: "table",
  tableId: table.id,
  // ... many fields
}])
```

**After**:
```typescript
import { convertTableToCard } from '../core/results/converters';
import { createResultCard } from '../core/results/createResultCard';

const card = convertTableToCard({
  tableId: table.id,
  tableName: table.name,
  roll: rollValue,
  resultText: rowResult.prompt
});
createResultCard(card); // Handles pane + entry
```

---

## Phase 5: Migrate Dice

### [MODIFY] [DiceTray.tsx](file:///e:/Anvil%20and%20Loom/anvil-and-loom/src/components/DiceTray.tsx)

Update dice roll handlers to use `convertDiceToCard()`.

### [MODIFY] [App.tsx](file:///e:/Anvil%20and%20Loom/anvil-and-loom/src/App.tsx#L2116-L2247)

Replace 130-line `convertRollToCard()` with import from converters.

> [!CAUTION]
> **Risk**: `convertRollToCard` has complex logic for challenge outcomes, advantage/disadvantage, pool mechanics. Must preserve all behavior during extraction.

**Mitigation**: Copy-paste first, refactor later. Don't rewrite logic during migration.

---

## Phase 6: Migrate Interpretations

### [MODIFY] [InterpretButton.tsx](file:///e:/Anvil%20and%20Loom/anvil-and-loom/src/components/InterpretButton.tsx)

Replace inline card creation with `convertInterpretationToCard()`.

---

## Phase 7: Cleanup

### [MODIFY] [resultTypes.ts](file:///e:/Anvil%20and%20Loom/anvil-and-loom/src/core/results/resultTypes.ts)

- Remove `DiceResultCard`, `TableResultCard`, `InterpretationResultCard`
- Remove `ResultCardModel` union type
- Remove old `createResultCard()` factory (if it exists)
- Keep theme/color logic, remap to `source` instead of `kind`

### [MODIFY] [App.tsx](file:///e:/Anvil%20and%20Loom/anvil-and-loom/src/App.tsx)

- Delete `convertRollToCard()` function (lines 2116-2247)
- Remove any remaining inline card creation

### [DELETE] [ResultCard.tsx](file:///e:/Anvil%20and%20Loom/anvil-and-loom/src/core/results/ResultCard.tsx)

Replace with `ResultCardWidget.tsx` (already done in Phase 2).

---

## Risky Spots

1. **State management** in `createResultCard()`: Needs app-level state access. Start pure, add side effects carefully.

2. **Dice conversion logic**: 130 lines of special cases in `App.tsx:convertRollToCard`. Must preserve all branching (advantage, challenge outcomes, pool successes).

3. **Entry append mechanism**: Currently uses `renderResultCardHtml()` which exists but may need updates. Test HTML output carefully.

4. **Type compatibility**: Old `ResultCardModel` used throughout app. Migration must be complete before removing types or you'll have cascading errors.

---

## Verification Plan

After each phase:
- Manual test: Roll dice → verify card appears in Results Pane + Entry
- Manual test: Roll table → verify card appears correctly
- Manual test: Run interpretation → verify card appears correctly
- Check: No TypeScript errors
- Check: No runtime errors in console
