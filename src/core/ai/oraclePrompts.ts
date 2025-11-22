/**
 * Prompt builders for Oracle AI interpretations.
 *
 * These functions construct the system and user prompts sent to the AI model
 * when interpreting oracle table results within a journal entry.
 */

import { ORACLE_PERSONAS } from './oraclePersonas';
import type { AISettings } from './oraclePersonas';
import type { OracleResultCardPayload, EntryOracleSnapshot } from './oracleTypes';

/**
 * Build the system prompt for oracle interpretations.
 *
 * This creates the base instructions for the AI, including:
 * - The oracle's role and tone
 * - How to treat and interpret table results
 * - Output format requirements
 * - Persona-specific flavor from the selected persona
 *
 * @param settings - User's AI configuration including oracle name and persona
 * @returns Complete system prompt string for the AI model
 */
export function buildOracleSystemPrompt(settings: AISettings): string {
  const oracleName = settings.oracleName?.trim() || 'The Loomwright';
  const persona = ORACLE_PERSONAS[settings.oraclePersonaId] ?? ORACLE_PERSONAS['loomwright'];
  return `You are ${oracleName}, the in-app oracle interpreter for the Anvil & Loom TTRPG.

ROLE
- You never roll dice or choose table results.
- You only receive already-rolled oracle results and INTERPRET them.

CORE BEHAVIOR
- Treat every result as a prompt, not a command.
- Results may be literal events, symbols/omens, or rumors/partial truths.
- Never discard or ignore a result; every roll matters, even if its impact is delayed or off-screen.
- Do not overwrite or contradict result text; build meaning around it.
- Contradictions between results are complications, not errors.

MACRO SIGNALS
- "ACTION + ASPECT/THEME": some push, twist, or escalation flavored by that Aspect/Theme.
- "DESCRIPTOR + FOCUS": a specific, out-of-place focal element (object, creature, event, or detail).
- "CONNECTION WEB": this ties into a recurring or persistent element in the campaign; hint at the connection without fully defining the Web.
- "ROLL TWICE": multiple prompts are active at once; lean into their collision or tension.

OUTPUT FORMAT
- Respond in exactly TWO parts:

1) INTERPRETATION
- 1 short paragraph or 2–3 bullet points tying the results together.

2) SNAPSHOT
- 1–3 sentences of in-fiction description expressing the same interpretation inside the fiction.

- Keep the whole response under ~240 words.

PERSONA
- Your tone, style, and flavor are defined by your current persona.

${persona.systemAddendum}`;

}

/**
 * Format oracle results into a structured text block for the user prompt.
 *
 * Converts the array of table results into a numbered list with table name,
 * roll value, and result text for each entry.
 *
 * @param snapshot - Entry snapshot containing all rolled oracle results
 * @returns Formatted string listing all results, or "No oracle results" if empty
 */
export function formatOracleResultsForPrompt(snapshot: EntryOracleSnapshot): string {
  if (!snapshot.oracleResults.length) return 'No oracle results were rolled.';
  const blocks = snapshot.oracleResults.map((r, idx) => {
    return [`#${idx + 1}`, `TABLE: ${r.tableName}`, `ROLL: ${r.roll}`, `RESULT: ${r.resultText}`].join('\n');
  });
  return blocks.join('\n\n');
}

/**
 * Build the user prompt for oracle interpretations.
 *
 * This creates the actual request sent to the AI, including:
 * - Formatted list of all oracle results
 * - Request for interpretation, next moves, and snapshot
 * - Reminders about treating results as prompts (not literal facts)
 *
 * @param snapshot - Entry snapshot containing all rolled oracle results
 * @param oracleName - Display name of the oracle for personalization
 * @returns Complete user prompt string for the AI model
 */
export function buildOracleUserPrompt(
  snapshot: EntryOracleSnapshot,
  oracleName: string,
): string {
  const list = formatOracleResultsForPrompt(snapshot);

  return `You are ${oracleName} inside the Anvil & Loom app.
Here are the oracle results for the current journal entry:
${list}

Using your system instructions, respond in TWO labeled sections only:

1) INTERPRETATION
A brief interpretation tying these results together (they may be literal, symbolic, or allusive). Keep this concise.

2) SNAPSHOT
A 1–3 sentence in-fiction snapshot that expresses the SAME interpretation inside the fiction. Do not introduce new themes here; just render the interpretation in the scene.

Treat the results as prompts: they can represent events, rumors, omens, dreams, or partial truths.
Do NOT overwrite or contradict the results directly; build meaning around them.`;
}
