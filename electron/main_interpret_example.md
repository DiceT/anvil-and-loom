Example Electron main-process handler for interpretEntryOracle

This is an example to show how to implement the bridge used by the renderer.
It assumes you have an existing IPC/bridge system exposing window.settingsAPI in the renderer.

// in your main process (e.g., main.js / main.ts)

const { app, ipcMain } = require('electron');
const fetch = require('node-fetch'); // or global fetch in newer Node

ipcMain.handle('interpretEntryOracle', async (event, snapshot, settings) => {
  try {
    // Read saved OpenAI key from your secure store or settings file
    const apiKey = await readUserOpenAiKeySomehow();
    if (!apiKey) return { success: false, error: 'OpenAI API key not set' };

    // Import the prompt builder (you may need to require a compiled JS module or reimplement builders here)
    const { buildOracleSystemPrompt, buildOracleUserPrompt } = require('./path/to/oraclePrompts');

    const systemPrompt = buildOracleSystemPrompt(settings);
    const userPrompt = buildOracleUserPrompt(snapshot, settings.oracleName);

    const resp = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: settings.model || 'gpt-5.1-mini',
        input: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      })
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => resp.statusText);
      return { success: false, error: `OpenAI error: ${resp.status} ${text}` };
    }

    const json = await resp.json();
    const first = json.output?.[0]?.content?.[0];
    const text = first && first.type === 'output_text' ? first.text : (json.output_text || '');
    return { success: true, text: (text || '').trim() };
  } catch (e) {
    return { success: false, error: e?.message || String(e) };
  }
});

// Expose handler to renderer via contextBridge
// e.g., in preload.js
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('settingsAPI', {
  interpretEntryOracle: (snapshot, settings) => ipcRenderer.invoke('interpretEntryOracle', snapshot, settings),
  // ... other APIs
});

Notes:
- Ensure you store the OpenAI key securely (user settings encrypted or OS keychain) and never send it to the renderer.
- Use the same prompt builders (buildOracleSystemPrompt, buildOracleUserPrompt) on the main process to ensure consistent prompts across desktop/server.
