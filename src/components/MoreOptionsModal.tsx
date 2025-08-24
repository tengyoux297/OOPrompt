import { useState } from "react";
import type { Property } from "../types";
import { generateExamples } from "../api";

type Props = {
  isOpen: boolean;
  property: Property;
  onClose: () => void;
  onUpdateProperty: (updatedProperty: Property) => void;
};

export function MoreOptionsModal({ isOpen, property, onClose, onUpdateProperty }: Props) {
  const [activeTab, setActiveTab] = useState<"examples" | "references" | "upload">("examples");
  const [examples, setExamples] = useState<string[]>(property.examples || []);
  const [isGeneratingExamples, setIsGeneratingExamples] = useState(false);
  const [newExample, setNewExample] = useState("");

  const handleGenerateExamples = async () => {
    setIsGeneratingExamples(true);
    try {
      const result = await generateExamples({
        name: property.name,
        value: typeof property.value === "string" ? property.value : property.value.refObjectName
      });
      setExamples(prev => [...prev, ...result.examples]);
    } catch (error) {
      console.error("Failed to generate examples:", error);
    } finally {
      setIsGeneratingExamples(false);
    }
  };

  const handleAddExample = () => {
    if (newExample.trim()) {
      setExamples(prev => [...prev, newExample.trim()]);
      setNewExample("");
    }
  };

  const handleRemoveExample = (index: number) => {
    setExamples(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveExamples = () => {
    const updatedProperty = { ...property, examples, updatedAt: Date.now() };
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
          <h2 className="text-lg font-semibold text-text-onLight">More Options for "{property.name}"</h2>
          <button
            onClick={onClose}
            className="text-text-onLight/60 hover:text-text-onLight/80 transition-colors"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-divider mb-4">
          {(["examples", "references", "upload"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-brand-600 text-brand-600"
                  : "border-transparent text-text-onLight/60 hover:text-text-onLight/80"
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
                <h3 className="text-md font-medium text-text-onLight">Examples</h3>
                <button
                  onClick={handleGenerateExamples}
                  disabled={isGeneratingExamples}
                  className="px-3 py-1 bg-brand-600 text-white text-sm rounded-xl hover:bg-brand-700 disabled:opacity-50 transition-colors"
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
                  className="flex-1 border border-divider rounded-xl px-3 py-2 text-sm text-text-onLight placeholder:text-text-onLight/60"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddExample();
                  }}
                />
                <button
                  onClick={handleAddExample}
                  disabled={!newExample.trim()}
                  className="px-3 py-2 bg-intent-success text-white text-sm rounded-xl hover:bg-intent-success/90 disabled:opacity-50 transition-colors"
                >
                  Add
                </button>
              </div>

              {/* Examples list */}
              <div className="space-y-2">
                {examples.map((example, index) => (
                  <div key={index} className="flex items-center justify-between bg-panel rounded-xl border border-divider p-3">
                    <span className="text-sm text-text-onLight flex-1">{example}</span>
                    <button
                      onClick={() => handleRemoveExample(index)}
                      className="ml-3 text-intent-danger hover:text-intent-danger/80 text-sm transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                {examples.length === 0 && (
                  <p className="text-text-onLight/60 text-sm text-center py-4">
                    No examples yet. Add some manually or generate with AI.
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t border-divider">
                <button
                  onClick={handleSaveExamples}
                  className="px-4 py-2 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-colors"
                >
                  Save Examples
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-divider bg-white hover:bg-gray-50 text-text-onLight rounded-xl transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {activeTab === "references" && (
            <div className="space-y-4">
              <h3 className="text-md font-medium text-text-onLight">Set Value from OOPrompt Object</h3>
              <p className="text-text-onLight/60 text-sm">
                Choose an existing object or create a new one to reference.
              </p>
              
              <div className="space-y-3">
                <button className="w-full text-left p-3 border border-divider rounded-xl hover:bg-panel transition-colors">
                  <div className="font-medium text-text-onLight">Select Existing Object</div>
                  <div className="text-sm text-text-onLight/60">Choose from your existing OOPrompt objects</div>
                </button>
                
                <button className="w-full text-left p-3 border border-divider rounded-xl hover:bg-panel transition-colors">
                  <div className="font-medium text-text-onLight">Create New Object</div>
                  <div className="text-sm text-text-onLight/60">Create a new OOPrompt object to reference</div>
                </button>
              </div>

              <div className="flex gap-3 pt-4 border-t border-divider">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-divider bg-white hover:bg-gray-50 text-text-onLight rounded-xl transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {activeTab === "upload" && (
            <div className="space-y-4">
              <h3 className="text-md font-medium text-text-onLight">Upload Reference</h3>
              <p className="text-text-onLight/60 text-sm">
                Upload a file or document to reference for this property.
              </p>
              
              <div className="border-2 border-dashed border-divider rounded-xl p-6 text-center">
                <div className="text-text-onLight/60">
                  <div className="text-lg mb-2">📁</div>
                  <div className="text-sm">Drag and drop files here, or click to browse</div>
                  <div className="text-xs text-text-onLight/40 mt-1">Supports: PDF, DOC, TXT, Images</div>
                </div>
                <button className="mt-3 px-4 py-2 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-colors">
                  Browse Files
                </button>
              </div>

              <div className="flex gap-3 pt-4 border-t border-divider">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-divider bg-white hover:bg-gray-50 text-text-onLight rounded-xl transition-colors"
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
