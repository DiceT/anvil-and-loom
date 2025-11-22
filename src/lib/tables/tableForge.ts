export type ForgeCategory = "Aspect" | "Domain";

export interface ForgeTableRow {
  floor: number;
  ceiling: number;
  result: string;
}

export interface ForgeTable {
  sourcePath: string;
  category: ForgeCategory;
  name: string; // table name (e.g., Objectives, Atmosphere, Manifestations/Locations, etc.)
  tags: string[];
  summary?: string;
  description?: string;
  headers: string[]; // ["Roll", "Result"]
  tableData: ForgeTableRow[];
  maxRoll: number; // 100
  oracle_type?: string;
  icon?: string;
  source?: { title: string; page?: number };
}

export interface ForgeFilePayload {
  category: ForgeCategory;
  name: string; // Aspect or Domain name (e.g., Haunted, Forest)
  description: string;
  tables: ForgeTable[];
}

function makeRangeRows(): ForgeTableRow[] {
  const rows: ForgeTableRow[] = [];
  for (let i = 1; i <= 100; i += 2) {
    rows.push({ floor: i, ceiling: i + 1, result: "" });
  }
  return rows;
}

function applyMacroRows(
  rows: ForgeTableRow[],
  macros: Array<{ range: [number, number]; text: string }>
) {
  const byStart: Record<number, string> = {};
  macros.forEach((m) => {
    byStart[m.range[0]] = m.text;
  });
  return rows.map((r) => {
    const macro = byStart[r.floor];
    return macro ? { ...r, result: macro } : r;
  });
}

function baseTable(
  category: ForgeCategory,
  tableName: string,
  tags: string[],
  description?: string,
  oracleType?: string
): ForgeTable {
  return {
    sourcePath: "forge",
    category,
    name: tableName,
    tags,
    description,
    headers: ["Roll", "Result"],
    tableData: makeRangeRows(),
    maxRoll: 100,
    oracle_type: oracleType,
  };
}

// Macro conventions (current intent):
// - Most tables: 97-98 => ACTION + THEME, 99-100 => ROLL TWICE
// - Discoveries (and often Banes/Boons): 97-98 => DESCRIPTOR + FOCUS, 99-100 => ROLL TWICE
// - Some tables benefit from adding a mid-high macro: 95-96 => CONNECTION WEB

function withActionAspectMacros(rows: ForgeTableRow[], includeConnectionWeb = false) {
  const macros: Array<{ range: [number, number]; text: string }> = [
    ...(includeConnectionWeb ? [{ range: [95, 96], text: "CONNECTION WEB" }] : []),
    { range: [97, 98], text: "ACTION + THEME" },
    { range: [99, 100], text: "ROLL TWICE" },
  ];
  return applyMacroRows(rows, macros);
}

function withDescriptorFocusMacros(rows: ForgeTableRow[], includeConnectionWeb = false) {
  const macros: Array<{ range: [number, number]; text: string }> = [
    ...(includeConnectionWeb ? [{ range: [95, 96], text: "CONNECTION WEB" }] : []),
    { range: [97, 98], text: "DESCRIPTOR + FOCUS" },
    { range: [99, 100], text: "ROLL TWICE" },
  ];
  return applyMacroRows(rows, macros);
}

export function createEmptyAspectTables(name: string, description: string): ForgeTable[] {
  const category: ForgeCategory = "Aspect";
  const tagsBase = ["aspect"];

  const objectives: ForgeTable = baseTable(category, "Objectives", [...tagsBase, "objective"], undefined, "Objectives");
  objectives.tableData = withActionAspectMacros(objectives.tableData);

  const atmosphere: ForgeTable = baseTable(category, "Atmosphere", tagsBase, undefined, "Atmosphere");
  atmosphere.tableData = withActionAspectMacros(atmosphere.tableData);

  const manifestations: ForgeTable = baseTable(category, "Manifestations", tagsBase, undefined, "Manifestations");
  manifestations.tableData = withActionAspectMacros(manifestations.tableData, true);

  const discoveries: ForgeTable = baseTable(category, "Discoveries", tagsBase, undefined, "Discoveries");
  discoveries.tableData = withDescriptorFocusMacros(discoveries.tableData, true);

  const banes: ForgeTable = baseTable(category, "Banes", tagsBase, undefined, "Banes");
  banes.tableData = withDescriptorFocusMacros(banes.tableData);

  const boons: ForgeTable = baseTable(category, "Boons", tagsBase, undefined, "Boons");
  boons.tableData = withDescriptorFocusMacros(boons.tableData);

  // Optionally carry the parent description onto each table for context
  ;[objectives, atmosphere, manifestations, discoveries, banes, boons].forEach((t) => {
    t.summary = `${name} — ${t.name}`;
    t.description = description;
  });

  return [objectives, atmosphere, manifestations, discoveries, banes, boons];
}

export function createEmptyDomainTables(name: string, description: string): ForgeTable[] {
  const category: ForgeCategory = "Domain";
  const tagsBase = ["domain"];

  const objectives: ForgeTable = baseTable(category, "Objectives", [...tagsBase, "objective"], undefined, "Objectives");
  objectives.tableData = withActionAspectMacros(objectives.tableData);

  const atmosphere: ForgeTable = baseTable(category, "Atmosphere", tagsBase, undefined, "Atmosphere");
  atmosphere.tableData = withActionAspectMacros(atmosphere.tableData);

  const locations: ForgeTable = baseTable(category, "Locations", tagsBase, undefined, "Locations");
  locations.tableData = withActionAspectMacros(locations.tableData, true);

  const discoveries: ForgeTable = baseTable(category, "Discoveries", tagsBase, undefined, "Discoveries");
  discoveries.tableData = withDescriptorFocusMacros(discoveries.tableData, true);

  const banes: ForgeTable = baseTable(category, "Banes", tagsBase, undefined, "Banes");
  banes.tableData = withDescriptorFocusMacros(banes.tableData);

  const boons: ForgeTable = baseTable(category, "Boons", tagsBase, undefined, "Boons");
  boons.tableData = withDescriptorFocusMacros(boons.tableData);

  ;[objectives, atmosphere, locations, discoveries, banes, boons].forEach((t) => {
    t.summary = `${name} — ${t.name}`;
    t.description = description;
  });

  return [objectives, atmosphere, locations, discoveries, banes, boons];
}

export function buildForgeFile(
  category: ForgeCategory,
  name: string,
  description: string,
  tables: ForgeTable[]
): ForgeFilePayload {
  return { category, name, description, tables };
}
