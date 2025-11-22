// ../lib/tables/tableRegistry.ts

import type { ForgeTable } from "./tableForge";
import type { TableDescriptor } from "../../types";

// Grab ALL json files in aspects + domains.
// Adjust the relative path to match where this file sits.
const tableModules = import.meta.glob(
  "../../../electron/tables/{aspects,domains}/*.json",
  { eager: true }
);

interface TableCache {
  list: TableDescriptor[];
  byId: Record<string, ForgeTable>;
}

let cache: TableCache | null = null;

function titleCase(slug: string): string {
  if (!slug) return slug;
  return slug.charAt(0).toUpperCase() + slug.slice(1);
}

function normalizeSourcePath(path: string): string {
  // Show nice paths like /electron/tables/domains/catacombs.json
  const idx = path.lastIndexOf("electron");
  if (idx === -1) return path;
  return "/" + path.slice(idx).replace(/\\/g, "/");
}

function buildCaches() {
  if (cache) return;

  const list: TableDescriptor[] = [];
  const byId: Record<string, ForgeTable> = {};

  for (const [path, mod] of Object.entries(tableModules)) {
    // JSON module default export
    const raw = (mod as any).default ?? mod;

    // OLD FORMAT: { aspects: {...} } / { domains: {...} } → skip for now
    if (!Array.isArray(raw)) {
      continue;
    }

    // Decide Aspect vs Domain from folder name
    const isDomain = path.includes("/domains/");
    const isAspect = path.includes("/aspects/");
    const category: "Aspect" | "Domain" | "Other" =
      isDomain ? "Domain" : isAspect ? "Aspect" : "Other";

    if (category === "Other") {
      // Not in aspects/domains, ignore
      continue;
    }

    // Parent name from filename: /catacombs.json -> "Catacombs"
    const fileName = path.split(/[/\\]/).pop() || "";
    const slug = fileName.replace(/\.json$/i, "");
    const parentName = titleCase(slug);
    const sourcePath = normalizeSourcePath(path);

    (raw as ForgeTable[]).forEach((table, index) => {
      const oracleType =
        table.oracle_type || table.name || `Table ${index + 1}`;

      // Unique ID per subtable
      const id = `${category}:${parentName}:${oracleType}`;

      // Display name: "Catacombs: Objectives"
      const fullName = `${parentName}: ${table.name || oracleType}`;

      // Merge existing tags + our own
      const tags = Array.from(
        new Set([
          ...(table.tags ?? []),
          category.toLowerCase(),        // "aspect" or "domain"
          parentName.toLowerCase(),      // "catacombs"
          oracleType.toLowerCase(),      // "objectives"
        ])
      );

      const normalized: ForgeTable = {
        ...table,
        name: fullName,
        category,
        tags,
        sourcePath,
      };

      byId[id] = normalized;

      list.push({
        id,
        name: fullName,
        category,
        oracle_type: table.oracle_type,
        tags,
        sourcePath,
        parentName,
      });
    });
  }

  cache = { list, byId };
}

export async function fetchTableList(): Promise<TableDescriptor[]> {
  buildCaches();
  return cache!.list;
}

export async function fetchTableById(id: string): Promise<ForgeTable> {
  buildCaches();
  const table = cache!.byId[id];
  if (!table) {
    throw new Error(`Unknown table id: ${id}`);
  }
  return table;
}
