import type { Suggestion, Conflict } from "../types";

type Props = {
  suggestions: Suggestion[];
  conflicts: Conflict[];
  isVisible: boolean;
  onAddSuggestion: (suggestion: Suggestion) => void;
  onDismissSuggestion: (suggestion: Suggestion) => void;
  onResolveConflict: (conflict: Conflict) => void;
  onHide: () => void;
};

export function SuggestionsBanner({
  suggestions,
  conflicts,
  isVisible,
  onAddSuggestion,
  onDismissSuggestion,
  onResolveConflict,
  onHide,
}: Props) {
  if (!isVisible || (suggestions.length === 0 && conflicts.length === 0)) {
    return null;
  }

  return (
    <div className="border-b border-divider bg-amber-50 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm text-text-onLight">AI Suggestions & Conflicts</h3>
        <button
          onClick={onHide}
          className="text-sm text-text-onLight/60 hover:text-text-onLight/80 transition-colors"
          aria-label="Hide suggestions"
        >
          Hide
        </button>
      </div>

      {/* Suggested Properties */}
      {suggestions.length > 0 && (
        <div className="mb-3">
          <h4 className="text-sm font-medium mb-2 text-intent-success">Suggested Properties</h4>
          <div className="space-y-2">
            {suggestions.map((suggestion, index) => (
              <div key={index} className="flex items-center justify-between bg-white rounded-xl border border-divider p-3 shadow-xs">
                <div className="flex-1">
                  <div className="font-medium text-sm text-text-onLight">{suggestion.name}</div>
                  <div className="text-sm text-text-onLight/60">{suggestion.value}</div>
                </div>
                <div className="flex gap-2 ml-3">
                  <button
                    onClick={() => onAddSuggestion(suggestion)}
                    className="px-3 py-1 bg-intent-success text-white text-xs rounded-xl hover:bg-intent-success/90 transition-colors"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => onDismissSuggestion(suggestion)}
                    className="px-3 py-1 bg-gray-300 text-text-onLight text-xs rounded-xl hover:bg-gray-400 transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Conflicts */}
      {conflicts.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2 text-intent-danger">Conflicts to Resolve</h4>
          <div className="space-y-2">
            {conflicts.map((conflict, index) => (
              <div key={index} className="flex items-center justify-between bg-white rounded-xl border border-divider p-3 shadow-xs">
                <div className="flex-1">
                  <div className="font-medium text-sm text-text-onLight">{conflict.name}</div>
                  <div className="text-sm text-text-onLight/60">
                    <span className="text-intent-danger">{conflict.valueA}</span>
                    {" vs "}
                    <span className="text-intent-danger">{conflict.valueB}</span>
                  </div>
                  <div className="text-xs text-text-onLight/50 mt-1">{conflict.reason}</div>
                </div>
                <button
                  onClick={() => onResolveConflict(conflict)}
                  className="px-3 py-1 bg-intent-danger text-white text-xs rounded-xl hover:bg-intent-danger/90 transition-colors ml-3"
                >
                  Resolve
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
