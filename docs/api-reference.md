# Anvil & Loom API Reference

This document summarizes the key modules, public functions, types, and typical usage patterns across the Anvil & Loom codebase.

## Scripts

- `npm run dev` – start Vite dev server
- `npm run build` – build assets
- `npm run preview` – preview build
- `npm run electron` – launch Electron app

Reference: `package.json:6`

## Dev Server Endpoints

- `POST /api/oracle/interpret` – AI interpretation proxy (dev only)
- `POST /api/ai/chat` – generic AI chat proxy (dev only)

Reference: `vite.config.ts:27`

Example:

```bash
curl -X POST http://localhost:5000/api/oracle/interpret \
  -H "Content-Type: application/json" \
  -d '{
    "snapshot": {"entryId": "e1", "oracleResults": [{"tableId":"t1","tableName":"Action + Theme","roll":42,"resultText":"Believe + Shadow","tags":[],"sourcePath":"/tables/core/action-theme.json"}]},
    "settings": {"oracleName":"The Loomwright","model":"gpt-4o-mini","temperature":0.7}
  }'
```

## Dice Engine

Core entry points for rolling dice and handling 3D dice visualization.

- Appearance
  - `setDiceFadeDuration`, `setDiceThemeName`, `setDiceThemeColor`, `setDiceTensThemeColor`, `setDiceTexture`, `setDiceScale`, `getDiceAppearance`
  - Reference: `src/core/dice/diceAppearance.ts:82`

- Roll functions
  - `rollDiceBoxValues(count, sides)` – 3D animated roll for N dice
  - `rollDiceBoxComposite(requests)` – roll multiple pools (e.g., 1d6 + 2d10)
  - `rollDiceBoxList(dice)` – roll custom list with per-die styling
  - `rollDice(type, options?)` – simple polyhedral, percentile, challenge
  - `rollOracleD100(ctx)` – resilient d100 for oracle tables
  - Reference: `src/core/dice/diceEngine.ts:111`, `src/core/dice/diceEngine.ts:134`, `src/core/dice/diceEngine.ts:159`, `src/core/dice/diceEngine.ts:196`, `src/core/dice/diceEngine.ts:422`

Usage:

```ts
import { rollDice } from "../core/dice/diceEngine";

// d20
const d20 = await rollDice("d20");
console.log(d20.value);

// d20 with advantage
const adv = await rollDice("d20", { mode: "advantage" });
console.log(adv.value);

// d100
const d100 = await rollDice("percentile");

// Challenge (Ironsworn-style)
const challenge = await rollDice("challenge", { modifier: 2 });
console.log(challenge.meta.outcome); // Strong Hit | Weak Hit | Miss
```

## Dice Parser & Roller

Advanced notation, deterministic logic, and provider-backed rolls.

- Parser
  - `DiceExpression.parse(notation, options?)` → `DiceExpression`
  - Reference: `src/lib/dice/DiceExpression.ts:153`

- Roller
  - `DiceRoller.roll(expression, options?)`
  - `DiceRoller.rollWithProvider(expression, provider)` (3D DiceBox via adapter)
  - Reference: `src/lib/dice/DiceRoller.ts:103`, `src/lib/dice/DiceRoller.ts:140`

- DiceBox Adapter
  - `diceBoxValueProvider` implements `DiceValueProvider`
  - Reference: `src/lib/dice/diceBoxAdapter.ts:1`

Usage:

```ts
import DiceExpression from "../lib/dice/DiceExpression";
import { DiceRoller } from "../lib/dice/DiceRoller";
import diceBoxValueProvider from "../lib/dice/diceBoxAdapter";

const expr = DiceExpression.parse("4d6dl1 + 2");
const result = await DiceRoller.rollWithProvider(expr, diceBoxValueProvider);
console.log(result.total);
```

## Tables & Oracles

Forge tables, registry access, and rolling.

- Types
  - `ForgeTable`, `ForgeTableRow`, `ForgeFilePayload`, `ForgeCategory`
  - Reference: `src/lib/tables/tableForge.ts:9`

- Generators
  - `createEmptyAspectTables(name, description)`
  - `createEmptyDomainTables(name, description)`
  - `buildForgeFile(category, name, description, tables)`
  - Reference: `src/lib/tables/tableForge.ts:96`, `src/lib/tables/tableForge.ts:127`, `src/lib/tables/tableForge.ts:157`

- Registry
  - `fetchTableList()` → `TableDescriptor[]`
  - `fetchTableById(id)` → `ForgeTable`
  - Reference: `src/lib/tables/tableRegistry.ts:109`, `src/lib/tables/tableRegistry.ts:114`

- Dice integration
  - `rollOracleD100({ tableId, tableName, sourcePath })`
  - Reference: `src/core/dice/diceEngine.ts:422`

Usage:

```ts
import { fetchTableList, fetchTableById } from "../lib/tables/tableRegistry";
import { rollOracleD100 } from "../core/dice/diceEngine";

const list = await fetchTableList();
const tableDesc = list[0];
const table = await fetchTableById(tableDesc.id);

const roll = await rollOracleD100({
  tableId: tableDesc.id,
  tableName: tableDesc.name,
  sourcePath: tableDesc.sourcePath,
});

const max = table.maxRoll;
const normalized = Math.max(1, Math.min(max, Math.floor(((roll - 1) % max) + 1)));
const row = table.tableData.find(r => normalized >= r.floor && normalized <= r.ceiling);
console.log(row?.result);
```

## Result Cards

Unified rendering for dice, table, and interpretation results.

- Types
  - `ResultCardModel` union, subtypes: `DiceResultCard`, `TableResultCard`, `InterpretationResultCard`
  - `generateResultCardId()`
  - Reference: `src/core/results/resultTypes.ts:121`, `src/core/results/resultTypes.ts:180`

- Renderer
  - `ResultCard({ card, variant })` – variant `"standard"` or `"entry"`
  - `renderResultCardHtml(card)` – HTML markup for Entry insertion
  - Reference: `src/core/results/ResultCard.tsx:32`, `src/core/results/ResultCard.tsx:210`

Usage (Table card):

```ts
import { generateResultCardId } from "../core/results/resultTypes";
import type { TableResultCard } from "../core/results/resultTypes";

const card: TableResultCard = {
  id: generateResultCardId(),
  kind: "table",
  createdAt: Date.now(),
  tableId: tableDesc.id,
  tableName: tableDesc.name,
  roll: normalized,
  resultText: row?.result || "",
  headerText: `ORACLE: ${tableDesc.name.toUpperCase()}`,
  contentText: `Roll ${normalized} on ${tableDesc.name}\nSource: ${tableDesc.sourcePath}`,
  theme: "table",
  category: tableDesc.category,
  sourcePath: tableDesc.sourcePath,
};
```

Usage (Render HTML for Entry):

```ts
import { renderResultCardHtml } from "../core/results/ResultCard";
const html = renderResultCardHtml(card);
// Append html into Entry content
```

## AI Interpretation

Central service for oracle interpretations.

- Service
  - `interpretEntryOracle(snapshot, settings)`
  - Reference: `src/core/ai/oracleService.ts:54`

- Prompt builders
  - `buildOracleSystemPrompt(settings)`
  - `buildOracleUserPrompt(snapshot, oracleName)`
  - Reference: `src/core/ai/oraclePrompts.ts:24`, `src/core/ai/oraclePrompts.ts:93`

- AI client
  - `callModel({ system, user, model, apiKey? })`
  - Reference: `src/core/ai/aiClient.ts:50`

Usage:

```ts
import { interpretEntryOracle } from "../core/ai/oracleService";
import type { EntryOracleSnapshot } from "../core/ai/oracleTypes";

const snapshot: EntryOracleSnapshot = {
  entryId: "entry-123",
  oracleResults: [
    { tableId: "t1", tableName: "Action + Theme", roll: 21, resultText: "Believe + Shadow", tags: [], sourcePath: "/tables/core/action-theme.json" }
  ],
};

const text = await interpretEntryOracle(snapshot, {
  oracleName: "The Loomwright",
  oraclePersonaId: "loomwright",
  model: "gpt-4o-mini",
  temperature: 0.7,
});
```

## Settings & IPC

- Renderer settings
  - `fetchAppSettings()`, `updateAppSettings(partial)`, `subscribeToSettings(callback)`
  - Reference: `src/lib/settingsStore.ts:85`

- Electron preload bridge
  - `window.settingsAPI` with methods for settings, tapestries, and tables
  - Reference: `electron/preload.cjs:4`

Usage (subscribe):

```ts
import { subscribeToSettings } from "../lib/settingsStore";
const unsubscribe = subscribeToSettings((settings) => {
  console.log("settings changed", settings);
});
```

## UI Components that Emit Cards

- `TablesPane` emits `onResultCard(TableResultCard)` and logs to Entry via `onOracleResult(payload)`
  - Reference: `src/components/TablesPane.tsx:178`

- `ResultsPane` renders `ResultCard` in Entry variant and supports copying to Entry
  - Reference: `src/components/ResultsPane.tsx:30`

- `InterpretButton` parses `forge:oracle` comments and inserts `renderResultCardHtml`
  - Reference: `src/components/InterpretButton.tsx:1`

## Notes

- Headers follow consistent semantics: HEADER / CONTENT / RESULT across kinds.
- Oracle tables use `source: "oracle"` for distinct styling and filtering.
- Entry variant collapses CONTENT, keeping HEADER and RESULT visible.