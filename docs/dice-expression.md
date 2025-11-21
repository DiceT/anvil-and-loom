# DiceExpression Reference

This document explains the notation and behaviors supported by the `DiceExpression` parser located in `src/lib/dice/DiceExpression.ts`. Every dice-related tool should parse user input through this class before executing a roll.

## Overview

```ts
import DiceExpression from "../lib/dice/DiceExpression";

const expression = DiceExpression.parse("4d6dl1 + 2");
console.log(expression.terms);
console.log(expression.describe()); // "4d6dl1 + 2"
```

Parsing produces:

- `expression.terms`: immutable list of **dice terms** and **constant terms**.
- `expression.warnings`: parsing issues that didn’t trigger an error (unless `strict: true`).
- `expression.describe()`: normalized string for display or debugging.

## Dice Term Syntax

```
[sign] [count] d [sides] [selection] [pool] [degrade]
```

| Section     | Description                                                                                  | Example      |
|-------------|----------------------------------------------------------------------------------------------|--------------|
| `sign`      | Optional `+`/`-`. Default `+` if omitted.                                                     | `-`, `+`     |
| `count`     | Number of dice. Defaults to `1`.                                                             | `4d6`        |
| `sides`     | Number of sides per die.                                                                     | `d20`, `d10` |
| `selection` | Keep/Drop modifier. Supported tags: `kh`, `kl`, `dh`, `dl` (see below).                      | `kh3`, `dl1` |
| `pool`      | Success/Fumble logic for dice pools, e.g. `>=6#3` (see below).                               | `>=6`, `>=6#3` |
| `degrade`   | Step-down trigger, using `!` notation (see below).                                           | `!<=2`, `!<=2:2` |
| `percentile`| Percentile shorthand using `%` or `p` (see below).                                           | `d%100`, `d%66` |

### Keep/Drop Modifiers

- `khN`: keep highest N dice.
- `klN`: keep lowest N dice.
- `dhN`: drop highest N dice.
- `dlN`: drop lowest N dice.

Example: `4d6dl1` → roll four d6, drop the lowest one.

### Dice Pools

Attach success rules after the dice term:

```
10d6>=6        // every die >= 6 counts as success
10d6>=6#3      // as above, with target of 3 successes
```

Parsed as `pool.successComparator`, `pool.successThreshold`, and optional `pool.targetSuccesses`.

### Degradation

Use `!` to define when a die should step down for future rolls:

```
d12!<=2        // if a die rolls 1-2, flag for degradation by 1 step
d10!<=1:2      // if a die rolls 1, degrade by 2 steps
```

`DiceExpression` only records the rule (`degrade.comparator`, `threshold`, `stepAmount`). The owning system is responsible for applying the step-down to the next expression.

### Challenge Rolls

Use the `challenge` keyword to create an Ironsworn-style action vs. challenge test:

```
challenge                      // defaults to d6 action vs 2d10 challenge
challenge(d6+1 vs 2d10)        // add +1 action modifier
challenge(d8+2 vs 3d12-1)      // custom dice/count/modifiers
```

Format inside the parentheses:

```
challenge(<actionDie> vs <challengeDice>)
```

### Percentile Rolls

- `d%100` (or `dp100`) parses as a d100 percentile roll. The roller uses a native d100 die (no extra d10 is added).
- `d%XY` where `X` and `Y` are digits (e.g., `d%66`, `d%88`) parses as a custom percentile built from two dice: tens uses X sides, ones uses Y sides. The runtime pairs those dice into a 2-digit result (and honors a configured tens color when using DiceBox).


- `<actionDie>`: `dX` plus optional modifier (`d6+2`, `d8-1`). Always a single die.
- `<challengeDice>`: `NdX` plus optional modifier (`2d10`, `3d12+1`).

If the parentheses (or portions) are omitted, defaults are `d6` for the action die and `2d10` for the challenge dice. The parser stores this as a `ChallengeTerm` that the `DiceRoller` interprets directly.

## Constants

Fragments consisting only of a signed integer become constant terms:

```
4d6 + 2 - 1
```

Constants are returned as `{ type: "constant", value: 2, operator: "+" }`, etc.

## Tokenization & Strict Mode

- Expressions are normalized by removing whitespace and splitting on `+`/`-`.
- Each fragment must start with an explicit operator (`+` or `-`).
- Any unrecognized fragments generate warnings; set `{ strict: true }` to throw.

```ts
DiceExpression.parse("4d6 + foo", { strict: true });
// throws Error: Unrecognized dice/number fragment
```

## Future Extensions

The parser currently focuses on:

- Standard dice terms with keep/drop modifiers.
- Dice pools (success counting).
- Degradation triggers.
- Constant arithmetic terms.

Upcoming work will add:

- Exploding / reroll modifiers.
- Variables / references for macro support.
- Serialization helpers for macros/plugins.

Feel free to extend this file as new notation features land so engineers and plugin authors can see exactly what the dice system supports.
