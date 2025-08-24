import { useState } from "react";
import type { AppState, Action } from "../state/useOOPrompt";
import type { Importance, OOPromptObject, Property, Suggestion, Conflict } from "../types";
import { AddPropertyModal } from "./AddPropertyModal";
import { ConflictResolveModal } from "./ConflictResolveModal";
import { MoreOptionsModal } from "./MoreOptionsModal";
import { SuggestionsBanner } from "./SuggestionsBanner";
import { BookmarkHandle } from "./BookmarkHandle";
import { suggest } from "../api";

function ImportanceSegmented({
  value, onChange
}: { value: Importance; onChange: (v: Importance) => void }) {
  const opts: Importance[] = ["highlight", "normal", "avoid"];
  return (
    <div className="segmented">
      {opts.map(o => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={"segmented-btn " + (o === value ? "segmented-on" : "segmented-off")}
          aria-pressed={o === value}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function PropertyCard({ p, onSelect, isSelected, onToggleDetails, dispatch }: { 
  p: Property; 
  onSelect: () => void; 
  isSelected: boolean;
  onToggleDetails: () => void;
  dispatch: React.Dispatch<Action>;
}) {
  
  const base = "card-base text-left p-4 w-full transition-all duration-200";
  const style =
    p.importance === "highlight" ? "card-highlight" :
    p.importance === "avoid"     ? "card-avoid"     :
                                   "";
  const selectedStyle = isSelected ? "ring-2 ring-blue-500 ring-offset-2 shadow-lg" : "";
  
  return (
    <div className="w-full">
      <button onClick={onSelect} className={`${base} ${style} ${selectedStyle}`}>
        <div className="text-xs opacity-60 truncate">Property</div>
        <div className="font-semibold mt-0.5 truncate" title={p.name}>{p.name}</div>
        <div className="mt-1.5 text-sm line-clamp-2 break-words">
          {typeof p.value === "string" ? p.value : `[${p.value.refObjectName}]`}
        </div>
        <div className="mt-2 text-xs opacity-70 capitalize truncate">{p.importance}</div>
      </button>
      
      {/* Expandable Details Panel */}
      {isSelected && (
        <div className="mt-3 overflow-hidden animate-slide-down">
          <div className="card-base bg-white/95 p-4 border-l-4 border-l-blue-500">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Property Details</h3>
              <button 
                onClick={onToggleDetails}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close details"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
                  <input
                    className="input text-sm"
                    defaultValue={p.name}
                    onBlur={(e) => {
                      dispatch({
                        type: "UPSERT_PROPERTY",
                        payload: { ...p, name: e.target.value, updatedAt: Date.now() },
                      });
                    }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Value</label>
                  <input
                    className="input text-sm"
                    defaultValue={typeof p.value === "string" ? p.value : p.value.refObjectName}
                    onBlur={(e) => {
                      const nextVal = typeof p.value === "string"
                        ? e.target.value
                        : { ...p.value, refObjectName: e.target.value };
                      dispatch({
                        type: "UPSERT_PROPERTY",
                        payload: { ...p, value: nextVal, updatedAt: Date.now() },
                      });
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-gray-600">Importance</span>
                <ImportanceSegmented
                  value={p.importance}
                  onChange={(v) => {
                    dispatch({
                      type: "UPSERT_PROPERTY",
                      payload: { ...p, importance: v, updatedAt: Date.now() },
                    });
                  }}
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-gray-100">
                <button 
                  className="btn-danger text-xs px-3 py-1.5"
                  onClick={() => dispatch({ type: "DELETE_PROPERTY", id: p.id })}
                >
                  Delete
                </button>
                <button 
                  className="btn-ghost text-xs px-3 py-1.5"
                  onClick={() => dispatch({ type: "OPEN_MODAL", modal: "more-options", data: p })}
                >
                  More options…
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function OOPromptPanel({
  state, dispatch
}: { state: AppState; dispatch: React.Dispatch<Action> }) {
  const { oop, selectedPropertyId, suggestions, modal } = state;
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"none" | "importance" | "name" | "time">("none");

  // Filter properties based on search term
  const filtered = oop.properties.filter((p: Property) => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (typeof p.value === "string" && p.value.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Sort properties based on user selection
  const sorted = [...filtered].sort((a: Property, b: Property) => {
    if (sortBy === "none") return 0; // No sorting, maintain original order
    
    if (sortBy === "importance") {
      const order: Record<string, number> = { highlight: 0, normal: 1, avoid: 2 };
      return order[a.importance] - order[b.importance] || (b.updatedAt ?? 0) - (a.updatedAt ?? 0);
    }
    
    if (sortBy === "name") {
      return a.name.localeCompare(b.name);
    }
    
    if (sortBy === "time") {
      return (b.createdAt ?? 0) - (a.createdAt ?? 0);
    }
    
    return 0;
  });

  // Cycle through sorting options
  const cycleSort = () => {
    const sortOptions: Array<"none" | "importance" | "name" | "time"> = ["none", "importance", "name", "time"];
    const currentIndex = sortOptions.indexOf(sortBy);
    const nextIndex = (currentIndex + 1) % sortOptions.length;
    setSortBy(sortOptions[nextIndex]);
  };



  const handleAddProperty = (property: Property) => {
    dispatch({ type: "UPSERT_PROPERTY", payload: property });
    dispatch({ type: "CLOSE_MODAL" });
  };

  const handleAISuggestion = async () => {
    try {
      const result = await suggest(
        oop.properties.map(p => ({ name: p.name, value: typeof p.value === "string" ? p.value : p.value.refObjectName })),
        oop.main_task,
        oop.audience
      );
      dispatch({ type: "SET_SUGGESTIONS", payload: result });
    } catch (error) {
      console.error("Failed to get AI suggestions:", error);
    }
  };

  const handleAddSuggestion = (suggestion: Suggestion) => {
    const property: Property = {
      id: `p${Date.now()}`,
      name: suggestion.name,
      value: suggestion.value,
      importance: "normal",
      source: "ai-suggested",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    dispatch({ type: "UPSERT_PROPERTY", payload: property });
    
    // Remove from suggestions

    const newSuggested = suggestions.suggested.filter((s: Suggestion) => 
      s.name !== suggestion.name || s.value !== suggestion.value
    );
    dispatch({ 
      type: "SET_SUGGESTIONS", 
      payload: { ...suggestions, suggested: newSuggested } 
    });
  };

  const handleDismissSuggestion = (suggestion: Suggestion) => {
    const newSuggested = suggestions.suggested.filter((s: Suggestion) => 
      s.name !== suggestion.name || s.value !== suggestion.value
    );
    dispatch({ 
      type: "SET_SUGGESTIONS", 
      payload: { ...suggestions, suggested: newSuggested } 
    });
  };

  const handleResolveConflict = (conflict: Conflict) => {
    dispatch({ type: "OPEN_MODAL", modal: "conflict-resolve", data: conflict });
  };

  const handleConflictResolution = (resolution: "keepA" | "keepB" | "merge") => {
    // For now, just remove the conflict - in a real app you'd implement the resolution logic
    // TODO: Implement resolution logic using the resolution parameter
    console.log("Resolution selected:", resolution); // Use the parameter to avoid linter warning
    const newConflicts = suggestions.conflicts.filter((c: Conflict) => 
      c.name !== (modal && typeof modal === 'object' && 'name' in modal ? (modal as Conflict).name : null)
    );
    dispatch({ 
      type: "SET_SUGGESTIONS", 
      payload: { ...suggestions, conflicts: newConflicts } 
    });
    dispatch({ type: "CLOSE_MODAL" });
  };

  return (
    <aside className="panel-shell max-w-[50vw] relative" style={{ width: "var(--panel-w)" }}>
      {/* Bookmark handle for closing panel */}
      <BookmarkHandle
        open={true}
        attachTo="panel-left"
        onClick={() => dispatch({ type: "TOGGLE_PANEL", open: false })}
      />
      
      {/* Header with Brief (main_task / audience) */}
      <div className="panel-chrome p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="font-semibold text-text-onLight">OOPrompt</div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <input
            className="input"
            placeholder="Main task"
            defaultValue={oop.main_task}
            onBlur={(e) => {
              const next: OOPromptObject = { ...oop, main_task: e.target.value };
              dispatch({ type: "SET_OOP", payload: next });
            }}
          />
          <input
            className="input"
            placeholder="Audience"
            defaultValue={oop.audience}
            onBlur={(e) => {
              const next: OOPromptObject = { ...oop, audience: e.target.value };
              dispatch({ type: "SET_OOP", payload: next });
            }}
          />
        </div>
      </div>

      {/* Suggestions Banner */}
      <SuggestionsBanner
        suggestions={suggestions.suggested}
        conflicts={suggestions.conflicts}
        isVisible={suggestions.isVisible}
        onAddSuggestion={handleAddSuggestion}
        onDismissSuggestion={handleDismissSuggestion}
        onResolveConflict={handleResolveConflict}
        onHide={() => dispatch({ type: "HIDE_SUGGESTIONS" })}
      />

      {/* Toolbar */}
      <div className="panel-chrome p-3 flex gap-2 items-center sticky top-[56px] z-10">
        <button 
          className="btn-primary w-10 h-10 flex items-center justify-center"
          onClick={() => dispatch({ type: "OPEN_MODAL", modal: "add-property" })}
          title="Add Property"
        >
          <span className="text-lg font-bold">+</span>
        </button>
        <button 
          className="btn-ghost w-10 h-10 flex items-center justify-center"
          onClick={cycleSort}
          title={`Current: ${sortBy === "none" ? "No Sorting" : sortBy === "importance" ? "Sorting by Importance" : sortBy === "name" ? "Sorting by Name" : "Sorting by Time"} | Click to cycle through options`}
        >
          <span className="text-sm">
            {sortBy === "none" && "🔀"}
            {sortBy === "importance" && "🎯"}
            {sortBy === "name" && "📝"}
            {sortBy === "time" && "🕒"}
          </span>
        </button>
        <button 
          className="btn-tonal w-10 h-10 flex items-center justify-center"
          onClick={handleAISuggestion}
          title="AI Suggestion"
        >
          <span className="text-sm">🤖</span>
        </button>
        <input 
          className="input flex-1 h-10" 
          placeholder="Search properties…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Grid of read-only cards */}
      <div className="p-4 grid gap-4 grid-cols-1">
        {sorted.map((p: Property) => (
          <PropertyCard
            key={p.id}
            p={p}
            isSelected={p.id === selectedPropertyId}
            onSelect={() => dispatch({ type: "SELECT_PROPERTY", id: p.id })}
            onToggleDetails={() => dispatch({ type: "SELECT_PROPERTY", id: undefined })}
            dispatch={dispatch}
          />
        ))}
      </div>

      

      {/* Undo/Redo */}
      <div className="p-4 flex gap-2">
        <button 
          className="btn-ghost" 
          onClick={() => dispatch({ type: "UNDO" })}
          disabled={state.past.length === 0}
        >
          Undo
        </button>
        <button 
          className="btn-ghost" 
          onClick={() => dispatch({ type: "REDO" })}
          disabled={state.future.length === 0}
        >
          Redo
        </button>
      </div>

      {/* Modals */}
      <AddPropertyModal
        isOpen={modal === "add-property"}
        onClose={() => dispatch({ type: "CLOSE_MODAL" })}
        onAdd={handleAddProperty}
      />

      <ConflictResolveModal
        isOpen={modal === "conflict-resolve"}
        conflict={modal === "conflict-resolve" ? (state.modalData as Conflict) : {} as Conflict}
        onResolve={handleConflictResolution}
        onClose={() => dispatch({ type: "CLOSE_MODAL" })}
      />

      <MoreOptionsModal
        isOpen={modal === "more-options"}
        property={modal === "more-options" ? (state.modalData as Property) : {} as Property}
        onClose={() => dispatch({ type: "CLOSE_MODAL" })}
        onUpdateProperty={(updatedProperty) => {
          dispatch({ type: "UPSERT_PROPERTY", payload: updatedProperty });
          dispatch({ type: "CLOSE_MODAL" });
        }}
      />
    </aside>
  );
}
