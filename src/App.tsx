import { useEffect, useState } from "react";
import "./App.css";
import {
  ScrollText,
  Dices,
  LayoutPanelTop,
  Settings,
  User,
  FolderPlus,
  FilePlus2,
  Edit3,
  Puzzle,
  SunMoon,
} from "lucide-react";
import { DiceTray } from "./components/DiceTray";

type ActiveTool = "results" | "dice" | "tables";
type ThemeMode = "dark" | "light";

function App() {
  const [isToolPaneOpen, setToolPaneOpen] = useState(false);
  const [activeTool, setActiveTool] = useState<ActiveTool>("results");
  const [theme, setTheme] = useState<ThemeMode>("dark");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const openTool = (tool: ActiveTool) => {
    setActiveTool(tool);
    setToolPaneOpen(true);
  };

  const closeTools = () => {
    setToolPaneOpen(false);
  };

  const renderMainContent = () => (
    <div className="app-main-inner">
      <h1>Your Tome</h1>
      <p>Main editor / workspace will live here.</p>
      <p>Dice roll as a full-screen overlay on top of everything.</p>
    </div>
  );

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const renderToolContent = () => (
    <div className="app-tools-content">
      {activeTool === "results" && <p>Results tool will go here.</p>}

      {activeTool === "tables" && <p>Oracles / Tables tool will go here.</p>}

      {/* DiceTray stays mounted, just hidden when not active */}
      <div style={{ display: activeTool === "dice" ? "block" : "none" }}>
        <DiceTray />
      </div>
    </div>
  );

  const statusText = "Connected to local workspace";

  return (
    <div className="app-root">
      <div className="app-shell">
      {/* LEFT: Tome / library pane */}
      <aside className="app-sidebar">
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
            aria-label="Add folder"
            data-tooltip="Add folder"
          >
            <FolderPlus size={20} strokeWidth={2} />
          </button>
          <button
            className="sidebar-toolbar-button icon-button"
            aria-label="Add tome entry"
            data-tooltip="Add tome entry"
          >
            <FilePlus2 size={20} strokeWidth={2} />
          </button>
          <button
            className="sidebar-toolbar-button icon-button"
            aria-label="Rename selection"
            data-tooltip="Rename selection"
          >
            <Edit3 size={20} strokeWidth={2} />
          </button>
        </div>

        <nav className="app-sidebar-nav">
          <button className="nav-item nav-item-active">Home</button>
          <button className="nav-item">Journal</button>
          <button className="nav-item">Tables</button>
        </nav>
      </aside>

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
        </div>
      ) : (
        <div className="app-tools-expanded">
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
            data-tooltip={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            onClick={toggleTheme}
          >
            <SunMoon size={24} strokeWidth={2} />
          </button>
        </div>
        <div className="app-status-indicator">
          <span>Status:</span> {statusText}
        </div>
      </footer>
    </div>
  );
}

export default App;
