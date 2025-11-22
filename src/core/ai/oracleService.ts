/**
 * Oracle Service - Public API for AI oracle interpretations.
 *
 * This is the ONLY module UI components should use for oracle AI features.
 * It orchestrates the prompt building and AI model invocation.
 *
 * Components should call functions here, not aiClient or OpenAI directly.
 */

import { callModel } from './aiClient';
import { buildOracleSystemPrompt, buildOracleUserPrompt } from './oraclePrompts';
import type { AISettings } from './oraclePersonas';
import type { EntryOracleSnapshot } from './oracleTypes';

/**
 * Interpret oracle results for a journal entry using AI.
 *
 * This high-level function:
 * 1. Builds the system prompt (with selected persona)
 * 2. Builds the user prompt (with formatted oracle results)
 * 3. Calls the AI model
 * 4. Returns the interpretation text
 *
 * The output includes:
 * - Brief interpretation connecting the results
 * - 1-3 "Next Moves" suggestions
 * - Optional 1-2 sentence in-fiction snapshot
 *
 * @param snapshot - All oracle results rolled for the entry
 * @param settings - User's AI configuration (oracle name, persona, model)
 * @returns The AI's interpretation text
 * @throws Error if API key is missing or request fails
 *
 * @example
 * ```ts
 * const interpretation = await interpretEntryOracle(
 *   {
 *     entryId: "entry-123",
 *     oracleResults: [
 *       { tableName: "NPC Reaction", roll: 42, resultText: "Suspicious" },
 *       { tableName: "Complication", roll: 67, resultText: "A rival appears" }
 *     ]
 *   },
 *   {
 *     oracleName: "The Loomwright",
 *     oraclePersonaId: "loomwright",
 *     model: "gpt-4o-mini",
 *     temperature: 0.7
 *   }
 * );
 * ```
 */
export async function interpretEntryOracle(
  snapshot: EntryOracleSnapshot,
  settings: AISettings
): Promise<string> {
  const systemPrompt = buildOracleSystemPrompt(settings);
  const userPrompt = buildOracleUserPrompt(snapshot, settings.oracleName);

  return await callModel({
    system: systemPrompt,
    user: userPrompt,
    model: settings.model,
  });
}
