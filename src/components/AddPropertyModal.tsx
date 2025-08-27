import { useState } from "react";
import type { Property, Importance, OOPromptObject } from "../types";
import { llmService } from "../services/llmService";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (property: Property) => void;
  currentOOP: OOPromptObject; // Current OOP object to merge with
  onUpdateOOP: (updatedOOP: OOPromptObject) => void; // Callback to update the OOP object
};

export function AddPropertyModal({ isOpen, onClose, onAdd, currentOOP, onUpdateOOP }: Props) {
  const [mode, setMode] = useState<"structured" | "unstructured">("structured");
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [importance, setImportance] = useState<Importance>("normal");
  const [unstructuredText, setUnstructuredText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleStructuredSubmit = () => {
    if (name.trim()) {
      const property: Property = {
        id: `p${Date.now()}`,
        name: name.trim(),
        value: value.trim(), // Allow empty values
        importance,
        source: "user",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      onAdd(property);
      onClose();
      setName("");
      setValue("");
      setImportance("normal");
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
        className="modal-content"
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          width: '100%',
          maxWidth: '448px',
          margin: '0 16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text-onLight">Add Property</h2>
          <button
            onClick={onClose}
            className="text-text-onLight/60 hover:text-text-onLight/80 transition-colors"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        {/* Mode selector */}
        <div className="flex mb-4 border border-gray-200 rounded-xl overflow-hidden">
          <button
            onClick={() => setMode("structured")}
            className={`flex-1 px-3 py-2 text-sm transition-colors ${
              mode === "structured"
                ? "modal-selected"
                : "modal-unselected"
            }`}
          >
            Add by name & value
          </button>
          <button
            onClick={() => setMode("unstructured")}
            className={`flex-1 px-3 py-2 text-sm transition-colors ${
              mode === "unstructured"
                ? "modal-selected"
                : "modal-unselected"
            }`}
          >
            Add by free text
          </button>
        </div>

        {mode === "structured" ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-gray-900 placeholder:text-gray-500"
                placeholder="Property name"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleStructuredSubmit();
                  if (e.key === "Escape") onClose();
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Value</label>
              <input
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-gray-900 placeholder:text-gray-500 placeholder:text-xs"
                placeholder="Enter value or leave blank to explore options later"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleStructuredSubmit();
                  if (e.key === "Escape") onClose();
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Importance</label>
              <div className="flex border border-gray-200 rounded-xl overflow-hidden">
                {(["highlight", "normal", "avoid"] as const).map((imp) => (
                  <button
                    key={imp}
                    onClick={() => setImportance(imp)}
                    className={`flex-1 px-3 py-2 text-sm capitalize transition-colors ${
                      importance === imp
                        ? "modal-selected"
                        : "modal-unselected"
                    }`}
                  >
                    {imp}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleStructuredSubmit}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-3 py-2 transition-colors"
                disabled={!name.trim()}
              >
                Add Property
              </button>
              <button
                onClick={onClose}
                className="px-3 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-900 rounded-xl transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">
                Describe new requirements or properties in natural language
              </label>
              <textarea
                value={unstructuredText}
                onChange={(e) => setUnstructuredText(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 h-24 resize-none text-gray-900 placeholder:text-gray-500"
                placeholder="e.g., The story should have a mysterious tone that builds suspense, or add a requirement for the protagonist to have a specific background..."
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.ctrlKey) handleUnstructuredSubmit();
                  if (e.key === "Escape") onClose();
                }}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleUnstructuredSubmit}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-3 py-2 transition-colors"
                disabled={!unstructuredText.trim() || isGenerating}
              >
                {isGenerating ? "Adding to prompt..." : "Add to prompt!"}
              </button>
              <button
                onClick={onClose}
                className="px-3 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-900 rounded-xl transition-colors"
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
