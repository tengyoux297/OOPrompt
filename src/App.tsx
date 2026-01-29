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
import { ApiKeyRequiredModal } from "./components/ApiKeyRequiredModal";
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
  const [showApiKeyRequiredModal, setShowApiKeyRequiredModal] = useState(false);
  
  // Check for API key on mount
  useEffect(() => {
    const checkApiKey = async () => {
      // Wait a bit for the service to initialize and load from storage
      // Use a longer delay to ensure chrome.storage is ready
      await new Promise(resolve => setTimeout(resolve, 300));
      const hasApiKey = await llmService.checkAndLoadApiKey();
      console.log('App: API key check result:', hasApiKey);
      if (!hasApiKey) {
        console.log('App: Showing API key required modal');
        setShowApiKeyRequiredModal(true);
      }
    };
    checkApiKey();
  }, []);

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
                    <h3 className="text-sm font-bold text-gray-900">Step 1: Main Task & Audience</h3>
                  </div>
                  <p className="text-xs text-gray-600 mb-3">
                    At the top of the editing panel you’ll see <strong>Main Task</strong> and <strong>Audience</strong>. Describe what you want to accomplish and who it’s for—just like talking to an AI assistant.
                  </p>
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <div className="space-y-2">
                      <div className="p-2 bg-white rounded-lg border border-gray-200">
                        <div className="text-sm font-semibold text-gray-900 mb-1">Main Task</div>
                        <div className="text-xs text-gray-500 italic">e.g. “Plan a trip” or “Create a marketing strategy for our eco-friendly product”</div>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-gray-200">
                        <div className="text-sm font-semibold text-gray-900 mb-1">Audience</div>
                        <div className="text-xs text-gray-500 italic">e.g. “everyone” or “environmentally conscious consumers”</div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-gray-600">
                  ☛ <strong>Pro tip:</strong> You can create a new prompt with the <strong>+</strong> button in the top bar, or open one from the prompt library (left sidebar).
                  </div>
                </div>
              )}





              {tutorialPage === 2 && (
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="text-lg">➕</div>
                    <h3 className="text-sm font-bold text-gray-900">Step 2: Add Properties</h3>
                  </div>
                  <p className="text-xs text-gray-600 mb-3">
                    Use the <strong>ADD PROPERTY</strong> button (blue, next to Main Task & Audience) to add requirements. Each property has a <strong>Name</strong> and <strong>Value</strong> that you can edit inline.
                  </p>
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-200">
                        <span className="text-xs">⭐</span>
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-gray-900">Important</div>
                          <div className="text-xs text-gray-500">Properties the AI should prefer or prioritize</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-200">
                        <span className="text-xs">✏️</span>
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-gray-900">Normal</div>
                          <div className="text-xs text-gray-500">Default emphasis for standard requirements</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-200">
                        <span className="text-xs">🚫</span>
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-gray-900">Avoid</div>
                          <div className="text-xs text-gray-500">Things the AI should not do or include</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-gray-600">
                  ☛ <strong>Pro tip:</strong> On each property card, the icon on the left cycles emphasis: normal → important → avoid. Use <strong>⋯</strong> for more options (examples, nested).
                  </div>
                </div>
              )}

              {tutorialPage === 3 && (
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="text-lg">✏️</div>
                    <h3 className="text-sm font-bold text-gray-900">Step 3: Edit & More Options</h3>
                  </div>
                  <p className="text-xs text-gray-600 mb-3">
                    Each property card has inline <strong>Name</strong> and <strong>Value</strong> fields—click to edit. On the right you’ll see the emphasis icon, <strong>⋯</strong> (more options), and delete.
                  </p>
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <div className="space-y-2">
                      <div className="text-sm font-semibold text-gray-900 mb-2">From the ⋯ (more options) button</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-200">
                          <span className="text-xs">💬</span>
                          <div>
                            <div className="text-sm font-semibold text-gray-900">Examples</div>
                            <div className="text-xs text-gray-500">Add examples or use the lightbulb to generate them with AI</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-200">
                          <span className="text-xs">🔑</span>
                          <div>
                            <div className="text-sm font-semibold text-gray-900">Nested</div>
                            <div className="text-xs text-gray-500">Attach another saved prompt object as this property’s value</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-gray-600">
                  ☛ <strong>Pro tip:</strong> Use nested when a requirement is complex enough to deserve its own Main Task + Audience + properties (e.g. “Competitor Analysis” as its own prompt object).
                  </div>
                </div>
              )}

              {tutorialPage === 4 && (
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="text-lg">💾</div>
                    <h3 className="text-sm font-bold text-gray-900">Step 4: Prompt Library & Versions</h3>
                  </div>
                  <p className="text-xs text-gray-600 mb-3">
                    Use <strong>SAVE</strong> (next to Main Task) to store the current prompt in the library. Open or close the library with the <strong>clock icon</strong> in the top bar—it’s the left sidebar with your saved prompts.
                  </p>
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <span className="text-xs">📚</span>
                        <div>
                          <div className="text-sm font-semibold text-gray-900">Prompt library (left sidebar)</div>
                          <div className="text-xs text-gray-500">Each card shows Main Task, property count, and date. Click a card to load that prompt.</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-xs">🕐</span>
                        <div>
                          <div className="text-sm font-semibold text-gray-900">Version history</div>
                          <div className="text-xs text-gray-500">On each library card, click the clock icon to open the History Menu and load an older version.</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-gray-600">
                  ☛ <strong>Pro tip:</strong> Save often so you can switch between prompts and revisit earlier versions anytime.
                  </div>
                </div>
              )}

              {tutorialPage === 5 && (
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="text-lg">🤖</div>
                    <h3 className="text-sm font-bold text-gray-900">Step 5: AI Suggestions</h3>
                  </div>
                  <p className="text-xs text-gray-600 mb-3">
                    Click the yellow <strong>AI SUGGESTIONS</strong> button (in the header next to SAVE and ADD PROPERTY) to open a panel with three actions. Each one both chooses the mode and runs it—no separate “Analyze” step.
                  </p>
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <div className="space-y-2">
                      <div className="text-sm font-semibold text-gray-900 mb-2">Three AI actions</div>
                      <div className="space-y-1.5">
                        <div className="flex items-start gap-2 p-2 bg-white rounded-lg border border-gray-200">
                          <span className="text-xs">🔍</span>
                          <div>
                            <div className="text-sm font-semibold text-gray-900">Check Conflicts</div>
                            <div className="text-xs text-gray-500">Finds conflicting properties (e.g. two different budgets) and suggests how to resolve them.</div>
                          </div>
                        </div>
                        <div className="flex items-start gap-2 p-2 bg-white rounded-lg border border-gray-200">
                          <span className="text-xs">➕</span>
                          <div>
                            <div className="text-sm font-semibold text-gray-900">Suggest Properties</div>
                            <div className="text-xs text-gray-500">Suggests extra properties you might want to add (e.g. timeline, success metrics).</div>
                          </div>
                        </div>
                        <div className="flex items-start gap-2 p-2 bg-white rounded-lg border border-gray-200">
                          <span className="text-xs">✏️</span>
                          <div>
                            <div className="text-sm font-semibold text-gray-900">Improve Wording</div>
                            <div className="text-xs text-gray-500">Refines the wording of your existing properties for clarity and consistency.</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-gray-600">
                  ☛ <strong>Pro tip:</strong> Pick one of the three actions to run it. You can apply, ignore, or tweak suggestions in the panel.
                  </div>
                </div>
              )}

              {tutorialPage === 6 && (
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="text-lg">🚀</div>
                    <h3 className="text-sm font-bold text-gray-900">Step 6: Build Prompt</h3>
                  </div>
                  <p className="text-xs text-gray-600 mb-3">
                    Click the blue <strong>Build Prompt</strong> button at the bottom to turn your Main Task, Audience, and properties into a single natural-language prompt.
                  </p>
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <div className="space-y-2">
                      <div className="text-sm font-semibold text-gray-900 mb-2">What happens when you build</div>
                      <div className="text-xs text-gray-500 space-y-1.5">
                        <div className="flex items-start gap-2">
                          <span className="text-xs">•</span>
                          <span>The prompt is <strong className="text-gray-700">copied to your clipboard</strong> automatically.</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-xs">•</span>
                          <span>A <strong className="text-gray-700">“Prompt Built Successfully”</strong> panel appears with the full text. Use the <strong className="text-gray-700">copy icon</strong> in the top-right of that panel to copy again.</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-xs">•</span>
                          <span>Your prompt object is saved to the library.</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-gray-600">
                  ☛ <strong>Pro tip:</strong> Paste the built prompt into any AI chat (ChatGPT, Gemini, Claude, etc.). Switching or creating a new prompt clears the built result so you always see the one for the current object.
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
          
          {/* New Prompt, Settings and Help buttons */}
          <div className="flex items-center gap-2 ml-2">
          {/* New Prompt Button - Always visible */}
          <button
            onClick={() => setShowNewPromptModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded p-1.5 transition-colors"
            title="New prompt"
            aria-label="New prompt"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
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
            
            // Load the extracted object as current (sets oop, currentObjectId, adds to promptObjects
            // when new) so the panel and sidebar show this object's properties only
            dispatch({ type: "LOAD_PROMPT_OBJECT", payload: oopObject });
            
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

        {/* API Key Required Modal */}
        <ApiKeyRequiredModal
          isOpen={showApiKeyRequiredModal}
          onSave={async (apiKey) => {
            await llmService.setCustomApiKey(apiKey);
            // Update current API key state
            if (llmService.hasApiKey()) {
              setCurrentApiKey(llmService.getCurrentApiKey());
              setShowApiKeyRequiredModal(false);
            }
          }}
        />
      </div>
    </div>
  );
}
