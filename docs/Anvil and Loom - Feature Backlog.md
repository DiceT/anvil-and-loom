# Anvil & Loom: Feature Backlog & Inspiration

_Last updated: 2025-11-21_

## Purpose

Working list of features inspired by Obsidian, LegendKeeper, World Anvil, Kanka, Foundry VTT, and similar tools, evaluated as potential additions to **Anvil & Loom**.

We’ll expand and revise this file as we go.

---

## Priority Legend

- **P0 – Core**: Must-have for the first public release.
- **P1 – High**: Strongly desired soon after core is stable.
- **P2 – Nice**: Quality-of-life or depth once the base is solid.
- **P3 – Future**: Experimental, stretch, or “only if it still feels right later”.

_Source tags used below:_
- `#obsidian`, `#legendkeeper`, `#worldanvil`, `#kanka`, `#notion`, `#vtt`, `#foundry`, `#ai`, `#original`

---

## 1. Core Knowledge & Editing

| Priority | Feature                                   | Source(s)                        | Tags                                               | Notes |
|---------:|-------------------------------------------|----------------------------------|----------------------------------------------------|-------|
| P0       | Markdown-based editor                     | Obsidian                         | #obsidian                                          | Core text editing for everything. |
| P0       | Internal links between entries            | Obsidian, LK, WA, Kanka          | #obsidian #legendkeeper #worldanvil #kanka         | `[[wikilinks]]` style linking. |
| P0       | Backlinks panel                           | Obsidian                         | #obsidian                                          | See where an entry is referenced. |
| P1       | Block/section embeds (transclusion)       | Obsidian                         | #obsidian                                          | Reuse sections across entries. |
| P1       | Templated entry creation                  | Obsidian, LK, WA, Kanka          | #obsidian #legendkeeper #worldanvil #kanka         | Templates per type (NPC, place, etc.). |
| P2       | WYSIWYG-ish helpers over Markdown         | Obsidian-like                    | #obsidian #original                                | Buttons for common formatting. |
| P2       | Snippets / text expansions                | Obsidian plugins                 | #obsidian                                          | Frequently used phrases/blocks. |

---

## 2. Linking, Graphs, & Structure

| Priority | Feature                                   | Source(s)               | Tags                                   | Notes |
|---------:|-------------------------------------------|-------------------------|----------------------------------------|-------|
| P0       | Graph view of entries & links             | Obsidian                | #obsidian                              | Global graph plus per-tapestry subsets. |
| P0       | Tagging system                            | Obsidian, WA, Kanka     | #obsidian #worldanvil #kanka           | Simple tags for arbitrary grouping. |
| P1       | Saved graph filters / views               | Obsidian                | #obsidian                              | Saved searches / filters for graph subsets. |
| P1       | Hierarchical folders / notebooks          | Obsidian, LK, WA        | #obsidian #legendkeeper #worldanvil    | Optional structure on top of links. |
| P2       | Second-order link discovery               | Obsidian plugins        | #obsidian                              | Suggestions for “you might connect X and Y”. |

---

## 3. World Maps & Spatial Tools

| Priority | Feature                                   | Source(s)                    | Tags                                   | Notes |
|---------:|-------------------------------------------|------------------------------|----------------------------------------|-------|
| P0       | Interactive maps with pins                | LegendKeeper, WA, Kanka     | #legendkeeper #worldanvil #kanka       | Clickable pins that open entries. |
| P1       | Multiple maps per tapestry                | LegendKeeper, WA            | #legendkeeper #worldanvil              | Regions, cities, dungeons, etc. |
| P1       | Layers & toggleable overlays              | LegendKeeper                | #legendkeeper                          | E.g. political vs geographic vs travel routes. |
| P1       | Fog-of-war / player reveal controls       | LegendKeeper, VTT patterns  | #legendkeeper #vtt                     | Separate GM vs player visibility. |
| P2       | Simple distance measuring                 | Misc tools                  | #original                              | Rough travel estimations. |
| P3       | Animated map states / time-lapse          | Future                      | #original                              | Show how a region changes over time. |

---

## 4. Timelines, Calendars, & Time

| Priority | Feature                                   | Source(s)                   | Tags                                   | Notes |
|---------:|-------------------------------------------|-----------------------------|----------------------------------------|-------|
| P0       | World / campaign timelines                | LK, WA, Kanka              | #legendkeeper #worldanvil #kanka       | Events with links back to entries. |
| P1       | Custom calendars (fantasy dates)          | Kanka, WA                  | #worldanvil #kanka                     | Months, weekdays, leap rules, etc. |
| P1       | Per-entity life timeline (character arc)  | WA, Kanka                  | #worldanvil #kanka                     | Autogenerated from events tagged with that entity. |
| P2       | Multiple parallel timelines               | LegendKeeper timelines     | #legendkeeper                          | E.g. “mythic age” vs “current campaign”. |
| P2       | Time-aware map/timeline sync              | Mixed                      | #legendkeeper #original                | Click timeline, highlight map changes. |

---

## 5. Entities, Data Modeling, & Templates

| Priority | Feature                                   | Source(s)                     | Tags                                   | Notes |
|---------:|-------------------------------------------|-------------------------------|----------------------------------------|-------|
| P0       | Typed entries (character, place, item…)   | Kanka, WA, LK                | #kanka #worldanvil #legendkeeper       | Each type can have its own template. |
| P0       | Custom fields per type                    | Kanka, WA                    | #kanka #worldanvil                     | E.g. “CR”, “alignment”, “population”. |
| P1       | Entity relationships / links graph        | Kanka, WA                    | #kanka #worldanvil                     | Families, factions, “reports to”, “lives in”. |
| P1       | Inline statblocks / system-agnostic sheets| WA                           | #worldanvil                            | System-neutral first; later system presets. |
| P2       | Relationship views (family tree, org chart)| Kanka, WA                   | #kanka #worldanvil                     | Visualizations of relationships. |
| P2       | Derived fields / formulas                  | Notion-style                 | #notion #original                      | Calculated values from fields. |

---

## 6. Campaign Management & Play Tools

| Priority | Feature                                         | Source(s)                      | Tags                                   | Notes |
|---------:|-------------------------------------------------|--------------------------------|----------------------------------------|-------|
| P0 | First-run Tapestry & Welcome Entry auto-creation | Anvil & Loom | #original | On first launch, create a starter Tapestry with a Welcome Entry and open it immediately. |
| P0 | Onboarding Story Seed oracle                     | Anvil & Loom | #original | Roll once on a small Story Seed table and insert the result as an Oracle Result Card in the Welcome Entry. |
| P0 | Guided “your turn” prompt in Welcome Entry       | Anvil & Loom | #original | Short, actionable text under the seed card that invites the user to write or roll again. |
| P0       | Play Mode / Current Session Entry               | WA, Obsidian, Anvil & Loom     | #worldanvil #obsidian #original        | Focused layout for real-time play; one active Session Entry per session. |
| P0       | Auto-logging Dice & Table results to Session    | Anvil & Loom                   | #original                              | Rolls from Dice/Oracles append structured cards into the active Session Entry. |
| P0       | Basic progress / track support                  | Anvil & Loom, RPG systems      | #original                              | Generic clocks/vows/fronts that can be ticked in Play Mode and logged. |
| P0       | Quick-create Entities from play                 | Anvil & Loom                   | #original                              | Highlight text in a Session Entry to create a new linked Entry (NPC, place, etc.). |
| P1       | GM/Play dashboard (solo-focused)                | WA campaign manager            | #worldanvil #original                  | Pin current location, key NPCs, active tracks for quick reference during play. |
| P1       | Session recap tools (manual; AI optional later) | Anvil & Loom                   | #original #ai                          | Summarize a session’s key events, rolls, and loose threads; AI can expand into prose. |
| P1       | Integrated dice roller                          | Multiple tools                 | #original                              | Already part of Anvil & Loom vision. |
| P1       | Initiative / turn tracker (optional)            | VTT-inspired                   | #vtt                                   | Lightweight tracker; avoid full combat simulator. |
| P2       | Player journals linked to campaign              | WA, Kanka                      | #worldanvil #kanka                     | Player-facing notes with permissions (later, if multi-user). |
| P3       | Simple encounter builder                        | WA, others                     | #worldanvil #original                  | More “planning aide” than combat simulator. |

---

## 7. Collaboration, Permissions, & Publishing

| Priority | Feature                                   | Source(s)             | Tags                                   | Notes |
|---------:|-------------------------------------------|-----------------------|----------------------------------------|-------|
| P1       | GM vs player visibility flags             | WA, Kanka, LK        | #worldanvil #kanka #legendkeeper       | Per-entry and per-field where possible. |
| P2       | Shared campaigns (multiple collaborators) | WA, Kanka            | #worldanvil #kanka                     | Invite-only, with roles (owner, GM, player). |
| P2       | Public web publishing of selected content | Obsidian Publish, WA | #obsidian #worldanvil                  | Turn a tapestry into a browsable site. |
| P3       | Commenting / annotations on entries       | Notion-style         | #notion #original                      | Possibly later; avoid early complexity. |

---

## 8. Import, Export, & Interoperability

| Priority | Feature                                   | Source(s)                       | Tags                                   | Notes |
|---------:|-------------------------------------------|---------------------------------|----------------------------------------|-------|
| P1       | Import from Obsidian vaults (Markdown)    | LK import, WA import           | #obsidian #legendkeeper #worldanvil    | Preserve links, folder structure where possible. |
| P1       | Import from other tools (LegendKeeper, WA, Kanka) | Various                    | #legendkeeper #worldanvil #kanka       | Likely via Markdown/JSON exports. |
| P1       | Export to Markdown/JSON                   | General best practice          | #original                              | Avoid lock-in; support backups. |
| P2       | Export to print/PDF layout-friendly form  | General                       | #original                              | For offline books, zines, etc. |

---

## 9. Extensibility, Automation, & Power Tools

| Priority | Feature                                   | Source(s)              | Tags                                   | Notes |
|---------:|-------------------------------------------|------------------------|----------------------------------------|-------|
| P1       | Macro / scriptable actions                | Obsidian plugins       | #obsidian                              | Run workflows on entries, dice, tables. |
| P1       | Plugin API for third-party extensions     | Obsidian, WA ecosystem | #obsidian #worldanvil                  | Long-term but should be architected for. |
| P2       | Custom views (boards, kanban, etc.)       | LK boards, Notion      | #legendkeeper #notion                  | Visual organization for quests, arcs, etc. |
| P2       | Saved searches / smart collections        | Obsidian search        | #obsidian                              | Auto-updating lists of entries (e.g. “unresolved quests”). |
| P3       | External integrations (VTTs, VCS, etc.)   | Various                | #vtt #original                         | Foundry, Roll20, Git, etc. TBD. |

---

## 10. Open Questions & To-Discuss

A running list of things we want to argue about later:

- How deep should collaboration go in v1 vs focusing solely on solo GMs and authors?
- Where does Anvil & Loom stop being a “campaign manager” and start stepping on VTT territory?
- How opinionated should entity types be vs fully user-defined schemas?
- How tightly intertwined should maps, timelines, and oracles be in the first implementation?

---

## 11. AI & Oracles

| Priority | Feature                                            | Source(s)                          | Tags                       | Notes |
|---------:|----------------------------------------------------|------------------------------------|----------------------------|-------|
| P0       | Local oracle & table roller                        | Anvil & Loom                       | #original                  | Core engine for d100 tables, Aspects/Domains, etc. |
| P0       | AI-assisted oracle interpretation (optional API)   | Anvil & Loom + LLM integration     | #ai #original              | Take raw rolls and suggest narrative meaning in context. |
| P1       | AI-powered tagging & link suggestions              | Obsidian-style + AI                | #ai #obsidian #original    | Suggest tags, backlinks, and related entries while writing. |
| P1       | AI prompts from table results (“expand this”)      | Oracles + AI                       | #ai #original              | Click a result to generate 2–3 variations or elaborations. |
| P1       | AI-assisted session summaries & recap generation   | Journals + AI                      | #ai #original              | Turn raw session logs into summaries, NPC lists, loose threads. |
| P2       | AI-driven Reverberation / Echo suggestions         | Connection Web + AI                | #ai #original              | Propose when & how past threads resurface based on new notes. |
| P2       | AI persona presets (Sage, Trickster, Archivist)    | Anvil & Loom                       | #ai #original              | Curated prompt styles for different creative “voices”. |
| P3       | AI-assisted map dressing (non-positional prompts)  | Foundry-inspired + AI              | #ai #foundry #original     | Suggest landmarks, hazards, and atmosphere for a selected region. |
| P3       | AI-powered system-conversion helper                | General                            | #ai #original              | Translate NPCs/items between supported RPG systems. |

---

## 12. Canvas-based Exploration

| Priority | Feature                                   | Source(s)       | Tags        | Notes |
|---------:|-------------------------------------------|-----------------|------------|-------|
| P1       | Canvas Mode (layout + pins)              | Anvil & Loom    | #original   | Unified canvas for maps AND crawls; grid or node-based, supports tiles plus tags/links/pins to Entries. |
| P2       | Environment-specific tile sets           | Anvil & Loom    | #original   | Tiles/themes per Aspect/Domain (dungeon rooms, forest clearings, city blocks, caverns, etc.). |
| P2       | Tile ↔ Entry linking                     | Anvil & Loom    | #original   | Click a tile/region to open or create a linked Entry for that location, keeping crawls tied to Tapestries. |
