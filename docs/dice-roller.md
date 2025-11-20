# DiceRoller Reference

This guide documents the `DiceRoller` module (`src/lib/dice/DiceRoller.ts`). It is the runtime companion to `DiceExpression`: once an expression is parsed, the roller evaluates it, producing structured results that any tool or plugin can consume.

## Overview

```ts
import DiceExpression from "../lib/dice/DiceExpression";
import DiceRoller from "../lib/dice/DiceRoller";

const expression = DiceExpression.parse("4d6dl1 + 2");
const result = DiceRoller.roll(expression);

// Async DiceBox-backed example
import diceBoxValueProvider from "../lib/dice/diceBoxAdapter";
const animatedResult = await DiceRoller.rollWithProvider(expression, diceBoxValueProvider);
```

`result` contains:

- `total`: final signed total (respecting + / - operators).
- `successes`: aggregated pool successes (if the expression uses pool notation).
- `terms`: an array of per-term results:
  - `type: "dice"` entries include the original `DiceTerm`, all individual dice, totals, success counts, and degradation flags.
  - `type: "constant"` entries include the signed constant that was applied.
  - `type: "challenge"` entries represent Ironsworn-style action vs. challenge rolls, including boon/complication flags and outcome text.

## DiceTermRollResult

```ts
export interface DiceTermRollResult {
  type: "dice";
  term: DiceTerm;
  dice: SingleDieResult[];
  total: number;
  successes?: number;
  metTarget?: boolean;
  degradeTriggered?: boolean;
  degradeStep?: number;
}
```

- `term`: the original `DiceTerm` so consumers know the source expression.
- `dice`: each die has `{ index, value, kept, dropped }`.
  - `kept`/`dropped` reflect keep/drop modifiers (only kept dice contribute to totals).
- `total`: signed subtotal contributed by this term (after drop/keep and operator).
- `successes`: count of dice that met `pool.successComparator` / `successThreshold`.
- `metTarget`: `true` when successes >= target.
- `degradeTriggered`: `true` if any die met the degradation rule (e.g., `!<=2`).
- `degradeStep`: the amount to step down (defaults to `1` when not specified).

## Constants

Constant terms produce:

```ts
{ type: "constant", value: signedNumber }
```

`value` already reflects the operator, so a `-2` fragment becomes `-2`.

## Challenge Rolls

Challenge notation (`challenge(...)`) produces `type: "challenge"` entries:

```ts
export interface ChallengeTermRollResult {
  type: "challenge";
  term: ChallengeTerm;
  actionDie: number;
  actionModifier: number;
  actionScore: number | null;
  signedActionScore: number;
  challengeDice: number[];
  challengeModifier: number;
  challengeScore: number[];
  outcome: "Strong Hit" | "Weak Hit" | "Miss";
  boon: boolean;
  complication: boolean;
}
```

- `actionScore` = `actionDie + actionModifier`.
- `signedActionScore` already respects the expression operator (normally positive).
- `challengeScore` lists each challenge die value after applying the modifier.
- `outcome` compares `actionScore` against each challenge die: beating both = Strong Hit, beating one = Weak Hit, otherwise Miss.
- `boon` is true on doubles during a Strong Hit; `complication` is true on doubles during a Miss.

## RNG Options

`DiceRoller.roll` accepts an optional deterministic RNG:

```ts
DiceRoller.roll(expression, { random: () => 0.5 });
```

`random` should return a float in `[0, 1)`. When omitted, `Math.random` is used.

## DiceBox / Async Integration

For real dice animations we use the async API:

```ts
import DiceRoller, { type DiceValueProvider } from "../lib/dice/DiceRoller";

const provider: DiceValueProvider = {
  async rollDice(count, sides) {
    return diceBox.roll(count, sides); // implementation-specific
  },
  async rollComposite(requests) {
    return diceBox.rollBatch(requests);
  },
};

const result = await DiceRoller.rollWithProvider(expression, provider);
```

`DiceValueProvider` requires a `rollDice(count, sides)` method that resolves with the rolled numbers. The optional `rollComposite(requests)` can return multiple rolls at once, letting us batch DiceBox calls and also support percentile behavior (the roller automatically pairs `d100` tens with `d10` ones). Challenge terms call the provider exactly once per die type so all dice animate together.

The returned `RollResult` structure is identical to the synchronous `roll` output, so UI components don’t care which path produced the data.

## Future Work

Upcoming enhancements under consideration:

- Lifecycle hooks (before/after each term) for plugins and macros.
- Helper methods on `RollResult` for HTML/Markdown formatting so logging stays consistent outside the Dice Tray.
