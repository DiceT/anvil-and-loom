import { useState } from "react";
import "./App.css";

type ToolId = "dice" | "oracle";
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
            <p>Tables / oracle browser placeholder.</p>
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

  return (
    <div className="app-root">
      {/* LEFT: Tome / library */}
      <aside className="app-sidebar">
        <h1 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>
          Anvil &amp; Loom
        </h1>
        <div
          style={{
            fontSize: "0.75rem",
            textTransform: "uppercase",
            color: "#666",
            marginBottom: "0.75rem",
          }}
        >
          Tome
        </div>

        <nav>
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              fontSize: "0.9rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.25rem",
            }}
          >
            {[
              { id: "home", label: "Home" },
              { id: "journal", label: "Journal" },
              { id: "tables", label: "Tables" },
            ].map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => setCurrentView(item.id as ViewId)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "0.25rem 0.5rem",
                    borderRadius: "4px",
                    border: "none",
                    background:
                      currentView === item.id ? "#eee" : "transparent",
                    cursor: "pointer",
                  }}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* CENTER: main content */}
      <main className="app-main">{renderMainContent()}</main>

      {/* RIGHT: tools area */}
      {!isToolPaneOpen ? (
        // Collapsed: slim vertical toolbar
        <div className="app-tools-collapsed">
          <button
            onClick={() => setActiveTool("dice")}
            title="Dice tray"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "1.2rem",
              lineHeight: 1,
            }}
          >
            🎲
          </button>
          <button
            onClick={() => setActiveTool("oracle")}
            title="Oracles / tables"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "1.2rem",
              lineHeight: 1,
            }}
          >
            📜
          </button>
        </div>
      ) : (
        // Expanded: full tools pane with horizontal icon toolbar
        <div className="app-tools-expanded">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0.4rem 0.6rem",
              borderBottom: "1px solid #eee",
            }}
          >
            <div style={{ display: "flex", gap: "0.25rem" }}>
              <button
                onClick={() => setActiveTool("dice")}
                title="Dice tray"
                style={{
                  padding: "0.15rem 0.35rem",
                  borderRadius: "4px",
                  border: "1px solid #ccc",
                  background:
                    activeTool === "dice" ? "#eee" : "rgba(255,255,255,0.9)",
                  cursor: "pointer",
                  fontSize: "1.1rem",
                  lineHeight: 1,
                }}
              >
                🎲
              </button>
              <button
                onClick={() => setActiveTool("oracle")}
                title="Oracles / tables"
                style={{
                  padding: "0.15rem 0.35rem",
                  borderRadius: "4px",
                  border: "1px solid #ccc",
                  background:
                    activeTool === "oracle"
                      ? "#eee"
                      : "rgba(255,255,255,0.9)",
                  cursor: "pointer",
                  fontSize: "1.1rem",
                  lineHeight: 1,
                }}
              >
                📜
              </button>
            </div>

            <button
              onClick={() => setActiveTool(null)}
              title="Close tools pane"
              style={{
                border: "none",
                background: "none",
                cursor: "pointer",
                fontSize: "1rem",
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>

          <div
            style={{
              padding: "0.75rem",
              fontSize: "0.9rem",
              flex: 1,
              overflow: "auto",
            }}
          >
            {activeTool === "dice" && (
              <div>Dice tray placeholder (3D dice will live here).</div>
            )}
            {activeTool === "oracle" && (
              <div>Oracles / tables browser placeholder.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
