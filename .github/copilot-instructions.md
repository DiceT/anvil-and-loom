<!--
This file provides concise, project-specific guidance for AI coding agents
working in the `anvil-and-loom` repository. Keep this short and actionable.
-->

# Copilot instructions for Anvil & Loom

Summary
- Project: Electron + Vite + React + TypeScript app that embeds a 3D dice engine.
- Key runtime: Vite dev server for the renderer, Electron `electron/main.js` for desktop shell.

Quick start (developer flows)
- Start the renderer dev server: `pnpm run dev` (runs `vite`).
- In a second terminal start the desktop shell: `pnpm run electron` (runs `electron ./electron/main.js`).
- To build production renderer: `pnpm run build`. The Electron process will load `../dist/index.html` when `app.isPackaged`.

Key files to reference when making changes
- `package.json` — scripts and dependency list (vite + electron + @3d-dice packages).
- `electron/main.js` — desktop shell behavior and dev vs prod loading (dev uses `http://localhost:5173`).
- `index.html` — contains overlay container `#dice-box-container` used by the dice engine.
- `src/lib/diceEngine.ts` — single source of truth for dice integration and roll parsing.
- `src/components/DiceTray.tsx` — UI for triggering rolls and rendering results (uses `rollDice`).
- `public/assets/` — static assets (textures, sounds) expected by the dice engine; code uses `assetPath: "/assets/"`.

Important project-specific patterns and conventions
- Dice overlay: `diceEngine.getDiceBox()` expects an element with id `dice-box-container` (see `index.html` and `src/App.css`). Do not change the id without updating `DICE_CONTAINER_ID` in `src/lib/diceEngine.ts`.
- Asset path: the dice library is configured with `assetPath: "/assets/"` and therefore expects files under `public/assets/` (served at `/assets/` in dev and prod builds).
- Roll parsing: `src/lib/diceEngine.ts` normalizes raw dice-box responses using `extractDiceValues()` and `extractFirstValue()` — when adding new roll types follow the same pattern to keep outputs predictable.
- Result shape: `rollDice()` returns objects matching `DiceEngineResult` with fields `{ id, kind, label, value?, detail?, meta? }`. The `meta` object is used by the UI (see challenge roll handling in `DiceTray`). Preserve `meta` structure when extending features.
- UI mounting: `DiceTray` stays mounted and is hidden/shown via display CSS, not unmounted — rely on that when adding stateful behavior or animations.

Integration and behavior notes for agents
- When changing roll expressions or dice parsing, add unit-style tests or a small verification harness that runs `rollDice()` in a browser context (dice-box is DOM/threejs-based and requires canvas). For quick local checks, run `pnpm run dev` then `pnpm run electron`.
- The dice engine initialization is asynchronous and cached (`diceBoxInitPromise`) — ensure code paths await `getDiceBox()` before calling `box.roll()`.
- The electron main process currently has `contextIsolation: false` and `nodeIntegration: false`. Be conservative when changing these flags; if you enable IPC or preload scripts, update `electron/main.js` accordingly and document the IPC contract.

When editing code
- Prefer minimal, focused changes. Preserve the established APIs in `src/lib/diceEngine.ts` and the result object shape so UI components (e.g., `DiceTray`) don't require simultaneous changes.
- Small UI changes: modify `src/components/DiceTray.tsx` or `src/App.css`. Larger layout changes should keep the `app-root`/sidebar/tools structure intact.

Search tips / examples
- Find dice engine logic: search `src/lib/diceEngine.ts` or `DICE_CONTAINER_ID`.
- Find where roll outputs are displayed: `src/components/DiceTray.tsx`.
- Dev-run electron + vite: run `pnpm run dev` then `pnpm run electron` in separate terminals.

If you are unsure
- Prefer asking the maintainer for desired UX for new roll types or changes to `meta` shape.
- When changing Electron security settings, explicitly document the reason and update `electron/main.js` comments.

End of file — ask for any missing details or additional examples to include.
