import { useState, useEffect } from "react";
import type { Property, OOPromptObject } from "../types";
import { generateExamples } from "../api";

type Props = {
  isOpen: boolean;
  property: Property;
  currentOOP: OOPromptObject; // Add current OOPrompt object
  onClose: () => void;
  onUpdateProperty: (updatedProperty: Property) => void;
};

export function MoreOptionsModal({ isOpen, property, currentOOP, onClose, onUpdateProperty }: Props) {
  const [activeTab, setActiveTab] = useState<"examples" | "references" | "upload">("examples");
  const [examples, setExamples] = useState<string[]>(property.examples || []);
  const [selectedExamples, setSelectedExamples] = useState<Set<string>>(new Set(property.examples || []));
  const [isGeneratingExamples, setIsGeneratingExamples] = useState(false);
  const [newExample, setNewExample] = useState("");

  // Initialize selected examples when property changes
  useEffect(() => {
    setExamples(property.examples || []);
    setSelectedExamples(new Set(property.examples || []));
  }, [property.examples]);

  const handleGenerateExamples = async () => {
    setIsGeneratingExamples(true);
    try {
      const result = await generateExamples({
        name: property.name,
        value: typeof property.value === "string" ? property.value : property.value.refObjectName
      }, currentOOP); // Pass the current OOPrompt object
      
      // Add new examples to the list but don't select them by default
      const newExamples = [...examples, ...result.examples];
      setExamples(newExamples);
      
      // Keep existing selections, don't auto-select new examples
      // Users will need to manually select which new examples they want to keep
    } catch (error) {
      console.error("Failed to generate examples:", error);
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
        className="modal-content"
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          width: '100%',
          maxWidth: '672px',
          maxHeight: '80vh',
          margin: '0 16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden'
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">More Options for "{property.name}"</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 mb-4">
          {(["examples", "references", "upload"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="overflow-y-auto max-h-[60vh]">
          {activeTab === "examples" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-md font-medium text-gray-900">Examples</h3>
                <button
                  onClick={handleGenerateExamples}
                  disabled={isGeneratingExamples}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {isGeneratingExamples ? "Generating..." : "Generate with AI"}
                </button>
              </div>

              {/* Add new example */}
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newExample}
                  onChange={(e) => setNewExample(e.target.value)}
                  placeholder="Add a new example..."
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddExample();
                  }}
                />
                <button
                  onClick={handleAddExample}
                  disabled={!newExample.trim()}
                  className="px-3 py-2 bg-green-600 text-white text-sm rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  Add
                </button>
              </div>

              {/* Examples list */}
              <div className="space-y-2">
                {examples.map((example, index) => (
                  <div 
                    key={index} 
                    className={`flex items-center justify-between rounded-xl border p-3 cursor-pointer transition-all duration-200 hover:shadow-md ${
                      selectedExamples.has(example)
                        ? "bg-blue-50 border-blue-200 ring-1 ring-blue-300"
                        : "bg-gray-50 border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => handleToggleExample(example)}
                  >
                    <span className="text-sm text-gray-900 flex-1">{example}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${
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
                  <p className="text-gray-500 text-sm text-center py-4">
                    No examples yet. Add some manually or generate with AI.
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <div className="flex-1 text-sm text-gray-600">
                  {examples.length > 0 && (
                    <span>
                      {selectedExamples.size} of {examples.length} examples selected
                    </span>
                  )}
                </div>
                <button
                  onClick={handleSaveExamples}
                  disabled={selectedExamples.size === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Save {selectedExamples.size > 0 ? `(${selectedExamples.size})` : ''} Examples
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-900 rounded-xl transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {activeTab === "references" && (
            <div className="space-y-4">
              <h3 className="text-md font-medium text-gray-900">Set Value from OOPrompt Object</h3>
              <p className="text-gray-500 text-sm">
                Choose an existing object or create a new one to reference.
              </p>
              
              <div className="space-y-3">
                <button className="w-full text-left p-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="font-medium text-gray-900">Select Existing Object</div>
                  <div className="text-sm text-gray-500">Choose from your existing OOPrompt objects</div>
                </button>
                
                <button className="w-full text-left p-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="font-medium text-gray-900">Create New Object</div>
                  <div className="text-sm text-gray-500">Create a new OOPrompt object to reference</div>
                </button>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-900 rounded-xl transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {activeTab === "upload" && (
            <div className="space-y-4">
              <h3 className="text-md font-medium text-gray-900">Upload Reference</h3>
              <p className="text-gray-500 text-sm">
                Upload a file or document to reference for this property.
              </p>
              
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center">
                <div className="text-gray-500">
                  <div className="text-lg mb-2">📁</div>
                  <div className="text-sm">Drag and drop files here, or click to browse</div>
                  <div className="text-xs text-gray-400 mt-1">Supports: PDF, DOC, TXT, Images</div>
                </div>
                <button className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors">
                  Browse Files
                </button>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-900 rounded-xl transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
