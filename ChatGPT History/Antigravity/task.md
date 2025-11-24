# Result Card Refactoring

## Planning
- [x] Draft implementation plan for unified Result Card model
- [x] Get user approval on phased approach

## Phase 1: Foundation
- [x] Create new `ResultCard` interface in `core/results/resultTypes.ts`
- [x] Create `createResultCard()` helper
- [x] Add new types alongside old ones (no breaking changes)

## Phase 2: Renderers
- [x] Create `ResultCardWidget.tsx` component
- [x] Create `renderResultCardHtml()` function
- [x] Verify both renderers work with new model

## Phase 3: Converters
- [x] Create `core/results/converters.ts`
- [x] Add `convertDiceToCard()`
- [x] Add `convertTableToCard()`
- [x] Add `convertInterpretationToCard()`
## Phase 4: Migration (Tables/Oracles)
- [x] Update `TablesPane.tsx` to use new converters
- [x] Test table rolls end-to-end

## Phase 5: Migration (Dice)
- [x] Update `DiceTray.tsx` to use new converters
- [x] Update `App.tsx` dice bridge to use `convertDiceToCard`
- [x] TypeScript compiles cleanly

## Phase 6: Migration (Interpretations)
- [ ] Update `InterpretButton.tsx` to use new converters
- [ ] Test AI interpretations end-to-end
- [ ] Remove old discriminated union types
- [ ] Remove old `convertRollToCard()` from App.tsx
- [ ] Remove old card creation logic from components
- [ ] Final verification
