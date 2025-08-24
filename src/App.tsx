import { useOOPrompt } from "./state/useOOPrompt";
import type { OOPromptObject } from "./types";
import { ChatPanel } from "./components/ChatPanel";
import { OOPromptPanel } from "./components/OOPromptPanel";
import { BookmarkHandle } from "./components/BookmarkHandle";
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
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-white">
      {/* Top bar */}
      <header className="h-16 panel-chrome flex items-center justify-between px-8 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-lg">O</span>
          </div>
          <div className="font-bold text-xl text-gray-900">OOPrompt</div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">AI Model:</div>
          <select className="border border-gray-200 rounded-xl px-4 py-2 bg-white text-gray-900 text-sm shadow-sm hover:border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all">
            <option>GPT-4</option>
            <option>Gemini</option>
            <option>Claude</option>
          </select>
        </div>
      </header>

      {/* Main content: chat panel always takes full width and height */}
      <div className="flex-1 relative h-full">
        <ChatPanel
          onSend={(msg) => {
            // TODO: call your chat backend
            console.log("Send:", msg);
          }}
          onOptimize={handleOptimize}
          onTogglePanel={() => dispatch({ type: "TOGGLE_PANEL" })}
        />

        {/* Floating OOP panel overlay */}
        {state.openPanel && (
          <>
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-black/20 backdrop-blur-sm z-40"
              onClick={() => dispatch({ type: "TOGGLE_PANEL", open: false })}
            />
            <OOPromptPanel state={state} dispatch={dispatch} />
          </>
        )}

        {/* Edge handle to open panel when closed */}
        {!state.openPanel && (
          <BookmarkHandle
            open={false}
            attachTo="viewport-right"
            onClick={() => dispatch({ type: "TOGGLE_PANEL", open: true })}
          />
        )}
      </div>
    </div>
  );
}
