import { app, BrowserWindow } from "electron";
import path from "node:path";
import { readFile, writeFile } from "node:fs/promises";
import { existsSync, mkdirSync } from "node:fs";
import {
  appSettingsDefaults,
  cloneDefaultSettings,
} from "../shared/appSettingsDefaults.js";

const SETTINGS_DIR = "config";
const SETTINGS_FILE = "app-settings.json";

let cachedSettings = cloneDefaultSettings();
let settingsPath = "";

function ensureSettingsPath() {
  if (settingsPath) return settingsPath;
  const base = app.getPath("userData");
  const dir = path.join(base, SETTINGS_DIR);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  settingsPath = path.join(dir, SETTINGS_FILE);
  return settingsPath;
}

async function persistSettingsToDisk() {
  const file = ensureSettingsPath();
  await writeFile(file, JSON.stringify(cachedSettings, null, 2), "utf-8");
}

async function readSettingsFromDisk() {
  const file = ensureSettingsPath();
  try {
    const raw = await readFile(file, "utf-8");
    const parsed = JSON.parse(raw);
    cachedSettings = { ...appSettingsDefaults, ...parsed };
  } catch (error) {
    cachedSettings = cloneDefaultSettings();
    await persistSettingsToDisk();
  }
  return cachedSettings;
}

export async function initSettingsStore() {
  return readSettingsFromDisk();
}

export function getCachedSettings() {
  return cachedSettings;
}

export async function updateSettings(partial = {}) {
  cachedSettings = { ...cachedSettings, ...partial };
  await persistSettingsToDisk();
  broadcastSettings();
  return cachedSettings;
}

function broadcastSettings() {
  const payload = getCachedSettings();
  BrowserWindow.getAllWindows().forEach((win) => {
    win.webContents.send("settings:changed", payload);
  });
}
