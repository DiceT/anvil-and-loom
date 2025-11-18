import { useState } from "react";
import "./App.css";
import {
  Dice5,
  MessagesSquare,
  ScrollText,
  FolderPlus,
  FilePlus,
  Pencil,
  Trash2,
  Search,
  Settings,
  Puzzle,
  User,
} from "lucide-react";
import { DiceTray } from "./components/DiceTray";


type ToolId = "results" | "dice" | "oracle";
type ViewId = "home" | "journal" | "tables";

function App() {
  const [activeTool, setActiveTool] = useState<ToolId | null>(null);
  const [currentView, setCurrentView] = useState<ViewId>("home");

  const isToolPaneOpen = activeTool !== null;

  const renderMainContent = () => {
    switch (currentView) {
      case "journal":
        return (
          <>
            <h2>Journal</h2>
            <p>Journal view placeholder. Entries will appear here.</p>
          </>
        );
      case "tables":
        return (
          <>
            <h2>Tables</h2>
            <p>Tables / oracle editor view placeholder.</p>
          </>
        );
      case "home":
      default:
        return (
          <>
            <h2>Welcome to your Tome</h2>
            <p>Core app shell is running inside Electron.</p>
            <p>This main area will become the editor/workspace.</p>
          </>
        );
    }
  };

  const renderToolToolbar = () => {
    if (!activeTool) return null;

    switch (activeTool) {
      case "results":
        return (
          <div className="app-tools-toolbar">
            <span className="app-tools-toolbar-label">Results</span>
            <span>Filter: All</span>
            {/* later: dropdown / chips for Dice / Tables / System / Notes */}
          </div>
        );
      case "dice":
        return (
          <div className="app-tools-toolbar">
            <span className="app-tools-toolbar-label">Dice</span>
            <span>d4</span>
            <span>d6</span>
            <span>d8</span>
            <span>d10</span>
            <span>d12</span>
            <span>d20</span>
            <span>ADV</span>
            <span>DIS</span>
            {/* later: proper buttons, modifiers, formula input */}
          </div>
        );
      case "oracle":
        return (
          <div className="app-tools-toolbar">
            <span className="app-tools-toolbar-label">Oracles</span>
            <span>Add folder</span>
            <span>Add table</span>
            <span>Edit</span>
            <span>Delete</span>
            {/* later: search, filter, roll-on-table, etc. */}
          </div>
        );
      default:
        return null;
    }
  };

  const renderToolContent = () => {
    if (!activeTool) return null;

    switch (activeTool) {
      case "results":
        return (
          <div className="app-tools-content">
            <p>Results log placeholder.</p>
            <p>
              This will show real-time cards for dice rolls, table results, and
              notes, with a chat box at the bottom.
            </p>
          </div>
        );
      case "dice":
        return (
          <div className="app-tools-content">
            <DiceTray />
          </div>
        );
      case "oracle":
        return (
          <div className="app-tools-content">
            <p>Oracles / tables browser placeholder.</p>
            <p>JSON tables directory and quick roll UI will live here.</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="app-root">
      {/* LEFT: Tome / library */}
      <aside className="app-sidebar">
        {/* Tome toolbar (top of left pane) */}
        <div className="app-tome-toolbar">
          <div className="app-tome-title">Anvil &amp; Loom</div>
          <button
            className="icon-button"
            title="New folder"
            type="button"
          >
            <FolderPlus size={24} strokeWidth={2.5} />
          </button>
          <button
            className="icon-button"
            title="New entry"
            type="button"
          >
            <FilePlus size={24} strokeWidth={2.5} />
          </button>
          <button
            className="icon-button"
            title="Search Tome"
            type="button"
          >
            <Search size={24} strokeWidth={2.5} />
          </button>
        </div>

        <div className="app-tome-label">Tome</div>

        {/* Tomb nav (for now: simple views) */}
        <nav>
          <ul className="app-tome-nav">
            {[
              { id: "home", label: "Home" },
              { id: "journal", label: "Journal" },
              { id: "tables", label: "Tables" },
            ].map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setCurrentView(item.id as ViewId)}
                  className={
                    "nav-button" +
                    (currentView === item.id ? " nav-button--active" : "")
                  }
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Master toolbar (bottom of left pane) */}
        <div className="app-master-toolbar">
          <button
            className="icon-button"
            title="Settings"
            type="button"
          >
            <Settings size={24} strokeWidth={2.5} />
          </button>
          <button
            className="icon-button"
            title="Plugins"
            type="button"
          >
            <Puzzle size={24} strokeWidth={2.5} />
          </button>
          <button
            className="icon-button"
            title="Account"
            type="button"
          >
            <User size={24} strokeWidth={2.5} />
          </button>
        </div>
      </aside>

      {/* CENTER: main content */}
      <main className="app-main">{renderMainContent()}</main>

      {/* RIGHT: tools area */}
      {!isToolPaneOpen ? (
        // Collapsed: slim vertical launcher (Results, Dice, Oracles)
        <div className="app-tools-launcher">
          <button
            className="icon-button"
            title="Results"
            type="button"
            onClick={() => setActiveTool("results")}
          >
            <MessagesSquare size={32} strokeWidth={2.5} />
          </button>
          <button
            className="icon-button"
            title="Dice tray"
            type="button"
            onClick={() => setActiveTool("dice")}
          >
            <Dice5 size={32} strokeWidth={2.5} />
          </button>
          <button
            className="icon-button"
            title="Oracles / tables"
            type="button"
            onClick={() => setActiveTool("oracle")}
          >
            <ScrollText size={32} strokeWidth={2.5} />
          </button>
        </div>
      ) : (
        // Expanded: full tools pane with header + per-tool toolbar + content
        <div className="app-tools-expanded">
          <div className="app-tools-header">
            <div className="app-tools-header-icons">
              <button
                className={
                  "icon-button" +
                  (activeTool === "results" ? " icon-button--active" : "")
                }
                title="Results"
                type="button"
                onClick={() => setActiveTool("results")}
              >
                <MessagesSquare size={32} strokeWidth={2.5} />
              </button>
              <button
                className={
                  "icon-button" +
                  (activeTool === "dice" ? " icon-button--active" : "")
                }
                title="Dice tray"
                type="button"
                onClick={() => setActiveTool("dice")}
              >
                <Dice5 size={32} strokeWidth={2.5} />
              </button>
              <button
                className={
                  "icon-button" +
                  (activeTool === "oracle" ? " icon-button--active" : "")
                }
                title="Oracles / tables"
                type="button"
                onClick={() => setActiveTool("oracle")}
              >
                <ScrollText size={32} strokeWidth={2.5} />
              </button>
            </div>

            <button
              className="icon-button"
              title="Close tools pane"
              type="button"
              onClick={() => setActiveTool(null)}
            >
              ✕
            </button>
          </div>

          {renderToolToolbar()}
          {renderToolContent()}
        </div>
      )}
    </div>
  );
}

export default App;
