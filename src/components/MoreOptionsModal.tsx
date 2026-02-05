import { useState, useEffect } from "react";
import type { Property, OOPromptObject } from "../types";
import { generateExamples } from "../api";

type Props = {
  isOpen: boolean;
  property: Property;
  currentOOP: OOPromptObject; // Add current OOPrompt object
  promptObjects: OOPromptObject[]; // All available prompt objects
  selectedLLM: 'openai' | 'gemini' | 'claude';
  onClose: () => void;
  onUpdateProperty: (updatedProperty: Property) => void;
  onCreateEmbeddedObject?: (propertyId: string, parentObjectId: string) => void;
  onEmbedExistingObject?: (propertyId: string, objectId: string, objectName: string) => void;
};

export function MoreOptionsModal({ isOpen, property, currentOOP, promptObjects, selectedLLM, onClose, onUpdateProperty, onCreateEmbeddedObject, onEmbedExistingObject }: Props) {
  const [activeTab, setActiveTab] = useState<"examples" | "nested">("examples");
  const [examples, setExamples] = useState<string[]>(property.examples || []);
  const [selectedExamples, setSelectedExamples] = useState<Set<string>>(new Set(property.examples || []));
  const [isGeneratingExamples, setIsGeneratingExamples] = useState(false);
  const [newExample, setNewExample] = useState("");
  
  // Check if property value is empty (for disabling example generation)
  const propertyValue = typeof property.value === "string" 
    ? property.value.trim() 
    : (property.value?.refObjectName || "").trim();
  const hasPropertyValue = !!propertyValue;

  // Filter promptObjects to show only latest version of each unique object
  // Group by main_task + audience and keep only the most recently updated version
  const getLatestVersions = () => {
    const uniqueObjects = new Map<string, OOPromptObject>();
    
    promptObjects.forEach(obj => {
      const key = `${obj.main_task || ''}|${obj.audience || ''}`;
      
      if (!uniqueObjects.has(key) || obj.updatedAt > uniqueObjects.get(key)!.updatedAt) {
        uniqueObjects.set(key, obj);
      }
    });
    
    // Convert to array, filter out current object, and sort by most recently updated
    return Array.from(uniqueObjects.values())
      .filter(obj => obj.id !== currentOOP.id)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  };
  
  const latestObjects = getLatestVersions();

  // Initialize selected examples when property changes
  useEffect(() => {
    setExamples(property.examples || []);
    setSelectedExamples(new Set(property.examples || []));
  }, [property.examples]);


  const handleGenerateExamples = async () => {
    // Check if property value is empty
    const propertyValue = typeof property.value === "string" 
      ? property.value.trim() 
      : (property.value?.refObjectName || "").trim();
    
    if (!propertyValue) {
      alert(`Warning: Cannot generate examples. The property "${property.name}" has no value.\n\nExamples are generated to clarify the property value (e.g., for property {name: "interest", value: "food"}, examples would be "burgers", "rice", "noodles").\n\nPlease provide a value for this property first.`);
      return;
    }
    
    setIsGeneratingExamples(true);
    try {
      const result = await generateExamples({
        name: property.name,
        value: propertyValue
      }, currentOOP); // Pass the current OOPrompt object
      
      // Add new examples to the list but don't select them by default
      const newExamples = [...examples, ...result.examples];
      setExamples(newExamples);
      
      // Keep existing selections, don't auto-select new examples
      // Users will need to manually select which new examples they want to keep
    } catch (error) {
      console.error("Failed to generate examples:", error);
      alert(`Failed to generate examples: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGeneratingExamples(false);
    }
  };

  const handleAddExample = () => {
    if (newExample.trim()) {
      const newExampleText = newExample.trim();
      setExamples(prev => [...prev, newExampleText]);
      // Select newly added example by default
      setSelectedExamples(prev => new Set([...prev, newExampleText]));
      setNewExample("");
    }
  };

  const handleToggleExample = (example: string) => {
    setSelectedExamples(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(example)) {
        newSelected.delete(example);
      } else {
        newSelected.add(example);
      }
      return newSelected;
    });
  };

  const handleSaveExamples = () => {
    // Only keep the selected examples
    const selectedExamplesArray = Array.from(selectedExamples);
    const updatedProperty = { ...property, examples: selectedExamplesArray, updatedAt: Date.now() };
    onUpdateProperty(updatedProperty);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="modal-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
      }}
    >
      <div 
        className="bg-white rounded-lg border-2 border-gray-300 shadow-lg flex flex-col"
        style={{
          width: '100%',
          maxWidth: '400px',
          maxHeight: '80vh',
          margin: '0 12px',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-sm font-semibold text-gray-900">"{property.name}" options</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors text-lg leading-none"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-3 flex-shrink-0">
          {(["examples", "nested"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-2 py-1.5 text-xs font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab === "nested" ? "Nested" : "Examples"}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto min-h-0 p-3">
          {activeTab === "examples" && (
            <div className="space-y-2">
              {!hasPropertyValue && (
                <div className="px-2 py-1.5 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                  ⚠️ Set a property value first to generate examples.
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newExample}
                  onChange={(e) => setNewExample(e.target.value)}
                  placeholder="Add example..."
                  className="flex-1 min-w-0 border border-gray-300 rounded-lg px-2 py-1.5 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddExample();
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddExample}
                  disabled={!newExample.trim()}
                  className="flex-shrink-0 px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={handleGenerateExamples}
                  disabled={isGeneratingExamples || !hasPropertyValue}
                  className="flex-shrink-0 p-1.5 border border-gray-300 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 hover:border-amber-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title={!hasPropertyValue ? "Please provide a value for this property first" : "Generate examples with AI"}
                  aria-label="Generate examples with AI"
                >
                  {isGeneratingExamples ? (
                    <div className="w-4 h-4 border-2 border-amber-300 border-t-amber-600 rounded-full animate-spin" />
                  ) : (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z" />
                    </svg>
                  )}
                </button>
              </div>

              {examples.length > 0 && (
                <div className="flex items-center justify-between px-2 py-1.5 bg-gray-50 rounded border border-gray-200">
                  <span className="text-xs text-gray-600">
                    {selectedExamples.size}/{examples.length} selected
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedExamples(new Set(examples))}
                      disabled={selectedExamples.size === examples.length}
                      className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-md hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium border border-green-200"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedExamples(new Set())}
                      disabled={selectedExamples.size === 0}
                      className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium border border-gray-200"
                    >
                      Unselect All
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                {examples.map((example, index) => (
                  <div 
                    key={index} 
                    className={`flex items-center justify-between rounded border px-2 py-1.5 cursor-pointer transition-colors ${
                      selectedExamples.has(example)
                        ? "bg-blue-50 border-blue-200"
                        : "bg-gray-50 border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => handleToggleExample(example)}
                  >
                    <span className="text-xs text-gray-900 flex-1">{example}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                        selectedExamples.has(example)
                          ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-500"
                      }`}>
                        {selectedExamples.has(example) ? "Selected" : "Click to select"}
                      </span>
                    </div>
                  </div>
                ))}
                {examples.length === 0 && (
                  <p className="text-gray-500 text-xs text-center py-2">
                    No examples. Add manually or use AI (💡).
                  </p>
                )}
              </div>
            </div>
          )}

          {activeTab === "nested" && (
            <div className="space-y-2">
              <button 
                onClick={() => {
                  if (onCreateEmbeddedObject) {
                    onCreateEmbeddedObject(property.id, currentOOP.id);
                    onClose();
                  }
                }}
                className="w-full text-left px-2 py-1.5 border-2 border-blue-200 bg-blue-50 rounded hover:bg-blue-100 hover:border-blue-300 transition-colors flex items-center gap-2"
              >
                <span className="text-base">➕</span>
                <span className="text-xs font-medium text-blue-900">Create New Object</span>
              </button>
              
              <div className="relative py-0.5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center">
                  <span className="px-2 bg-white text-gray-500 text-xs">or</span>
                </div>
              </div>
              
              {latestObjects.length > 0 ? (
                <div className="space-y-1">
                  <h4 className="text-[11px] font-medium text-gray-600 uppercase tracking-wide">Existing objects</h4>
                  <div className="max-h-40 overflow-y-auto space-y-1 border border-gray-200 rounded p-1.5">
                    {latestObjects.map((obj) => (
                      <button
                        key={obj.id}
                        onClick={() => {
                          if (onEmbedExistingObject) {
                            onEmbedExistingObject(property.id, obj.id, obj.name || obj.main_task || 'Untitled Object');
                            onClose();
                          }
                        }}
                        className="w-full text-left px-2 py-1.5 border border-transparent rounded hover:bg-gray-50 hover:border-gray-200 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm">📄</span>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-medium text-gray-900 truncate">
                              {obj.main_task || obj.name || 'Untitled Object'}
                            </div>
                            <div className="text-[11px] text-gray-500">
                              {obj.properties.length} properties · {new Date(obj.updatedAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-xs text-center py-2">No other objects to nest.</p>
              )}

              <div className="flex gap-2 pt-2 border-t border-gray-200">
                <button
                  onClick={onClose}
                  className="px-3 py-1.5 border border-gray-300 bg-white hover:bg-gray-50 text-gray-900 text-xs rounded transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {activeTab === "examples" && (
          <div className="flex gap-2 px-3 py-2 border-t border-gray-200 flex-shrink-0">
            <button
              onClick={handleSaveExamples}
              disabled={selectedExamples.size === 0}
              className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Save{selectedExamples.size > 0 ? ` (${selectedExamples.size})` : ''}
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1.5 border border-gray-300 bg-white hover:bg-gray-50 text-gray-900 text-xs rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
