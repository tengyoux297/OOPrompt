import { useState } from "react";
import type { AppState, Action } from "../state/useOOPrompt";
import type { Importance, OOPromptObject, Property, Suggestion, Conflict } from "../types";
import { AddPropertyModal } from "./AddPropertyModal";
import { ConflictResolveModal } from "./ConflictResolveModal";
import { MoreOptionsModal } from "./MoreOptionsModal";
import { SuggestionsBanner } from "./SuggestionsBanner";
import { suggest } from "../api";

function ImportanceSegmented({
  value, onChange
}: { value: Importance; onChange: (v: Importance) => void }) {
  const opts: Importance[] = ["highlight", "normal", "avoid"];
  return (
    <div className="inline-flex items-center gap-0.5 p-0.5 rounded-2xl border border-divider bg-panel shadow-xs">
      {opts.map(o => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={
            "px-3 py-1 text-sm capitalize transition-colors " +
            (o === value 
              ? "bg-brand-600 text-white" 
              : "bg-transparent text-text-onLight hover:bg-white"
            )
          }
          aria-pressed={o === value}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function PropertyCard({ p, onSelect, isSelected }: { p: Property; onSelect: () => void; isSelected: boolean }) {
  
  // Map importance to the correct card styles using CSS custom properties
  const getCardStyle = () => {
    if (p.importance === "highlight") {
      return {
        backgroundColor: "var(--color-card-highlight)",
        borderColor: "var(--color-intent-warn)",
        color: "var(--color-text-onLight)"
      };
    } else if (p.importance === "avoid") {
      return {
        backgroundColor: "var(--color-card-avoid)",
        borderColor: "#1F2430",
        color: "var(--color-text-onDark)"
      };
    } else {
      return {
        backgroundColor: "var(--color-card-normal)",
        borderColor: "var(--color-divider)",
        color: "var(--color-text-onLight)"
      };
    }
  };

  const val = typeof p.value === "string" ? p.value : `[${p.value.refObjectName}]`;

  return (
    <button
      onClick={onSelect}
      style={{
        ...getCardStyle(),
        textAlign: 'left',
        border: '1px solid',
        borderRadius: 'var(--radius-2xl)',
        padding: '16px',
        transition: 'all 0.2s ease',
        cursor: 'pointer',
        boxShadow: 'var(--shadow-xs)',
        ...(isSelected && {
          borderColor: 'var(--color-brand-600)',
          borderWidth: '2px'
        })
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'var(--shadow-xs)';
      }}
      title="Open details"
    >
      <div style={{ fontSize: '12px', opacity: 0.6 }}>Property</div>
      <div style={{ fontWeight: 600, marginTop: '8px' }}>{p.name}</div>
      <div style={{ marginTop: '4px', fontSize: '14px', lineHeight: '20px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{val}</div>
      <div style={{ marginTop: '8px', fontSize: '12px', opacity: 0.7, textTransform: 'capitalize' }}>{p.importance}</div>
    </button>
  );
}

export function OOPromptPanel({
  state, dispatch
}: { state: AppState; dispatch: React.Dispatch<Action> }) {
  const { oop, selectedPropertyId, suggestions, modal } = state;
  const selected = oop.properties.find(p => p.id === selectedPropertyId);
  const [searchTerm, setSearchTerm] = useState("");

  // simple sort: highlight -> normal -> avoid -> updatedAt desc
  const order: Record<string, number> = { highlight: 0, normal: 1, avoid: 2 };
  const filtered = oop.properties.filter((p: Property) => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (typeof p.value === "string" && p.value.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  const sorted = [...filtered].sort((a: Property, b: Property) =>
    order[a.importance] - order[b.importance] ||
    (b.updatedAt ?? 0) - (a.updatedAt ?? 0)
  );

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

  const handleConflictResolution = (_resolution: "keepA" | "keepB" | "merge") => {
    // For now, just remove the conflict - in a real app you'd implement the resolution logic
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
    <aside className="border-l border-divider bg-panel max-w-[50vw]" style={{ width: "var(--panel-w)" }}>
      {/* Header with Brief (main_task / audience) */}
      <div className="sticky top-0 z-10 bg-panel/95 backdrop-blur border-b border-divider p-4">
        <div className="flex items-center justify-between">
          <div className="font-semibold text-text-onLight">OOPrompt</div>
          <button
            className="text-sm text-text-onLight hover:text-text-onLight/80 transition-colors"
            onClick={() => dispatch({ type: "TOGGLE_PANEL", open: false })}
          >
            Close ×
          </button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <input
            className="border border-divider rounded-xl px-3 py-2 text-sm bg-white text-text-onLight placeholder:text-text-onLight/60"
            placeholder="Main task"
            defaultValue={oop.main_task}
            onBlur={(e) => {
              const next: OOPromptObject = { ...oop, main_task: e.target.value };
              dispatch({ type: "SET_OOP", payload: next });
            }}
          />
          <input
            className="border border-divider rounded-xl px-3 py-2 text-sm bg-white text-text-onLight placeholder:text-text-onLight/60"
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
      <div className="sticky top-[72px] z-10 bg-panel/95 backdrop-blur border-b border-divider p-3 flex gap-2 items-center">
        <button 
          className="bg-brand-600 hover:bg-brand-700 text-white rounded-xl px-3 py-2 text-sm shadow-xs transition-colors"
          onClick={() => dispatch({ type: "OPEN_MODAL", modal: "add-property" })}
        >
          + Add Property
        </button>
        <input 
          className="border border-divider rounded-xl px-3 py-2 text-sm bg-white flex-1 text-text-onLight placeholder:text-text-onLight/60" 
          placeholder="Search properties…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button 
          className="border border-divider bg-white hover:bg-gray-50 rounded-xl px-3 py-2 text-sm transition-colors"
          onClick={handleAISuggestion}
        >
          AI Suggestion
        </button>
      </div>

      {/* Grid of read-only cards */}
      <div className="p-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {sorted.map((p: Property) => (
          <PropertyCard
            key={p.id}
            p={p}
            isSelected={p.id === selectedPropertyId}
            onSelect={() => dispatch({ type: "SELECT_PROPERTY", id: p.id })}
          />
        ))}
      </div>

      {/* Details panel */}
      <div className="border-t border-divider p-4 bg-white">
        <div className="text-sm font-semibold mb-3 text-text-onLight">Details</div>
        {!selected && <div className="text-sm text-text-onLight/60">Select a property to edit.</div>}
        {selected && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input
                className="border border-divider rounded-xl px-3 py-2 text-sm bg-white text-text-onLight"
                defaultValue={selected.name}
                onBlur={(e) =>
                  dispatch({
                    type: "UPSERT_PROPERTY",
                    payload: { ...selected, name: e.target.value, updatedAt: Date.now() },
                  })
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                  if (e.key === "Escape") e.currentTarget.value = selected.name;
                }}
              />
              <input
                className="border border-divider rounded-xl px-3 py-2 text-sm bg-white text-text-onLight"
                defaultValue={typeof selected.value === "string" ? selected.value : selected.value.refObjectName}
                onBlur={(e) => {
                  const nextVal = typeof selected.value === "string"
                    ? e.target.value
                    : { ...selected.value, refObjectName: e.target.value };
                  dispatch({
                    type: "UPSERT_PROPERTY",
                    payload: { ...selected, value: nextVal, updatedAt: Date.now() },
                  });
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                  if (e.key === "Escape") {
                    e.currentTarget.value = typeof selected.value === "string" ? selected.value : selected.value.refObjectName;
                  }
                }}
              />
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm text-text-onLight/70">Importance</span>
              <ImportanceSegmented
                value={selected.importance}
                onChange={(v) =>
                  dispatch({
                    type: "UPSERT_PROPERTY",
                    payload: { ...selected, importance: v, updatedAt: Date.now() },
                  })
                }
              />
            </div>

            <div className="flex gap-3">
              <button
                className="border border-[#FCA5A5] text-[#B91C1C] hover:bg-[#FEE2E2] rounded-xl px-3 py-2 text-sm transition-colors"
                onClick={() => dispatch({ type: "DELETE_PROPERTY", id: selected.id })}
              >
                Delete
              </button>
              <button 
                className="border border-divider bg-white hover:bg-gray-50 rounded-xl px-3 py-2 text-sm"
                onClick={() => dispatch({ type: "OPEN_MODAL", modal: "more-options", data: selected })}
              >
                More options…
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Undo/Redo */}
      <div className="p-4 flex gap-2">
        <button 
          className="border border-divider bg-white hover:bg-gray-50 rounded-xl px-3 py-2 text-sm" 
          onClick={() => dispatch({ type: "UNDO" })}
          disabled={state.past.length === 0}
        >
          Undo
        </button>
        <button 
          className="border border-divider bg-white hover:bg-gray-50 rounded-xl px-3 py-2 text-sm" 
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
