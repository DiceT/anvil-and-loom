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
  const { system, user, model } = options;

  const messages = [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];

  // In web/Replit environment: use the /api/ai/chat endpoint
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
