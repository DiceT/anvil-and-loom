import { useState } from "react";
import "./App.css";
import {
  MessageSquareMore,
  Dices,
  Table2,
  Settings,
  User,
} from "lucide-react";
import { DiceTray } from "./components/DiceTray";

type ActiveTool = "results" | "dice" | "tables";

function App() {
  const [isToolPaneOpen, setToolPaneOpen] = useState(false);
  const [activeTool, setActiveTool] = useState<ActiveTool>("results");

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


  return (
    <div className="app-root">
      {/* LEFT: Tome / library pane */}
      <aside className="app-sidebar">
        <div className="app-sidebar-header">
          <div className="app-logo-mark" />
          <div className="app-logo-text">
            <div className="app-logo-title">Anvil &amp; Loom</div>
            <div className="app-logo-subtitle">TOME</div>
          </div>
        </div>

        <nav className="app-sidebar-nav">
          <button className="nav-item nav-item-active">Home</button>
          <button className="nav-item">Journal</button>
          <button className="nav-item">Tables</button>
        </nav>

        {/* Master toolbar at bottom of left pane */}
        <div className="app-sidebar-footer">
          <button className="sidebar-icon-button" title="Settings">
            <Settings size={20} strokeWidth={2.5} />
          </button>
          <button className="sidebar-icon-button" title="Account">
            <User size={20} strokeWidth={2.5} />
          </button>
        </div>
      </aside>

      {/* CENTER: main content pane */}
      <main className="app-main">{renderMainContent()}</main>

      {/* RIGHT: tools launcher / pane */}
      {!isToolPaneOpen ? (
        <div className="app-tools-launcher">
          <button
            className="tool-icon-button"
            title="Results"
            onClick={() => openTool("results")}
          >
            <MessageSquareMore size={32} strokeWidth={2.5} />
          </button>
          <button
            className="tool-icon-button"
            title="Dice"
            onClick={() => openTool("dice")}
          >
            <Dices size={32} strokeWidth={2.5} />
          </button>
          <button
            className="tool-icon-button"
            title="Tables"
            onClick={() => openTool("tables")}
          >
            <Table2 size={32} strokeWidth={2.5} />
          </button>
        </div>
      ) : (
        <div className="app-tools-expanded">
          <div className="app-tools-header">
            <div className="app-tools-tabs">
              <button
                className={
                  "tool-tab" +
                  (activeTool === "results" ? " tool-tab-active" : "")
                }
                onClick={() => setActiveTool("results")}
                title="Results"
              >
                <MessageSquareMore size={24} strokeWidth={2.5} />
              </button>
              <button
                className={
                  "tool-tab" +
                  (activeTool === "dice" ? " tool-tab-active" : "")
                }
                onClick={() => setActiveTool("dice")}
                title="Dice"
              >
                <Dices size={24} strokeWidth={2.5} />
              </button>
              <button
                className={
                  "tool-tab" +
                  (activeTool === "tables" ? " tool-tab-active" : "")
                }
                onClick={() => setActiveTool("tables")}
                title="Tables"
              >
                <Table2 size={24} strokeWidth={2.5} />
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
  );
}

export default App;
