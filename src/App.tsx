import { useState, useEffect } from "react";
import { useOOPrompt } from "./state/useOOPrompt";
import type { OOPromptObject } from "./types";
import { OOPromptPanel } from "./components/OOPromptPanel";
import { BookmarkHandle } from "./components/BookmarkHandle";
import { ObjectPanel } from "./components/ObjectPanel";
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[95vw] h-full max-h-[95vh] overflow-hidden mx-2 sm:mx-4 flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-3 sm:p-4 md:p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-1 sm:mb-2">🎉 Welcome to OOPrompt!</h1>
                  <p className="text-blue-100 text-sm sm:text-base md:text-lg">
                    Master the art of structured AI prompting step by step
                  </p>
                </div>
                <button
                  onClick={() => setShowWelcome(false)}
                  className="text-white hover:text-blue-200 transition-colors text-xl sm:text-2xl ml-2 flex-shrink-0"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="bg-gray-100 h-2">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-full transition-all duration-300"
                style={{ width: `${(tutorialPage / 5) * 100}%` }}
              ></div>
            </div>

            {/* Tutorial Content - Single Page View */}
            <div className="p-3 sm:p-4 md:p-6 lg:p-8 h-full overflow-y-auto flex-1">
              {tutorialPage === 1 && (
                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-3 sm:p-4 md:p-6 rounded-xl border border-blue-200">
                  <div className="flex items-center gap-2 sm:gap-3 md:gap-4 mb-3 sm:mb-4">
                    <div className="text-2xl sm:text-3xl">💬</div>
                    <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-blue-900">Step 1: Start with a Natural Prompt</h3>
                  </div>
                  <p className="text-gray-700 mb-4 sm:mb-6 text-sm sm:text-base md:text-lg">
                    To begin with, write naturally about what you want to do, just like how you do to a common AI chat bot!
                  </p>
                  <div className="bg-white p-3 sm:p-4 md:p-6 rounded-lg border border-blue-200">
                    <div className="space-y-2 sm:space-y-3">
                      <div className="p-2 sm:p-3 bg-blue-50 rounded-lg">
                        <div className="font-medium text-blue-900 mb-1 sm:mb-2 text-sm sm:text-base">Natural Input:</div>
                        <div className="text-gray-700 italic text-xs sm:text-sm">
                          "I need to create a marketing strategy for launching our new eco-friendly product. It should target environmentally conscious consumers and include social media campaigns, influencer partnerships, and sustainability messaging."
                        </div>
                      </div>
                      <div className="text-center text-lg sm:text-xl text-blue-400">↓</div>
                      <div className="p-2 sm:p-3 bg-green-50 rounded-lg">
                        <div className="font-medium text-green-900 mb-1 sm:mb-2 text-sm sm:text-base">OOPrompt Converts To:</div>
                        <div className="text-gray-700 text-xs sm:text-sm">
                          A structured object with properties like "Product Type", "Target Audience", "Marketing Channels", "Key Messages", etc.
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 sm:mt-4 text-sm sm:text-base text-blue-600">
                  ☛ <strong>Pro tip:</strong> You do not need to include all details at once. You can always add more properties easily by our system!
                  </div>
                </div>
              )}





              {tutorialPage === 2 && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-3 sm:p-4 md:p-6 rounded-xl border border-green-200">
                  <div className="flex items-center gap-2 sm:gap-3 md:gap-4 mb-3 sm:mb-4">
                    <div className="text-2xl sm:text-3xl">➕</div>
                    <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-green-900">Step 2: Add Detailed Properties</h3>
                  </div>
                  <p className="text-gray-700 mb-4 sm:mb-6 text-sm sm:text-base md:text-lg">
                    Some properties are extracted from your initial prompt. You can always add more at any time.
                  </p>
                  <div className="bg-white p-3 sm:p-4 md:p-6 rounded-lg border border-green-200">
                    <div className="space-y-2 sm:space-y-3">
                      <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-orange-50 rounded-lg border border-orange-200">
                        <span className="text-orange-600 font-bold text-lg sm:text-xl">🟠</span>
                        <div className="flex-1">
                          <div className="font-medium text-orange-900 text-sm sm:text-base">Product Features</div>
                          <div className="text-orange-700 text-xs sm:text-sm">Highlight eco-friendly materials, sustainable packaging, and carbon-neutral production</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <span className="text-gray-600 font-bold text-lg sm:text-xl">⚪</span>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 text-sm sm:text-base">Budget Constraints</div>
                          <div className="text-gray-700 text-xs sm:text-sm">Marketing budget: $50,000, timeline: 3 months</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-red-50 rounded-lg border border-red-200">
                        <span className="text-red-600 font-bold text-lg sm:text-xl">⚫️</span>
                        <div className="flex-1">
                          <div className="font-medium text-red-900 text-sm sm:text-base">Avoid</div>
                          <div className="text-red-700 text-xs sm:text-sm">Greenwashing, overly technical language, aggressive sales tactics</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 sm:mt-6 text-sm sm:text-base text-green-600">
                  ☛ <strong>Pro tip:</strong> Use the action buttons to manage properties: 🟠 (highlight), ⚪ (normal), ⚫️ (avoid)
                  </div>
                </div>
              )}

              {tutorialPage === 3 && (
                <div className="bg-gradient-to-r from-purple-50 to-violet-50 p-3 sm:p-4 md:p-6 rounded-xl border border-purple-200">
                  <div className="flex items-center gap-2 sm:gap-3 md:gap-4 mb-3 sm:mb-4">
                    <div className="text-2xl sm:text-3xl md:text-4xl">✏️</div>
                    <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-purple-900">Step 3: Modify Properties</h3>
                  </div>
                  <p className="text-gray-700 mb-4 sm:mb-6 text-sm sm:text-base md:text-lg">
                    Now you can further define and modify your properties!
                  </p>
                  <div className="bg-white p-3 sm:p-4 md:p-6 rounded-lg border border-purple-200">
                    <div className="space-y-3 sm:space-y-4">
                      <div className="font-medium text-purple-900 text-sm sm:text-base md:text-lg mb-2 sm:mb-3 md:mb-4">Property Modification Options</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                        <div className="space-y-2 sm:space-y-3">
                          <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <span className="text-blue-600 font-bold text-lg sm:text-xl">📝</span>
                            <div>
                              <div className="font-medium text-blue-900 text-sm sm:text-base">Edit Content</div>
                              <div className="text-xs sm:text-sm text-blue-700">Click on property text to edit names and values</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-green-50 rounded-lg border border-green-200">
                            <span className="text-green-600 font-bold text-lg sm:text-xl">📍</span>
                            <div>
                              <div className="font-medium text-green-900 text-sm sm:text-base">Change Actions</div>
                              <div className="text-xs sm:text-sm text-green-700">Use highlight (🟠), normal (⚪), or avoid (⚫️)</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-orange-50 rounded-lg border border-orange-200">
                            <span className="text-orange-600 font-bold text-lg sm:text-xl">🔑</span>
                            <div>
                              <div className="font-medium text-orange-900 text-sm sm:text-base">Embed Objects</div>
                              <div className="text-xs sm:text-sm text-orange-700">Include another prompt as a property</div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-2 sm:space-y-3">
                          <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-red-50 rounded-lg border border-red-200">
                            <span className="text-red-600 font-bold text-lg sm:text-xl">🗑️</span>
                            <div>
                              <div className="font-medium text-red-900 text-sm sm:text-base">Delete Properties</div>
                              <div className="text-xs sm:text-sm text-red-700">Remove properties you no longer need</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-purple-50 rounded-lg border border-purple-200">
                            <span className="text-purple-600 font-bold text-lg sm:text-xl">🔗</span>
                            <div>
                              <div className="font-medium text-purple-900 text-sm sm:text-base">File Attachments</div>
                              <div className="text-xs sm:text-sm text-purple-700">Add files to any property as references</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <span className="text-gray-600 font-bold text-lg sm:text-xl">💬</span>
                            <div>
                              <div className="font-medium text-gray-900 text-sm sm:text-base">Add Examples</div>
                              <div className="text-xs sm:text-sm text-gray-700">Add examples to your properties to help AI understand better</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 sm:mt-6 text-sm sm:text-base md:text-lg text-purple-600">
                  ☛ <strong>Pro tip:</strong> Use the "More options..." button for advanced functionalities like embedding objects and file attachments!
                  </div>
                  <div className="mt-4 sm:mt-6 text-sm sm:text-base md:text-lg text-purple-600">
                  ☛ <strong>Pro tip:</strong> Try to create and add a new prompot object for complex properties!
                  </div>
                  
                  {/* Embedded Objects Feature */}
                  <div className="mt-6 sm:mt-8 p-4 sm:p-6 md:p-8 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 sm:gap-3 md:gap-4 mb-3 sm:mb-4">
                      <span className="text-blue-600 font-bold text-2xl sm:text-3xl">🔑</span>
                      <span className="font-medium text-blue-900 text-base sm:text-lg md:text-xl">Embed Other Prompt Objects</span>
                    </div>
                    <p className="text-blue-700 mb-4 sm:mb-6 text-sm sm:text-base md:text-lg">
                      You can use one prompt object to define a property in another prompt object, creating powerful nested structures.
                    </p>
                    <div className="bg-white p-3 sm:p-4 md:p-6 rounded-lg border border-blue-200">
                      <div className="text-blue-800 text-sm sm:text-base md:text-lg">
                        <strong>Example:</strong> In your "Marketing Strategy" object, you can have a "Competitor Analysis" property that references a separate "Competitor Research" prompt object with its own detailed properties.
                      </div>
                    </div>
                  </div>


                </div>
              )}

              {tutorialPage === 4 && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-3 sm:p-4 md:p-6 rounded-xl border border-green-200">
                  <div className="flex items-center gap-2 sm:gap-3 md:gap-4 mb-3 sm:mb-4">
                    <div className="text-2xl sm:text-3xl md:text-4xl">💾</div>
                    <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-green-900">Step 4: Save & Version Control</h3>
                  </div>
                  <p className="text-gray-700 mb-4 sm:mb-6 text-sm sm:text-base md:text-lg">
                    Save your prompt objects to the left sidebar library for easy management.
                  </p>
                  <div className="bg-white p-3 sm:p-4 md:p-6 rounded-lg border border-green-200">
                    <div className="space-y-3 sm:space-y-4">
                      <div className="flex items-start gap-2 sm:gap-3">
                        <span className="text-green-600 font-bold text-lg sm:text-xl">📚</span>
                        <div>
                          <div className="font-medium text-green-900 text-sm sm:text-base">Left Sidebar Library</div>
                          <div className="text-green-700 text-xs sm:text-sm">You can access all your saved prompts from the left sidebar.</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-2 sm:gap-3">
                        <span className="text-green-600 font-bold text-lg sm:text-xl">🔄</span>
                        <div>
                          <div className="font-medium text-green-900 text-sm sm:text-base">Version Control</div>
                          <div className="text-green-700 text-xs sm:text-sm">You can go back to any history version of each saved prompt object.</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 sm:mt-6 text-sm sm:text-base md:text-lg text-green-600">
                  ☛ <strong>Pro tip:</strong> Save your work regularly to build a library of reusable prompt structures!
                  </div>
                </div>
              )}

              {tutorialPage === 5 && (
                <div className="bg-gradient-to-r from-violet-50 to-fuchsia-50 p-3 sm:p-4 md:p-6 rounded-xl border border-violet-200">
                  <div className="flex items-center gap-2 sm:gap-3 md:gap-4 mb-3 sm:mb-4">
                    <div className="text-2xl sm:text-3xl">🤖</div>
                    <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-violet-900">Step 5: Get AI Assistance</h3>
                  </div>
                  <p className="text-gray-700 mb-4 sm:mb-6 text-sm sm:text-base md:text-lg">
                    OOPrompt provides 3 powerful AI tools help you modify and improve your prompt!
                  </p>
                  <div className="bg-white p-3 sm:p-4 md:p-6 rounded-lg border border-violet-200">
                    <div className="space-y-2 sm:space-y-3">
                      <div className="font-medium text-violet-900 text-sm sm:text-base mb-2 sm:mb-3">3 Powerful AI Tools Available</div>
                      <div className="space-y-2 sm:space-y-3">
                        <div className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <span className="text-blue-600 font-bold text-lg sm:text-xl">🔍</span>
                          <div>
                            <div className="font-medium text-blue-900 text-sm sm:text-base">Conflict Check</div>
                            <div className="text-blue-700 mb-1 sm:mb-2 text-xs sm:text-sm">AI automatically detects conflicting properties and suggests resolutions. Sometimes maybe you forget you have already added some properties!</div>
                            <div className="text-xs text-blue-600 bg-blue-100 p-1 sm:p-2 rounded">
                              <strong>Example:</strong> "Budget: $50,000" vs "Budget: $100,000" - AI helps you choose or merge
                            </div>
                          </div>
                        </div>
                        <div className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 bg-green-50 rounded-lg border border-green-200">
                          <span className="text-green-600 font-bold text-lg sm:text-xl">➕</span>
                          <div>
                            <div className="font-medium text-green-900 text-sm sm:text-base">More Properties</div>
                            <div className="text-green-700 mb-1 sm:mb-2 text-xs sm:text-sm">AI suggests more related properties that can possibly add to your prompt. Maybe some you need but forgot to add!</div>
                            <div className="text-xs text-green-600 bg-green-100 p-1 sm:p-2 rounded">
                              <strong>Example:</strong> "Add 'Timeline Constraints' and 'Success Metrics' properties"
                            </div>
                          </div>
                        </div>
                        <div className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 bg-purple-50 rounded-lg border border-purple-200">
                          <span className="text-purple-600 font-bold text-lg sm:text-xl">✏️</span>
                          <div>
                            <div className="font-medium text-purple-900 text-sm sm:text-base">Language Modify</div>
                            <div className="text-purple-700 mb-1 sm:mb-2 text-xs sm:text-sm">AI improves the clarity of the language in your existing properties. Not good at summarizing? No worries!</div>
                            <div className="text-xs text-purple-600 bg-purple-100 p-1 sm:p-2 rounded">
                              <strong>Example:</strong> "Refine 'readers' to 'target audience'"
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 sm:mt-6 text-sm sm:text-base text-violet-600">
                  ☛ <strong>Pro tip:</strong> Click the 💡 button in the toolbar to access all three AI tools and help you modify your prompt!
                  </div>
                </div>
              )}

              {tutorialPage === 6 && (
                <div className="bg-gradient-to-r from-red-50 to-pink-50 p-3 sm:p-4 md:p-6 rounded-xl border border-red-200">
                  <div className="flex items-center gap-2 sm:gap-3 md:gap-4 mb-3 sm:mb-4">
                    <div className="text-2xl sm:text-3xl">🚀</div>
                    <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-red-900">Step 6: Send to AI</h3>
                  </div>
                  <p className="text-gray-700 mb-4 sm:mb-6 text-sm sm:text-base md:text-lg">
                    Send your optimized prompt to your favorite AI model and get results!
                  </p>
                  <div className="bg-white p-3 sm:p-4 md:p-6 rounded-lg border border-red-200">
                    <div className="space-y-4 sm:space-y-6">
                      <div className="text-center">
                        <div className="font-medium text-red-900 text-base sm:text-lg mb-4">Available AI Models</div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                          <div className="flex flex-col items-center gap-2 p-3 sm:p-4 bg-orange-50 rounded-lg border border-orange-200">
                            <span className="text-orange-600 text-2xl sm:text-3xl">🟩</span>
                            <span className="text-orange-800 text-sm sm:text-base font-medium">ChatGPT</span>
                            <span className="text-orange-700 text-xs text-center">Powerful language model for creative tasks</span>
                          </div>
                          <div className="flex flex-col items-center gap-2 p-3 sm:p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                            <span className="text-emerald-600 text-2xl sm:text-3xl">🟦</span>
                            <span className="text-emerald-800 text-sm sm:text-base font-medium">Gemini</span>
                            <span className="text-emerald-700 text-xs text-center">Multimodal AI for complex tasks</span>
                          </div>
                          <div className="flex flex-col items-center gap-2 p-3 sm:p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                            <span className="text-indigo-600 text-2xl sm:text-3xl">🟧</span>
                            <span className="text-indigo-800 text-sm sm:text-base font-medium">Claude</span>
                            <span className="text-indigo-700 text-xs text-center">Advanced reasoning and analysis</span>
                          </div>
                        </div>
                      </div>
                      <div className="bg-blue-50 p-3 sm:p-4 rounded-lg border border-blue-200">
                        <div className="flex items-start gap-2 sm:gap-3">
                          <span className="text-blue-600 text-lg sm:text-xl">☛</span>
                          <div className="text-blue-800 text-xs sm:text-sm">
                            <strong>Pro tip:</strong> Each AI model has different strengths. Try multiple models to see which works best for your specific task!
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation & Action Buttons */}
            <div className="bg-white border-t border-gray-200 p-3 sm:p-4 md:p-6 rounded-b-2xl">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
                <div className="text-xs sm:text-sm text-gray-500 order-3 sm:order-1">
                  Press <kbd className="px-1 sm:px-2 py-1 bg-gray-100 rounded text-xs">ESC</kbd> to close
                </div>
                
                {/* Navigation */}
                <div className="flex items-center gap-2 sm:gap-3 order-2">
                  <button
                    onClick={() => setTutorialPage(Math.max(1, tutorialPage - 1))}
                    disabled={tutorialPage === 1}
                    className={`px-2 sm:px-3 md:px-4 py-1 sm:py-2 rounded-lg transition-colors text-sm sm:text-base ${
                      tutorialPage === 1 
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    ← Previous
                  </button>
                  
                  <span className="text-xs sm:text-sm text-gray-500">
                    {tutorialPage} of 6
                  </span>
                  
                  <button
                    onClick={() => setTutorialPage(Math.min(6, tutorialPage + 1))}
                    disabled={tutorialPage === 6}
                    className={`px-2 sm:px-3 md:px-4 py-1 sm:py-2 rounded-lg transition-colors text-sm sm:text-base ${
                      tutorialPage === 6 
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Next →
                  </button>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 sm:gap-3 order-1 sm:order-3">
                  <button
                    onClick={() => setShowWelcome(false)}
                    className="px-3 sm:px-4 md:px-6 py-1 sm:py-2 text-gray-600 hover:text-gray-800 transition-colors text-sm sm:text-base"
                  >
                    Skip Tutorial
                  </button>
                  {tutorialPage === 6 && (
                    <button
                      onClick={() => setShowWelcome(false)}
                      className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105 text-sm sm:text-base"
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
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-base">O</span>
          </div>
          <div className="font-semibold text-base text-gray-900">OOPrompt</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setShowSettingsModal(true);
              // Load current API key when opening settings
              const key = llmService.getCurrentApiKey();
              // Only show the key if it's a custom one (not the default)
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
      </header>

      {/* Main content area */}
      <div className="flex-1 relative h-full pt-14 flex flex-col lg:flex-row overflow-hidden">
        {state.openPanel ? (
          <>
            {/* Object Panel - Sidebar when editing (25% width) */}
            <div className="hidden lg:block lg:w-1/4 lg:border-r lg:border-gray-200 lg:bg-white lg:overflow-y-auto">
              <ObjectPanel
                objects={state.promptObjects}
                selectedObjectId={state.currentObjectId}
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
                onOpenOOPPanel={() => setShowNewPromptModal(true)}
                onOpenPanel={() => {
                  // Panel is already open when editing, so this is a no-op
                }}
              />
            </div>
            
            {/* OOP Panel - Main content area when editing (75% width) */}
            <div className="flex-1 min-w-0 bg-white overflow-hidden">
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
        ) : (
          /* Object Panel - Main view when no object is open (full width) */
          <div className="flex-1 w-full overflow-y-auto">
            <ObjectPanel
              objects={state.promptObjects}
              selectedObjectId={state.currentObjectId}
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
              onOpenOOPPanel={() => setShowNewPromptModal(true)}
              onOpenPanel={() => {
                // Open the OOP panel to show the selected object
                dispatch({ type: "TOGGLE_PANEL", open: true });
              }}
            />
          </div>
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
