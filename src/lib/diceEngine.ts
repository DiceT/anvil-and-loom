import DiceBox from "@3d-dice/dice-box-threejs/dist/dice-box-threejs.es";

const DICE_CONTAINER_ID = "dice-box-container";

type DiceBoxInstance = any;

let diceBox: DiceBoxInstance | null = null;
let diceBoxInitPromise: Promise<DiceBoxInstance> | null = null;

export type LogicalRollType = "d20" | "four_d6" | "percentile" | "challenge";

export type DiceEngineResultKind = "number" | "percentile" | "challenge";

export interface DiceEngineResult {
  id: string;
  kind: DiceEngineResultKind;
  label: string;
  value?: number;
  detail?: string;
  meta?: any; // 🔹 add this
}


/**
 * Ensure DiceBox is initialized on the global overlay container.
 */
async function getDiceBox(): Promise<DiceBoxInstance> {
  if (diceBox && diceBoxInitPromise) {
    await diceBoxInitPromise;
    return diceBox;
  }

  if (!diceBoxInitPromise) {
    diceBoxInitPromise = (async () => {
      const container = document.getElementById(DICE_CONTAINER_ID);
      if (!container) {
        throw new Error(`Dice container #${DICE_CONTAINER_ID} not found in DOM`);
      }

      // Clear any previous canvases
      container.innerHTML = "";

      const box = new (DiceBox as any)(`#${DICE_CONTAINER_ID}`, {
        theme: "default",
        assetPath: "/assets/",        // <-- points to public/assets
        sounds: true,                // turn sound on
        light_intensity: 0.8,
        gravity_multiplier: 400,
        baseScale: 100,
        strength: 2,
      });

      diceBox = box;

      if (box.initialize) {
        await box.initialize();
      }

      return box;
    })();
  }

  return diceBoxInitPromise;
}

/**
 * Recursively walk the raw result and pull out per-die values
 * in a predictable order.
 *
 * We only collect:
 * - leaf objects with `value` / `result`
 * - roll entries inside `.rolls`
 */
function extractDiceValues(raw: any): number[] {
  const values: number[] = [];

  const visit = (node: any) => {
    if (node == null) return;

    if (Array.isArray(node)) {
      for (const item of node) {
        visit(item);
      }
      return;
    }

    if (typeof node === "object") {
      const anyNode = node as any;

      // If this looks like a roll-group: prefer its .rolls array
      if (Array.isArray(anyNode.rolls)) {
        for (const r of anyNode.rolls) {
          if (r && typeof r.value === "number") {
            values.push(r.value);
          } else if (r && typeof r.result === "number") {
            values.push(r.result);
          }
        }
      } else {
        // Otherwise, this might itself be a single roll
        if (typeof anyNode.value === "number") {
          values.push(anyNode.value);
        } else if (typeof anyNode.result === "number") {
          values.push(anyNode.result);
        }
      }

      // Dive into nested sets/results if present
      if (Array.isArray(anyNode.sets)) {
        visit(anyNode.sets);
      }
      if (Array.isArray(anyNode.results)) {
        visit(anyNode.results);
      }

      return;
    }
  };

  visit(raw);
  return values;
}

function extractFirstValue(raw: any): number | undefined {
  const vals = extractDiceValues(raw);
  return vals.length ? vals[0] : undefined;
}

// --- public API ---

export async function rollDice(
  type: LogicalRollType
): Promise<DiceEngineResult> {
  const box = await getDiceBox();

  switch (type) {
    case "d20": {
      const raw = await box.roll("1d20");
      const value = extractFirstValue(raw);

      return {
        id: createId(),
        kind: "number",
        label: "1d20",
        value,
        detail:
          value !== undefined
            ? `Rolled 1d20 → ${value}`
            : "Rolled 1d20 (could not read value)",
      };
    }

    case "four_d6": {
      const raw = await box.roll("4d6");
      const rolls = extractDiceValues(raw);
      const total = rolls.reduce((sum, v) => sum + v, 0);

      return {
        id: createId(),
        kind: "number",
        label: "4d6",
        value: rolls.length ? total : undefined,
        detail: rolls.length
          ? `Rolled 4d6 → [${rolls.join(", ")}], total = ${total}`
          : "Rolled 4d6 (could not read values)",
      };
    }

    case "percentile": {
      // 🔹 Roll tens and ones together in a single expression
      const raw = await box.roll("1d100+1d10");
      const vals = extractDiceValues(raw);

      // Expect at least 2 dice: [d100, d10, ...maybe other junk]
      const tensValue = vals[0];
      const onesValue = vals[1];

      const tensIndex = normalizeTensIndex(tensValue);
      const onesIndex = normalizeOnesIndex(onesValue);

      let total = tensIndex * 10 + onesIndex;
      if (total === 0) {
        total = 100;
      }

      const d100Face = tensIndex === 0 ? "00" : String(tensIndex * 10);
      const d10Face = String(onesIndex);

      return {
        id: createId(),
        kind: "percentile",
        label: "d100",
        value: total,
        detail: `d100=${d100Face}, d10=${d10Face} → ${total}`,
      };
    }

    case "challenge": {
      // Roll action + challenge dice together: 1d6 + 2d10
      const raw = await box.roll("1d6+2d10");
      const vals = extractDiceValues(raw);

      const actionDie = vals[0];
      const challengeDice = vals.slice(1, 3); // first two d10s
      const modifier = 2;

      let actionScore: number | undefined;
      let quality: "Strong Hit" | "Weak Hit" | "Miss" | null = null;
      let boon = false;
      let complication = false;

      if (typeof actionDie === "number" && challengeDice.length >= 2) {
        const [c1, c2] = challengeDice;
        actionScore = actionDie + modifier;

        const beats1 = actionScore > c1;
        const beats2 = actionScore > c2;

        if (beats1 && beats2) quality = "Strong Hit";
        else if (beats1 || beats2) quality = "Weak Hit";
        else quality = "Miss";

        const doubles = c1 === c2;
        if (doubles && quality === "Strong Hit") {
          boon = true;
        } else if (doubles && quality === "Miss") {
          complication = true;
        }
      }

      // Fallback detail string in case we ever need it
      const detail =
        typeof actionDie === "number" && challengeDice.length >= 2 && quality
          ? `Action: ${actionDie} + ${modifier} = ${actionScore}; Challenge: [${challengeDice.join(
              ", "
            )}]`
          : "Challenge roll (invalid)";

      return {
        id: createId(),
        kind: "challenge",
        label: "Challenge (1d6+2d10, +2)",
        value: actionScore,
        detail,
        meta: {
          type: "challenge",
          actionDie,
          modifier,
          actionScore,
          challengeDice,
          outcome: quality,
          boon,
          complication,
        },
      };
    }


  }
}

// --- helpers for percentile semantics ---

function normalizeTensIndex(value: number | undefined): number {
  if (value == null || Number.isNaN(value)) return 0;

  // Treat 0 or 100 as "00" (tensIndex = 0)
  if (value === 0 || value === 100) return 0;

  // Standard percentile tens: 10, 20, ..., 90
  if (value % 10 === 0 && value >= 10 && value <= 90) {
    return value / 10; // 10 -> 1, 20 -> 2, ..., 90 -> 9
  }

  // If we ever get 1–9 directly, treat them as indices
  if (value >= 1 && value <= 9) {
    return value;
  }

  // Fallback: derive index from the tens place, clamp 0–9
  return Math.max(0, Math.min(9, Math.floor(value / 10)));
}

function normalizeOnesIndex(value: number | undefined): number {
  if (value == null || Number.isNaN(value)) return 0;

  // 10 or 0 should mean face "0"
  if (value === 10 || value === 0) return 0;

  // Normal 1–9 range
  if (value >= 1 && value <= 9) {
    return value;
  }

  // Fallback: last digit, clamped 0–9
  const digit = Math.floor(value) % 10;
  return digit < 0 ? digit + 10 : digit;
}


function createId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
