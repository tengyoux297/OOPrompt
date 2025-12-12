import { useState, useEffect } from "react";
import { useOOPrompt } from "./state/useOOPrompt";
import type { OOPromptObject } from "./types";
import { OOPromptPanel } from "./components/OOPromptPanel";
import { ObjectPanel } from "./components/ObjectPanel";
import { HistoryPanel } from "./components/HistoryPanel";
import { SaveConfirmationModal } from "./components/SaveConfirmationModal";
import { ErrorPopup } from "./components/ErrorPopup";
import { NewPromptModal } from "./components/NewPromptModal";
import { SettingsModal } from "./components/SettingsModal";
import { llmService } from "./services/llmService";


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
  const [selectedLLM] = useState<'openai' | 'gemini' | 'claude'>('openai');
  const [showWelcome, setShowWelcome] = useState(false);
  const [tutorialPage, setTutorialPage] = useState(1);
  const [showNewPromptModal, setShowNewPromptModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [currentApiKey, setCurrentApiKey] = useState<string>("");
  
  // Check if tutorial has been shown before (but don't auto-show)
  useEffect(() => {
    const checkTutorialShown = () => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['tutorial_shown'], (result) => {
          // Don't auto-show tutorial - user can click the button to see it
          if (!result.tutorial_shown) {
            // Mark as available (but don't show it automatically)
            chrome.storage.local.set({ tutorial_shown: false });
          }
        });
      } else {
        const shown = localStorage.getItem('tutorial_shown');
        if (!shown) {
          localStorage.setItem('tutorial_shown', 'false');
        }
      }
    };
    checkTutorialShown();
  }, []);

  // Keyboard support for closing tutorial
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showWelcome) {
        setShowWelcome(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showWelcome]);

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
    <div className="h-full w-full flex flex-col bg-gradient-to-br from-gray-50 to-white overflow-hidden">
      {/* Multi-Page Interactive Tutorial */}
      {showWelcome && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-lg border-2 border-gray-300 shadow-lg w-full max-w-[95vw] h-full max-h-[95vh] overflow-hidden mx-2 sm:mx-4 flex flex-col">
            {/* Header */}
            <div className="bg-gray-50 border-b border-gray-200 p-4 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h1 className="text-sm font-semibold text-gray-900 mb-1">Welcome to OOPrompt!</h1>
                  <p className="text-xs text-gray-600">
                    Master the art of structured AI prompting step by step
                  </p>
                </div>
                <button
                  onClick={() => setShowWelcome(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors text-lg leading-none flex-shrink-0"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="bg-gray-100 h-1">
              <div 
                className="bg-blue-600 h-full transition-all duration-300"
                style={{ width: `${(tutorialPage / 6) * 100}%` }}
              ></div>
            </div>

            {/* Tutorial Content - Single Page View */}
            <div className="p-4 h-full overflow-y-auto flex-1">
              {tutorialPage === 1 && (
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="text-lg">💬</div>
                    <h3 className="text-xs font-semibold text-gray-900">Step 1: Start with a Natural Prompt</h3>
                  </div>
                  <p className="text-xs text-gray-700 mb-3">
                    To begin with, write naturally about what you want to do, just like how you do to a common AI chat bot!
                  </p>
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <div className="space-y-2">
                      <div className="p-2 bg-white rounded-lg border border-gray-200">
                        <div className="font-medium text-xs text-gray-900 mb-1">Natural Input:</div>
                        <div className="text-xs text-gray-700 italic">
                          "I need to create a marketing strategy for launching our new eco-friendly product. It should target environmentally conscious consumers and include social media campaigns, influencer partnerships, and sustainability messaging."
                        </div>
                      </div>
                      <div className="text-center text-xs text-gray-400">↓</div>
                      <div className="p-2 bg-white rounded-lg border border-gray-200">
                        <div className="font-medium text-xs text-gray-900 mb-1">OOPrompt Converts To:</div>
                        <div className="text-xs text-gray-700">
                          A structured object with properties like "Product Type", "Target Audience", "Marketing Channels", "Key Messages", etc.
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-gray-600">
                  ☛ <strong>Pro tip:</strong> You do not need to include all details at once. You can always add more properties easily by our system!
                  </div>
                </div>
              )}





              {tutorialPage === 2 && (
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="text-lg">➕</div>
                    <h3 className="text-xs font-semibold text-gray-900">Step 2: Add Detailed Properties</h3>
                  </div>
                  <p className="text-xs text-gray-700 mb-3">
                    Some properties are extracted from your initial prompt. You can always add more at any time.
                  </p>
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-200">
                        <span className="text-xs">🟠</span>
                        <div className="flex-1">
                          <div className="font-medium text-xs text-gray-900">Product Features</div>
                          <div className="text-xs text-gray-700">Highlight eco-friendly materials, sustainable packaging, and carbon-neutral production</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-200">
                        <span className="text-xs">⚪</span>
                        <div className="flex-1">
                          <div className="font-medium text-xs text-gray-900">Budget Constraints</div>
                          <div className="text-xs text-gray-700">Marketing budget: $50,000, timeline: 3 months</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-200">
                        <span className="text-xs">⚫️</span>
                        <div className="flex-1">
                          <div className="font-medium text-xs text-gray-900">Avoid</div>
                          <div className="text-xs text-gray-700">Greenwashing, overly technical language, aggressive sales tactics</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-3 text-xs text-gray-600">
                  ☛ <strong>Pro tip:</strong> Use the action buttons to manage properties: 🟠 (highlight), ⚪ (normal), ⚫️ (avoid)
                  </div>
                </div>
              )}

              {tutorialPage === 3 && (
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="text-lg">✏️</div>
                    <h3 className="text-xs font-semibold text-gray-900">Step 3: Modify Properties</h3>
                  </div>
                  <p className="text-xs text-gray-700 mb-3">
                    Now you can further define and modify your properties!
                  </p>
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <div className="space-y-2">
                      <div className="font-medium text-xs text-gray-900 mb-2">Property Modification Options</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-200">
                            <span className="text-xs">📝</span>
                            <div>
                              <div className="font-medium text-xs text-gray-900">Edit Content</div>
                              <div className="text-xs text-gray-700">Click on property text to edit names and values</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-200">
                            <span className="text-xs">📍</span>
                            <div>
                              <div className="font-medium text-xs text-gray-900">Change Emphasis</div>
                              <div className="text-xs text-gray-700">Use highlight (🟠), normal (⚪), or avoid (⚫️)</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-200">
                            <span className="text-xs">🔑</span>
                            <div>
                              <div className="font-medium text-xs text-gray-900">Embed Objects</div>
                              <div className="text-xs text-gray-700">Include another prompt as a property</div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-200">
                            <span className="text-xs">🗑️</span>
                            <div>
                              <div className="font-medium text-xs text-gray-900">Delete Properties</div>
                              <div className="text-xs text-gray-700">Remove properties you no longer need</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-200">
                            <span className="text-xs">💬</span>
                            <div>
                              <div className="font-medium text-xs text-gray-900">Add Examples</div>
                              <div className="text-xs text-gray-700">Add examples to your properties to help AI understand better</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-gray-600">
                  ☛ <strong>Pro tip:</strong> Use the "More options..." button for advanced functionalities like embedding objects!
                  </div>
                  
                  {/* Embedded Objects Feature */}
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs">🔑</span>
                      <span className="font-medium text-xs text-gray-900">Embed Other Prompt Objects</span>
                    </div>
                    <p className="text-xs text-gray-700 mb-2">
                      You can use one prompt object to define a property in another prompt object, creating powerful nested structures.
                    </p>
                    <div className="bg-white p-2 rounded-lg border border-gray-200">
                      <div className="text-xs text-gray-700">
                        <strong>Example:</strong> In your "Marketing Strategy" object, you can have a "Competitor Analysis" property that references a separate "Competitor Research" prompt object with its own detailed properties.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {tutorialPage === 4 && (
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="text-lg">💾</div>
                    <h3 className="text-xs font-semibold text-gray-900">Step 4: Save & Version Control</h3>
                  </div>
                  <p className="text-xs text-gray-700 mb-3">
                    Save your prompt objects to the left sidebar library for easy management.
                  </p>
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <span className="text-xs">📚</span>
                        <div>
                          <div className="font-medium text-xs text-gray-900">Left Sidebar Library</div>
                          <div className="text-xs text-gray-700">You can access all your saved prompts from the left sidebar.</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-xs">🔄</span>
                        <div>
                          <div className="font-medium text-xs text-gray-900">Version Control</div>
                          <div className="text-xs text-gray-700">You can go back to any history version of each saved prompt object.</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-gray-600">
                  ☛ <strong>Pro tip:</strong> Save your work regularly to build a library of reusable prompt structures!
                  </div>
                </div>
              )}

              {tutorialPage === 5 && (
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="text-lg">🤖</div>
                    <h3 className="text-xs font-semibold text-gray-900">Step 5: Get AI Assistance</h3>
                  </div>
                  <p className="text-xs text-gray-700 mb-3">
                    OOPrompt provides 3 powerful AI tools help you modify and improve your prompt!
                  </p>
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <div className="space-y-2">
                      <div className="font-medium text-xs text-gray-900 mb-2">3 Powerful AI Tools Available</div>
                      <div className="space-y-1.5">
                        <div className="flex items-start gap-2 p-2 bg-white rounded-lg border border-gray-200">
                          <span className="text-xs">🔍</span>
                          <div>
                            <div className="font-medium text-xs text-gray-900">Conflict Check</div>
                            <div className="text-xs text-gray-700 mb-1">AI automatically detects conflicting properties and suggests resolutions. Sometimes maybe you forget you have already added some properties!</div>
                            <div className="text-xs text-gray-600 bg-gray-100 p-1.5 rounded">
                              <strong>Example:</strong> "Budget: $50,000" vs "Budget: $100,000" - AI helps you choose or merge
                            </div>
                          </div>
                        </div>
                        <div className="flex items-start gap-2 p-2 bg-white rounded-lg border border-gray-200">
                          <span className="text-xs">➕</span>
                          <div>
                            <div className="font-medium text-xs text-gray-900">More Properties</div>
                            <div className="text-xs text-gray-700 mb-1">AI suggests more related properties that can possibly add to your prompt. Maybe some you need but forgot to add!</div>
                            <div className="text-xs text-gray-600 bg-gray-100 p-1.5 rounded">
                              <strong>Example:</strong> "Add 'Timeline Constraints' and 'Success Metrics' properties"
                            </div>
                          </div>
                        </div>
                        <div className="flex items-start gap-2 p-2 bg-white rounded-lg border border-gray-200">
                          <span className="text-xs">✏️</span>
                          <div>
                            <div className="font-medium text-xs text-gray-900">Language Modify</div>
                            <div className="text-xs text-gray-700 mb-1">AI improves the clarity of the language in your existing properties. Not good at summarizing? No worries!</div>
                            <div className="text-xs text-gray-600 bg-gray-100 p-1.5 rounded">
                              <strong>Example:</strong> "Refine 'readers' to 'target audience'"
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-gray-600">
                  ☛ <strong>Pro tip:</strong> Click the 💡 button in the toolbar to access all three AI tools and help you modify your prompt!
                  </div>
                </div>
              )}

              {tutorialPage === 6 && (
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="text-lg">🚀</div>
                    <h3 className="text-xs font-semibold text-gray-900">Step 6: Build Prompt</h3>
                  </div>
                  <p className="text-xs text-gray-700 mb-3">
                    Once you've structured your prompt with properties, click the "Build Prompt" button to convert it into a natural language prompt ready to send to AI!
                  </p>
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <div className="space-y-2">
                      <div className="font-medium text-xs text-gray-900 mb-2">Build Prompt Button</div>
                      <div className="bg-white p-3 rounded-lg border border-gray-200">
                        <button className="w-full py-2 px-3 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors">
                          Build Prompt
                        </button>
                      </div>
                      <div className="text-xs text-gray-700 space-y-1.5">
                        <div className="flex items-start gap-2">
                          <span className="text-xs">•</span>
                          <span>Converts your structured properties into a natural language prompt</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-xs">•</span>
                          <span>Automatically saves your prompt object to the library</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-xs">•</span>
                          <span>Displays the built prompt in an expandable panel below</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-gray-600">
                  ☛ <strong>Pro tip:</strong> After building your prompt, you can copy it and use it with any AI model (ChatGPT, Gemini, Claude, etc.) in your preferred chat interface!
                  </div>
                </div>
              )}
            </div>

            {/* Navigation & Action Buttons */}
            <div className="bg-white border-t border-gray-200 p-3 flex-shrink-0">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
                <div className="text-xs text-gray-500 order-3 sm:order-1">
                  Press <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">ESC</kbd> to close
                </div>
                
                {/* Navigation */}
                <div className="flex items-center gap-2 order-2">
                  <button
                    onClick={() => setTutorialPage(Math.max(1, tutorialPage - 1))}
                    disabled={tutorialPage === 1}
                    className={`px-3 py-1.5 rounded-lg transition-colors text-xs ${
                      tutorialPage === 1 
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    ← Previous
                  </button>
                  
                  <span className="text-xs text-gray-500">
                    {tutorialPage} of 6
                  </span>
                  
                  <button
                    onClick={() => setTutorialPage(Math.min(6, tutorialPage + 1))}
                    disabled={tutorialPage === 6}
                    className={`px-3 py-1.5 rounded-lg transition-colors text-xs ${
                      tutorialPage === 6 
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Next →
                  </button>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 order-1 sm:order-3">
                  <button
                    onClick={() => setShowWelcome(false)}
                    className="px-3 py-1.5 text-gray-600 hover:text-gray-800 transition-colors text-xs"
                  >
                    Skip Tutorial
                  </button>
                  {tutorialPage === 6 && (
                    <button
                      onClick={() => setShowWelcome(false)}
                      className="px-3 py-1.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors text-xs"
                    >
                      Start Creating!
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top bar - Fixed at top */}
      <header className="fixed top-0 left-0 right-0 z-30 h-14 panel-chrome flex items-center justify-between px-4 lg:px-6 shadow-sm border-b border-gray-200">
        <div className="flex items-center gap-3 flex-1">
          {/* History Icon Button */}
          <button
            onClick={() => dispatch({ type: "TOGGLE_OBJECT_PANEL", open: !state.objectPanelOpen })}
            className="bg-gray-100 hover:bg-gray-200 rounded p-1.5 transition-colors"
            title={state.objectPanelOpen ? "Hide History" : "Show History"}
            aria-label={state.objectPanelOpen ? "Hide History" : "Show History"}
          >
            <svg className="w-4 h-4" viewBox="0 0 9 10" fill="none">
              <path d="M1.10855 4.46444C0.78686 4.3771 0.465174 4.28975 0.143488 4.20241C0.0479797 4.55369 -0.00012809 4.91812 0 5.28134C0 5.33729 0.0011254 5.39303 0.00335786 5.44851C0.0596826 7.78148 2.26575 9.6285 4.5 9.57301C6.79096 9.63478 9.04379 7.67773 9 5.28134C9.00002 5.04477 8.9798 4.80815 8.93927 4.57499C8.59687 2.47149 6.55215 0.951006 4.5 0.989675C4.19969 0.989646 3.89864 1.01791 3.60274 1.07507L3.98887 1.97234C4.22837 1.80061 4.46788 1.62887 4.70739 1.45714C5.00698 1.24232 5.30658 1.0275 5.60617 0.81268C5.41193 0.541788 5.2177 0.270896 5.02346 3.48687e-06C4.72386 0.214823 4.42427 0.429643 4.12467 0.644463C3.88516 0.816197 3.64566 0.98793 3.40615 1.15966L3.79228 2.05694C4.02485 2.01202 4.2621 1.98966 4.5 1.98967C6.12393 1.95807 7.70255 3.1641 7.95403 4.74616C7.98467 4.92245 8.00001 5.10146 8 5.28134C8.0405 7.08113 6.31498 8.61994 4.5 8.57301C2.73043 8.61598 1.03743 7.1599 1.00255 5.40831C1.00086 5.36621 1 5.32388 1 5.28134C0.999937 5.00518 1.03633 4.73018 1.10855 4.46444Z" fill="currentColor"/>
              <path d="M4.5 3.73969V5.94563L5.7381 6.74404" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          
          {/* OOPrompt Title - Centered */}
          <div className="flex-1 flex justify-center">
          <div className="font-semibold text-base text-gray-900">OOPrompt</div>
        </div>
          
          {/* Settings and Help buttons */}
          <div className="flex items-center gap-2 ml-2">
          <button
            onClick={() => {
              setShowSettingsModal(true);
              const key = llmService.getCurrentApiKey();
              if (llmService.hasCustomApiKey()) {
                setCurrentApiKey(key);
              } else {
                setCurrentApiKey("");
              }
            }}
            className="text-gray-500 hover:text-gray-700 transition-colors p-1.5 hover:bg-gray-100 rounded-lg"
            title="Settings"
            aria-label="Settings"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          <button
            onClick={() => {
              setShowWelcome(true);
              setTutorialPage(1);
            }}
            className="text-gray-500 hover:text-gray-700 transition-colors p-1.5 hover:bg-gray-100 rounded-lg"
            title="Show tutorial"
            aria-label="Show tutorial"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          </div>
        </div>
      </header>

      {/* Main content area */}
      <div className="flex-1 relative h-full pt-14 flex flex-row overflow-hidden">
        {/* History Panel - Left Sidebar (foldable) */}
        <HistoryPanel
                objects={state.promptObjects}
                selectedObjectId={state.currentObjectId}
                onSelectObject={(objectId) => {
                  console.log('Loading prompt object:', objectId);
                  const obj = state.promptObjects.find(obj => obj.id === objectId);
                  if (obj) {
                    handleObjectSwitch(obj, `switching to "${obj.name || obj.main_task || 'another object'}"`);
              // Open the OOP panel when selecting an object
              dispatch({ type: "TOGGLE_PANEL", open: true });
                  }
                }}
                onDeleteObject={(objectId) => {
                  console.log('Deleting prompt object:', objectId);
                  dispatch({ type: "DELETE_PROMPT_OBJECT", id: objectId });
                }}
          isOpen={state.objectPanelOpen}
          onToggle={() => dispatch({ type: "TOGGLE_OBJECT_PANEL", open: !state.objectPanelOpen })}
              />
            
        {/* Main Content Area */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {state.openPanel && state.oop.main_task && state.oop.main_task.trim() ? (
            /* OOP Panel - Main content area when editing */
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
        ) : (
            /* Object Panel - Main view when no object is open */
          <div className="flex-1 w-full overflow-y-auto">
            <ObjectPanel
              objects={state.promptObjects}
              selectedObjectId={state.currentObjectId}
              onSelectObject={(objectId) => {
                console.log('Loading prompt object:', objectId);
                const obj = state.promptObjects.find(obj => obj.id === objectId);
                if (obj) {
                  handleObjectSwitch(obj, `switching to "${obj.name || obj.main_task || 'another object'}"`);
                    // Open the OOP panel to show the selected object
                    dispatch({ type: "TOGGLE_PANEL", open: true });
                }
              }}
              onDeleteObject={(objectId) => {
                console.log('Deleting prompt object:', objectId);
                dispatch({ type: "DELETE_PROMPT_OBJECT", id: objectId });
              }}
              onOpenOOPPanel={() => setShowNewPromptModal(true)}
              onOpenPanel={() => {
                // Open the OOP panel to show the selected object
                dispatch({ type: "TOGGLE_PANEL", open: true });
              }}
            />
          </div>
        )}
        </div>

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

        {/* New Prompt Modal */}
        <NewPromptModal
          isOpen={showNewPromptModal}
          onClose={() => setShowNewPromptModal(false)}
          onExtract={(oopObject) => {
            console.log('=== Setting extracted OOP object ===');
            console.log('Extracted object:', oopObject);
            
            // Set the extracted object as the current OOP object
            dispatch({ type: "SET_OOP", payload: oopObject });
            
            // Open the OOP panel to show the extracted properties
            dispatch({ type: "TOGGLE_PANEL", open: true });
            
            // Close the modal
            setShowNewPromptModal(false);
          }}
          onError={showError}
        />

        {/* Settings Modal */}
        <SettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          onSave={async (apiKey) => {
            await llmService.setCustomApiKey(apiKey);
            // Update current API key state
            if (llmService.hasCustomApiKey()) {
              setCurrentApiKey(llmService.getCurrentApiKey());
            } else {
              setCurrentApiKey("");
            }
          }}
          currentApiKey={currentApiKey}
        />
      </div>
    </div>
  );
}
