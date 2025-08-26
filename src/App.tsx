import { useState } from "react";
import { useOOPrompt } from "./state/useOOPrompt";
import type { OOPromptObject } from "./types";
import { ChatPanel } from "./components/ChatPanel";
import { OOPromptPanel } from "./components/OOPromptPanel";
import { BookmarkHandle } from "./components/BookmarkHandle";
import { ObjectPanel } from "./components/ObjectPanel";


import "./index.css";

const seed: OOPromptObject = {
  id: "root",
  name: "Main OOPrompt",
  main_task: "",
  audience: "",
  properties: [],
  tabsOrder: ["root"],
  log: [],
  createdAt: Date.now(),
  updatedAt: Date.now()
};

export default function App() {
  const { state, dispatch } = useOOPrompt(seed);
  const [messageFromOOP, setMessageFromOOP] = useState<string | null>(null);
  const [selectedLLM, setSelectedLLM] = useState<'openai' | 'gemini' | 'claude'>('openai');



  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-white">
      {/* Top bar - Fixed at top */}
      <header className="fixed top-0 left-0 right-0 z-30 h-16 panel-chrome flex items-center justify-between px-8 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-lg">O</span>
          </div>
          <div className="font-bold text-xl text-gray-900">OOPrompt</div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">AI Model:</div>
          <select 
            value={selectedLLM === 'openai' ? 'GPT-4' : selectedLLM === 'gemini' ? 'Gemini' : 'Claude'}
            onChange={(e) => {
              const value = e.target.value;
              if (value === 'GPT-4') setSelectedLLM('openai');
              else if (value === 'Gemini') setSelectedLLM('gemini');
              else if (value === 'Claude') setSelectedLLM('claude');
            }}
            className="border border-gray-200 rounded-xl px-4 py-2 bg-white text-gray-900 text-sm shadow-sm hover:border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all"
          >
            <option>GPT-4</option>
            <option>Gemini</option>
            <option>Claude</option>
          </select>
        </div>
      </header>

      {/* Main content: chat panel always takes full width and height */}
      <div className="flex-1 relative h-full pt-16">
        <ChatPanel
          onSend={(msg) => {
            // TODO: call your chat backend
            console.log("Send:", msg);
          }}
          onTogglePanel={() => dispatch({ type: "TOGGLE_PANEL" })}
          messageFromOOP={messageFromOOP}
          selectedLLM={selectedLLM}
          onExtractProperties={(oopObject) => {
            console.log('Extracted OOP object:', oopObject);
            console.log('Properties count:', oopObject.properties?.length || 0);
            console.log('Properties:', oopObject.properties);
            
            // Validate and normalize the properties
            if (oopObject.properties && Array.isArray(oopObject.properties) && oopObject.properties.length > 0) {
              const normalizedProperties = oopObject.properties.map((prop, index) => {
                // Ensure each property has required fields
                return {
                  id: prop.id || `extracted_${Date.now()}_${index}`,
                  name: prop.name || `Property ${index + 1}`,
                  value: prop.value || "",
                  importance: prop.importance || "normal",
                  examples: prop.examples || [],
                  source: prop.source || "ai-suggested",
                  createdAt: prop.createdAt || Date.now(),
                  updatedAt: prop.updatedAt || Date.now(),
                };
              });
              
              const normalizedOOP = {
                ...oopObject,
                properties: normalizedProperties
              };
              
              console.log('Normalized properties:', normalizedProperties);
              
              // Update the OOP state with normalized properties
              dispatch({ type: "SET_OOP", payload: normalizedOOP });
            } else {
              console.warn('No properties found in extracted object, keeping main_task and audience in their dedicated fields');
              
              // Keep the OOP object as-is, with main_task and audience in their proper fields
              // Don't create duplicate property cards for these fields
              const cleanOOP = {
                ...oopObject,
                properties: [] // Empty properties array - no cards to display
              };
              
              console.log('No properties extracted, main_task and audience remain in dedicated input fields');
              dispatch({ type: "SET_OOP", payload: cleanOOP });
            }
            
            // Reset property selection to ensure details panel works
            dispatch({ type: "SELECT_PROPERTY", id: undefined });
            // Open the panel to show the extracted properties
            dispatch({ type: "TOGGLE_PANEL", open: true });
          }}
        />

        {/* Object Panel - Left side */}
        <ObjectPanel
          objects={state.promptObjects}
          selectedObjectId={state.currentObjectId}
          isOpen={state.objectPanelOpen}
          onToggle={() => dispatch({ type: "TOGGLE_OBJECT_PANEL" })}
          onSelectObject={(objectId) => {
            console.log('Loading prompt object:', objectId);
            const obj = state.promptObjects.find(obj => obj.id === objectId);
            if (obj) {
              dispatch({ type: "LOAD_PROMPT_OBJECT", payload: obj });
            }
          }}
          onDeleteObject={(objectId) => {
            console.log('Deleting prompt object:', objectId);
            dispatch({ type: "DELETE_PROMPT_OBJECT", id: objectId });
          }}
          onClose={() => dispatch({ type: "TOGGLE_OBJECT_PANEL", open: false })}
          onOpenOOPPanel={() => dispatch({ type: "TOGGLE_PANEL", open: true })}
        />
        
        {/* Debug info - remove this later */}
        <div className="fixed bottom-4 left-4 bg-black/80 text-white p-2 rounded text-xs z-50">
          Debug: {state.promptObjects.length} objects, current: {state.currentObjectId}
        </div>



        {/* Floating OOP panel overlay */}
        {state.openPanel && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black/20 z-40"
              onClick={() => dispatch({ type: "TOGGLE_PANEL", open: false })}
            />
            
            {/* Panel - fixed positioning, full screen height */}
            <div className="fixed top-0 right-0 bottom-0 z-50 h-screen">
              <OOPromptPanel 
                state={state} 
                dispatch={dispatch} 
                onSendMessage={(message) => {
                  console.log('Message from OOP panel:', message);
                  setMessageFromOOP(message);
                  // Clear the message after a short delay to allow the ChatPanel to process it
                  setTimeout(() => setMessageFromOOP(null), 100);
                }}
              />
            </div>
          </>
        )}

        {/* Edge handle to open panel when closed */}
        {!state.openPanel && state.oop.main_task && state.oop.main_task.trim() && (
          <BookmarkHandle
            isOpen={false}
            position="right"
            onToggle={() => dispatch({ type: "TOGGLE_PANEL", open: true })}
          />
        )}
      </div>
    </div>
  );
}
