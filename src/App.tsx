import { useState, useEffect } from "react";
import { useOOPrompt } from "./state/useOOPrompt";
import type { OOPromptObject } from "./types";
import { ChatPanel } from "./components/ChatPanel";
import { OOPromptPanel } from "./components/OOPromptPanel";
import { BookmarkHandle } from "./components/BookmarkHandle";
import { ObjectPanel } from "./components/ObjectPanel";
import { SaveConfirmationModal } from "./components/SaveConfirmationModal";
import { ErrorPopup } from "./components/ErrorPopup";


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
  const [messageQueue, setMessageQueue] = useState<string[]>([]);
  const [selectedLLM, setSelectedLLM] = useState<'openai' | 'gemini' | 'claude'>('openai');
  
  // Process message queue
  useEffect(() => {
    if (messageQueue.length > 0 && !messageFromOOP) {
      const nextMessage = messageQueue[0];
      console.log('Processing next message from queue:', nextMessage);
      setMessageFromOOP(nextMessage);
      setMessageQueue(prev => prev.slice(1));
    }
  }, [messageQueue, messageFromOOP]);
  
  // Save confirmation state
  const [saveConfirmation, setSaveConfirmation] = useState<{
    isOpen: boolean;
    objectToLoad?: OOPromptObject;
    actionDescription: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    actionDescription: "",
    onConfirm: () => {}
  });

  // Error popup state
  const [errorPopup, setErrorPopup] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
  }>({
    isOpen: false,
    title: "",
    message: ""
  });

  // Function to handle object switching with save confirmation
  const handleObjectSwitch = (objectToLoad: OOPromptObject, actionDescription: string) => {
    if (state.hasUnsavedChanges) {
      setSaveConfirmation({
        isOpen: true,
        objectToLoad,
        actionDescription,
        onConfirm: () => {
          dispatch({ type: "LOAD_PROMPT_OBJECT", payload: objectToLoad });
          setSaveConfirmation({ isOpen: false, actionDescription: "", onConfirm: () => {} });
        }
      });
    } else {
      // No unsaved changes, proceed directly
      dispatch({ type: "LOAD_PROMPT_OBJECT", payload: objectToLoad });
    }
  };

  // Function to save current object
  const saveCurrentObject = () => {
    dispatch({ type: "SAVE_PROMPT_OBJECT", payload: state.oop });
  };

  // Function to show error popup
  const showError = (title: string, message: string) => {
    setErrorPopup({
      isOpen: true,
      title,
      message
    });
  };

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

      {/* Main content: chat panel with left sidebar */}
      <div className="flex-1 relative h-full pt-16 flex">
        {/* Object Panel - Always visible left sidebar */}
        <ObjectPanel
          objects={state.promptObjects}
          selectedObjectId={state.currentObjectId}
          isOpen={true}
          onToggle={() => {}} // No-op since panel is always open
          onSelectObject={(objectId) => {
            console.log('Loading prompt object:', objectId);
            const obj = state.promptObjects.find(obj => obj.id === objectId);
            if (obj) {
              handleObjectSwitch(obj, `switching to "${obj.name || obj.main_task || 'another object'}"`);
            }
          }}
          onDeleteObject={(objectId) => {
            console.log('Deleting prompt object:', objectId);
            dispatch({ type: "DELETE_PROMPT_OBJECT", id: objectId });
          }}
          onClose={() => {}} // No-op since panel is always open
          onOpenOOPPanel={() => dispatch({ type: "TOGGLE_PANEL", open: true })}
        />

        {/* Chat Panel - Takes remaining width */}
        <div className="flex-1">
          <ChatPanel 
            onSend={(msg) => console.log('Chat message:', msg)}
            onExtractProperties={(oopObject) => {
              dispatch({ type: "SET_OOP", payload: oopObject });
              dispatch({ type: "TOGGLE_PANEL", open: true });
            }}
            messageFromOOP={messageFromOOP}
            selectedLLM={selectedLLM}
            onMessageProcessed={() => setMessageFromOOP(null)}
          />
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
                selectedLLM={selectedLLM}
                onError={showError}
                onSendMessage={(message) => {
                  console.log('Message from OOP panel:', message);
                  setMessageQueue(prev => {
                    const newQueue = [...prev, message];
                    console.log('Updated message queue:', newQueue);
                    return newQueue;
                  });
                }}
                onCreateEmbeddedObject={(propertyId, parentObjectId) => {
                  if (state.hasUnsavedChanges) {
                    setSaveConfirmation({
                      isOpen: true,
                      actionDescription: "creating an embedded object",
                      onConfirm: () => {
                        dispatch({ type: "CREATE_EMBEDDED_OBJECT", payload: { propertyId, parentObjectId } });
                        dispatch({ type: "CLOSE_MODAL" });
                        dispatch({ type: "TOGGLE_PANEL", open: true });
                        setSaveConfirmation({ isOpen: false, actionDescription: "", onConfirm: () => {} });
                      }
                    });
                  } else {
                    dispatch({ type: "CREATE_EMBEDDED_OBJECT", payload: { propertyId, parentObjectId } });
                    dispatch({ type: "CLOSE_MODAL" });
                    dispatch({ type: "TOGGLE_PANEL", open: true });
                  }
                }}
                onEmbedExistingObject={(propertyId, objectId, objectName) => {
                  if (state.hasUnsavedChanges) {
                    setSaveConfirmation({
                      isOpen: true,
                      actionDescription: `embedding "${objectName}"`,
                      onConfirm: () => {
                        dispatch({ type: "EMBED_EXISTING_OBJECT", payload: { propertyId, objectId, objectName } });
                        dispatch({ type: "CLOSE_MODAL" });
                        dispatch({ type: "TOGGLE_PANEL", open: true });
                        setSaveConfirmation({ isOpen: false, actionDescription: "", onConfirm: () => {} });
                      }
                    });
                  } else {
                    dispatch({ type: "EMBED_EXISTING_OBJECT", payload: { propertyId, objectId, objectName } });
                    dispatch({ type: "CLOSE_MODAL" });
                    dispatch({ type: "TOGGLE_PANEL", open: true });
                  }
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

        {/* Save Confirmation Modal */}
        <SaveConfirmationModal
          isOpen={saveConfirmation.isOpen}
          objectName={state.oop.name || state.oop.main_task || "Current Object"}
          actionDescription={saveConfirmation.actionDescription}
          onSaveAndContinue={() => {
            saveCurrentObject();
            saveConfirmation.onConfirm();
          }}
          onContinueWithoutSaving={() => {
            saveConfirmation.onConfirm();
          }}
          onCancel={() => {
            setSaveConfirmation({ isOpen: false, actionDescription: "", onConfirm: () => {} });
          }}
        />

        {/* Error Popup */}
        <ErrorPopup
          isOpen={errorPopup.isOpen}
          title={errorPopup.title}
          message={errorPopup.message}
          onClose={() => setErrorPopup({ isOpen: false, title: "", message: "" })}
          autoCloseMs={5000}
        />
      </div>
    </div>
  );
}
