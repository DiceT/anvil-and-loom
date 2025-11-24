/**
 * Converters - Transform domain results into ResultCards
 *
 * These pure functions handle the conversion of:
 * - Dice rolls (DiceRoller RollResult) → ResultCard
 * - Table/oracle results → ResultCard
 * - AI interpretations → ResultCard
 *
 * All conversion logic should live here, NOT in components.
 */

import type { ResultCard } from "./resultModel";
import { generateResultCardId } from "./resultModel";
import type { RollResult, ChallengeTermRollResult, DiceTermRollResult } from "../../lib/dice/DiceRoller";

/**
 * Get the primary term from a roll result.
 * Helper for dice conversion logic.
 */
function getPrimaryTerm(result: RollResult): ChallengeTermRollResult | DiceTermRollResult | null {
    for (const term of result.terms) {
        if (term.type === "challenge" || term.type === "dice") {
            return term as ChallengeTermRollResult | DiceTermRollResult;
        }
    }
    return null;
}

/**
 * Sum all constant terms in a roll result.
 */
function getConstantSum(terms: any[]): number {
    return terms
        .filter((t) => t.type === "constant")
        .reduce((sum, t) => sum + t.value, 0);
}

/**
 * Format selection text for dice labels.
 */
function formatSelectionText(selection: any): string {
    if (!selection) return "";
    const mode = selection.mode.replace(/-/g, " ");
    return ` (${mode})`;
}

/**
 * Humanize selection shorthand like "kh1" → "keep highest 1".
 */
function humanizeSelectionShorthand(expression: string): string {
    return expression
        .replace(/kh(\d+)/g, "keep highest $1")
        .replace(/kl(\d+)/g, "keep lowest $1")
        .replace(/dh(\d+)/g, "drop highest $1")
        .replace(/dl(\d+)/g, "drop lowest $1");
}

/**
 * Format dice label for display.
 */
function formatDiceLabel(diceResult: any, options: any = {}): string {
    const { modifier, expression } = options;
    const count = diceResult.term.count;
    const sides = diceResult.term.sides;
    const selection = diceResult.term.selection;

    if (expression) {
        return `ROLLED ${humanizeSelectionShorthand(expression)}`;
    }

    let label = `${count}d${sides}`;
    if (selection) {
        label += formatSelectionText(selection);
    }
    if (modifier && modifier !== 0) {
        label += ` ${modifier > 0 ? "+" : ""}${modifier}`;
    }
    return `ROLLED ${label}`;
}

/**
 * Get color for challenge roll outcomes.
 */
function getChallengeOutcomeColor(outcome: string): string {
    switch (outcome) {
        case "Strong Hit":
            return "#22c55e";
        case "Weak Hit":
            return "#d97706";
        case "Miss":
            return "#ef4444";
        default:
            return "var(--text-main)";
    }
}

// ============================================================================
// DICE CONVERTER
// ============================================================================

/**
 * Convert a DiceRoller RollResult to a ResultCard.
 *
 * Handles all dice roll types:
 * - Challenge rolls (Ironsworn-style)
 * - Simple dice rolls
 * - Dice pools (success counting)
 * - Degradation rolls
 * - Exploding dice
 *
 * @param result - RollResult from DiceRoller
 * @returns ResultCard or null if conversion fails
 */
export function convertDiceToCard(result: RollResult): ResultCard | null {
    const term = getPrimaryTerm(result);
    if (!term) return null;

    const constantTotal = getConstantSum(result.terms);

    // Challenge Roll
    if (term.type === "challenge") {
        const actionSegments: string[] = [`${term.actionDie}`];
        if (term.actionModifier) {
            actionSegments.push(
                `${term.actionModifier >= 0 ? "+" : ""}${term.actionModifier}`
            );
        }
        if (typeof term.actionScore === "number") {
            actionSegments.push(`= ${term.actionScore}`);
        }
        const actionText = actionSegments.join(" ");
        const challengeText = term.challengeScore.length
            ? term.challengeScore.join(", ")
            : "-";
        const resultText = `${term.outcome}${term.boon ? " (Boon)" : ""}${term.complication ? " (Complication)" : ""
            }`;
        const outcomeColor = getChallengeOutcomeColor(term.outcome);

        return {
            id: generateResultCardId(),
            timestamp: new Date().toISOString(),
            header: "CHALLENGE ROLL",
            content: `Action Roll: ${actionText || "-"}\nChallenge Roll: ${challengeText}`,
            result: resultText,
            source: "dice",
            meta: {
                resultColor: outcomeColor,
            },
        };
    }

    // Dice Roll
    if (term.type === "dice") {
        const simpleDiceTerms = result.terms.filter(
            (t: any) =>
                t.type === "dice" &&
                !t.term.pool &&
                !t.term.explode &&
                !t.term.degrade
        );
        const constantTerms = result.terms.filter((t: any) => t.type === "constant");

        // Multiple simple dice
        if (simpleDiceTerms.length > 1) {
            const header = result.expression?.original
                ? `ROLLED ${humanizeSelectionShorthand(result.expression.original)}`
                : "ROLL RESULT";
            const diceLines = simpleDiceTerms.map((t: any) => {
                const rollsDisplay = t.dice
                    .map((die: any) => (die.dropped ? `(${die.value})` : `${die.value}`))
                    .join(", ");
                const label = `${t.term.count}d${t.term.sides}${t.term.selection ? ` (${t.term.selection.mode.replace("-", " ")})` : ""
                    }`;
                return `${label}: ${rollsDisplay || "-"} = ${t.total}`;
            });
            const constantLines = constantTerms.map((c: any) => `Modifier: ${c.value}`);
            const contentText = [...diceLines, ...constantLines].join("\n");

            return {
                id: generateResultCardId(),
                timestamp: new Date().toISOString(),
                header,
                content: contentText,
                result: `${result.total}`,
                source: "dice",
            };
        }

        // Dice Pool
        if (term.term.pool) {
            const pool = term.term.pool;
            const threshold = `${pool.successThreshold}`;
            const needed =
                typeof pool.targetSuccesses === "number" ? pool.targetSuccesses : undefined;
            const successes = term.successes ?? 0;
            const met =
                term.metTarget ??
                (typeof needed === "number" ? successes >= needed : successes > 0);
            const statusText = met ? "PASS" : "FAIL";
            const statusColor = met ? "#22c55e" : "#ef4444";
            const successLabel = `${successes} success${successes === 1 ? "" : "es"}`;
            const poolHeader = `DICE POOL - ${term.term.count}d${term.term.sides} T:${threshold} S:${needed !== undefined ? needed : "-"
                }`;
            const rollsDisplay = term.dice.map((d: any) => d.value).join(", ");
            const contentText = `Rolls: ${rollsDisplay}\nTarget: ${threshold}\nSuccesses Needed: ${needed !== undefined ? needed : "-"
                }`;

            return {
                id: generateResultCardId(),
                timestamp: new Date().toISOString(),
                header: poolHeader,
                content: contentText,
                result: `${successLabel} - ${statusText}`,
                source: "dice",
                meta: {
                    resultColor: statusColor,
                },
            };
        }

        // Degradation Roll
        if (term.term.degrade) {
            const threshold = term.term.degrade?.threshold ?? "-";
            const triggered = term.degradeTriggered ?? false;
            const statusText = triggered ? `${term.total} - DEGRADE` : `${term.total}`;
            const statusColor = triggered ? "#ef4444" : undefined;
            const headerText = `DEGRADATION ROLL ${term.term.count}d${term.term.sides} D:${threshold}`;
            const rollsDisplay = term.dice.map((d: any) => d.value).join(", ");
            const contentText = `Roll: ${rollsDisplay}\nThreshold: ${threshold}`;

            return {
                id: generateResultCardId(),
                timestamp: new Date().toISOString(),
                header: headerText,
                content: contentText,
                result: statusText,
                source: "dice",
                meta: {
                    resultColor: statusColor,
                },
            };
        }

        // Exploding Dice
        if (term.explosions && term.explosions.length) {
            const threshold = term.term.explode?.threshold ?? term.term.sides;
            const explosionCount =
                term.explosionCount ?? Math.max(0, term.explosions.length - 1);
            const statusColor = explosionCount > 0 ? "#22c55e" : undefined;
            const lines = term.explosions.map((group: any, index: number) => {
                const label = index === 0 ? "ROLL" : "EXPLOSION";
                const values = group.join(", ");
                return `${label}: ${values}`;
            });
            const header = `EXPLODING ROLL ${term.term.count}d${term.term.sides} T:${threshold}`;
            const resultText = `${term.total}${explosionCount > 0 ? ` - ${explosionCount} Explosions` : ""
                }`;

            return {
                id: generateResultCardId(),
                timestamp: new Date().toISOString(),
                header,
                content: lines.join("\n"),
                result: resultText,
                source: "dice",
                meta: {
                    resultColor: statusColor,
                },
            };
        }

        // Standard dice roll
        const label = formatDiceLabel(term, {
            modifier: constantTotal,
            expression: result.expression?.original,
        });
        const rollsDisplay = term.dice
            .map((die: any) => (die.dropped ? `(${die.value})` : `${die.value}`))
            .join(", ");
        const contentLines = [`Rolls: ${rollsDisplay}`];
        if (constantTotal !== 0) {
            contentLines.push(
                `Modifier: ${constantTotal > 0 ? `+${constantTotal}` : constantTotal}`
            );
        }

        return {
            id: generateResultCardId(),
            timestamp: new Date().toISOString(),
            header: label,
            content: contentLines.join("\n"),
            result: `${result.total}`,
            source: "dice",
        };
    }

    return null;
}

// ============================================================================
// TABLE CONVERTER
// ============================================================================

/**
 * Input for converting table results to cards.
 */
export interface ConvertTableInput {
    tableId: string;
    tableName: string;
    roll: number;
    resultText: string;
    category?: string;
    sourcePath?: string;
    /** If true, use "oracle" source (Action+Theme), otherwise "table" (Aspects/Domains) */
    isOracle?: boolean;
}

/**
 * Convert a table/oracle roll result to a ResultCard.
 *
 * @param input - Table roll data
 * @returns ResultCard
 *
 * @example
 * ```typescript
 * const card = convertTableToCard({
 *   tableId: "Domain:Catacombs:Objectives",
 *   tableName: "Catacombs: Objectives",
 *   roll: 67,
 *   resultText: "Uncover ancient secrets",
 *   category: "Domain",
 * });
 * ```
 */
export function convertTableToCard(input: ConvertTableInput): ResultCard {
    const source = input.isOracle ? "oracle" : "table";

    // Header: "TABLE: DOMAIN, SUBTABLE" or "ORACLE: ACTION+THEME"
    const header = input.category
        ? `${source.toUpperCase()}: ${input.category.toUpperCase()}, ${input.tableName.toUpperCase()}`
        : `${source.toUpperCase()}: ${input.tableName.toUpperCase()}`;

    // Content: "Roll 67 on TableName"
    const content = `Roll ${input.roll} on ${input.tableName}`;

    return {
        id: generateResultCardId(),
        timestamp: new Date().toISOString(),
        header,
        content,
        result: input.resultText,
        source,
        meta: {
            tableId: input.tableId,
            tableName: input.tableName,
            roll: input.roll,
            category: input.category,
            sourcePath: input.sourcePath,
        },
    };
}

// ============================================================================
// INTERPRETATION CONVERTER
// ============================================================================

/**
 * Input for converting AI interpretations to cards.
 */
export interface ConvertInterpretationInput {
    oracleName: string;
    personaId: string;
    snapshot: string;
    interpretation: string;
}

/**
 * Convert an AI interpretation to a ResultCard.
 *
 * @param input - Interpretation data
 * @returns ResultCard
 *
 * @example
 * ```typescript
 * const card = convertInterpretationToCard({
 *   oracleName: "The Loomwright",
 *   personaId: "loomwright",
 *   snapshot: "A shadowy figure beckons from the darkness",
 *   interpretation: "- The oracle suggests...\n- Consider these threads...",
 * });
 * ```
 */
export function convertInterpretationToCard(
    input: ConvertInterpretationInput
): ResultCard {
    const header = `INTERPRETATION: ${input.oracleName.toUpperCase()}`;

    return {
        id: generateResultCardId(),
        timestamp: new Date().toISOString(),
        header,
        content: input.interpretation,
        result: input.snapshot,
        source: "interpretation",
        meta: {
            oracleName: input.oracleName,
            personaId: input.personaId,
        },
    };
}
