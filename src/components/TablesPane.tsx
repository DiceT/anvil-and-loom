import { useEffect, useMemo, useState } from "react";
import { Dices, ChevronRight } from "lucide-react";
import type { TableDescriptor } from "../types";
import type { ForgeTable } from "../lib/tables/tableForge";
import { rollOracleD100 } from "../core/dice/diceEngine";
import { fetchTableList, fetchTableById } from "../lib/tables/tableRegistry";
import type { ResultCard } from "../core/results/resultModel";
import { convertTableToCard } from "../core/results/converters";
import { useUiSettings } from "../contexts/UiSettingsContext";

export interface OracleResultCardPayload {
  tableId: string;
  tableName: string;
  roll: number;
  resultText: string;
  tags: string[];
  sourcePath: string;
  category?: string;
}

interface OracleRollResult {
  tableId: string;
  tableName: string;
  roll: number;
  resultText: string;
  timestamp: number;
  category?: string;
}

function getMaxRollForTable(table: ForgeTable): number {
  if (typeof table.maxRoll === "number" && table.maxRoll > 0) {
    return table.maxRoll;
  }

  if (Array.isArray(table.tableData) && table.tableData.length > 0) {
    const ceilings = table.tableData
      .map((row: any) =>
        typeof row.ceiling === "number" ? row.ceiling : 0
      )
      .filter((v: number) => v > 0);
    if (ceilings.length > 0) return Math.max(...ceilings);
  }

  return 100;
}

export default function TablesPane({
  activeEntryId,
  onOracleResult,
  onResultCard,
  onOpenTableEditor,
}: {
  activeEntryId: string | null;
  onOracleResult: (payload: OracleResultCardPayload) => void;
  onResultCard?: (card: ResultCard) => void;
  onOpenTableEditor: (tableId: string) => void;
}) {
  const [tableList, setTableList] = useState<TableDescriptor[]>([]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { settings: uiSettings } = useUiSettings();
  const [results, setResults] = useState<OracleRollResult[]>([]);
  const [isRolling, setIsRolling] = useState(false);

  // collapse state
  const [categoryOpen, setCategoryOpen] = useState<Record<string, boolean>>({});
  const [parentOpen, setParentOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchTableList()
      .then(setTableList)
      .catch(() => setTableList([]));
  }, []);

  const isSearching = query.trim().length > 0;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tableList;

    return tableList.filter((t) => {
      const nameMatch = t.name?.toLowerCase().includes(q);
      const tagMatch = (t.tags || []).some((tag) =>
        tag.toLowerCase().includes(q)
      );
      const typeMatch = t.oracle_type?.toLowerCase().includes(q);
      const catMatch = t.category?.toLowerCase().includes(q);
      const parentMatch = t.parentName?.toLowerCase().includes(q);
      return Boolean(
        nameMatch || tagMatch || typeMatch || catMatch || parentMatch
      );
    });
  }, [query, tableList]);

  // category -> parentName -> TableDescriptor[]
  const grouped = useMemo(() => {
    const groups: Record<string, Record<string, TableDescriptor[]>> = {};

    for (const td of filtered) {
      const category = td.category || "Other";
      const parent = td.parentName || "Unknown";

      if (!groups[category]) groups[category] = {};
      if (!groups[category][parent]) groups[category][parent] = [];

      groups[category][parent].push(td);
    }

    return groups;
  }, [filtered]);

  // keep selectedTable fetch but optional; used to populate sourcePath
  const [selectedTable, setSelectedTable] = useState<ForgeTable | null>(null);
  useEffect(() => {
    if (!selectedId) {
      setSelectedTable(null);
      return;
    }
    fetchTableById(selectedId)
      .then((t) => setSelectedTable(t))
      .catch(() => setSelectedTable(null));
  }, [selectedId]);

  const performRolls = async (
    table: ForgeTable,
    tableId: string,
    times: number
  ) => {
    const max = Math.max(1, getMaxRollForTable(table));
    const tableName = table.name || tableId;
    const tableTags = table.tags || [];
    const sourcePath = (table as any).sourcePath || "";

    const newResults: OracleRollResult[] = [];

    for (let i = 0; i < times; i++) {
      try {
        setIsRolling(true);
        const r = await rollOracleD100({ tableId, tableName, sourcePath });

        // normalize into range 1..max
        const normalized = Math.max(1, Math.min(max, Math.floor(((r - 1) % max) + 1)));

        const row = (table.tableData || []).find(
          (row: any) =>
            typeof row.floor === "number" &&
            typeof row.ceiling === "number" &&
            normalized >= row.floor &&
            normalized <= row.ceiling
        );

        const resultText = row?.result ?? "";

        const entry: OracleRollResult = {
          tableId,
          tableName,
          roll: normalized,
          resultText,
          timestamp: Date.now(),
          category: table.category || undefined,
        };
        newResults.push(entry);

        if (uiSettings.logToEntry && activeEntryId && onOracleResult && resultText) {
          // Send to entry the same payload used by other parts of the app
          const payload = {
            tableId,
            tableName,
            roll: normalized,
            resultText,
            tags: tableTags,
            sourcePath,
            category: table.category,
          } as OracleResultCardPayload;
          onOracleResult(payload);
        }

        // Emit ResultCard to Results pane if callback is provided
        if (onResultCard && resultText) {
          const isOracle = table.category !== "Aspect" && table.category !== "Domain";
          const card = convertTableToCard({
            tableId,
            tableName,
            roll: normalized,
            resultText,
            category: table.category,
            sourcePath,
            isOracle,
          });
          onResultCard(card);
        }
      } catch (e) {
        console.error("Oracle roll failed:", e);
      } finally {
        setIsRolling(false);
      }
    }

    setResults((prev) => [...newResults, ...prev].slice(0, 20));
  };

  const rollOnTable = (times: number) => {
    if (!selectedId || !selectedTable) return;
    performRolls(selectedTable, selectedId, times);
  };

  const rollOnSpecificTable = async (
    descriptor: TableDescriptor,
    times: number
  ) => {
    try {
      const table = await fetchTableById(descriptor.id);
      setSelectedId(descriptor.id);
      setSelectedTable(table);
      performRolls(table, descriptor.id, times);
    } catch (err) {
      console.error("Failed to roll on table:", err);
    }
  };

  const latest = results[0] ?? null;
  return (
    <div className="oracles-pane-root">
      {/* HEADER: title row */}
      <div className="oracles-title" style={{ marginBottom: '0.25rem' }}>
        <span className="settings-section-subtitle">ORACLES AND TABLES</span>
      </div>

      {/* TOP: search */}
      <div className="oracles-header">
        <input
          className="oracles-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tables..."
        />
      </div>

      {/* MIDDLE: scrollable table tree */}
      <div className="oracles-tree">
        {Object.keys(grouped).length === 0 && (
          <div className="dice-dev-hint">No tables found.</div>
        )}

        {Object.entries(grouped).map(([category, parentMap]) => {
          const catKey = category;
          const catOpen = isSearching ? true : categoryOpen[catKey] ?? false;

          return (
            <div key={category}>
              <button
                type="button"
                className="tapestry-tree-row"
                onClick={() => setCategoryOpen((prev) => ({ ...prev, [catKey]: !catOpen }))}
              >
                <ChevronRight size={14} style={{ transform: catOpen ? 'rotate(90deg)' : 'rotate(0deg)' }} />
                <span className="settings-section-subtitle">{category}</span>
              </button>

              {catOpen && Object.entries(parentMap).map(([parentName, list]) => {
                const parentKey = `${category}::${parentName}`;
                const pOpen = isSearching ? true : parentOpen[parentKey] ?? false;

                return (
                  <div key={parentName} style={{ marginLeft: 12 }}>
                    <button
                      type="button"
                      className="tapestry-tree-row"
                      onClick={() => setParentOpen((prev) => ({ ...prev, [parentKey]: !pOpen }))}
                    >
                      <ChevronRight size={14} style={{ transform: pOpen ? 'rotate(90deg)' : 'rotate(0deg)' }} />
                      <span className="settings-section-subtitle">{parentName}</span>
                    </button>

                    {pOpen && list.map((td) => {
                      const isCore = td.sourcePath.includes('/tables/core/') || td.sourcePath.includes('\\tables\\core\\');
                      const isActive = selectedId === td.id;
                      const parts = td.name.split(':');
                      const subName = parts.length > 1 ? parts[1].trim() : td.name;

                      return (
                        <div key={td.id} className="tapestry-tree-row-wrapper" style={{ marginLeft: 12 }}>
                          <button
                            type="button"
                            className={`tapestry-tree-row ${isActive ? 'tapestry-tree-row-active' : ''}`}
                            onClick={() => setSelectedId(td.id)}
                            title={isCore ? `${td.sourcePath} • core` : td.sourcePath}
                            style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', justifyContent: 'flex-start' }}
                          >
                            <span>{subName}</span>
                          </button>
                          <button
                            type="button"
                            className="dice-icon-button dice-icon-small"
                            title="Roll once"
                            aria-label="Roll once"
                            disabled={isRolling}
                            onClick={(e) => { e.stopPropagation(); rollOnSpecificTable(td, 1); }}
                          >
                            <Dices size={14} strokeWidth={2} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* BOTTOM: result card pinned to bottom */}
      <div className="oracles-footer">
        <div className="dice-card">
          <div className="dice-card-title" style={{ backgroundColor: "#255f1e", color: "#ffffff" }}>
            {latest ? `${latest.category === "Aspect" ? "ASPECT" : latest.category === "Domain" ? "DOMAIN" : "ORACLE"}: ${latest.tableName.toUpperCase()}` : 'TABLE: —'}
          </div>
          <div className="dice-card-body">
            <div className="dice-card-detail">
              Roll: <strong>{latest ? latest.roll : '—'}</strong>
            </div>
          </div>
          <div className="dice-card-highlight">
            <span className="dice-card-inline-result">
              {latest ? latest.resultText : 'No rolls yet.'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
