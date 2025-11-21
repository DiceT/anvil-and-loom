import { appSettingsDefaults } from "../../shared/appSettingsDefaults.js";

export type ThemeMode = "dark" | "light";

export interface AppSettings {
  theme: ThemeMode;
  launchOnStartup: boolean;
  dailyBackupReminder: boolean;
  activeTapestry: string;
  liveSpellcheck: boolean;
  focusMode: boolean;
  defaultBodyFont: string;
  automaticUpdates: boolean;
  autoLinkTitles: boolean;
  attachmentFolder: string;
  linkStyle: string;
  accentColor: string;
  highContrastText: boolean;
  showParchmentTexture: boolean;
  coreDiceEngine: boolean;
  coreTapestrySync: boolean;
  coreLoreAtlas: boolean;
  tapestriesRoot: string;
  currentTapestry: string;
  diceFadeDurationMs: number;
  diceThemeName: string;
  diceThemeColor: string;
  diceTensThemeColor: string;
  diceTexture: string;
  diceScale: number;
  diceEnableExploding: boolean;
  diceEnableDegrade: boolean;
  diceEnablePools: boolean;
}

const LOCAL_STORAGE_KEY = "anvil-and-loom:settings";

const defaultsFromShared = appSettingsDefaults as AppSettings;

let memorySettings: AppSettings = { ...defaultsFromShared };

function getBridge() {
  if (typeof window === "undefined") return undefined;
  return window.settingsAPI;
}

function readFromLocalStorage() {
  if (typeof window === "undefined" || !window.localStorage) {
    return defaultsFromShared;
  }
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return defaultsFromShared;
    const parsed = JSON.parse(raw);
    return { ...defaultsFromShared, ...parsed };
  } catch (error) {
    console.error("Failed to parse stored settings", error);
    return defaultsFromShared;
  }
}

function writeToLocalStorage(settings: AppSettings) {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(
      LOCAL_STORAGE_KEY,
      JSON.stringify(settings)
    );
  } catch (error) {
    console.error("Failed to persist settings locally", error);
  }
}

export async function fetchAppSettings(): Promise<AppSettings> {
  const bridge = getBridge();
  if (bridge) {
    memorySettings = await bridge.getSettings();
    return memorySettings;
  }
  memorySettings = readFromLocalStorage();
  writeToLocalStorage(memorySettings);
  return memorySettings;
}

export async function updateAppSettings(
  partial: Partial<AppSettings>
): Promise<AppSettings> {
  const bridge = getBridge();
  if (bridge) {
    memorySettings = await bridge.updateSettings(partial);
    return memorySettings;
  }
  memorySettings = { ...memorySettings, ...partial };
  writeToLocalStorage(memorySettings);
  return memorySettings;
}

export function getDefaultSettings(): AppSettings {
  return { ...defaultsFromShared };
}

export function subscribeToSettings(
  callback: (settings: AppSettings) => void
): () => void {
  const bridge = getBridge();
  if (bridge?.subscribe) {
    return bridge.subscribe(callback);
  }
  return () => {};
}
