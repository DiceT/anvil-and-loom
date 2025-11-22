# Anvil & Loom - TTRPG Companion App

## Overview
**Anvil & Loom** is a digital workspace for organizing and developing stories, worlds, and TTRPG campaigns. It provides tools for planning, exploring, playing, and tracking everything that unfolds in your tabletop adventures.

## Current State
- **Status**: Running successfully on Replit
- **Framework**: React + Vite + TypeScript
- **Port**: 5000 (frontend dev server)
- **Last Updated**: November 22, 2025

## Key Features

### Core Functionality
1. **Tapestries** - Personal campaign workspace organized by user imagination
2. **Entries** - Markdown-based notes for people, places, things, events (interconnected with Threads)
3. **Dice Tray** - 3D dice rolling with automatic logging, supports pools, degradation, challenge rolls
4. **Oracles & Tables** - Random content generation tools for storytelling
5. **AI Integration** - OpenAI-powered oracle interpretation and table generation (optional)

### Customization
- Theme settings (dark/light mode)
- Accent colors
- Dice appearance and themes
- Font preferences

## Project Structure

```
/src/
  /core/          - Centralized core modules (refactored Nov 22, 2025)
    /ai/          - AI client, oracle service, personas, prompts, types
    /dice/        - Dice engine, appearance settings
  /components/    - React components (DiceTray, TablesPane, etc.)
  /lib/
    /dice/        - DiceBox manager, expression parser, roller
    /tables/      - Table registry and AI table filler
  App.tsx         - Main application component
  
/electron/        - Electron desktop app wrapper
/public/          - Static assets (dice textures, themes, sounds)
/tapestries/      - Sample campaign data
```

## Architecture

### Frontend
- **React 19** with TypeScript
- **Vite** for dev server and build tooling
- **3D Dice**: @3d-dice/dice-box for physics-based dice rolling
- **Markdown**: marked library for entry rendering

### Backend/API
- Vite dev server middleware handles API endpoints:
  - `/api/oracle/interpret` - AI-powered oracle interpretation
  - `/api/ai/chat` - Generic OpenAI chat proxy
- Desktop version uses Electron IPC for file system operations

### Data Storage
- **Web**: LocalStorage for settings and temporary data
- **Desktop**: File system-backed Tapestries (campaign data)

## Environment Setup

### Required for AI Features (Optional)
- `OPENAI_API_KEY` - OpenAI API key for AI-powered features
- `OPENAI_MODEL` - Model selection (defaults to gpt-4o-mini)

AI features are optional - the app works fully without them for dice rolling, tables, and manual oracles.

## Development

### Running Locally
```bash
npm install
npm run dev
```
Server runs on http://localhost:5000

### Building for Production
```bash
npm run build
npm run preview
```

### Electron Desktop App
```bash
npm run electron
```

## Replit Configuration

### Vite Config
- Host: 0.0.0.0 (required for Replit proxy)
- Port: 5000 (webview port)
- Middleware for API endpoints included

### Workflow
- Name: "Anvil & Loom Dev Server"
- Command: `npm run dev`
- Output: Webview on port 5000

## User Preferences
- This is a fresh import - no user preferences yet defined

## Recent Changes
- **November 22, 2025**: Complete 3D dice integration for all rolls
  - **All Dice Rolls Now Use 3D Physics**: Every dice roll in the app now goes through the 3D DiceBox system
    - Single die rolls (d4, d6, d8, d10, d12, d20) with advantage/disadvantage support
    - Four d6 rolls for character generation
    - **Table rolls** (d100 percentile) now show 3D dice animations
    - Challenge rolls (Ironsworn 1d6+2d10) with full 3D physics
  - **Animation Awaiting**: Results are not displayed until after the 3D dice animation completes
    - Uses async/await pattern to wait for Promise resolution
    - Ensures users see the dice roll before seeing the result
  - **Robust Fallbacks**: Defensive code with RNG fallbacks maintains uniform probability distribution if 3D system fails
  - **Removed Math.random() stubs**: Eliminated unused `simulateDice()` function, all rolls use DiceBox or fallback RNG

- **November 22, 2025**: Major refactoring for modularity and code clarity
  - **AI Module Consolidation**: Created `src/core/ai/` with centralized AI client and oracle service
    - `aiClient.ts` - Single wrapper for all OpenAI API calls via `/api/ai/chat` endpoint
    - `oracleService.ts` - Centralized oracle interpretation logic
    - `oraclePersonas.ts`, `oraclePrompts.ts`, `oracleTypes.ts` - Modular oracle system
    - Removed duplicates: `src/lib/oraclePersonas.ts`, `src/lib/oraclePrompts.ts`, `src/lib/openaiClient.ts`
  - **Dice Engine Consolidation**: Created `src/core/dice/` with centralized dice logic
    - `diceEngine.ts` - Single API for all dice rolls, delegates to 3D DiceBox manager
    - `diceAppearance.ts` - Shared appearance state (prevents circular dependencies)
    - Removed duplicate: `src/lib/diceEngine.ts`
  - **Component Updates**: All components now use centralized modules from `src/core/`
  - **Architect Review**: Passed - preserves 3D DiceBox behavior, eliminates circular dependencies
  
- **November 22, 2025**: Initial Replit setup
  - Configured Vite to run on 0.0.0.0:5000
  - Set up workflow for dev server
  - Dependencies installed successfully
  - Frontend running and accessible via webview

## Notes
- This app was originally designed for Electron desktop use
- Web version works but file system features (Tapestry management) use localStorage instead
- OpenAI integration is optional and gracefully degrades if API key not provided
