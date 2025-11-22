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

ipcMain.handle("dev:saveTableJson", async (_event, payload) => {
  const type = (payload?.type ?? "").toString();
  const name = (payload?.name ?? "").toString();
  const json = (payload?.json ?? "").toString();
  if (type !== "aspect" && type !== "domain") {
    throw new Error("Invalid type; expected 'aspect' or 'domain'");
  }
  const tablesBase = await ensureTablesBaseDir();
  const targetDir = path.join(tablesBase, type === "aspect" ? "aspects" : "domains");
  await mkdir(targetDir, { recursive: true });
  const slug = slugify(name);
  if (!slug) throw new Error("Name required");
  let parsed;
  try {
    parsed = JSON.parse(json);
  } catch (e) {
    throw new Error("Invalid JSON payload");
  }
  const filePath = path.join(targetDir, `${slug}.json`);
  await writeFile(filePath, JSON.stringify(parsed, null, 2), "utf-8");
  return { ok: true, path: filePath };
});

// Tables registry IPC
ipcMain.handle("tables:list", async () => listAllTables());
ipcMain.handle("tables:get", async (_event, payload) => getTableById(payload?.id ?? ""));

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

function slugify(value = "") {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

async function ensureTablesBaseDir() {
  // Prefer electron/tables first (where current repo stores tables), then repo-root tables
  const candidatesInOrder = [
    path.join(__dirname, "tables"),
    path.join(__dirname, "..", "tables"),
    path.join(process.cwd(), "tables"),
    path.join(app.getAppPath(), "tables"),
  ];
  for (const dir of candidatesInOrder) {
    try {
      if (existsSync(dir)) {
        await mkdir(dir, { recursive: true });
        return dir;
      }
    } catch {
      // continue
    }
  }
  // Fallback: create under electron/tables
  const preferred = path.join(__dirname, "tables");
  try {
    await mkdir(preferred, { recursive: true });
    return preferred;
  } catch {}
  const fallback = path.join(app.getPath("userData"), "tables");
  await mkdir(fallback, { recursive: true });
  return fallback;
}

async function listAllTables() {
  const base = await ensureTablesBaseDir();
  const roots = [
    // Explicitly include electron/tables and common subfolders
    path.join(__dirname, "tables"),
    path.join(__dirname, "tables", "core"),
    path.join(__dirname, "tables", "custom"),
    path.join(__dirname, "tables", "aspects"),
    path.join(__dirname, "tables", "domains"),
    // Also include the resolved base and its likely subfolders
    base,
    path.join(base, "core"),
    path.join(base, "custom"),
    path.join(base, "aspects"),
    path.join(base, "domains"),
  ];
  const files = new Set();
  for (const root of roots) {
    if (!existsSync(root)) continue;
    await collectJsonFiles(root, files);
  }
  const descriptors = [];
  for (const filePath of files) {
    try {
      const normalized = await loadForgeTablesFromFile(filePath);
      for (const t of normalized) {
        const rel = path.relative(path.join(__dirname, ".."), filePath).replace(/\\/g, "/");
        const parent = t.parent || inferParentName(filePath) || inferCategoryFromPath(filePath);
        const oracleType = t.oracle_type || t.name || "Table";
        const displayName = `${parent}: ${oracleType}`;
        const id = `${rel}::${displayName}`;
        descriptors.push({
          id,
          name: displayName,
          parent,
          category: t.category || inferCategoryFromPath(filePath),
          oracle_type: t.oracle_type,
          tags: Array.isArray(t.tags) ? t.tags : [],
          sourcePath: rel,
        });
      }
    } catch {
      // skip invalid files
    }
  }
  // Sort by category then parent display grouping for nicer UX
  descriptors.sort((a, b) => (a.category === b.category ? a.name.localeCompare(b.name) : a.category.localeCompare(b.category)));
  return descriptors;
}

async function getTableById(id) {
  const idStr = String(id || "");
  if (!idStr.includes("::")) {
    throw new Error("Invalid table id");
  }
  const [rel, displayName] = idStr.split("::");
  const filePath = path.join(path.join(__dirname, ".."), rel);
  const tables = await loadForgeTablesFromFile(filePath);
  const match = tables.find((t) => t.name === displayName) || tables[0];
  return match;
}

async function collectJsonFiles(dir, files) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      await collectJsonFiles(full, files);
    } else if (e.isFile() && e.name.toLowerCase().endsWith(".json")) {
      files.add(full);
    }
  }
}

async function loadForgeTablesFromFile(filePath) {
  const raw = await readFile(filePath, "utf-8");
  const json = JSON.parse(raw);
  const rel = path.relative(path.join(__dirname, ".."), filePath).replace(/\\/g, "/");

  function normalizeSubtableName(key) {
    const k = String(key || "").toLowerCase();
    if (k.includes("objective")) return "Objectives";
    if (k.includes("atmosphere")) return "Atmosphere";
    if (k.includes("manifestation")) return "Manifestations";
    if (k.includes("location")) return "Locations";
    if (k.includes("discover")) return "Discoveries";
    if (k.includes("bane")) return "Banes";
    if (k.includes("boon")) return "Boons";
    // fallback capitalize
    return String(key || "").replace(/_/g, " ");
  }

  function normalizeTags(tags, category) {
    const t = Array.isArray(tags) ? [...tags] : [];
    if (category === "Aspect" && !t.includes("aspect")) t.push("aspect");
    if (category === "Domain" && !t.includes("domain")) t.push("domain");
    return t;
  }

  // Case: Already canonical ForgeTable[]
  if (Array.isArray(json) && json.every((t) => t && t.headers && t.tableData)) {
    return json.map((t) => ({
      ...t,
      sourcePath: t.sourcePath || rel,
      category: t.category || undefined,
      tags: normalizeTags(t.tags, t.category),
      oracle_type: t.oracle_type || t.name,
    }));
  }

  // Case: Single ForgeTable
  if (json && json.headers && json.tableData) {
    return [{
      ...json,
      sourcePath: json.sourcePath || rel,
      category: json.category || undefined,
      tags: normalizeTags(json.tags, json.category),
      oracle_type: json.oracle_type || json.name,
    }];
  }

  // Legacy nested structure under aspects/domains
  const out = [];
  const addFromGroup = (groupObj, categoryLabel) => {
    if (!groupObj || typeof groupObj !== "object") return;
    for (const topName of Object.keys(groupObj)) {
      const pack = groupObj[topName];
      if (!pack || typeof pack !== "object") continue;
      const parentDesc = pack.description ?? "";
      for (const key of Object.keys(pack)) {
        if (key === "description") continue;
        const node = pack[key];
        if (node && node.headers && node.tableData) {
          const tableName = normalizeSubtableName(key);
          out.push({
            sourcePath: rel,
            category: categoryLabel,
            name: tableName,
            parent: topName,
            tags: normalizeTags(node.tags, categoryLabel),
            summary: `${topName} — ${tableName}`,
            description: node.description ?? parentDesc ?? "",
            headers: node.headers,
            tableData: node.tableData,
            maxRoll: node.maxRoll || 100,
            oracle_type: node.oracle_type || tableName,
          });
        }
      }
    }
  };
  if (json.aspects) addFromGroup(json.aspects, "Aspect");
  if (json.domains) addFromGroup(json.domains, "Domain");
  if (out.length) return out;

  // Unrecognized
  return [];
}

function inferCategoryFromPath(p) {
  const lower = p.toLowerCase();
  if (lower.includes("aspects")) return "Aspect";
  if (lower.includes("domains")) return "Domain";
  return "Other";
}

function inferParentName(filePath) {
  // Try to derive parent from filename for nested legacy files
  const base = path.basename(filePath, ".json");
  // Title case
  return base
    .split(/[-_\s]+/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
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
