import { useState, useEffect, useMemo, useCallback } from "react";
import type { AppState, Action } from "../state/useOOPrompt";
import type { OOPromptObject, Property, Suggestion, Conflict, Emphasis } from "../types";
import { AddPropertyModal } from "./AddPropertyModal";
import { ConflictResolveModal } from "./ConflictResolveModal";
import { MoreOptionsModal } from "./MoreOptionsModal";
import { ObjectModifierModal } from "./ObjectModifierModal";
import { SuggestionsBanner } from "./SuggestionsBanner";
// import { suggest } from "../api"; // Deprecated - now using ObjectModifierModal
import { llmService } from "../services/llmService";
import { PatchService } from "../services/patchService";



const EMPHASIS_ORDER: Emphasis[] = ["normal", "important", "avoid"];

function EmphasisIcon({ emphasis }: { emphasis: Emphasis }) {
  if (emphasis === "important") {
    return (
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" aria-label="Important">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    );
  }
  if (emphasis === "avoid") {
    return (
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label="Avoid">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
      </svg>
    );
  }
  return (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label="Normal">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  );
}

function PropertyCard({ p, onSelect, isSelected, dispatch, selectedLLM }: { 
  p: Property; 
  onSelect: () => void; 
  isSelected: boolean;
  dispatch: React.Dispatch<Action>;
  selectedLLM: 'openai' | 'gemini' | 'claude';
}) {
  const base = "oop-property-card bg-white border border-gray-200 rounded px-2 py-1.5 w-full transition-all duration-200 hover:shadow-sm";
  const selectedStyle = isSelected ? "ring-1 ring-black ring-offset-1 shadow-md" : "";
  const isObjectRef = typeof p.value === "object" && p.value?.refObjectName;

  const cycleEmphasis = () => {
    const i = EMPHASIS_ORDER.indexOf(p.emphasis);
    const next = EMPHASIS_ORDER[(i + 1) % EMPHASIS_ORDER.length];
    dispatch({ type: "UPSERT_PROPERTY", payload: { ...p, emphasis: next, updatedAt: Date.now() } });
  };

  return (
    <div className="w-full">
      <div onClick={onSelect} className={`${base} ${selectedStyle}`}>
        <div className="grid grid-cols-[1fr_1fr_auto] gap-1.5 items-center">
          <div className="text-left min-w-0">
            <div className="oop-property-label text-[10px] text-gray-500 mb-0 leading-none">Name</div>
            <input
              type="text"
              className="oop-property-name w-full px-1 py-0.5 text-xs font-semibold text-gray-900 border border-transparent hover:border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-transparent leading-tight"
              defaultValue={p.name || ""}
              placeholder="No name"
              onClick={(e) => e.stopPropagation()}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v !== (p.name || "")) {
                  dispatch({ type: "UPSERT_PROPERTY", payload: { ...p, name: v || "Unnamed", updatedAt: Date.now() } });
                }
              }}
            />
          </div>
          <div className="text-left min-w-0">
            <div className="oop-property-label text-[10px] text-gray-500 mb-0 leading-none">Value</div>
            {isObjectRef ? (
              <div className="oop-property-value text-xs text-blue-600 font-medium py-0.5 px-1 leading-tight">
                <span className="text-blue-500 font-semibold">object:</span> {(p.value as { refObjectName: string }).refObjectName}
              </div>
            ) : (
              <input
                type="text"
                className="oop-property-value w-full px-1 py-0.5 text-xs text-gray-700 border border-transparent hover:border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-transparent leading-tight"
                defaultValue={typeof p.value === "string" ? (p.value || "") : ""}
                placeholder="To be added..."
                onClick={(e) => e.stopPropagation()}
                onBlur={(e) => {
                  const nextVal = e.target.value;
                  if (nextVal !== (typeof p.value === "string" ? p.value : "")) {
                    dispatch({ type: "UPSERT_PROPERTY", payload: { ...p, value: nextVal, updatedAt: Date.now() } });
                  }
                }}
              />
            )}
          </div>
          <div className="flex flex-col items-center gap-px">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); cycleEmphasis(); }}
              className={`p-0.5 rounded transition-colors ${
                p.emphasis === "important" ? "text-amber-500 hover:bg-amber-50" :
                p.emphasis === "avoid" ? "text-red-500 hover:bg-red-50" :
                "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              }`}
              title={p.emphasis === "important" ? "Important" : p.emphasis === "avoid" ? "Avoid" : "Normal"}
              aria-label={`Emphasis: ${p.emphasis}. Click to cycle.`}
            >
              <EmphasisIcon emphasis={p.emphasis} />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); dispatch({ type: "OPEN_MODAL", modal: "more-options", data: p }); }}
              className="p-0.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
              aria-label="More options"
              title="More options"
            >
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (confirm(`Are you sure you want to delete "${p.name}"?`)) {
                  dispatch({ type: "DELETE_PROPERTY", id: p.id });
                }
              }}
              className="p-0.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
              aria-label="Delete property"
              title="Delete property"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
        
        {p.fileReference && selectedLLM === 'openai' && (
          <div className="mt-1 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <span className="text-green-600 text-[10px] font-medium bg-green-50 px-1.5 py-0.5 rounded border border-green-200">
              📎 {p.fileReference.fileName}
            </span>
            <button
              type="button"
              className="text-green-600 hover:text-green-700 text-[10px]"
              onClick={async () => {
                try {
                  const { fileStorageService } = await import("../services/fileStorageService");
                  await fileStorageService.downloadFile(p.fileReference!);
                } catch (error) {
                  alert(`Failed to download file: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
              }}
              title="Download file"
            >
              ⬇️
            </button>
          </div>
        )}
        
        {p.fileReference && (selectedLLM === 'gemini' || selectedLLM === 'claude') && (
          <div className="mt-1 flex items-center gap-1">
            <span className="text-amber-600 text-[10px] font-medium bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
              📎 {p.fileReference.fileName} (Not supported by {selectedLLM.charAt(0).toUpperCase() + selectedLLM.slice(1)})
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export function OOPromptPanel({
  state, dispatch, onSendMessage: _onSendMessage, onCreateEmbeddedObject, onEmbedExistingObject, selectedLLM, onError
}: { 
  state: AppState; 
  dispatch: React.Dispatch<Action>;
  onSendMessage?: (message: string) => void;
  onCreateEmbeddedObject?: (propertyId: string, parentObjectId: string) => void;
  onEmbedExistingObject?: (propertyId: string, objectId: string, objectName: string) => void;
  selectedLLM: 'openai' | 'gemini' | 'claude';
  onError?: (title: string, message: string) => void;
}) {
  const [showSuccess, setShowSuccess] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const { oop, selectedPropertyId, suggestions, modal } = state;
  const searchTerm = "";
  const sortBy: "none" | "emphasis" | "name" | "time" = "none";
  const [isSending, setIsSending] = useState(false);
  const [sendStatus, setSendStatus] = useState<'idle' | 'building' | 'sending'>('idle');
  const [builtPrompt, setBuiltPrompt] = useState<string | null>(null);
  const [isPromptPanelExpanded, setIsPromptPanelExpanded] = useState(true);
  
  // Local state for main task and audience inputs to make them controlled
  const [mainTask, setMainTask] = useState(oop.main_task || "");
  const [audience, setAudience] = useState(oop.audience || "");

  // Sync local state when oop object changes (e.g., when switching objects)
  useEffect(() => {
    setMainTask(oop.main_task || "");
    setAudience(oop.audience || "");
  }, [oop.id, oop.main_task, oop.audience]);

  // Clear built prompt when switching or creating a new object so the previous object's prompt doesn't persist
  useEffect(() => {
    setBuiltPrompt(null);
  }, [oop.id]);

  // Filter properties based on search term - memoized for performance
  const filtered = useMemo(() => {
    return (oop?.properties || []).filter((p: Property) => {
      try {
        if (!p || !p.name) return false;
        return p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (typeof p.value === "string" && p.value.toLowerCase().includes(searchTerm.toLowerCase()));
      } catch (error) {
        console.error('Error filtering property:', error, p);
        return false;
      }
    });
  }, [oop?.properties, searchTerm]);

  // Sort properties: emphasis (important→normal→avoid), then createdAt, then alphabetical
  // Use useMemo to avoid minification issues and improve performance
  const sorted = useMemo(() => {
    // Get emphasis order for sorting: important=0, normal=1, avoid=2
    const getEmphasisOrder = (emphasis: string) => {
      switch (emphasis) {
        case "important": 
          return 0;
        case "normal": 
          return 1;
        case "avoid": 
          return 2;
        default: 
          return 1; // default to normal
      }
    };

    try {
      const sortedArray = [...filtered];
      
      sortedArray.sort((propA: Property, propB: Property) => {
        // Primary: emphasis order (important=0, normal=1, avoid=2)
        const emphasisA = getEmphasisOrder(propA.emphasis);
        const emphasisB = getEmphasisOrder(propB.emphasis);
        if (emphasisA !== emphasisB) {
          return emphasisA - emphasisB;
        }
        
        // Secondary: creation time (oldest first)
        const timeA = propA.createdAt ?? 0;
        const timeB = propB.createdAt ?? 0;
        if (timeA !== timeB) {
          return timeA - timeB;
        }
        
        // Tertiary: alphabetical by name
        return (propA.name || "").localeCompare(propB.name || "");
      });
      
      return sortedArray;
    } catch (error) {
      console.error('Error during sorting:', error);
      return filtered; // Fallback to unsorted on error
    }
  }, [filtered]);

  // Debug: Log current state whenever it changes
  useEffect(() => {
    console.log('=== Current JSON Object State ===');
    console.log(JSON.stringify(state.oop, null, 2));
    console.log('=== Properties Debug ===', { 
      allProperties: oop.properties, 
      filtered, 
      sorted, 
      selectedPropertyId,
      propertiesCount: oop.properties.length,
      sortBy,
      sortByType: typeof sortBy
    });
    console.log('=== Sorting Debug ===', {
      sortBy,
      filteredCount: filtered.length,
      sortedCount: sorted.length,
      firstProperty: filtered[0] ? { name: filtered[0].name, emphasis: filtered[0].emphasis, createdAt: filtered[0].createdAt, updatedAt: filtered[0].updatedAt } : null
    });
    console.log('================================');
  }, [state.oop, oop.properties, filtered, sorted, selectedPropertyId, sortBy]);



  // Auto-open Object Panel when OOP panel is displayed (if there are saved objects)
  useEffect(() => {
    if (state.openPanel && state.promptObjects.length > 0) {
      console.log('=== Auto-Opening Object Panel ===');
      console.log('OOP panel is open, promptObjects count:', state.promptObjects.length);
      dispatch({ type: "TOGGLE_OBJECT_PANEL", open: true });
      console.log('=== Object Panel Auto-Opened ===');
    }
  }, [state.openPanel, state.promptObjects.length, dispatch]);



  const handleAddProperty = useCallback((property: Property) => {
    dispatch({ type: "UPSERT_PROPERTY", payload: property });
    dispatch({ type: "CLOSE_MODAL" });
    
    // Debug: Log current state after adding property
    setTimeout(() => {
      console.log('=== Current JSON Object After Adding Property ===');
      console.log(JSON.stringify(state.oop, null, 2));
      console.log('===============================================');
    }, 100);
  }, [dispatch, state.oop]);

  // handleAISuggestion is deprecated - now using ObjectModifierModal
  // const handleAISuggestion = async () => { ... };

  const handleAddSuggestion = useCallback((suggestion: Suggestion) => {
    const property: Property = {
      id: `p${Date.now()}`,
      name: suggestion.name,
      value: suggestion.value,
      emphasis: "normal",
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
  }, [dispatch, suggestions]);

  const handleDismissSuggestion = useCallback((suggestion: Suggestion) => {
    const newSuggested = suggestions.suggested.filter((s: Suggestion) => 
      s.name !== suggestion.name || s.value !== suggestion.value
    );
    dispatch({ 
      type: "SET_SUGGESTIONS", 
      payload: { ...suggestions, suggested: newSuggested } 
    });
  }, [dispatch, suggestions]);

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

  console.log('=== OOPromptPanel Render ===');
  
  // Safety check for oop object
  if (!oop) {
    console.warn('Invalid oop object:', oop);
    return null;
  }
  
  // Ensure properties is an array, but don't fail if it's empty
  if (!Array.isArray(oop.properties)) {
    console.warn('Properties is not an array, converting to empty array:', oop.properties);
    oop.properties = [];
  }
  
  return (
    <div className="h-full w-full flex flex-col bg-white">
      {/* Fixed height container with flexbox layout */}
      <div className="flex flex-col h-full">
        {/* Header: Main Task, Audience, actions */}
        <div className="panel-chrome px-2.5 py-2 flex-shrink-0 border-b border-gray-200">
          <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 mb-1.5">
            <div>
              <label className="block text-[10px] font-medium text-gray-600 mb-0.5">Main Task</label>
              <input
                className="input text-xs w-full"
                placeholder="What do you want to accomplish?"
                value={mainTask}
                onChange={(e) => setMainTask(e.target.value)}
                onBlur={(e) => {
                  const v = e.target.value;
                  if (v !== (oop.main_task || "")) {
                    dispatch({ type: "PATCH_OOP", payload: { main_task: v } });
                  }
                }}
              />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-gray-600 mb-0.5">Audience</label>
              <input
                className="input text-xs w-full"
                placeholder="Who is this for?"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                onBlur={(e) => {
                  const v = e.target.value;
                  if (v !== (oop.audience || "")) {
                    dispatch({ type: "PATCH_OOP", payload: { audience: v } });
                  }
                }}
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-1 flex-wrap">
            {/* SAVE Button - Save prompt object to history */}
            <button
              onClick={() => {
                const objectToSave: OOPromptObject = {
                  ...oop,
                  id: oop.id === 'root' ? `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` : oop.id,
                  name: oop.name || oop.main_task || `Prompt Object ${Date.now()}`,
                  createdAt: oop.id === 'root' ? Date.now() : oop.createdAt || Date.now(),
                  updatedAt: Date.now()
                };
                console.log('Saving prompt object to history:', objectToSave.id);
                dispatch({ type: "SAVE_PROMPT_OBJECT", payload: objectToSave });
                
                // Show success feedback
                setShowSaveSuccess(true);
                setTimeout(() => {
                  setShowSaveSuccess(false);
                }, 2000);
              }}
              className="px-1.5 py-0.5 text-[10px] font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors flex items-center gap-1 relative"
              title="Save prompt object to history"
            >
              {showSaveSuccess ? (
                <svg className="w-3 h-3 text-green-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              )}
              <span>{showSaveSuccess ? 'Saved!' : 'SAVE'}</span>
            </button>
            <button
              onClick={() => dispatch({ type: "OPEN_MODAL", modal: "object-modifier" })}
              className="px-1.5 py-0.5 text-[10px] font-medium text-yellow-800 bg-yellow-100 border border-yellow-300 rounded hover:bg-yellow-200 transition-colors flex items-center gap-1"
              title="Add AI Suggestions"
            >
              <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 12l10 10 10-10L12 2z" />
              </svg>
              <span>AI SUGGESTIONS</span>
            </button>
            <button
              onClick={() => dispatch({ type: "OPEN_MODAL", modal: "add-property" })}
              className="px-1.5 py-0.5 text-[10px] font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors flex items-center gap-1"
              title="Add Property"
            >
              <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>ADD PROPERTY</span>
            </button>
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


        {/* Properties area */}
        <div className="flex-1 min-h-0 overflow-y-auto bg-gray-50/30">
          <div className="p-2">
            <div className="space-y-1">
                {sorted.map((p: Property) => {
                  try {
                    if (!p || !p.id || !p.name) {
                      console.warn('Invalid property found:', p);
                      return null;
                    }
                    
                    const isSelected = p.id === selectedPropertyId;
                    console.log(`Property ${p.id}: name="${p.name}", isSelected=${isSelected}, selectedPropertyId=${selectedPropertyId}, value="${p.value}"`);
                    return (
                      <PropertyCard
                        key={p.id}
                        p={p}
                        isSelected={isSelected}
                        selectedLLM={selectedLLM}
                        onSelect={() => {
                          if (isSelected) {
                            dispatch({ type: "SELECT_PROPERTY", id: undefined });
                          } else {
                            dispatch({ type: "SELECT_PROPERTY", id: p.id });
                          }
                        }}
                        dispatch={dispatch}
                      />
                    );
                  } catch (error) {
                    console.error('Error rendering property:', error, p);
                    return null;
                  }
                })}
              
            </div>
          </div>
        </div>

        {/* Footer: built prompt + Build Prompt */}
        <div className="panel-chrome px-2 py-2 flex-shrink-0 border-t border-gray-200 bg-white space-y-1.5">
          {builtPrompt && !isSending && (
            <div className="space-y-1.5">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded p-2 shadow-sm">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-[10px]">✓</span>
                    </div>
                    <span className="text-green-800 font-semibold text-xs">Prompt Built Successfully</span>
                  </div>
                  <div className="flex items-center gap-0.5 flex-shrink-0" style={{ height: '1.25rem' }}>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          await navigator.clipboard.writeText(builtPrompt);
                          setShowSuccess(true);
                          setTimeout(() => setShowSuccess(false), 2000);
                        } catch {
                          if (onError) onError('Copy Failed', 'Could not copy prompt to clipboard.');
                        }
                      }}
                      className="p-0.5 text-green-700 hover:text-green-900 hover:bg-green-100/80 rounded transition-colors"
                      aria-label="Copy to clipboard"
                      title={showSuccess ? 'Copied!' : 'Copy to clipboard'}
                    >
                      {showSuccess ? (
                        <svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      )}
                    </button>
                    <button
                      onClick={() => setIsPromptPanelExpanded(!isPromptPanelExpanded)}
                      className="text-green-700 hover:text-green-900 transition-colors p-0.5"
                      aria-label={isPromptPanelExpanded ? "Collapse" : "Expand"}
                      title={isPromptPanelExpanded ? "Collapse" : "Expand"}
                    >
                      <svg
                        className={`w-3.5 h-3.5 transition-transform ${isPromptPanelExpanded ? '' : 'rotate-180'}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                </div>
                {isPromptPanelExpanded && (
                  <div className="bg-white rounded border border-green-200 p-1.5 max-h-[40vh] md:max-h-[50vh] overflow-y-auto text-xs text-gray-800 whitespace-pre-wrap font-mono leading-relaxed">
                    {builtPrompt}
                  </div>
                )}
              </div>
            </div>
          )}
          
          <button 
            className={`btn-primary w-full py-1.5 text-xs font-semibold shadow-md hover:shadow-lg transition-all ${isSending ? 'opacity-75 cursor-not-allowed' : ''}`}
            onClick={async () => {
              if (isSending) return; // Prevent multiple clicks
              
              console.log('=== Send Button Clicked ===');
              
              // Console output: Current JSON Prompt Object
              console.log('╔════════════════════════════════════════════════════════════════════════════════════╗');
              console.log('║                                CURRENT JSON PROMPT OBJECT                         ║');
              console.log('╚════════════════════════════════════════════════════════════════════════════════════╝');
              console.log(JSON.stringify(oop, null, 2));
              console.log('═══════════════════════════════════════════════════════════════════════════════════════');
              
              setIsSending(true);
              setSendStatus('building');
              
              try {
                // Step 1: Function to recursively resolve embedded objects and file references
                const resolveEmbeddedObjects = async (properties: Property[], depth = 0): Promise<Property[]> => {
                  if (depth > 10) { // Prevent infinite recursion
                    console.warn('Maximum embedding depth reached, stopping recursion');
                    return properties;
                  }
                  
                  const resolvedProperties = await Promise.all(properties.map(async (prop) => {
                    if (typeof prop.value === 'object' && prop.value?.refObjectId) {
                      // Find the referenced object (check both saved objects and current object)
                      const valueRef = prop.value as { refObjectId: string; refObjectName: string };
                      const referencedObject = state.promptObjects.find(obj => obj.id === valueRef.refObjectId) ||
                                               (state.oop.id === valueRef.refObjectId ? state.oop : null);
                      if (referencedObject) {
                        // Recursively resolve nested embedded objects
                        const resolvedNestedProperties = await resolveEmbeddedObjects(referencedObject.properties, depth + 1);
                        
                        return {
                          ...prop,
                          value: {
                            ...prop.value,
                            embeddedObject: {
                              main_task: referencedObject.main_task,
                              audience: referencedObject.audience,
                              properties: resolvedNestedProperties
                            }
                          }
                        };
                      }
                    }
                    return prop;
                  }));

                  return resolvedProperties;
                };

                // Step 1.5: Function to resolve file references to include actual file data
                const resolveFileReferences = async (properties: Property[]): Promise<Property[]> => {
                  const { fileStorageService } = await import("../services/fileStorageService");
                  
                  return Promise.all(properties.map(async (prop) => {
                    if (prop.fileReference) {
                      try {
                        // Get the actual file data from storage
                        const fileData = await fileStorageService.getFileData(prop.fileReference.id);
                        if (fileData) {
                          return {
                            ...prop,
                            fileData: {
                              fileName: prop.fileReference.fileName,
                              fileType: prop.fileReference.fileType,
                              fileSize: prop.fileReference.fileSize,
                              data: fileData.data
                            }
                          };
                        }
                      } catch (error) {
                        console.warn(`Failed to resolve file reference for property ${prop.name}:`, error);
                      }
                    }
                    return prop;
                  }));
                };

                const resolvedProperties = await resolveEmbeddedObjects(oop.properties);
                const propertiesWithFiles = await resolveFileReferences(resolvedProperties);

                const promptData: OOPromptObject = {
                  ...oop,
                  properties: propertiesWithFiles
                };
                console.log('Sending to PROMPT_BUILDER with resolved embedded objects:', promptData);
                
                // Step 2: Build the prompt (no API call)
                console.log('Building prompt with PROMPT_BUILDER assistant...');
                const prompt = await llmService.buildPromptWithAssistant(promptData);
                console.log('Built prompt:', prompt);
                
                // Store the built prompt and auto-copy to clipboard
                setBuiltPrompt(prompt);
                setIsPromptPanelExpanded(true); // Reset to expanded when new prompt is built
                try {
                  await navigator.clipboard.writeText(prompt);
                  setShowSuccess(true);
                  setTimeout(() => setShowSuccess(false), 2000);
                } catch {
                  // clipboard may be unavailable (e.g. non-HTTPS); ignore
                }
                _onSendMessage?.(prompt);
                
                // Console output: Final Prompt
                console.log('╔════════════════════════════════════════════════════════════════════════════════════╗');
                console.log('║                                  FINAL PROMPT BUILT                               ║');
                console.log('╚════════════════════════════════════════════════════════════════════════════════════╝');
                console.log(prompt);
                console.log('═══════════════════════════════════════════════════════════════════════════════════════');
                
                // Auto-save the current OOP object
                const objectToSave = {
                  ...oop,
                  id: oop.id === 'root' ? `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` : oop.id,
                  name: oop.name || `Prompt Object ${Date.now()}`,
                  createdAt: oop.id === 'root' ? Date.now() : oop.createdAt || Date.now(),
                  updatedAt: Date.now()
                };
                console.log('Auto-saving object with ID:', objectToSave.id);
                dispatch({ type: "SAVE_PROMPT_OBJECT", payload: objectToSave });
                console.log('=== OOP Object Auto-Saved ===');
                
              } catch (error) {
                console.error('Send process failed:', error);
                
                // Show error popup with appropriate message
                if (onError) {
                  let errorMessage = 'Unknown error occurred';
                  
                  if (error instanceof Error) {
                    if (error.message.includes('400')) {
                      errorMessage = `API Error (400): The request was invalid. This may be due to file upload issues or malformed data. Please try again or contact support if the problem persists.`;
                    } else if (error.message.includes('401') || error.message.includes('unauthorized')) {
                      errorMessage = `Authentication Error: Please check your API keys for ${selectedLLM.toUpperCase()} in the configuration.`;
                    } else if (error.message.includes('403') || error.message.includes('forbidden')) {
                      errorMessage = `Permission Error: Your ${selectedLLM.toUpperCase()} API key doesn't have permission for this operation.`;
                    } else if (error.message.includes('429') || error.message.includes('rate limit')) {
                      errorMessage = `Rate Limit Error: Too many requests to ${selectedLLM.toUpperCase()}. Please wait a moment and try again.`;
                    } else if (error.message.includes('500') || error.message.includes('502') || error.message.includes('503')) {
                      errorMessage = `Server Error: ${selectedLLM.toUpperCase()} service is temporarily unavailable. Please try again later.`;
                    } else if (error.message.includes('Failed to fetch') || error.message.includes('network')) {
                      errorMessage = `Network Error: Unable to connect to ${selectedLLM.toUpperCase()}. Please check your internet connection.`;
                    } else {
                      errorMessage = `${selectedLLM.toUpperCase()} Error: ${error.message}`;
                    }
                  }
                  
                  onError('Prompt Send Failed', errorMessage);
                }
              } finally {
                setIsSending(false);
                setSendStatus('idle');
              }
            }}
            disabled={isSending}
          >
            {isSending ? (
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>{sendStatus === 'sending' ? 'Sending...' : 'Building...'}</span>
              </div>
            ) : (
              'Build Prompt'
            )}
        </button>
        </div>
      </div>

      {/* Modals */}
      <AddPropertyModal
        isOpen={modal === "add-property"}
        onClose={() => dispatch({ type: "CLOSE_MODAL" })}
        onAdd={handleAddProperty}
        currentOOP={oop}
        onUpdateOOP={(updatedOOP) => {
          console.log('=== Updating OOP Object from AddPropertyModal ===');
          console.log('Previous OOP:', oop);
          console.log('Updated OOP:', updatedOOP);
          
          // Update the entire OOP object
          dispatch({ type: "SET_OOP", payload: updatedOOP });
          
          console.log('=== OOP Object Updated Successfully ===');
        }}
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
        currentOOP={oop}
        promptObjects={state.promptObjects}
        selectedLLM={selectedLLM}
        onClose={() => dispatch({ type: "CLOSE_MODAL" })}
        onUpdateProperty={(updatedProperty) => {
          dispatch({ type: "UPSERT_PROPERTY", payload: updatedProperty });
          dispatch({ type: "CLOSE_MODAL" });
        }}
        onCreateEmbeddedObject={(propertyId, parentObjectId) => {
          if (onCreateEmbeddedObject) {
            onCreateEmbeddedObject(propertyId, parentObjectId);
          } else {
            dispatch({ type: "CREATE_EMBEDDED_OBJECT", payload: { propertyId, parentObjectId } });
            dispatch({ type: "CLOSE_MODAL" });
            dispatch({ type: "TOGGLE_PANEL", open: true }); // Keep OOP panel open
          }
        }}
        onEmbedExistingObject={(propertyId, objectId, objectName) => {
          if (onEmbedExistingObject) {
            onEmbedExistingObject(propertyId, objectId, objectName);
          } else {
            dispatch({ type: "EMBED_EXISTING_OBJECT", payload: { propertyId, objectId, objectName } });
            dispatch({ type: "CLOSE_MODAL" });
            dispatch({ type: "TOGGLE_PANEL", open: true }); // Keep OOP panel open
          }
        }}
      />

      <ObjectModifierModal
        isOpen={modal === "object-modifier"}
        currentOOP={oop}
        onClose={() => dispatch({ type: "CLOSE_MODAL" })}
        onApplyPatches={(patches) => {
          console.log("🚀 OOPromptPanel: onApplyPatches called with patches:", patches);
          console.log("🚀 OOPromptPanel: Current oop object has", oop.properties.length, "properties");
          
          try {
            // Validate patches before applying
            console.log("🔍 OOPromptPanel: Validating patches...");
            const validationErrors = PatchService.validatePatches(oop, patches);
            if (validationErrors.length > 0) {
              console.error("❌ Patch validation failed:", validationErrors);
              if (onError) {
                onError("Patch Validation Failed", validationErrors.join("\n"));
              }
              return;
            }
            console.log("✅ Patch validation passed");

            // Apply patches to create updated OOP object
            console.log("🔧 OOPromptPanel: Applying patches...");
            const updatedOOP = PatchService.applyPatches(oop, patches);
            console.log("✅ OOPromptPanel: Patches applied, updated object has", updatedOOP.properties.length, "properties");
            
            // Update the OOP object with the patched version
            console.log("🔄 OOPromptPanel: Dispatching SET_OOP action...");
            dispatch({ type: "SET_OOP", payload: updatedOOP });
            
            console.log("=== Patches Applied Successfully ===");
            console.log("Applied patches:", patches);
            console.log("Previous OOP object state:", JSON.stringify(oop, null, 2));
            console.log("Updated OOP object state:", JSON.stringify(updatedOOP, null, 2));
            console.log("Changes summary:");
            console.log(`  - Properties count: ${oop.properties.length} → ${updatedOOP.properties.length}`);
            console.log(`  - Main task: "${oop.main_task}" → "${updatedOOP.main_task}"`);
            console.log(`  - Audience: "${oop.audience}" → "${updatedOOP.audience}"`);
            console.log("===================================");
            
            // Close the modal
            dispatch({ type: "CLOSE_MODAL" });
            
          } catch (error) {
            console.error("Failed to apply patches:", error);
            if (onError) {
              onError("Patch Application Failed", `Failed to apply patches: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }}
        onError={onError}
      />
    </div>
  );
}

