import { useMemo, useState } from 'react';
import { fetchAppSettings } from '../lib/settingsStore';
import { interpretEntryOracle } from '../core/ai/oracleService';
import type { AISettings } from '../core/ai/oraclePersonas';
import type { OracleResultCardPayload, EntryOracleSnapshot } from '../core/ai/oracleTypes';
import { renderResultCardHtml } from '../core/results/ResultCard';
import { convertInterpretationToCard } from '../core/results/converters';
import { emitResultCard } from '../core/dice/diceEngine';

function parseForgeOracleComments(content: string): OracleResultCardPayload[] {
  const results: OracleResultCardPayload[] = [];
  if (!content) return results;
  const regex = /<!--\s*forge:oracle\s+([^>-]+)-->?/g;
  let m;
  while ((m = regex.exec(content)) !== null) {
    const attrString = m[1] || '';
    const attrs: Record<string, string> = {};
    // parse key="value" and key='value' and key=value
    const pairRe = /([a-zA-Z0-9_:-]+)=(?:"([^"]*)"|'([^']*)'|([^\s]*))/g;
    let pm;
    while ((pm = pairRe.exec(attrString)) !== null) {
      const key = pm[1];
      const value = pm[2] ?? pm[3] ?? pm[4] ?? '';
      attrs[key] = value;
    }
    const tableId = attrs.tableId ?? '';
    const sourcePath = attrs.sourcePath ?? '';
    const roll = attrs.roll ? Number.parseInt(attrs.roll, 10) : NaN;
    const result = attrs.result ? attrs.result : '';
    let tags: string[] = [];
    if (attrs.tags) {
      try {
        tags = JSON.parse(attrs.tags);
      } catch {
        // fallback: split on commas
        tags = attrs.tags.split(',').map((s) => s.trim()).filter(Boolean);
      }
    }

    if (tableId) {
      results.push({
        tableId,
        tableName: attrs.tableName ?? '',
        roll: Number.isFinite(roll) ? roll : 0,
        resultText: result,
        tags,
        sourcePath,
      });
    }
  }
  return results;
}

function escapeHtml(text: string) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export default function InterpretButton({
  entryContent,
  entryId,
  onAppend,
  onReplace,
  getAiSettings,
}: {
  entryContent: string;
  entryId: string | null;
  onAppend: (html: string) => void;
  onReplace: (placeholderHtml: string, replacementHtml: string) => void;
  getAiSettings: () => AISettings;
}) {
  const [isWorking, setIsWorking] = useState(false);

  const oracleResults = useMemo(() => parseForgeOracleComments(entryContent), [entryContent]);

  const disabled = isWorking || oracleResults.length === 0 || !entryId;

  async function handleClick() {
    if (disabled) return;
    const settings = getAiSettings();
    const snapshot: EntryOracleSnapshot = {
      entryId: entryId ?? '',
      title: '',
      oracleResults,
    };

    // create placeholder card html with explicit start/end markers so replacement is robust
    const placeholderId = `interpret-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const placeholderStart = `<!-- interpret:start id="${placeholderId}" -->`;
    const placeholderEnd = `<!-- interpret:end id="${placeholderId}" -->`;
    const placeholderCard = `<div class="dice-card dice-card-inline dice-log-card"><input type="checkbox" id="${placeholderId}" class="dice-log-toggle" /><label for="${placeholderId}" class="dice-card-title dice-log-header"><span>INTERPRETATION: ${escapeHtml(settings.oracleName)}</span><span class="dice-log-caret" aria-hidden="true"></span></label><div class="dice-card-body dice-log-body"> <div class="dice-card-detail">Thinking…</div></div><div class="dice-card-highlight dice-log-footer"><span class="dice-log-footer-label">Result:</span><span class="dice-card-inline-result">…</span></div></div>`;
    const placeholderHtml = `${placeholderStart}\n${placeholderCard}\n${placeholderEnd}`;

    setIsWorking(true);
    try {
      onAppend(placeholderHtml);
      console.debug('[InterpretButton] appended placeholder', { placeholderId, len: placeholderHtml.length });

      // call desktop bridge if available
      let resp: { success: true; text: string } | { success: false; error: string } | null = null;
      const bridge: any = (window as any).settingsAPI;
      if (bridge?.interpretEntryOracle) {
        try {
          console.debug('[InterpretButton] using bridge interpretEntryOracle');
          resp = await bridge.interpretEntryOracle(snapshot, settings);
        } catch (e: any) {
          resp = { success: false, error: e?.message ?? 'Unknown error' };
        }
      } else {
        // No desktop bridge: use new oracle service (calls /api/ai/chat endpoint)
        try {
          const clientSettings = await fetchAppSettings();
          const modelToUse = (clientSettings?.openaiModel || settings.model || 'gpt-4o-mini');

          // Use the centralized oracle service
          const aiSettings: AISettings = {
            oracleName: settings.oracleName,
            oraclePersonaId: settings.oraclePersonaId as any,
            model: modelToUse,
            temperature: settings.temperature,
          };

          const text = await interpretEntryOracle(snapshot, aiSettings);
          resp = { success: true, text };
        } catch (e: any) {
          resp = { success: false, error: e?.message ?? 'Network error' };
        }
      }

      if (resp && resp.success) {
        const raw = (resp.text || '').toString();
        if (!raw.trim()) {
          const errorMsg = 'AI returned empty response';

          const errHtml = `<div class="dice-card dice-card-inline dice-log-card"><input type="checkbox" id="${placeholderId}-err" class="dice-log-toggle" /><label for="${placeholderId}-err" class="dice-card-title dice-log-header"><span>INTERPRETATION: ${escapeHtml(settings.oracleName)}</span><span class="dice-log-caret" aria-hidden="true"></span></label><div class="dice-card-body dice-log-body"><div class="dice-card-detail">Failed to interpret oracle results: ${escapeHtml(errorMsg)}</div></div><div class="dice-card-highlight dice-log-footer"><span class="dice-log-footer-label">Result:</span><span class="dice-card-inline-result">${escapeHtml(errorMsg)}</span></div></div>`;
          console.debug('[InterpretButton] AI returned empty; replacing placeholder with error', { placeholderId, errorMsg });
          onReplace(placeholderHtml, errHtml);
        } else {
          // Support structured responses (JSON) with { interpretation, snapshot }
          let interpretation = raw;
          let snapshotText = '';
          let parsedAsJson = false;
          try {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
              if (typeof parsed.interpretation === 'string') interpretation = parsed.interpretation;
              if (typeof parsed.snapshot === 'string') snapshotText = parsed.snapshot;
              if (!snapshotText && typeof parsed.snapshotText === 'string') snapshotText = parsed.snapshotText;
              parsedAsJson = true;
            }
          } catch (e) {
            // not JSON, fall back to plain text parsing
          }

          if (!parsedAsJson) {
            // Try to extract numbered sections like "1) INTERPRETATION ... 2) SNAPSHOT ..."
            const norm = raw.replace(/\r/g, '');
            const secRe = /^\s*1\)\s*(?:INTERPRETATION\b[:\s-]*)?([\s\S]*?)\s*\n\s*2\)\s*(?:SNAPSHOT\b[:\s-]*)?([\s\S]*)$/i;
            const m = norm.match(secRe);
            if (m) {
              interpretation = m[1].trim();
              snapshotText = m[2].trim();
            } else {
              // Fallback: split on a "2)" marker anywhere
              const split = norm.split(/\n\s*2\)\s*(?:SNAPSHOT\b[:\s-]*)?/i);
              interpretation = (split[0] || '').replace(/^\s*1\)\s*(?:INTERPRETATION\b[:\s-]*)?/i, '').trim();
              snapshotText = (split[1] || '').trim();
              // If still no snapshot, look for a SNAPSHOT label elsewhere
              if (!snapshotText) {
                const snapMatch = norm.match(/(?:\n|^)\s*(?:2\)\s*)?SNAPSHOT\b[:\s-]*([\s\S]*)$/i);
                if (snapMatch) snapshotText = snapMatch[1].trim();
              }
            }
          }

          // If snapshot still empty, fall back to heuristic extraction from interpretation text
          if (!snapshotText) {
            const lines = interpretation.split('\n').filter(line => line.trim());
            let snapshotGuess = lines[lines.length - 1] || interpretation.slice(0, 100);
            const lastLine = lines[lines.length - 1];
            if (lastLine && !lastLine.match(/^[-•*]/) && !lastLine.toLowerCase().includes('next move')) {
              if (lastLine.length <= 150) {
                snapshotGuess = lastLine;
              }
            }
            snapshotText = snapshotGuess;
          }

          // Use converter to create the card
          const interpretationCard = convertInterpretationToCard({
            oracleName: settings.oracleName,
            personaId: settings.oraclePersonaId,
            snapshot: snapshotText,
            interpretation: interpretation,
          });

          const finalHtml = renderResultCardHtml(interpretationCard) + `\n<!-- interpret:meta id="${placeholderId}" -->`;
          console.debug('[InterpretButton] replacing placeholder', { placeholderId, placeholderLen: placeholderHtml.length, replacementLen: finalHtml.length, textPreview: (interpretation || '').slice(0, 200) });
          onReplace(placeholderHtml, finalHtml);

          // Emit InterpretationResultCard to Results pane
          emitResultCard(interpretationCard);
        }
      } else {
        const errorMsg = resp?.error ?? 'Unknown error';
        const errHtml = `<div class="dice-card dice-card-inline dice-log-card"><input type="checkbox" id="${placeholderId}-err" class="dice-log-toggle" /><label for="${placeholderId}-err" class="dice-card-title dice-log-header"><span>INTERPRETATION: ${escapeHtml(settings.oracleName)}</span><span class="dice-log-caret" aria-hidden="true"></span></label><div class="dice-card-body dice-log-body"><div class="dice-card-detail">Failed to interpret oracle results: ${escapeHtml(errorMsg)}</div></div><div class="dice-card-highlight dice-log-footer"><span class="dice-log-footer-label">Result:</span><span class="dice-card-inline-result">${escapeHtml(errorMsg)}</span></div></div>`;
        console.debug('[InterpretButton] replacing placeholder with error', { placeholderId, placeholderLen: placeholderHtml.length, replacementLen: errHtml.length, error: errorMsg });
        onReplace(placeholderHtml, errHtml);
      }
    } finally {
      setTimeout(() => setIsWorking(false), 500); // slight cooldown
    }
  }

  return (
    <button
      type="button"
      className="settings-secondary-button"
      onClick={handleClick}
      disabled={disabled}
    >
      {isWorking ? 'Interpreting…' : 'Interpret Oracle Results'}
    </button>
  );
}
