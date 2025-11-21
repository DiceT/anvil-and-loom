import { app, BrowserWindow, ipcMain, dialog } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import {
  mkdir,
  readdir,
  readFile,
  writeFile,
  rm,
  rename as renameFs,
  stat,
} from "node:fs/promises";
import {
  initSettingsStore,
  getCachedSettings,
  updateSettings,
} from "./settingsManager.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      // contextIsolation is required so only our preload bridge can expose APIs.
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.cjs"),
    },
  });

  const isDev = !app.isPackaged;

  if (isDev) {
    // Vite dev server
    win.loadURL("http://localhost:5173");
    win.webContents.openDevTools();
  } else {
    // Built files from Vite
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

ipcMain.handle("settings:get", () => getCachedSettings());
ipcMain.handle("settings:update", (_event, partial) =>
  updateSettings(partial)
);
ipcMain.handle("app:getVersion", () => app.getVersion());
ipcMain.handle("tapestries:chooseRoot", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openDirectory", "createDirectory"],
  });
  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  const selected = result.filePaths[0];
  await updateSettings({ tapestriesRoot: selected });
  return selected;
});
ipcMain.handle("tapestries:list", async () => listTapestriesOnDisk());
ipcMain.handle("tapestries:create", async (_event, name) =>
  createTapestryOnDisk(name)
);
ipcMain.handle("tapestries:listEntries", async () =>
  listTapestryEntries()
);
ipcMain.handle("tapestries:readEntry", async (_event, relativePath) =>
  readTapestryEntry(relativePath)
);
ipcMain.handle("tapestries:createFolder", async (_event, payload) =>
  createTapestryFolder(payload?.parentPath ?? "", payload?.folderName ?? "")
);
ipcMain.handle("tapestries:createEntryFile", async (_event, payload) =>
  createTapestryEntry(payload?.parentPath ?? "", payload?.entryName ?? "")
);
ipcMain.handle("tapestries:renamePath", async (_event, payload) =>
  renameTapestryPath(payload?.path ?? "", payload?.newName ?? "")
);
ipcMain.handle("tapestries:deletePath", async (_event, payload) =>
  deleteTapestryPath(payload?.path ?? "")
);
ipcMain.handle("tapestries:saveEntry", async (_event, payload) =>
  saveTapestryEntry(payload?.path ?? "", payload?.content ?? "")
);

app.whenReady().then(async () => {
  await initSettingsStore();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

function resolveTapestriesRoot(rawPath) {
  const base = rawPath && rawPath.length ? rawPath : "tapestries";
  return path.isAbsolute(base)
    ? base
    : path.resolve(app.getAppPath(), base);
}

async function ensureTapestriesRoot() {
  const target = resolveTapestriesRoot(getCachedSettings().tapestriesRoot);
  if (!existsSync(target)) {
    await mkdir(target, { recursive: true });
  }
  return target;
}

async function listTapestriesOnDisk() {
  const root = await ensureTapestriesRoot();
  const contents = await readdir(root, { withFileTypes: true });
  return contents
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);
}

async function createTapestryOnDisk(name) {
  const safeName = name.replace(/[\\/:*?"<>|]/g, "-").trim();
  if (!safeName) {
    throw new Error("Tapestry name cannot be empty");
  }
  const root = await ensureTapestriesRoot();
  const target = path.join(root, safeName);
  await mkdir(target, { recursive: true });
  await mkdir(path.join(target, "assets"), { recursive: true });
  // Seed default structure and welcome doc for new Tapestries.
  const defaultDirs = ["Journal", "Lore", "Places", "People", "Factions", "Notes"];
  for (const dir of defaultDirs) {
    await mkdir(path.join(target, dir), { recursive: true });
  }
  const welcomeCandidates = [
    path.join(app.getAppPath(), "tapestries", "Welcome to Your Tapestry.md"),
    path.join(process.cwd(), "tapestries", "Welcome to Your Tapestry.md"),
    path.join(__dirname, "..", "tapestries", "Welcome to Your Tapestry.md"),
  ];
  const welcomeTemplate = welcomeCandidates.find((candidate) => existsSync(candidate));
  if (welcomeTemplate) {
    const welcomeDest = path.join(target, "Welcome to Your Tapestry.md");
    if (!existsSync(welcomeDest)) {
      const content = await readFile(welcomeTemplate, "utf-8");
      await writeFile(welcomeDest, content, "utf-8");
    }
  }
  await updateSettings({ currentTapestry: safeName });
  return { name: safeName, path: target };
}

async function createTapestryFolder(parentPath, folderName) {
  const baseDir = await ensureCurrentTapestryDir();
  const parentDir = resolveWithinTapestry(baseDir, parentPath);
  await mkdir(parentDir, { recursive: true });
  const safeName = sanitizeName(folderName) || "New Folder";
  let finalName = safeName;
  let counter = 1;
  while (existsSync(path.join(parentDir, finalName))) {
    finalName = `${safeName}-${counter++}`;
  }
  const targetDir = path.join(parentDir, finalName);
  await mkdir(targetDir, { recursive: true });
  return {
    name: finalName,
    path: normalizeRelative(path.relative(baseDir, targetDir)),
  };
}

async function createTapestryEntry(parentPath, entryName) {
  const baseDir = await ensureCurrentTapestryDir();
  const parentDir = resolveWithinTapestry(baseDir, parentPath);
  await mkdir(parentDir, { recursive: true });
  const safeName = sanitizeName(entryName) || "Untitled Entry";
  let finalName = safeName;
  let counter = 1;
  let targetFile = path.join(parentDir, `${finalName}.md`);
  while (existsSync(targetFile)) {
    finalName = `${safeName}-${counter++}`;
    targetFile = path.join(parentDir, `${finalName}.md`);
  }
  await writeFile(targetFile, `# ${finalName}\n\n`);
  return {
    name: finalName,
    path: normalizeRelative(path.relative(baseDir, targetFile)),
  };
}

async function renameTapestryPath(relativePath, newName) {
  const baseDir = await ensureCurrentTapestryDir();
  const original = resolveWithinTapestry(baseDir, relativePath);
  const stats = await stat(original);
  const safeName = sanitizeName(newName);
  if (!safeName) {
    throw new Error("Name cannot be empty");
  }
  const parentDir = path.dirname(original);
  const extension = stats.isDirectory() ? "" : path.extname(original);
  const target = path.join(parentDir, safeName + extension);
  if (existsSync(target)) {
    throw new Error("A file or folder with that name already exists.");
  }
  await renameFs(original, target);
  return {
    path: normalizeRelative(path.relative(baseDir, target)),
    type: stats.isDirectory() ? "folder" : "file",
  };
}

async function deleteTapestryPath(relativePath) {
  const baseDir = await ensureCurrentTapestryDir();
  const target = resolveWithinTapestry(baseDir, relativePath);
  await rm(target, { recursive: true, force: true });
  return { path: normalizeRelative(relativePath) };
}

async function saveTapestryEntry(relativePath, content) {
  if (!relativePath) throw new Error("Entry path required");
  const baseDir = await ensureCurrentTapestryDir();
  const target = resolveWithinTapestry(baseDir, relativePath);
  await writeFile(target, content ?? "", "utf-8");
  return { path: normalizeRelative(relativePath) };
}

async function ensureCurrentTapestryDir() {
  const root = await ensureTapestriesRoot();
  const { currentTapestry } = getCachedSettings();
  const tapestryDir = path.join(root, currentTapestry);
  await mkdir(tapestryDir, { recursive: true });
  return tapestryDir;
}

async function listTapestryEntries() {
  const baseDir = await ensureCurrentTapestryDir();
  const nodes = await buildTree(baseDir, "");
  const { currentTapestry } = getCachedSettings();
  return [
    {
      type: "folder",
      name: currentTapestry,
      path: "",
      isRoot: true,
      children: nodes,
    },
  ];
}

async function buildTree(directory, relativeBase) {
  const dirents = await readdir(directory, { withFileTypes: true });
  const nodes = await Promise.all(
    dirents.map(async (dirent) => {
      if (dirent.name.startsWith(".")) return null;
      if (dirent.isDirectory() && dirent.name.toLowerCase() === "assets") {
        return null;
      }
      const nextRelative = relativeBase
        ? `${relativeBase}/${dirent.name}`
        : dirent.name;
      const absolutePath = path.join(directory, dirent.name);
      if (dirent.isDirectory()) {
        const children = await buildTree(absolutePath, nextRelative);
        return {
          type: "folder",
          name: dirent.name,
          path: normalizeRelative(nextRelative),
          children,
        };
      }
      if (!dirent.isFile()) return null;
      if (!dirent.name.toLowerCase().endsWith(".md")) return null;
      return {
        type: "file",
        name: dirent.name.replace(/\.md$/i, ""),
        path: normalizeRelative(nextRelative),
      };
    })
  );
  return nodes
    .filter(Boolean)
    .sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name);
      return a.type === "folder" ? -1 : 1;
    });
}

function normalizeRelative(value) {
  return value.replace(/\\/g, "/");
}

function sanitizeName(name = "") {
  return name.replace(/[<>:"/\\|?*]/g, "").trim();
}

function resolveWithinTapestry(baseDir, relativePath = "") {
  const normalized = relativePath ? path.normalize(relativePath) : "";
  const target = path.join(baseDir, normalized);
  if (!target.startsWith(baseDir)) {
    throw new Error("Path escapes the active Tapestry");
  }
  return target;
}

async function readTapestryEntry(relativePath) {
  if (!relativePath) {
    throw new Error("A file path is required");
  }
  const baseDir = await ensureCurrentTapestryDir();
  const target = path.normalize(path.join(baseDir, relativePath));
  if (!target.startsWith(baseDir)) {
    throw new Error("Path escapes the active Tapestry");
  }
  try {
    const content = await readFile(target, "utf-8");
    return { path: normalizeRelative(relativePath), content };
  } catch (error) {
    if (error.code === "ENOENT") {
      return { path: normalizeRelative(relativePath), content: "" };
    }
    throw error;
  }
}
