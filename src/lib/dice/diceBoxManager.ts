import DiceBox from "@3d-dice/dice-box";
import { getDiceAppearance } from "../diceEngine";

type RollObject = {
  value?: number;
  sides?: number | string;
  themeColor?: string;
  data?: string;
};

let boxRef: any = null;
let boxInitPromise: Promise<any> | null = null;
let fadeTimeout: number | null = null;
let audioPromise: Promise<void> | null = null;
let audioPool: { surfaces: HTMLAudioElement[]; dice: HTMLAudioElement[] } = {
  surfaces: [],
  dice: [],
};

async function loadDiceAudio() {
  if (audioPromise) return audioPromise;
  const loadClip = async (src: string) =>
    new Promise<HTMLAudioElement>((resolve, reject) => {
      const audio = new Audio();
      audio.oncanplaythrough = () => resolve(audio);
      audio.onerror = (e) => reject(e);
      audio.crossOrigin = "anonymous";
      audio.src = src;
    });
  audioPromise = (async () => {
    const surfaces: HTMLAudioElement[] = [];
    const dice: HTMLAudioElement[] = [];
    for (let i = 1; i <= 7; i++) {
      try {
        surfaces.push(await loadClip(`/assets/sounds/surfaces/surface_wood_table${i}.mp3`));
      } catch {
        /* ignore */
      }
    }
    for (let i = 1; i <= 15; i++) {
      try {
        dice.push(await loadClip(`/assets/sounds/dicehit/dicehit_plastic${i}.mp3`));
      } catch {
        /* ignore */
      }
    }
    audioPool = { surfaces, dice };
  })();
  return audioPromise;
}

function playDiceAudio() {
  void (async () => {
    try {
      await loadDiceAudio();
      const { surfaces, dice } = audioPool;
      if (!surfaces.length && !dice.length) return;
      const playClip = (clip?: HTMLAudioElement) => {
        if (!clip) return;
        clip.currentTime = 0;
        clip.play().catch(() => {});
      };
      const hits = Math.max(1, Math.floor(Math.random() * 2) + 2); // 2-3 hits
      for (let i = 0; i < hits; i++) {
        const delay = 75 + Math.random() * 375;
        setTimeout(() => {
          playClip(surfaces[Math.floor(Math.random() * surfaces.length)]);
          playClip(dice[Math.floor(Math.random() * dice.length)]);
        }, delay);
      }
    } catch {
      /* ignore audio failures */
    }
  })();
}

function coerceSides(input: number | string | undefined): number | undefined {
  if (typeof input === "number" && Number.isFinite(input)) return input;
  if (typeof input === "string") {
    const match = input.match(/\d+/);
    if (match && match[0]) {
      const parsed = Number(match[0]);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return undefined;
}

function normalizeRolls(raw: any): RollObject[] {
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw.rolls)) return raw.rolls;
  if (raw && Array.isArray(raw[0]?.rolls)) return raw[0].rolls;
  return [];
}

function allocateValuesBySpecs(
  rolls: RollObject[],
  specs: Array<{ sides: number }>
): number[] {
  const pools = new Map<number, number[]>();
  rolls.forEach((roll) => {
    const sides = coerceSides(roll?.sides);
    const val = roll?.value;
    if (sides && Number.isFinite(val as number)) {
      const bucket = pools.get(sides) ?? [];
      bucket.push(Number(val));
      pools.set(sides, bucket);
    }
  });

  return specs.map((spec) => {
    const bucket = pools.get(spec.sides) ?? [];
    const val = bucket.shift();
    if (Number.isFinite(val as number)) {
      return Number(val);
    }
    // Fallback to RNG if dice-box didn't return enough results.
    return Math.max(
      1,
      Math.min(spec.sides, Math.floor(Math.random() * spec.sides) + 1)
    );
  });
}

function getContainer(): HTMLElement | null {
  return document.getElementById("dice-box-container");
}

function pruneContainerCanvases() {
  const container = getContainer();
  if (!container) return;
  const canvases = Array.from(container.querySelectorAll("canvas"));
  if (canvases.length <= 1) return;
  // Keep the most recent canvas, remove older ones.
  canvases.slice(0, -1).forEach((node) => node.remove());
}

function scheduleFade(delayMs: number) {
  const container = getContainer();
  if (!container) return;
  if (fadeTimeout) {
    window.clearTimeout(fadeTimeout);
    fadeTimeout = null;
  }
  // Add a floor so dice don't disappear mid-animation if the roll promise resolves quickly.
  const delay = Math.max(2000, delayMs);
  fadeTimeout = window.setTimeout(() => {
    container.classList.add("dice-box-fade");
    fadeTimeout = window.setTimeout(() => {
      container.classList.remove("dice-box-visible");
      container.classList.remove("dice-box-fade");
      fadeTimeout = null;
    }, 600);
  }, delay);
}

async function ensureBox() {
  const appearance = getDiceAppearance();
  pruneContainerCanvases();
  if (!boxInitPromise) {
    boxInitPromise = (async () => {
      const box = new DiceBox({
        container: "#dice-box-container",
        assetPath: "/assets/dice-box/",
        theme: appearance.themeName ?? "default",
        themeColor: appearance.themeColor ?? "#333333",
        scale: appearance.scale ?? 4,
      });
      boxRef = box;
      if (box.init) {
        await box.init();
      } else if (box.initialize) {
        await box.initialize();
      }
      return box;
    })();
  }
  const box = await boxInitPromise;
  box?.updateConfig?.({
    theme: appearance.themeName ?? "default",
    themeColor: appearance.themeColor ?? "#333333",
    scale: appearance.scale ?? 4,
  });
  return box;
}

async function rollInternal(payload: any): Promise<RollObject[]> {
  const appearance = getDiceAppearance();
  const box = await ensureBox();
  const container = getContainer();

  playDiceAudio();

  // Clear any existing dice and reset visibility before rolling.
  pruneContainerCanvases();
  container?.classList.remove("dice-box-visible");
  container?.classList.remove("dice-box-fade");
  if (box?.clear) {
    try {
      await box.clear();
    } catch {
      /* ignore */
    }
  }
  container?.classList.add("dice-box-visible");
  container?.classList.remove("dice-box-fade");

  const result = await box.roll(payload);
  const rolls = normalizeRolls(result);
  pruneContainerCanvases();
  scheduleFade(appearance.fadeDurationMs ?? 3000);
  return rolls;
}

export async function rollDiceBoxValues(count: number, sides: number): Promise<number[]> {
  if (count <= 0 || sides <= 0) return [];
  const rolls = await rollInternal([{ sides, qty: count }]);
  return allocateValuesBySpecs(
    rolls,
    Array.from({ length: count }, () => ({ sides }))
  );
}

export async function rollDiceBoxComposite(
  requests: Array<{ count: number; sides: number }>
): Promise<number[][]> {
  const payload = requests.map((req) => ({ sides: req.sides, qty: req.count }));
  const rolls = await rollInternal(payload);
  const specs: Array<{ sides: number }> = [];
  requests.forEach((req) => {
    for (let i = 0; i < req.count; i++) {
      specs.push({ sides: req.sides });
    }
  });
  const values = allocateValuesBySpecs(rolls, specs);
  const results: number[][] = [];
  let cursor = 0;
  for (const req of requests) {
    const slice = values.slice(cursor, cursor + req.count);
    cursor += req.count;
    results.push(slice);
  }
  return results;
}

export async function rollDiceBoxList(
  dice: Array<{ sides: number | string; themeColor?: string; data?: string }>
): Promise<number[]> {
  const filtered = (dice ?? []).filter(
    (die) =>
      die &&
      ((typeof die.sides === "number" && Number.isFinite(die.sides) && die.sides > 0) ||
        typeof die.sides === "string")
  );
  if (!filtered.length) return [];
  const payload = filtered.map((die) => ({
    sides: die.sides,
    qty: 1,
    themeColor: die.themeColor,
    data: die.data,
  }));
  const rolls = await rollInternal(payload);
  const specs = filtered.map((die) => ({
    sides: typeof die.sides === "number" ? die.sides : coerceSides(die.sides) ?? 0,
  }));
  return allocateValuesBySpecs(rolls, specs);
}
