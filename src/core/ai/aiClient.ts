/**
 * Centralized AI client for Anvil & Loom.
 *
 * This is the ONLY module that should talk to OpenAI or any AI service.
 * All features (Dev Table, Oracles, etc.) should call functions here, not OpenAI directly.
 *
 * Implementation:
 * - In web/Replit: calls the `/api/ai/chat` endpoint (configured in vite.config.ts)
 * - In desktop/Electron: uses settingsAPI or main process IPC
 * - Both paths use the same underlying `electron/openaiClient.cjs` logic
 */

/**
 * Options for invoking the AI model.
 */
export interface AIInvokeOptions {
  /** System prompt (sets persona, instructions) */
  system: string;
  /** User prompt (the actual question/request) */
  user: string;
  /** Model ID (e.g., "gpt-4o-mini", "gpt-4") */
  model: string;
  /**
   * Optional API key for direct OpenAI calls.
   * If provided, bypasses the /api/ai/chat endpoint and calls OpenAI directly.
   * Used by Dev Table feature where users provide their own key.
   */
  apiKey?: string;
}

/**
 * Call the AI model with a system + user prompt.
 *
 * This function abstracts away the OpenAI implementation details.
 * Components should call this instead of using fetch() or OpenAI client directly.
 *
 * @param options - System prompt, user prompt, and model configuration
 * @returns The AI's text response, trimmed
 * @throws Error if the API key is missing or the request fails
 *
 * @example
 * ```ts
 * const response = await callModel({
 *   system: "You are a helpful oracle interpreter.",
 *   user: "Interpret these oracle results...",
 *   model: "gpt-4o-mini"
 * });
 * ```
 */
export async function callModel(options: AIInvokeOptions): Promise<string> {
  const { system, user, model, apiKey } = options;

  const messages = [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];

  // If API key is provided, call OpenAI directly (used by Dev Table feature)
  if (apiKey) {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, messages }),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => null);
      throw new Error(`OpenAI error: ${resp.status} ${text || resp.statusText}`);
    }

    const json = await resp.json();
    const text = json?.choices?.[0]?.message?.content ?? json?.choices?.[0]?.text ?? '';
    return (text || '').trim();
  }

  // Otherwise, use the /api/ai/chat endpoint (standard path for Oracle and other features)
  // This endpoint is configured in vite.config.ts and uses electron/openaiClient.cjs internally
  const resp = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages }),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => null);
    throw new Error(`AI request failed: ${resp.status} ${text || resp.statusText}`);
  }

  const json = await resp.json();
  
  if (!json.success) {
    throw new Error(json.error || 'Unknown AI error');
  }

  const text = (json.text || '').toString().trim();
  if (!text) {
    throw new Error('AI returned empty response');
  }

  return text;
}
