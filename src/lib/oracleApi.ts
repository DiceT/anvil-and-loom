import type { EntryOracleSnapshot, AISettings } from './types-oracle';

async function fetchJson(url: string, body: any) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => 'Unknown error');
    throw new Error(text || res.statusText || 'Request failed');
  }
  return res.json();
}

export async function interpretEntryOracleClient(
  snapshot: EntryOracleSnapshot,
  settings: AISettings
): Promise<{ success: true; text: string } | { success: false; error: string }> {
  // Desktop bridge
  const bridge: any = (window as any).settingsAPI;
  if (bridge?.interpretEntryOracle) {
    try {
      const r = await bridge.interpretEntryOracle(snapshot, settings);
      return r;
    } catch (e: any) {
      return { success: false, error: e?.message ?? 'Bridge error' };
    }
  }

  // Web fallback
  try {
    const j = await fetchJson('/api/oracle/interpret', { snapshot, settings });
    return j;
  } catch (e: any) {
    return { success: false, error: e?.message ?? 'Network error' };
  }
}
