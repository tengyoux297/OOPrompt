import { useState } from "react";
import type { Property, OOPromptObject } from "../types";
import { llmService } from "../services/llmService";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (property: Property) => void;
  currentOOP: OOPromptObject;
  onUpdateOOP: (updatedOOP: OOPromptObject) => void;
};

export function AddPropertyModal({ isOpen, onClose, onAdd, currentOOP, onUpdateOOP }: Props) {
  const [mode, setMode] = useState<"structured" | "unstructured">("structured");
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [unstructuredText, setUnstructuredText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleStructuredSubmit = () => {
    if (name.trim()) {
      const property: Property = {
        id: `p${Date.now()}`,
        name: name.trim(),
        value: value.trim(),
        emphasis: "normal",
        source: "user",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      onAdd(property);
      onClose();
      setName("");
      setValue("");
    }
  };

  const handleUnstructuredSubmit = async () => {
    if (unstructuredText.trim()) {
      setIsGenerating(true);
      try {
        console.log('=== Unstructured Property Submission ===');
        console.log('Free text:', unstructuredText.trim());
        console.log('Current OOP object:', currentOOP);
        
        // Use the LLM service to merge free text with current OOP object
        const updatedOOP = await llmService.mergeFreeTextWithOOP(
          unstructuredText.trim(), 
          currentOOP
        );
        
        console.log('Updated OOP object received:', updatedOOP);
        
        // Update the OOP object with the merged result
        onUpdateOOP(updatedOOP);
        
        // Close the modal and reset form
        onClose();
        setUnstructuredText("");
        
        console.log('=== Unstructured Property Submission Completed ===');
      } catch (error) {
        console.error('Failed to merge free text with OOP object:', error);
        // TODO: Show error message to user
        alert(`Failed to process your request: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setIsGenerating(false);
      }
    }
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
        className="modal-content bg-white rounded-lg p-3 sm:p-4 w-full max-w-md mx-4 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-gray-900">Add Property</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors text-lg leading-none"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        <div className="flex mb-3 border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setMode("structured")}
            className={`flex-1 px-2.5 py-1.5 text-xs transition-colors ${
              mode === "structured"
                ? "modal-selected font-semibold"
                : "modal-unselected font-medium text-gray-600"
            }`}
          >
            Name & value
          </button>
          <button
            onClick={() => setMode("unstructured")}
            className={`flex-1 px-2.5 py-1.5 text-xs transition-colors ${
              mode === "unstructured"
                ? "modal-selected font-semibold"
                : "modal-unselected font-medium text-gray-600"
            }`}
          >
            Free text
          </button>
        </div>

        {mode === "structured" ? (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-900 mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm text-gray-900 placeholder:text-gray-400"
                placeholder="Property name"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleStructuredSubmit();
                  if (e.key === "Escape") onClose();
                }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-900 mb-1">Value</label>
              <input
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 placeholder:text-xs"
                placeholder="Optional"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleStructuredSubmit();
                  if (e.key === "Escape") onClose();
                }}
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleStructuredSubmit}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
                disabled={!name.trim()}
              >
                Add
              </button>
              <button
                onClick={onClose}
                className="px-3 py-1.5 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-900 mb-1">Free text</label>
              <textarea
                value={unstructuredText}
                onChange={(e) => setUnstructuredText(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 h-20 resize-none text-sm text-gray-900 placeholder:text-gray-400 placeholder:italic placeholder:text-xs"
                placeholder="e.g., The story should have a mysterious tone that builds suspense, or add a requirement for the protagonist to have a specific background..."
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.ctrlKey) handleUnstructuredSubmit();
                  if (e.key === "Escape") onClose();
                }}
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleUnstructuredSubmit}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
                disabled={!unstructuredText.trim() || isGenerating}
              >
                {isGenerating ? "Adding…" : "Add"}
              </button>
              <button
                onClick={onClose}
                className="px-3 py-1.5 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
