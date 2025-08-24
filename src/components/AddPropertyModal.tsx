import { useState } from "react";
import type { Property, Importance } from "../types";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (property: Property) => void;
};

export function AddPropertyModal({ isOpen, onClose, onAdd }: Props) {
  const [mode, setMode] = useState<"structured" | "unstructured">("structured");
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [importance, setImportance] = useState<Importance>("normal");
  const [unstructuredText, setUnstructuredText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleStructuredSubmit = () => {
    if (name.trim() && value.trim()) {
      const property: Property = {
        id: `p${Date.now()}`,
        name: name.trim(),
        value: value.trim(),
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
        // Simulate AI suggestion - in real app this would call an LLM
        const suggestedProperty: Property = {
          id: `p${Date.now()}`,
          name: "Suggested Property",
          value: unstructuredText.trim(),
          importance: "normal",
          source: "ai-suggested",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        onAdd(suggestedProperty);
        onClose();
        setUnstructuredText("");
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
            Structured
          </button>
          <button
            onClick={() => setMode("unstructured")}
            className={`flex-1 px-3 py-2 text-sm transition-colors ${
              mode === "unstructured"
                ? "modal-selected"
                : "modal-unselected"
            }`}
          >
            Unstructured
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
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-gray-900 placeholder:text-gray-500"
                placeholder="Property value"
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
                disabled={!name.trim() || !value.trim()}
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
                Describe the property you want to add
              </label>
              <textarea
                value={unstructuredText}
                onChange={(e) => setUnstructuredText(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 h-24 resize-none text-gray-900 placeholder:text-gray-500"
                placeholder="e.g., The story should have a mysterious tone that builds suspense..."
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
                {isGenerating ? "Generating..." : "Generate & Add"}
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
