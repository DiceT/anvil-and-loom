const DEFAULT_FADE_DURATION_MS = 3000;

let diceFadeDurationMs = DEFAULT_FADE_DURATION_MS;
let diceThemeColor = "#ff7f00";
let diceThemeName = "default";
let diceTensThemeColor = "#000000";
let diceTexture = "paper";
let diceScale = 4;
const PRELOAD_THEMES = ["default", "rust", "diceOfRolling", "gemstone"];

export type SingleDieType =
  | "d4"
  | "d6"
  | "d8"
  | "d10"
  | "d12"
  | "d20";

export type LogicalRollType =
  | SingleDieType
  | "four_d6"
  | "percentile"
  | "challenge";

export type DiceEngineResultKind = "number" | "percentile" | "challenge";

export type RollAdvantageMode = "normal" | "advantage" | "disadvantage";

export interface RollOptions {
  mode?: RollAdvantageMode;
  modifier?: number;
}

export interface DiceEngineResult {
  id: string;
  kind: DiceEngineResultKind;
  label: string;
  value?: number;
  detail?: string;
  meta?: any;
}

function simulateDice(count: number, sides: number): number[] {
  if (count <= 0 || sides <= 0) return [];
  const rolls: number[] = [];
  for (let i = 0; i < count; i++) {
    const value = Math.floor(Math.random() * sides) + 1;
    rolls.push(Math.max(1, Math.min(sides, value)));
  }
  return rolls;
}

const SINGLE_DIE_CONFIG: Record<SingleDieType, { sides: number; label: string }> = {
  d4: { sides: 4, label: "1d4" },
  d6: { sides: 6, label: "1d6" },
  d8: { sides: 8, label: "1d8" },
  d10: { sides: 10, label: "1d10" },
  d12: { sides: 12, label: "1d12" },
  d20: { sides: 20, label: "1d20" },
};

export function setDiceFadeDuration(durationMs: number) {
  if (Number.isFinite(durationMs)) {
    diceFadeDurationMs = Math.max(500, durationMs);
  }
}

export function setDiceThemeName(name: string) {
  if (typeof name === "string" && name.trim().length) {
    diceThemeName = name.trim();
  }
}

export function setDiceThemeColor(color: string) {
  if (typeof color === "string" && color.trim().length) {
    diceThemeColor = color.trim();
  }
}

export function setDiceTensThemeColor(color: string) {
  if (typeof color === "string" && color.trim().length) {
    diceTensThemeColor = color.trim();
  }
}

export function setDiceTexture(texture: string) {
  if (typeof texture === "string" && texture.trim().length) {
    diceTexture = texture.trim();
  }
}

export function setDiceScale(scale: number) {
  if (Number.isFinite(scale) && scale > 0) {
    diceScale = Math.max(1, Math.min(12, scale));
  }
}

export function getDiceAppearance() {
  return {
    fadeDurationMs: diceFadeDurationMs,
    themeColor: diceThemeColor,
    themeName: diceThemeName,
    tensThemeColor: diceTensThemeColor,
    texture: diceTexture,
    scale: diceScale,
  };
}

export async function rollDiceBoxValues(count: number, sides: number): Promise<number[]> {
  if (count <= 0 || sides <= 0) return [];
  return simulateDice(count, sides);
}

export async function rollDiceBoxComposite(
  requests: Array<{ count: number; sides: number }>
): Promise<number[][]> {
  return requests.map((req) => simulateDice(req.count, req.sides));
}

export async function rollDiceBoxList(
  dice: Array<{ sides: number; themeColor?: string }>
): Promise<number[]> {
  const filtered = (dice ?? []).filter((die) => die && Number.isFinite(die.sides) && die.sides > 0);
  if (!filtered.length) return [];
  const values: number[] = [];
  filtered.forEach((die) => {
    values.push(...simulateDice(1, die.sides));
  });
  return values;
}

export async function rollDice(
  type: LogicalRollType,
  options: RollOptions = {}
): Promise<DiceEngineResult> {
  if (type in SINGLE_DIE_CONFIG) {
    const config = SINGLE_DIE_CONFIG[type as SingleDieType];
    return rollSingleDie(config.sides, config.label, options);
  }

  switch (type) {
    case "four_d6": {
      const rolls = simulateDice(4, 6);
      const total = rolls.reduce((sum, v) => sum + v, 0);

      return {
        id: createId(),
        kind: "number",
        label: "4d6",
        value: rolls.length ? total : undefined,
        detail: rolls.length
          ? `Rolled 4d6 -> [${rolls.join(", ")}], total = ${total}`
          : "Rolled 4d6 (could not read values)",
      };
    }

    case "percentile": {
      const tensValue = simulateDice(1, 100)[0];
      const onesValue = simulateDice(1, 10)[0];

      const tensIndex = normalizeTensIndex(tensValue);
      const onesIndex = normalizeOnesIndex(onesValue);

      let total = tensIndex * 10 + onesIndex;
      if (total === 0) total = 100;

      const d100Face = tensIndex === 0 ? "00" : String(tensIndex * 10);
      const d10Face = String(onesIndex);

      return {
        id: createId(),
        kind: "percentile",
        label: "d100",
        value: total,
        detail: `d100=${d100Face}, d10=${d10Face} -> ${total}`,
      };
    }

    case "challenge": {
      const actionDie = simulateDice(1, 6)[0];
      const challengeDice = simulateDice(2, 10);
      const baseModifier = 0;
      const userModifier = options.modifier ?? 0;

      let actionScore: number | undefined;
      let quality: "Strong Hit" | "Weak Hit" | "Miss" | null = null;
      let boon = false;
      let complication = false;

      if (typeof actionDie === "number" && challengeDice.length >= 2) {
        const [c1, c2] = challengeDice;
        actionScore = actionDie + baseModifier + userModifier;

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

      const detail =
        typeof actionDie === "number" && challengeDice.length >= 2 && quality
          ? `Action: ${actionDie}${baseModifier ? ` + ${baseModifier}` : ""}${
              userModifier ? ` + ${userModifier}` : ""
            } = ${actionScore}; Challenge: [${challengeDice.join(", ")}]`
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
          baseModifier,
          userModifier,
          actionScore,
          challengeDice,
          outcome: quality,
          boon,
          complication,
        },
      };
    }

    default:
      throw new Error(`Unsupported roll type: ${type}`);
  }
}

async function rollSingleDie(
  sides: number,
  baseLabel: string,
  options: RollOptions
): Promise<DiceEngineResult> {
  const mode: RollAdvantageMode = options.mode ?? "normal";
  const modifier = options.modifier ?? 0;
  const diceCount = mode === "normal" ? 1 : 2;
  const rolls = simulateDice(diceCount, sides);

  const chosen =
    mode === "advantage"
      ? Math.max(...rolls)
      : mode === "disadvantage"
      ? Math.min(...rolls)
      : rolls[0];

  const label =
    mode === "normal"
      ? baseLabel
      : `${baseLabel} (${mode === "advantage" ? "Advantage" : "Disadvantage"})`;

  const detail =
    mode === "normal"
      ? rolls.length
        ? `Rolled ${baseLabel} -> ${chosen}`
        : `Rolled ${baseLabel} (could not read value)`
      : rolls.length >= 2
      ? `Rolled 2d${sides} [${rolls.slice(0, 2).join(", ")}] -> ${
          mode === "advantage" ? "highest" : "lowest"
        } ${chosen}`
      : `Rolled 2d${sides} (could not read values)`;

  const finalValue =
    typeof chosen === "number" && !Number.isNaN(chosen)
      ? chosen + modifier
      : chosen;

  const detailWithModifier =
    modifier && typeof chosen === "number"
      ? `${detail}; modifier ${modifier >= 0 ? "+" : "-"} ${Math.abs(
          modifier
        )} = ${finalValue}`
      : detail;

  return {
    id: createId(),
    kind: "number",
    label,
    value: finalValue,
    detail: detailWithModifier,
    meta: {
      type: "single",
      mode,
      rolls: rolls.slice(0, diceCount),
      chosen,
      sides,
      modifier,
    },
  };
}

// --- helpers for percentile semantics ---

function normalizeTensIndex(value: number | undefined): number {
  if (value == null || Number.isNaN(value)) return 0;
  if (value === 0 || value === 100) return 0;
  if (value % 10 === 0 && value >= 10 && value <= 90) {
    return value / 10;
  }
  if (value >= 1 && value <= 9) {
    return value;
  }
  return Math.max(0, Math.min(9, Math.floor(value / 10)));
}

function normalizeOnesIndex(value: number | undefined): number {
  if (value == null || Number.isNaN(value)) return 0;
  if (value === 10 || value === 0) return 0;
  if (value >= 1 && value <= 9) {
    return value;
  }
  const digit = Math.floor(value) % 10;
  return digit < 0 ? digit + 10 : digit;
}

function createId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// Oracle roll helper: rolls a d100 (percentile) and returns the final face value.
export interface OracleRollContext {
  tableId: string;
  tableName: string;
  sourcePath?: string;
}

export async function rollOracleD100(ctx: OracleRollContext): Promise<number> {
  try {
    const res = await rollDice("percentile");
    if (res && typeof res.value === "number") return Math.max(1, Math.min(100, Math.floor(res.value)));
  } catch (e) {
    // fall through to fallback
    console.warn("rollOracleD100 failed, falling back to RNG", e);
  }
  // Fallback deterministic random
  return Math.floor(Math.random() * 100) + 1;
}
