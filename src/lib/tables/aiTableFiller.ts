import type { ForgeTable, ForgeTableRow } from "./tableForge";

export type TableKind =
  | "objectives"
  | "atmosphere"
  | "locations"
  | "manifestations"
  | "discoveries"
  | "banes"
  | "boons";

export interface TableContext {
  name: string;
  type: "aspect" | "domain";
  description: string;
  genre: "dark-fantasy" | "fantasy" | "sci-fi" | "starforged";
  model: string;
  apiKey: string;
}

function isMacro(text: string | undefined | null): boolean {
  const v = (text || "").toUpperCase().trim();
  if (!v) return false;
  return (
    v === "ACTION + THEME" ||
    v === "DESCRIPTOR + FOCUS" ||
    v === "CONNECTION WEB" ||
    v === "ROLL TWICE"
  );
}

function countEmptyNonMacroRows(table: ForgeTable): number {
  return (table.tableData ?? []).filter((row) => !row.result || (!row.result.trim() && !isMacro(row.result))).length;
}

function mapKindDisplay(kind: TableKind): string {
  switch (kind) {
    case "objectives":
      return "Objectives";
    case "atmosphere":
      return "Atmosphere";
    case "locations":
      return "Locations";
    case "manifestations":
      return "Manifestations";
    case "discoveries":
      return "Discoveries";
    case "banes":
      return "Banes";
    case "boons":
      return "Boons";
  }
}

function buildPrompt(table: ForgeTable, kind: TableKind, context: TableContext): { system: string; user: string } {
  const N = countEmptyNonMacroRows(table);
  const kindDisplay = mapKindDisplay(kind);
  const base = `You are an assistant that writes evocative, concise ${context.genre} oracle/table results for solo RPG play.
Follow these rules strictly:
- Write short, punchy results (4–10 words). No punctuation at the end unless essential.
- No duplicates or near-duplicates. Each line must be distinct.
- Avoid proper nouns. Focus on mood, texture, action.
- Maintain the theme of the ${context.type} "${context.name}".
- Do NOT include any macros like "ACTION + THEME", "DESCRIPTOR + FOCUS", "CONNECTION WEB", or "ROLL TWICE".
- Output only JSON: a plain array of ${N} strings. No comments, markdown, or extra fields.
`;
  const user = `Aspect/Domain: ${context.name} (${context.type})
Description: ${context.description}
Table: ${kindDisplay}
Genre: ${context.genre}
Rows needed: ${N}
Return: JSON array of ${N} strings.`;
  return { system: base, user };
}

async function fetchOpenAI(model: string, apiKey: string, system: string, user: string): Promise<string[]> {
  // Use the same client-side chat/completions call the Dev Table used originally.
  const { callChatModelRenderer } = await import('../openaiClient');
  const messages = [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
  const text = await callChatModelRenderer(apiKey, model, messages);

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    // Try to extract JSON array from content that may have text around it
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) {
      throw new Error("Failed to parse AI response as JSON array");
    }
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      throw new Error("Failed to parse extracted JSON array");
    }
  }
  if (!Array.isArray(parsed)) throw new Error("AI response was not an array");
  const results = (parsed as unknown[]).map((v) => (typeof v === "string" ? v.trim() : String(v)));
  return results;
}

export async function fillTableWithAI(
  table: ForgeTable,
  kind: TableKind,
  context: TableContext
): Promise<ForgeTable> {
  const needed = countEmptyNonMacroRows(table);
  if (needed <= 0) return table;
  const { system, user } = buildPrompt(table, kind, context);
  const generated = await fetchOpenAI(context.model, context.apiKey, system, user);
  if (!Array.isArray(generated) || generated.length < needed) {
    throw new Error(`AI returned insufficient rows (needed ${needed}, got ${generated.length})`);
  }
  const filled: ForgeTable = { ...table, tableData: [...(table.tableData ?? [])] };
  let cursor = 0;
  for (let i = 0; i < filled.tableData.length; i++) {
    const row: ForgeTableRow = filled.tableData[i];
    const current = row.result ?? "";
    if (!current.trim() && !isMacro(current)) {
      filled.tableData[i] = { ...row, result: generated[cursor++] ?? "" };
      if (cursor >= generated.length) break;
    }
  }
  return filled;
}

export async function fillTablesWithAI(
  tables: ForgeTable[],
  context: TableContext
): Promise<ForgeTable[]> {
  const results: ForgeTable[] = [];
  for (const table of tables) {
    const kind = inferKind(table);
    results.push(await fillTableWithAI(table, kind, context));
  }
  return results;
}

function inferKind(table: ForgeTable): TableKind {
  const tag = (table.oracle_type || table.name || "").toLowerCase();
  if (tag.includes("objective")) return "objectives";
  if (tag.includes("atmosphere")) return "atmosphere";
  if (tag.includes("manifestation")) return "manifestations";
  if (tag.includes("location")) return "locations";
  if (tag.includes("discover")) return "discoveries";
  if (tag.includes("bane")) return "banes";
  if (tag.includes("boon")) return "boons";
  return "discoveries";
}
