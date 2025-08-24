import { useOOPrompt } from "./state/useOOPrompt";
import type { OOPromptObject } from "./types";
import { ChatPanel } from "./components/ChatPanel";
import { OOPromptPanel } from "./components/OOPromptPanel";
import { extractProperties } from "./api";
import "./index.css";

const seed: OOPromptObject = {
  id: "root",
  name: "Main OOPrompt",
  main_task: "",
  audience: "",
  properties: [
    {
      id: "p1",
      name: "Tone",
      value: "mysterious, hopeful",
      importance: "highlight",
      examples: ["Keep tension in Act I", "Hopeful twist at end"],
      source: "user",
      createdAt: 1724380000000,
      updatedAt: 1724380000000
    },
    {
      id: "p2",
      name: "Protagonist",
      value: { refObjectId: "char001", refObjectName: "Hero Character Sheet" },
      importance: "normal",
      source: "ai-suggested",
      createdAt: 1724380100000,
      updatedAt: 1724380100000
    }
  ],
  tabsOrder: ["root"],
  log: []
};

export default function App() {
  const { state, dispatch } = useOOPrompt(seed);
  const panelWidth = "var(--panel-w)";

  const handleOptimize = async (text: string) => {
    try {
      const result = await extractProperties(text, state.oop.main_task, state.oop.audience);
      
      // Convert extracted properties to Property format
      const newProperties = result.properties.map((prop, index) => ({
        id: `extracted_${Date.now()}_${index}`,
        name: prop.name,
        value: prop.value,
        importance: "normal" as const,
        source: "ai-suggested" as const,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }));

      // Create new OOPrompt object with extracted properties
      const newOOP: OOPromptObject = {
        ...state.oop,
        properties: newProperties,
      };

      dispatch({ type: "SET_OOP", payload: newOOP });
      dispatch({ type: "TOGGLE_PANEL", open: true });
    } catch (error) {
      console.error("Failed to extract properties:", error);
      // Fallback: just open the panel
      dispatch({ type: "TOGGLE_PANEL", open: true });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Top bar */}
      <header className="h-14 border-b border-divider bg-white/80 backdrop-blur flex items-center justify-between px-6">
        <div className="font-semibold text-text-onLight">OOPrompt</div>
        <select className="border border-divider rounded-xl px-3 py-2 bg-white text-text-onLight text-sm">
          <option>GPT-4</option>
          <option>Gemini</option>
          <option>Claude</option>
        </select>
      </header>

      {/* Main grid: chat + (optional) panel */}
      <div className="flex-1 grid bg-surface" style={{ gridTemplateColumns: state.openPanel ? `1fr ${panelWidth}` : "1fr" }}>
        <ChatPanel
          onSend={(msg) => {
            // TODO: call your chat backend
            console.log("Send:", msg);
          }}
          onOptimize={handleOptimize}
          onTogglePanel={() => dispatch({ type: "TOGGLE_PANEL" })}
        />

        {state.openPanel && (
          <OOPromptPanel state={state} dispatch={dispatch} />
        )}

        {/* Edge handle to open */}
        {!state.openPanel && (
          <button
            onClick={() => dispatch({ type: "TOGGLE_PANEL", open: true })}
            className="fixed right-3 top-1/2 -translate-y-1/2 rounded-2xl shadow-xs border border-divider bg-white p-2 hover:shadow transition"
            style={{
              position: 'fixed',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 50
            }}
            aria-label="Open OOPrompt panel"
            title="Open OOPrompt (Ctrl/Cmd + =)"
          >
            <span className="text-lg font-bold text-text-onLight">←</span>
          </button>
        )}
      </div>
    </div>
  );
}
