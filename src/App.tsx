import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import "./App.css";
import {
  ScrollText,
  Dices,
  LayoutPanelTop,
  Settings,
  User,
  FilePlus2,
  Puzzle,
  SunMoon,
  Trash2,
  Search,
  FolderPlus,
  X,
  Folder as FolderIcon,
  FileText,
  Pencil,
  ChevronRight,
  ChevronDown,
  FlaskConical,
} from "lucide-react";
import { marked } from "marked";

marked.setOptions({
  breaks: true,
});
import { DiceTray } from "./components/DiceTray";
import {
  fetchAppSettings,
  getDefaultSettings,
  subscribeToSettings,
  updateAppSettings,
  type AppSettings,
} from "./lib/settingsStore";
import DiceExpression, {
  type DiceExpressionWarning,
} from "./lib/dice/DiceExpression";
import DiceRoller, { type RollResult } from "./lib/dice/DiceRoller";
import { annotateRollResult, type RollHighlight } from "./lib/dice/rollHighlights";
import diceBoxValueProvider from "./lib/dice/diceBoxAdapter";

type ActiveTool = "results" | "dice" | "tables" | "diceDev";
type EntryType = "journal" | "note";

interface Entry {
  id: string;
  title: string;
  type: EntryType;
  content: string;
  updatedAt: number;
  folderId?: string | null;
}

interface TapestryNode {
  type: "folder" | "file";
  name: string;
  path: string;
  children?: TapestryNode[];
  isRoot?: boolean;
}

const containsPath = (node: TapestryNode, target: string): boolean => {
  if (node.path === target) return true;
  if (node.children) {
    return node.children.some((child) => containsPath(child, target));
  }
  return false;
};

const getParentFolderPath = (relativePath: string) => {
  if (!relativePath) return "";
  const normalized = relativePath.replace(/\\/g, "/");
  const lastSlash = normalized.lastIndexOf("/");
  return lastSlash >= 0 ? normalized.slice(0, lastSlash) : "";
};

type SettingsCategory =
  | "general"
  | "editor"
  | "files"
  | "dice"
  | "appearance"
  | "hotkeys"
  | "corePlugins"
  | "communityPlugins";

const settingsNav: { id: SettingsCategory; label: string }[] = [
  { id: "general", label: "General" },
  { id: "editor", label: "Editor" },
  { id: "files", label: "Files & Threads" },
  { id: "dice", label: "Dice" },
  { id: "appearance", label: "Appearance" },
  { id: "hotkeys", label: "Hotkeys" },
  { id: "corePlugins", label: "Core Plugins" },
  { id: "communityPlugins", label: "Community Plugins" },
];

const initialEntries: Entry[] = [];

function App() {
  const [settings, setSettings] = useState<AppSettings>(getDefaultSettings());
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [appVersion, setAppVersion] = useState(
    import.meta.env.VITE_APP_VERSION ?? "0.0.0"
  );
  const [tapestryList, setTapestryList] = useState<string[]>([]);
  const [tapestriesLoading, setTapestriesLoading] = useState(false);
  const [newTapestryName, setNewTapestryName] = useState("");
  const [tapestryRootInput, setTapestryRootInput] = useState(
    getDefaultSettings().tapestriesRoot
  );
  const [tapestryTree, setTapestryTree] = useState<TapestryNode[]>([]);
  const [treeLoading, setTreeLoading] = useState(false);
  const [treeError, setTreeError] = useState<string | null>(null);
  const [isSavingEntry, setIsSavingEntry] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  const [isToolPaneOpen, setToolPaneOpen] = useState(false);
  const [activeTool, setActiveTool] = useState<ActiveTool>("results");
  const [entries, setEntries] = useState<Entry[]>(initialEntries);
  const [activeEntryDraftTitle, setActiveEntryDraftTitle] = useState("");
  const [activeEntryDraftContent, setActiveEntryDraftContent] = useState("");
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [selectedFolderPath, setSelectedFolderPath] = useState<string>("");
  const [selectedNode, setSelectedNode] = useState<{
    path: string;
    type: "file" | "folder";
    name: string;
  } | null>(null);
  const [diceDevExpression, setDiceDevExpression] = useState("1d6");
  const [diceDevResult, setDiceDevResult] = useState<RollResult | null>(null);
  const [diceDevWarnings, setDiceDevWarnings] = useState<DiceExpressionWarning[]>([]);
  const [diceDevError, setDiceDevError] = useState<string | null>(null);
  const [entryViewModes, setEntryViewModes] = useState<
    Record<string, "edit" | "view">
  >({});
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({ "": true });
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [renamingValue, setRenamingValue] = useState("");
  const [modalState, setModalState] = useState<
    | { type: "create"; target: "entry" | "folder" }
    | { type: "confirmDelete"; node: { path: string; type: "file" | "folder"; name: string } }
    | null
  >(null);
  const [modalValue, setModalValue] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [settingsCategory, setSettingsCategory] =
    useState<SettingsCategory>("general");
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [toolsWidth, setToolsWidth] = useState(360);
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);
  const activeEntryMode =
    activeEntryId && entryViewModes[activeEntryId]
      ? entryViewModes[activeEntryId]
      : "edit";

  useEffect(() => {
    let isMounted = true;
    fetchAppSettings()
      .then((loaded) => {
        if (!isMounted) return;
        setSettings(loaded);
        setSettingsLoaded(true);
      })
      .catch((error) => {
        console.error("Failed to load settings", error);
        if (isMounted) setSettingsLoaded(true);
      });
    const unsubscribe = subscribeToSettings((next) => {
      setSettings(next);
    });
    return () => {
      isMounted = false;
      unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", settings.theme);
  }, [settings.theme]);

  useEffect(() => {
    const handleMove = (event: MouseEvent) => {
      if (isResizingLeft) {
        const next = Math.min(Math.max(event.clientX, 260), 520);
        setSidebarWidth(next);
      } else if (isResizingRight) {
        const total = window.innerWidth;
        const next = Math.min(Math.max(total - event.clientX, 320), 520);
        setToolsWidth(next);
      }
    };
    const stop = () => {
      setIsResizingLeft(false);
      setIsResizingRight(false);
    };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", stop);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", stop);
    };
  }, [isResizingLeft, isResizingRight]);

  useEffect(() => {
    setTapestryRootInput(settings.tapestriesRoot);
  }, [settings.tapestriesRoot]);

  useEffect(() => {
    if (!activeEntryId) return;
    setEntryViewModes((prev) =>
      prev[activeEntryId] ? prev : { ...prev, [activeEntryId]: "view" }
    );
  }, [activeEntryId]);

  const fetchTapestryTree = useCallback(() => {
    const api = window.settingsAPI;
    const listFn =
      api?.listTapestryEntries ?? (api as any)?.listTapestriesEntries;
    if (!listFn) {
      setTapestryTree([]);
      setTreeError("Directory view requires the desktop app.");
      return;
    }
    setTreeLoading(true);
    setTreeError(null);
    listFn()
      .then((nodes: TapestryNode[]) => {
        setTapestryTree(nodes);
        setActiveEntryId((previous) => {
          if (!previous) return previous;
          const exists = nodes.some((node) => containsPath(node, previous));
          return exists ? previous : null;
        });
        setSelectedNode((previous) => {
          if (!previous) return previous;
          const exists = nodes.some((node) =>
            containsPath(node, previous.path)
          );
          return exists ? previous : null;
        });
        setSelectedFolderPath((previous) => {
          if (!previous) return "";
          const exists = nodes.some((node) => containsPath(node, previous));
          return exists ? previous : "";
        });
      })
      .catch((error: Error) => {
        console.error("Failed to load Tapestry tree", error);
        setTreeError("Could not read this Tapestry. Check the folder path.");
        setTapestryTree([]);
      })
      .finally(() => setTreeLoading(false));
  }, [settings.currentTapestry, settings.tapestriesRoot]);

  useEffect(() => {
    fetchTapestryTree();
  }, [fetchTapestryTree]);

  useEffect(() => {
    const fallback = import.meta.env.VITE_APP_VERSION ?? "0.0.0";
    if (window.settingsAPI?.getAppVersion) {
      window.settingsAPI
        .getAppVersion()
        .then((version) => {
          setAppVersion(version ?? fallback);
        })
        .catch(() => setAppVersion(fallback));
    } else {
      setAppVersion(fallback);
    }
  }, []);

  useEffect(() => {
    if (!isSettingsOpen) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSettingsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isSettingsOpen]);

  const openTool = (tool: ActiveTool) => {
    setActiveTool(tool);
    setToolPaneOpen(true);
  };

  const applySettingsPatch = useCallback(
    (partial: Partial<AppSettings>) => {
      updateAppSettings(partial)
        .then((updated) => {
          setSettings(updated);
        })
        .catch((error) => {
          console.error("Failed to update settings", error);
        });
    },
    []
  );

  const refreshTapestries = useCallback(() => {
    if (!settingsLoaded) return;
    setTapestriesLoading(true);
    const api = window.settingsAPI;
    if (api?.listTapestries) {
      api
        .listTapestries()
        .then((list) => setTapestryList(list))
        .catch((error) => {
          console.error("Failed to list tapestries", error);
          setTapestryList([]);
        })
        .finally(() => setTapestriesLoading(false));
    } else {
      setTapestryList(["Prime Chronicle", "Legends of the Vale"]);
      setTapestriesLoading(false);
    }
  }, [settingsLoaded, settings.tapestriesRoot]);

  useEffect(() => {
    refreshTapestries();
  }, [refreshTapestries]);

  useEffect(() => {
    if (tapestryTree.length === 0) {
      setSelectedFolderPath("");
      setSelectedNode(null);
      return;
    }
    const rootNode = tapestryTree[0];
    setSelectedFolderPath((prev) => (prev === "" ? "" : prev));
    if (!selectedNode) {
      setSelectedNode({
        path: rootNode.path,
        type: "folder",
        name: rootNode.name,
      });
    }
  }, [tapestryTree, selectedNode]);

  useEffect(() => {
    setSelectedFolderPath("");
    setSelectedNode(null);
    setActiveEntryId(null);
    setEntries([]);
    setExpandedFolders({ "": true });
  }, [settings.currentTapestry]);

  useEffect(() => {
    if (!selectedNode) {
      setSelectedFolderPath("");
      return;
    }
    const folderPath =
      selectedNode.type === "folder"
        ? selectedNode.path
        : getParentFolderPath(selectedNode.path);
    setSelectedFolderPath(folderPath);
  }, [selectedNode]);

  const handleChooseTapestriesRoot = useCallback(() => {
    const api = window.settingsAPI;
    if (api?.chooseTapestriesRoot) {
      api
        .chooseTapestriesRoot()
        .then((selected) => {
          if (selected) {
            applySettingsPatch({ tapestriesRoot: selected });
            setTapestryRootInput(selected);
          }
        })
        .catch((error) => console.error("Directory picker failed", error));
    } else {
      const trimmed = tapestryRootInput.trim();
      if (!trimmed) {
        window.alert?.("Enter a valid path before applying.");
        return;
      }
      applySettingsPatch({ tapestriesRoot: trimmed });
    }
  }, [applySettingsPatch, settings.tapestriesRoot, tapestryRootInput]);

  const handleSelectTapestry = useCallback(
    (value: string) => {
      applySettingsPatch({ currentTapestry: value });
    },
    [applySettingsPatch]
  );

  const handleCreateTapestry = useCallback(() => {
    const trimmed = newTapestryName.trim();
    if (!trimmed) return;
    const api = window.settingsAPI;
    if (api?.createTapestry) {
      api
        .createTapestry(trimmed)
        .then(() => {
          setNewTapestryName("");
          refreshTapestries();
        })
        .catch((error) => console.error("Failed to create tapestry", error));
    } else {
      setTapestryList((prev) =>
        prev.includes(trimmed) ? prev : [...prev, trimmed]
      );
      applySettingsPatch({ currentTapestry: trimmed });
      setNewTapestryName("");
    }
  }, [newTapestryName, applySettingsPatch, refreshTapestries]);

  const handleSelectTreeFile = useCallback(
    (node: TapestryNode) => {
      if (node.type !== "file") return;
      const parentFolder = getParentFolderPath(node.path);
      setSelectedFolderPath(parentFolder);
      setSelectedNode({ path: node.path, type: "file", name: node.name });
      const api = window.settingsAPI;
      if (api?.readTapestryEntry) {
        api
          .readTapestryEntry(node.path)
          .then((result) => {
            const entry: Entry = {
              id: node.path,
              title: node.name,
              type: "note",
              content: result.content ?? "",
              updatedAt: Date.now(),
              folderId: null,
            };
            setEntries((prev) => {
              const remaining = prev.filter((existing) => existing.id !== node.path);
              return [entry, ...remaining];
            });
            setActiveEntryId(node.path);
          })
          .catch((error) =>
            console.error("Failed to read Tapestry entry", error)
          );
      } else {
        const entry: Entry = {
          id: node.path,
          title: node.name,
          type: "note",
          content: "(Preview unavailable outside Electron)",
          updatedAt: Date.now(),
          folderId: null,
        };
        setEntries((prev) => {
          const remaining = prev.filter((existing) => existing.id !== node.path);
          return [entry, ...remaining];
        });
        setActiveEntryId(node.path);
      }
    },
    []
  );

  const handleSelectTreeFolder = useCallback((node: TapestryNode) => {
    if (node.type !== "folder") return;
    setSelectedFolderPath(node.path);
    setSelectedNode({ path: node.path, type: "folder", name: node.name });
    setExpandedFolders((prev) => ({ ...prev, [node.path]: true }));
  }, []);

  const toggleFolder = useCallback((path: string, isRoot?: boolean) => {
    setExpandedFolders((prev) => {
      const current = prev[path];
      const nextValue =
        typeof current === "boolean" ? !current : !(isRoot ?? false);
      return { ...prev, [path]: nextValue };
    });
  }, []);

  const submitRename = useCallback(
    (node: TapestryNode) => {
      if (!renamingPath) return;
      const trimmed = renamingValue.trim();
      setRenamingPath(null);
      if (!trimmed || trimmed === node.name) {
        setRenamingValue("");
        return;
      }
      const api = window.settingsAPI;
      if (!api?.renameTapestryPath) {
        setRenamingValue("");
        return;
      }
      api
        .renameTapestryPath({ path: node.path, newName: trimmed })
        .then((result) => {
          const newPath = result?.path ?? node.path;
          const updatedNode = { path: newPath, type: node.type, name: trimmed };
          if (selectedNode?.path === node.path) {
            setSelectedNode(updatedNode);
          }
          if (node.type === "file") {
            setEntries((prev) =>
              prev.map((entry) =>
                entry.id === node.path
                  ? { ...entry, id: newPath, title: trimmed }
                  : entry
              )
            );
            setActiveEntryId((prev) => (prev === node.path ? newPath : prev));
          } else if (node.type === "folder") {
            if (selectedFolderPath === node.path) {
              setSelectedFolderPath(newPath);
            }
          }
          fetchTapestryTree();
        })
        .catch((error) => console.error("Rename failed", error))
        .finally(() => setRenamingValue(""));
    },
    [
      fetchTapestryTree,
      renamingPath,
      renamingValue,
      selectedFolderPath,
      selectedNode,
    ]
  );

  const renderTapestryNodes = useCallback(
    (nodes: TapestryNode[], depth = 0): ReactNode[] =>
      nodes.map((node) => {
        const isFolder = node.type === "folder";
        const key = node.path || `${node.name}-${depth}`;
        const nodePath = node.path ?? "";
        const isActive = isFolder
          ? selectedNode?.type === "folder" && selectedNode.path === node.path
          : activeEntryId === node.path;
        const expanded = isFolder
          ? expandedFolders[nodePath] ?? node.isRoot ?? false
          : false;

        return (
          <div key={key} className="tapestry-tree-node">
            <div
              className="tapestry-tree-row-wrapper"
              style={{ paddingLeft: `${depth * 16}px` }}
            >
              {isFolder ? (
                <button
                  type="button"
                  className="tapestry-tree-caret"
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleFolder(nodePath, node.isRoot);
                  }}
                >
                  {expanded ? (
                    <ChevronDown size={14} strokeWidth={2} />
                  ) : (
                    <ChevronRight size={14} strokeWidth={2} />
                  )}
                </button>
              ) : (
                <span className="tapestry-tree-caret tapestry-tree-caret-spacer" />
              )}
              {renamingPath === nodePath ? (
                <input
                  className="tapestry-tree-rename-input"
                  value={renamingValue}
                  autoFocus
                  onChange={(event) => setRenamingValue(event.target.value)}
                  onBlur={() => submitRename(node)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      submitRename(node);
                    } else if (event.key === "Escape") {
                      setRenamingPath(null);
                      setRenamingValue("");
                    }
                  }}
                />
              ) : (
                <button
                  type="button"
                  className={
                    "tapestry-tree-row" +
                    (isActive ? " tapestry-tree-row-active" : "")
                  }
                  onClick={() =>
                    isFolder
                      ? handleSelectTreeFolder(node)
                      : handleSelectTreeFile(node)
                  }
                  onDoubleClick={(event) => {
                    if (!isFolder) return;
                    event.preventDefault();
                    toggleFolder(nodePath, node.isRoot);
                  }}
                >
                  {isFolder ? (
                    <FolderIcon size={16} strokeWidth={2} />
                  ) : (
                    <FileText size={16} strokeWidth={2} />
                  )}
                  <span>{node.name}</span>
                </button>
              )}
            </div>
            {node.children && node.children.length > 0 && (
              <div
                className="tapestry-tree-children"
                role="group"
                hidden={!expanded}
              >
                {expanded && renderTapestryNodes(node.children, depth + 1)}
              </div>
            )}
          </div>
        );
      }),
    [
      activeEntryId,
      expandedFolders,
      handleSelectTreeFile,
      handleSelectTreeFolder,
      selectedNode,
      toggleFolder,
      renamingPath,
      renamingValue,
    ]
  );

  const visibleTree = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return tapestryTree;
    const filterNodes = (nodes: TapestryNode[]): TapestryNode[] => {
      return nodes
        .map((node) => {
          const nameMatches = node.name.toLowerCase().includes(query);
          if (node.type === "file") {
            return nameMatches ? node : null;
          }
          const children = node.children ? filterNodes(node.children) : [];
          if (nameMatches || children.length) {
            return { ...node, children };
          }
          return null;
        })
        .filter(Boolean) as TapestryNode[];
    };
    return filterNodes(tapestryTree);
  }, [searchQuery, tapestryTree]);

  const handleCheckForUpdates = useCallback(() => {
    console.info("Checking for updates…");
    window.alert("Checking for updates… (coming soon)");
  }, []);

  const handleOpenSettings = () => {
    setSettingsCategory("general");
    setSettingsOpen(true);
  };

  const closeTools = () => {
    setToolPaneOpen(false);
  };

  const activeEntry =
    entries.find((entry) => entry.id === activeEntryId) ?? null;
  const renderedMarkdown = useMemo(() => {
    if (!activeEntry) return "";
    return marked.parse(activeEntryDraftContent || "");
  }, [activeEntry, activeEntryDraftContent]);

  useEffect(() => {
    if (activeEntry) {
      setActiveEntryDraftTitle(activeEntry.title);
      setActiveEntryDraftContent(activeEntry.content);
    } else {
      setActiveEntryDraftTitle("");
      setActiveEntryDraftContent("");
    }
  }, [activeEntry]);

  const renderMainContent = () => {
    if (!activeEntry) {
      return (
        <div className="app-main-empty">
          <h2>No entry selected</h2>
          <p>Create a new entry to begin weaving this tapestry.</p>
          <button
            className="app-primary-button"
            onClick={() => openCreateModal("entry")}
          >
            + New Entry
          </button>
        </div>
      );
    }

    return (
      <div className="app-editor">
        <div className="app-editor-header">
          <input
            className="app-entry-title-input"
            value={activeEntryDraftTitle}
            onChange={(e) => setActiveEntryDraftTitle(e.target.value)}
            onBlur={commitActiveEntryTitle}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commitActiveEntryTitle();
              } else if (event.key === "Escape") {
                setActiveEntryDraftTitle(activeEntry.title);
              }
            }}
            placeholder="Entry title"
          />
          <div className="app-entry-meta">
            <span>{activeEntry.type}</span>
            <span>
              Updated{" "}
              {new Date(activeEntry.updatedAt).toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
            <span className="app-entry-save-status">
              {saveError
                ? saveError
                : isSavingEntry
                ? "Saving..."
                : "Saved"}
            </span>
          </div>
          <div className="app-editor-mode-toggle">
            <button
              className={
                "app-editor-mode-button" +
                (activeEntryMode === "edit" ? " app-editor-mode-active" : "")
              }
              onClick={() => setActiveEntryMode("edit")}
            >
              Editor Mode
            </button>
            <button
              className={
                "app-editor-mode-button" +
                (activeEntryMode === "view" ? " app-editor-mode-active" : "")
              }
              onClick={() => setActiveEntryMode("view")}
            >
              View Mode
            </button>
          </div>
        </div>
        {activeEntryMode === "view" ? (
          <div
            className="app-entry-viewer"
            dangerouslySetInnerHTML={{ __html: renderedMarkdown }}
          />
        ) : (
          <textarea
            value={activeEntryDraftContent}
            onChange={(e) => handleEntryContentChange(e.target.value)}
            className="app-editor-textarea"
            placeholder="Start writing your entry..."
          />
        )}
      </div>
    );
  };

  const renderSettingsContent = () => {
    if (!settingsLoaded) {
      return (
        <section className="settings-section">
          <p className="settings-section-subtitle">Loading settings...</p>
        </section>
      );
    }
    switch (settingsCategory) {
      case "general":
        return (
          <section className="settings-section">
            <h2>General</h2>
            <p className="settings-section-subtitle">
              Core information about Anvil & Loom.
            </p>
            <div className="settings-option">
              <div>
                <p className="settings-option-label">Version</p>
                <p className="settings-option-description">
                  You are currently running Anvil & Loom v{appVersion}.
                </p>
              </div>
              <button
                className="app-primary-button settings-check-button"
                onClick={handleCheckForUpdates}
              >
                Check for updates
              </button>
            </div>
            <div className="settings-option">
              <div>
                <p className="settings-option-label">Automatic updates</p>
                <p className="settings-option-description">
                  Download stable releases as they become available.
                </p>
              </div>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={settings.automaticUpdates}
                  onChange={(e) =>
                    applySettingsPatch({ automaticUpdates: e.target.checked })
                  }
                />
                <span />
              </label>
            </div>
          </section>
        );
      case "editor":
        return (
          <section className="settings-section">
            <h2>Editor</h2>
            <p className="settings-section-subtitle">
              Tune the writing experience for drafting tomes and journal
              entries.
            </p>
            <div className="settings-option">
              <div>
                <p className="settings-option-label">Live spellcheck</p>
                <p className="settings-option-description">
                  Highlights typos as you type without changing the parchment
                  aesthetic.
                </p>
              </div>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={settings.liveSpellcheck}
                  onChange={(e) =>
                    applySettingsPatch({ liveSpellcheck: e.target.checked })
                  }
                />
                <span />
              </label>
            </div>
            <div className="settings-option">
              <div>
                <p className="settings-option-label">Focus mode</p>
                <p className="settings-option-description">
                  Dim surrounding panes to reduce distractions.
                </p>
              </div>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={settings.focusMode}
                  onChange={(e) =>
                    applySettingsPatch({ focusMode: e.target.checked })
                  }
                />
                <span />
              </label>
            </div>
            <div className="settings-option">
              <div>
                <p className="settings-option-label">Default body font</p>
                <p className="settings-option-description">
                  Applied to newly created entries.
                </p>
              </div>
              <select
                className="settings-select"
                value={settings.defaultBodyFont}
                onChange={(e) =>
                  applySettingsPatch({ defaultBodyFont: e.target.value })
                }
              >
                <option value="Caudex">Caudex</option>
                <option value="Inter">Inter</option>
                <option value="Gentium">Gentium</option>
              </select>
            </div>
          </section>
        );
      case "files":
        return (
          <section className="settings-section">
            <h2>Files & Threads</h2>
            <p className="settings-section-subtitle">
              Configure where Anvil & Loom stores Tapestries and all related
              files.
            </p>
            <div className="settings-option settings-option-column">
              <div>
                <p className="settings-option-label">
                  Default location for Tapestries
                </p>
                <p className="settings-option-description">
                  Root directory where all Tapestry folders live.
                </p>
              </div>
              <div className="settings-path-controls">
                <input
                  className="settings-path-input"
                  value={tapestryRootInput}
                  onChange={(e) => setTapestryRootInput(e.target.value)}
                />
                <button
                  className="settings-secondary-button"
                  onClick={handleChooseTapestriesRoot}
                >
                  Choose directory
                </button>
              </div>
            </div>
            <div className="settings-option settings-option-column">
              <div>
                <p className="settings-option-label">Current Tapestry</p>
                <p className="settings-option-description">
                  Active project loaded throughout the workspace.
                </p>
              </div>
              {tapestriesLoading ? (
                <p className="settings-hint">Scanning Tapestries…</p>
              ) : tapestryList.length ? (
                <select
                  className="settings-select"
                  value={settings.currentTapestry}
                  onChange={(e) => handleSelectTapestry(e.target.value)}
                >
                  {tapestryList.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="settings-hint">
                  No Tapestries detected. Create one below.
                </p>
              )}
            </div>
            <div className="settings-option settings-option-column">
              <div>
                <p className="settings-option-label">Create new Tapestry</p>
                <p className="settings-option-description">
                  Each new Tapestry receives its own assets folder for images
                  and references.
                </p>
              </div>
              <div className="settings-create-row">
                <input
                  type="text"
                  className="settings-text-input"
                  placeholder="Tapestry name"
                  value={newTapestryName}
                  onChange={(e) => setNewTapestryName(e.target.value)}
                />
                <button
                  className="app-primary-button settings-create-button"
                  disabled={!newTapestryName.trim()}
                  onClick={handleCreateTapestry}
                >
                  Create
                </button>
              </div>
            </div>
          </section>
        );
      case "dice":
        const fadeSeconds = Math.max(
          0.5,
          (settings.diceFadeDurationMs ?? 0) / 1000
        );
        return (
          <section className="settings-section">
            <h2>Dice</h2>
            <p className="settings-section-subtitle">
              Control how long the 3D dice linger after each roll.
            </p>
            <div className="settings-option settings-option-column">
              <div>
                <p className="settings-option-label">Fade timer</p>
                <p className="settings-option-description">
                  Seconds before the dice automatically fade off the table.
                </p>
              </div>
              <div className="settings-fade-control">
                <input
                  type="range"
                  min={0.5}
                  max={10}
                  step={0.5}
                  value={fadeSeconds}
                  onChange={(e) => {
                    const nextSeconds = Number.parseFloat(e.target.value);
                    const clamped = Number.isFinite(nextSeconds)
                      ? Math.max(0.5, Math.min(10, nextSeconds))
                      : 0.5;
                    applySettingsPatch({
                      diceFadeDurationMs: Math.round(clamped * 1000),
                    });
                  }}
                />
                <div className="settings-fade-number">
                  <input
                    type="number"
                    min={0.5}
                    max={10}
                    step={0.5}
                    className="settings-number-input"
                    value={fadeSeconds}
                    onChange={(e) => {
                      const nextSeconds = Number.parseFloat(e.target.value);
                      const clamped = Number.isFinite(nextSeconds)
                        ? Math.max(0.5, Math.min(10, nextSeconds))
                        : 0.5;
                      applySettingsPatch({
                        diceFadeDurationMs: Math.round(clamped * 1000),
                      });
                    }}
                  />
                  <span>s</span>
                </div>
              </div>
            </div>
          </section>
        );
      case "appearance":
        return (
          <section className="settings-section">
            <h2>Appearance</h2>
            <p className="settings-section-subtitle">
              Customize themes, typography, and contrast modes.
            </p>
            <div className="settings-option">
              <div>
                <p className="settings-option-label">Accent color</p>
                <p className="settings-option-description">
                  Sets the highlight for icons, cursors, and buttons.
                </p>
              </div>
              <select
                className="settings-select"
                value={settings.accentColor}
                onChange={(e) =>
                  applySettingsPatch({ accentColor: e.target.value })
                }
              >
                <option value="Gilded Ember">Gilded Ember</option>
                <option value="Arcane Azure">Arcane Azure</option>
                <option value="Verdant Noir">Verdant Noir</option>
              </select>
            </div>
            <div className="settings-option">
              <div>
                <p className="settings-option-label">High contrast text</p>
                <p className="settings-option-description">
                  Improve legibility for bright environments.
                </p>
              </div>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={settings.highContrastText}
                  onChange={(e) =>
                    applySettingsPatch({ highContrastText: e.target.checked })
                  }
                />
                <span />
              </label>
            </div>
            <div className="settings-option">
              <div>
                <p className="settings-option-label">Show parchment texture</p>
                <p className="settings-option-description">
                  Adds subtle grain behind entry content.
                </p>
              </div>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={settings.showParchmentTexture}
                  onChange={(e) =>
                    applySettingsPatch({ showParchmentTexture: e.target.checked })
                  }
                />
                <span />
              </label>
            </div>
          </section>
        );
      case "hotkeys":
        return (
          <section className="settings-section">
            <h2>Hotkeys</h2>
            <p className="settings-section-subtitle">
              Reference or customize keyboard shortcuts.
            </p>
            <div className="hotkey-grid">
              <div className="hotkey-row">
                <span className="hotkey-label">New entry</span>
                <span className="hotkey-value">Ctrl/Cmd + N</span>
              </div>
              <div className="hotkey-row">
                <span className="hotkey-label">Duplicate entry</span>
                <span className="hotkey-value">Ctrl/Cmd + D</span>
              </div>
              <div className="hotkey-row">
                <span className="hotkey-label">Toggle Dice Tray</span>
                <span className="hotkey-value">Ctrl/Cmd + Shift + T</span>
              </div>
              <div className="hotkey-row">
                <span className="hotkey-label">Search</span>
                <span className="hotkey-value">Ctrl/Cmd + K</span>
              </div>
            </div>
          </section>
        );
      case "corePlugins":
        return (
          <section className="settings-section">
            <h2>Core Plugins</h2>
            <p className="settings-section-subtitle">
              Built-in capabilities maintained by Anvil & Loom.
            </p>
            <div className="settings-option">
              <div>
                <p className="settings-option-label">Dice Engine</p>
                <p className="settings-option-description">
                  Enables all dice tray interactions and result history.
                </p>
              </div>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={settings.coreDiceEngine}
                  onChange={(e) =>
                    applySettingsPatch({ coreDiceEngine: e.target.checked })
                  }
                />
                <span />
              </label>
            </div>
            <div className="settings-option">
              <div>
                <p className="settings-option-label">Tapestry Sync</p>
                <p className="settings-option-description">
                  Keeps entries mirrored to disk under /tapestries.
                </p>
              </div>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={settings.coreTapestrySync}
                  onChange={(e) =>
                    applySettingsPatch({ coreTapestrySync: e.target.checked })
                  }
                />
                <span />
              </label>
            </div>
            <div className="settings-option">
              <div>
                <p className="settings-option-label">Lore Atlas</p>
                <p className="settings-option-description">
                  Visualize entry relationships on an interactive map.
                </p>
              </div>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={settings.coreLoreAtlas}
                  onChange={(e) =>
                    applySettingsPatch({ coreLoreAtlas: e.target.checked })
                  }
                />
                <span />
              </label>
            </div>
          </section>
        );
      case "communityPlugins":
      default:
        return (
          <section className="settings-section">
            <h2>Community Plugins</h2>
            <p className="settings-section-subtitle">
              Install experimental add-ons crafted by fellow storytellers.
            </p>
            <div className="community-callout">
              Browse the curated catalog once you connect your creator profile.
            </div>
            <button className="app-primary-button">Open plugin browser</button>
          </section>
        );
    }
  };

  const toggleTheme = () => {
    const next = settings.theme === "dark" ? "light" : "dark";
    applySettingsPatch({ theme: next });
  };

  const createFolder = useCallback(
    (folderName: string) => {
      const api = window.settingsAPI;
      if (!api?.createTapestryFolder) {
        window.alert?.("Folder creation requires the desktop app.");
        return Promise.reject(new Error("Desktop API unavailable"));
      }
      const parentPath = selectedFolderPath ?? "";
      return api
        .createTapestryFolder({
          parentPath,
          folderName,
        })
        .then((result) => {
          const createdPath = result?.path ?? "";
          const createdName = result?.name ?? folderName;
          setSelectedNode({
            path: createdPath,
            type: "folder",
            name: createdName,
          });
          setExpandedFolders((prev) => ({
            ...prev,
            [parentPath]: true,
            [createdPath]: true,
          }));
          fetchTapestryTree();
        });
    },
    [fetchTapestryTree, selectedFolderPath]
  );

  const createEntry = useCallback(
    (entryName: string) => {
      const api = window.settingsAPI;
      if (!api?.createTapestryEntry) {
        window.alert?.("Entry creation requires the desktop app.");
        return Promise.reject(new Error("Desktop API unavailable"));
      }
      const parentPath = selectedFolderPath ?? "";
      return api
        .createTapestryEntry({
          parentPath,
          entryName,
        })
        .then((result) => {
          fetchTapestryTree();
          if (result?.path) {
            handleSelectTreeFile({
              type: "file",
              name: result?.name ?? entryName,
              path: result.path,
            });
          }
        });
    },
    [fetchTapestryTree, handleSelectTreeFile, selectedFolderPath]
  );

  const handleRenameSelected = useCallback(() => {
    if (
      !selectedNode ||
      (selectedNode.type === "folder" && selectedNode.path === "")
    ) {
      return;
    }
    setRenamingPath(selectedNode.path);
    setRenamingValue(selectedNode.name);
  }, [selectedNode]);

  const handleDeleteSelected = useCallback(() => {
    if (
      !selectedNode ||
      (selectedNode.type === "folder" && selectedNode.path === "")
    ) {
      return;
    }
    setModalState({ type: "confirmDelete", node: selectedNode });
  }, [selectedNode]);

  const performDelete = useCallback(
    (node: { path: string; type: "file" | "folder"; name: string }) => {
      const api = window.settingsAPI;
      if (!api?.deleteTapestryPath) {
        return Promise.reject(new Error("Deletion requires the desktop app."));
      }
      return api
        .deleteTapestryPath({ path: node.path })
        .then(() => {
        if (node.type === "file") {
          setEntries((prev) => prev.filter((entry) => entry.id !== node.path));
          setActiveEntryId((prev) => (prev === node.path ? null : prev));
        }
        const parent = getParentFolderPath(node.path);
        setSelectedFolderPath(parent);
        setSelectedNode(null);
        fetchTapestryTree();
      });
    },
    [fetchTapestryTree]
  );

  const openCreateModal = useCallback(
    (target: "entry" | "folder") => {
      setModalState({ type: "create", target });
      setModalValue("");
    },
    []
  );

  const setActiveEntryMode = useCallback(
    (mode: "edit" | "view") => {
      if (!activeEntryId) return;
      setEntryViewModes((prev) => ({ ...prev, [activeEntryId]: mode }));
    },
    [activeEntryId]
  );

  const closeModal = useCallback(() => {
    setModalState(null);
    setModalValue("");
  }, []);

  const handleModalConfirm = useCallback(() => {
    if (!modalState) return;
    if (modalState.type === "create") {
      const value = modalValue.trim();
      if (!value) return;
      const action =
        modalState.target === "folder"
          ? createFolder(value)
          : createEntry(value);
      action
        .then(() => closeModal())
        .catch(() => closeModal());
    } else if (modalState.type === "confirmDelete") {
      performDelete(modalState.node)
        .then(() => closeModal())
        .catch(() => closeModal());
    }
  }, [closeModal, createEntry, createFolder, modalState, modalValue, performDelete]);

  const scheduleSave = useCallback(
    (content: string, entryId: string) => {
      if (!window.settingsAPI?.saveTapestryEntry) return;
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
      saveTimerRef.current = window.setTimeout(() => {
        setIsSavingEntry(true);
        setSaveError(null);
        window.settingsAPI
          ?.saveTapestryEntry({ path: entryId, content })
          .then(() => {
            setIsSavingEntry(false);
          })
          .catch((error) => {
            console.error("Failed to save entry", error);
            setIsSavingEntry(false);
            setSaveError("Failed to save entry");
          });
      }, 700);
    },
    []
  );

  const handleDiceRollLog = useCallback(
    (markdown: string) => {
      if (!activeEntryId) return;
      const baseContent =
        activeEntryDraftContent.length > 0
          ? activeEntryDraftContent
          : activeEntry?.content ?? "";
      const separator = baseContent.trim().length ? "\n\n" : "";
      const newContent = `${baseContent}${separator}${markdown}`;
      setActiveEntryDraftContent(newContent);
      setEntries((prev) =>
        prev.map((entry) =>
          entry.id === activeEntryId
            ? { ...entry, content: newContent, updatedAt: Date.now() }
            : entry
        )
      );
      scheduleSave(newContent, activeEntryId);
    },
    [activeEntry, activeEntryDraftContent, activeEntryId, scheduleSave]
  );

  const handleEntryContentChange = useCallback(
    (nextValue: string) => {
      if (!activeEntryId) return;
      setEntries((prev) =>
        prev.map((entry) =>
          entry.id === activeEntryId
            ? { ...entry, content: nextValue, updatedAt: Date.now() }
            : entry
        )
      );
      setActiveEntryDraftContent(nextValue);
      scheduleSave(nextValue, activeEntryId);
    },
    [activeEntryId, scheduleSave]
  );

  const commitActiveEntryTitle = useCallback(() => {
    if (!activeEntry) return;
    const trimmed = activeEntryDraftTitle.trim();
    if (!trimmed || trimmed === activeEntry.title) {
      setActiveEntryDraftTitle(activeEntry.title);
      return;
    }
    const api = window.settingsAPI;
    if (!api?.renameTapestryPath) {
      setActiveEntryDraftTitle(activeEntry.title);
      return;
    }
    api
      .renameTapestryPath({ path: activeEntry.id, newName: trimmed })
      .then((result) => {
        const newPath = result?.path ?? activeEntry.id;
        setEntries((prev) =>
          prev.map((entry) =>
            entry.id === activeEntry.id
              ? { ...entry, id: newPath, title: trimmed }
              : entry
          )
        );
        setActiveEntryId(newPath);
        setSelectedNode({ path: newPath, type: "file", name: trimmed });
        fetchTapestryTree();
      })
      .catch((error) => {
        console.error("Failed to rename entry", error);
        setActiveEntryDraftTitle(activeEntry.title);
      });
  }, [activeEntry, activeEntryDraftTitle, fetchTapestryTree]);

  const handleDiceDevRoll = useCallback(async () => {
    try {
      const expression = DiceExpression.parse(diceDevExpression || "");
      setDiceDevWarnings(expression.warnings);
      const result = await DiceRoller.rollWithProvider(expression, diceBoxValueProvider);
      setDiceDevResult(result);
      setDiceDevError(null);
    } catch (error) {
      setDiceDevResult(null);
      setDiceDevWarnings([]);
      setDiceDevError(
        error instanceof Error ? error.message : "Failed to parse/roll expression"
      );
    }
  }, [diceDevExpression]);

  const renderDiceDevPanel = () => (
    <div className="dice-dev-panel">
      <div className="dice-dev-controls">
        <label htmlFor="dice-dev-expression">Expression</label>
        <div className="dice-dev-input-row">
          <input
            id="dice-dev-expression"
            type="text"
            value={diceDevExpression}
            onChange={(event) => setDiceDevExpression(event.target.value)}
            placeholder="e.g. 4d6dl1 + 2"
          />
          <button type="button" onClick={handleDiceDevRoll}>
            Roll
          </button>
        </div>
        <p className="dice-dev-hint">
          Supports keep/drop (kh/kl/dh/dl), pool successes (&gt;=6#3), degrade triggers
          (!&lt;=2), and challenge rolls (e.g. <code>challenge(d6+1 vs 2d10)</code>).
        </p>
      </div>
      {diceDevError && <div className="dice-dev-error">{diceDevError}</div>}
      {!diceDevError && diceDevWarnings.length > 0 && (
        <div className="dice-dev-warning">
          {diceDevWarnings.map((warning, index) => (
            <div key={`${warning.fragment}-${index}`}>
              {warning.reason}: <code>{warning.fragment}</code>
            </div>
          ))}
        </div>
      )}
      {diceDevResult && !diceDevError && (
        <div className="dice-dev-output">
          <div className="dice-dev-summary">
            <p>
              <strong>Expression:</strong> {diceDevResult.expression.describe()}
            </p>
            <p>
              <strong>Total:</strong> {diceDevResult.total}
            </p>
            {typeof diceDevResult.successes === "number" && (
              <p>
                <strong>Successes:</strong> {diceDevResult.successes}
              </p>
            )}
          </div>
          {renderDiceDevHighlights(diceDevResult)}
          <pre className="dice-dev-json">
            {JSON.stringify(diceDevResult, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );

  const renderToolContent = () => (
    <div className="app-tools-content">
      {activeTool === "results" && <p>Results tool will go here.</p>}

      {activeTool === "tables" && <p>Oracles / Tables tool will go here.</p>}

      {activeTool === "diceDev" && renderDiceDevPanel()}

      {/* DiceTray stays mounted, just hidden when not active */}
        <div style={{ display: activeTool === "dice" ? "block" : "none" }}>
          <DiceTray
            onRollResult={handleDiceRollLog}
            fadeDurationMs={settings.diceFadeDurationMs}
          />
        </div>
      </div>
    );

  const statusText = "Connected to local workspace";

  return (
    <div className="app-root">
      <div className="app-shell">
      {/* LEFT: Tome / library pane */}
      <aside className="app-sidebar" style={{ width: sidebarWidth }}>
        <div className="app-sidebar-header">
          <div className="app-logo-mark" />
          <div className="app-logo-text">
            <div className="app-logo-title">Anvil &amp; Loom</div>
            <div className="app-logo-subtitle">TOME</div>
          </div>
        </div>

        <div className="app-sidebar-toolbar">
          <button
            className="sidebar-toolbar-button icon-button"
            aria-label="New entry"
            data-tooltip="New entry"
            onClick={() => openCreateModal("entry")}
          >
            <FilePlus2 size={20} strokeWidth={2} />
          </button>
          <button
            className="sidebar-toolbar-button icon-button"
            aria-label="New folder"
            data-tooltip="New folder"
            onClick={() => openCreateModal("folder")}
          >
            <FolderPlus size={20} strokeWidth={2} />
          </button>
          <button
            className="sidebar-toolbar-button icon-button"
            aria-label="Rename"
            data-tooltip="Rename"
            onClick={handleRenameSelected}
            disabled={
              !selectedNode ||
              (selectedNode.type === "folder" && selectedNode.path === "")
            }
          >
            <Pencil size={20} strokeWidth={2} />
          </button>
          <button
            className="sidebar-toolbar-button icon-button"
            aria-label="Delete entry"
            data-tooltip="Delete entry"
            onClick={handleDeleteSelected}
            disabled={
              !selectedNode ||
              (selectedNode.type === "folder" && selectedNode.path === "")
            }
          >
            <Trash2 size={20} strokeWidth={2} />
          </button>
          <button
            className={`sidebar-toolbar-button icon-button${
              searchOpen ? " sidebar-toolbar-button-active" : ""
            }`}
            aria-label="Search entries"
            data-tooltip="Search entries"
            onClick={() => setSearchOpen((prev) => !prev)}
          >
            <Search size={20} strokeWidth={2} />
          </button>
        </div>

        {searchOpen && (
          <div className="app-sidebar-search">
            <input
              type="text"
              placeholder="Search entries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        )}

        <div className="app-directory-tree">
          {treeLoading ? (
            <div className="app-entry-empty">
              <p>Loading Tapestry…</p>
            </div>
          ) : treeError ? (
            <div className="app-entry-empty">
              <p>{treeError}</p>
            </div>
          ) : visibleTree.length === 0 ? (
            <div className="app-entry-empty">
              <p>No files found in this Tapestry.</p>
            </div>
          ) : (
            renderTapestryNodes(visibleTree)
          )}
        </div>
      </aside>

      <div
        className="app-resize-handle app-resize-handle-left"
        onMouseDown={() => setIsResizingLeft(true)}
      />

      {/* CENTER: main content pane */}
      <main className="app-main">{renderMainContent()}</main>

      {/* RIGHT: tools launcher / pane */}
      {!isToolPaneOpen ? (
        <div className="app-tools-launcher">
          <button
            className="tool-icon-button icon-button"
            onClick={() => openTool("results")}
            aria-label="Results"
            data-tooltip="Results"
          >
            <ScrollText size={32} strokeWidth={2.5} />
          </button>
          <button
            className="tool-icon-button icon-button"
            onClick={() => openTool("dice")}
            aria-label="Dice"
            data-tooltip="Dice"
          >
            <Dices size={32} strokeWidth={2.5} />
          </button>
          <button
            className="tool-icon-button icon-button"
            onClick={() => openTool("tables")}
            aria-label="Tables"
            data-tooltip="Tables"
          >
            <LayoutPanelTop size={32} strokeWidth={2.5} />
          </button>
          <button
            className="tool-icon-button icon-button"
            onClick={() => openTool("diceDev")}
            aria-label="Dice dev"
            data-tooltip="Dice Dev"
          >
            <FlaskConical size={32} strokeWidth={2.5} />
          </button>
        </div>
      ) : (
        <>
        <div
          className="app-resize-handle app-resize-handle-right"
          onMouseDown={() => setIsResizingRight(true)}
        />
        <div className="app-tools-expanded" style={{ width: toolsWidth }}>
          <div className="app-tools-header">
            <div className="app-tools-tabs">
              <button
                className={`tool-tab icon-button${
                  activeTool === "results" ? " tool-tab-active" : ""
                }`}
                onClick={() => setActiveTool("results")}
                aria-label="Results"
                data-tooltip="Results"
              >
                <ScrollText size={24} strokeWidth={2.5} />
              </button>
              <button
                className={`tool-tab icon-button${
                  activeTool === "dice" ? " tool-tab-active" : ""
                }`}
                onClick={() => setActiveTool("dice")}
                aria-label="Dice"
                data-tooltip="Dice"
              >
                <Dices size={24} strokeWidth={2.5} />
              </button>
              <button
                className={`tool-tab icon-button${
                  activeTool === "tables" ? " tool-tab-active" : ""
                }`}
                onClick={() => setActiveTool("tables")}
                aria-label="Tables"
                data-tooltip="Tables"
              >
                <LayoutPanelTop size={24} strokeWidth={2.5} />
              </button>
              <button
                className={`tool-tab icon-button${
                  activeTool === "diceDev" ? " tool-tab-active" : ""
                }`}
                onClick={() => setActiveTool("diceDev")}
                aria-label="Dice Dev"
                data-tooltip="Dice Dev"
              >
                <FlaskConical size={24} strokeWidth={2.5} />
              </button>
            </div>
            <button
              className="app-tools-close"
              onClick={closeTools}
              title="Close tools"
            >
              ×
            </button>
          </div>

          <div className="app-tools-body">{renderToolContent()}</div>
        </div>
        </>
      )}
      </div>

      <footer className="app-status-bar">
        <div className="app-status-actions">
          <button
            className="status-icon-button icon-button"
            aria-label="Account"
            data-tooltip="Account"
          >
            <User size={24} strokeWidth={2} />
          </button>
          <button
            className="status-icon-button icon-button"
            aria-label="Settings"
            data-tooltip="Settings"
            onClick={handleOpenSettings}
          >
            <Settings size={24} strokeWidth={2} />
          </button>
          <button
            className="status-icon-button icon-button"
            aria-label="Plugins"
            data-tooltip="Plugins"
          >
            <Puzzle size={24} strokeWidth={2} />
          </button>
          <button
            className="status-icon-button icon-button"
            aria-label="Toggle theme"
            data-tooltip={
              settings.theme === "dark"
                ? "Switch to light mode"
                : "Switch to dark mode"
            }
            onClick={toggleTheme}
          >
            <SunMoon size={24} strokeWidth={2} />
          </button>
        </div>
        <div className="app-status-indicator">
          <span>Status:</span> {statusText}
        </div>
      </footer>
      {isSettingsOpen && (
        <div
          className="settings-overlay"
          role="presentation"
          onClick={() => setSettingsOpen(false)}
        >
          <div
            className="settings-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Anvil and Loom settings"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="settings-modal-header">
              <div>
                <p className="settings-modal-eyebrow">Anvil & Loom</p>
                <h1>Settings</h1>
              </div>
              <button
                className="icon-button settings-close-button"
                aria-label="Close settings"
                onClick={() => setSettingsOpen(false)}
              >
                <X size={22} strokeWidth={2.5} />
              </button>
            </div>
            <div className="settings-modal-body">
              <aside className="settings-sidebar">
                <p className="settings-sidebar-label">Options</p>
                <div className="settings-nav">
                  {settingsNav.map((section) => (
                    <button
                      key={section.id}
                      className={
                        "settings-nav-button" +
                        (settingsCategory === section.id
                          ? " settings-nav-button-active"
                          : "")
                      }
                      onClick={() => setSettingsCategory(section.id)}
                    >
                      {section.label}
                    </button>
                  ))}
                </div>
              </aside>
              <div className="settings-content">{renderSettingsContent()}</div>
            </div>
          </div>
        </div>
      )}
      {modalState && (
        <div className="app-modal-overlay">
          <div className="app-modal" role="dialog" aria-modal="true">
            {modalState.type === "create" ? (
              <>
                <h3>
                  {modalState.target === "entry"
                    ? "Create New Entry"
                    : "Create New Folder"}
                </h3>
                <input
                  className="app-modal-input"
                  autoFocus
                  placeholder={
                    modalState.target === "entry"
                      ? "Entry name"
                      : "Folder name"
                  }
                  value={modalValue}
                  onChange={(event) => setModalValue(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleModalConfirm();
                    }
                    if (event.key === "Escape") {
                      event.preventDefault();
                      closeModal();
                    }
                  }}
                />
                <div className="app-modal-actions">
                  <button onClick={closeModal}>Cancel</button>
                  <button
                    onClick={handleModalConfirm}
                    disabled={!modalValue.trim()}
                  >
                    Create
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3>Delete {modalState.node.type === "file" ? "Entry" : "Folder"}</h3>
                <p>
                  Are you sure you want to delete{" "}
                  <strong>{modalState.node.name}</strong>? This cannot be
                  undone.
                </p>
                <div className="app-modal-actions">
                  <button onClick={closeModal}>Cancel</button>
                  <button onClick={handleModalConfirm} className="danger">
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

  const renderDiceDevHighlights = (result: RollResult) => {
    const highlights = annotateRollResult(result);
    if (!highlights.length) return null;
    return (
      <div className="dice-dev-highlights">
        {highlights.map((highlight, index) => (
          <DiceDevHighlight key={`${highlight.type}-${index}`} highlight={highlight} />
        ))}
      </div>
    );
  };
const DiceDevHighlight = ({ highlight }: { highlight: RollHighlight }) => {
  switch (highlight.type) {
    case "challenge-outcome":
      return (
        <div
          className="dice-dev-highlight challenge"
          style={{ borderColor: highlight.color }}
        >
          <strong style={{ color: highlight.color }}>{highlight.outcome}</strong>
          {highlight.boon && <span> • Boon</span>}
          {highlight.complication && <span> • Complication</span>}
        </div>
      );
    case "natural-crit":
      return (
        <div className="dice-dev-highlight crit">
          {highlight.crit === "success" ? "Natural 20!" : "Natural 1!"} (die #{highlight.dieIndex + 1})
        </div>
      );
    case "pool-success":
      return (
        <div className="dice-dev-highlight pool">
          {highlight.successes} success
          {highlight.successes === 1 ? "" : "es"}
          {typeof highlight.target === "number" && (
            <>
              {" "}
              / target {highlight.target}{" "}
              {highlight.metTarget ? "(met)" : "(not met)"}
            </>
          )}
        </div>
      );
    case "degrade":
      return (
        <div className="dice-dev-highlight degrade">
          Die steps down by {highlight.step}
          {highlight.step === 1 ? "" : " steps"}
        </div>
      );
    default:
      return null;
  }
};
