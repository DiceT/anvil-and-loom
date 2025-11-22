import { useEffect, useMemo, useState } from "react";
import type { ForgeTable } from "../lib/tables/tableForge";
import {
  createEmptyAspectTables,
  createEmptyDomainTables,
} from "../lib/tables/tableForge";
import { fillTablesWithAI, fillTableWithAI } from "../lib/tables/aiTableFiller";
import { fetchAppSettings, subscribeToSettings, type AppSettings } from "../lib/settingsStore";

function slugify(input: string): string {
  return (input || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

type ForgeType = "Aspect" | "Domain";

export default function DevTableForgePane() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<ForgeType>("Aspect");
  const [tables, setTables] = useState<ForgeTable[] | null>(null);
  const [selected, setSelected] = useState<string>("Objectives");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFilling, setIsFilling] = useState(false);
  const [aiSettings, setAiSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    fetchAppSettings().then(setAiSettings).catch(() => setAiSettings(null));
    unsub = subscribeToSettings((s) => setAiSettings(s));
    return () => {
      unsub && unsub();
    };
  }, []);

  const tableNames = useMemo(() => {
    return type === "Aspect"
      ? ["Objectives", "Atmosphere", "Manifestations", "Discoveries", "Banes", "Boons"]
      : ["Objectives", "Atmosphere", "Locations", "Discoveries", "Banes", "Boons"];
  }, [type]);

  const generate = () => {
    setError(null);
    setStatus(null);
    const trimmedName = name.trim();
    const trimmedDesc = description.trim();
    if (!trimmedName) {
      setError("Enter a Name before generating.");
      return;
    }
    const next = type === "Aspect"
      ? createEmptyAspectTables(trimmedName, trimmedDesc)
      : createEmptyDomainTables(trimmedName, trimmedDesc);
    setTables(next);
    setSelected(tableNames[0]);
    setStatus("Generated empty tables.");
  };

  const currentTable = useMemo(() => {
    if (!tables) return null;
    return tables.find((t) => t.name === selected) ?? tables[0] ?? null;
  }, [tables, selected]);

  const jsonPreview = useMemo(() => {
    if (!currentTable) return "";
    return JSON.stringify(currentTable, null, 2);
  }, [currentTable]);

  const save = async (saveAs: ForgeType) => {
    try {
      setError(null);
      setStatus(null);
      if (!tables) {
        setError("Nothing to save. Generate first.");
        return;
      }
      const trimmedName = name.trim();
      if (!trimmedName) {
        setError("Enter a Name before saving.");
        return;
      }
      const slug = slugify(trimmedName);
      const payload = {
        type: saveAs === "Aspect" ? "aspect" : "domain",
        name: trimmedName,
        json: JSON.stringify(tables, null, 2),
      };
      if (!window.settingsAPI?.devSaveTableJson) {
        setError("Saving requires the Electron desktop app. Launch the desktop app (e.g., run 'pnpm dev' and 'pnpm electron') and try again.");
        return;
      }
      const result = await window.settingsAPI.devSaveTableJson(payload);
      if (result?.ok) setStatus(`Saved ${saveAs} JSON to ${result.path}`);
      else setStatus("Saved.");
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? "Save failed");
    }
  };

  return (
    <div className="dice-dev-panel">
      <div className="dice-dev-controls">
        <label>Table Forge</label>
      </div>

      <div className="dice-dev-input-row">
        <button
          type="button"
          className={`dice-adv-toggle${type === "Aspect" ? " dice-adv-toggle-active" : ""}`}
          onClick={() => setType("Aspect")}
          aria-label="Aspect"
        >
          Aspect
        </button>
        <button
          type="button"
          className={`dice-adv-toggle${type === "Domain" ? " dice-adv-toggle-active" : ""}`}
          onClick={() => setType("Domain")}
          aria-label="Domain"
        >
          Domain
        </button>
      </div>

      <div className="dice-dev-input-row">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name (e.g., Haunted, Overgrown, Forest, Cemetery)"
        />
      </div>

      <div className="dice-dev-input-row">
        <textarea
          className="app-editor-textarea"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="2–3 sentence descriptor"
        />
      </div>

      <div className="dice-dev-input-row">
        <button type="button" className="settings-secondary-button" onClick={generate}>Generate Empty Tables</button>
        <button type="button" className="settings-secondary-button" onClick={() => currentTable && navigator.clipboard?.writeText(jsonPreview)} disabled={!currentTable}>Copy JSON</button>
        <button
          type="button"
          className="settings-secondary-button"
          onClick={async () => {
            try {
              setError(null);
              setStatus(null);
              if (!tables) return;
              const key = aiSettings?.openaiApiKey?.trim();
              const model = aiSettings?.openaiModel?.trim();
              if (!key || !model) {
                setError("Please set OpenAI API key and model in Settings → AI.");
                return;
              }
              setIsFilling(true);
              setStatus("Filling tables with AI…");
              const filled = await fillTablesWithAI(tables, {
                name: name.trim(),
                type: type === "Aspect" ? "aspect" : "domain",
                description: description.trim(),
                genre: "dark-fantasy",
                model,
                apiKey: key,
              });
              setTables(filled);
              setStatus("Tables filled.");
            } catch (e: any) {
              setError(e?.message ?? "AI generation failed");
              setStatus(null);
            } finally {
              setIsFilling(false);
            }
          }}
          disabled={!tables || isFilling}
        >
          {isFilling ? "Filling…" : "Fill all tables with AI"}
        </button>
      </div>

      {tables && (
        <div className="dice-dev-output">
          <div className="dice-dev-input-row">
            <label>Preview</label>
            <select className="settings-select" value={selected} onChange={(e) => setSelected(e.target.value)}>
              {tableNames.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <pre className="dice-dev-json">{jsonPreview}</pre>
          <div className="dice-dev-input-row">
            <button
              type="button"
              className="settings-secondary-button"
              onClick={async () => {
                try {
                  setError(null);
                  setStatus(null);
                  if (!tables || !currentTable) return;
                  const key = aiSettings?.openaiApiKey?.trim();
                  const model = aiSettings?.openaiModel?.trim();
                  if (!key || !model) {
                    setError("Please set OpenAI API key and model in Settings → AI.");
                    return;
                  }
                  setIsFilling(true);
                  setStatus("Filling table with AI…");
                  const tag = (currentTable.oracle_type || currentTable.name || "").toLowerCase();
                  const kind = tag.includes("objective") ? "objectives"
                    : tag.includes("atmosphere") ? "atmosphere"
                    : tag.includes("manifestation") ? "manifestations"
                    : tag.includes("location") ? "locations"
                    : tag.includes("discover") ? "discoveries"
                    : tag.includes("bane") ? "banes"
                    : "boons";
                  const updated = await fillTableWithAI(currentTable, kind as any, {
                    name: name.trim(),
                    type: type === "Aspect" ? "aspect" : "domain",
                    description: description.trim(),
                    genre: "dark-fantasy",
                    model,
                    apiKey: key,
                  });
                  const next = tables.map((t) => t.name === currentTable.name ? updated : t);
                  setTables(next);
                  setStatus("Table filled.");
                } catch (e: any) {
                  setError(e?.message ?? "AI generation failed");
                  setStatus(null);
                } finally {
                  setIsFilling(false);
                }
              }}
              disabled={!currentTable || isFilling}
            >
              {isFilling ? "Filling…" : "Fill this table with AI"}
            </button>
            <button type="button" className="settings-secondary-button" onClick={() => save("Aspect")} disabled={!tables || !window.settingsAPI?.devSaveTableJson}>Save as Aspect JSON</button>
            <button type="button" className="settings-secondary-button" onClick={() => save("Domain")} disabled={!tables || !window.settingsAPI?.devSaveTableJson}>Save as Domain JSON</button>
          </div>
          {!window.settingsAPI?.devSaveTableJson && (
            <p className="dev-hint">Saving is available only in the Electron desktop app. Start the app (e.g., with "pnpm dev" and "pnpm electron") to enable saving.</p>
          )}
        </div>
      )}

      {status && <div className="dice-dev-warning">{status}</div>}
      {error && <div className="dice-dev-error">{error}</div>}
    </div>
  );
}
