import { useState, useEffect } from "react";
import type { AppState, Action } from "../state/useOOPrompt";
import type { Importance, OOPromptObject, Property, Suggestion, Conflict } from "../types";
import { AddPropertyModal } from "./AddPropertyModal";
import { ConflictResolveModal } from "./ConflictResolveModal";
import { MoreOptionsModal } from "./MoreOptionsModal";
import { ObjectModifierModal } from "./ObjectModifierModal";
import { SuggestionsBanner } from "./SuggestionsBanner";
import { BookmarkHandle } from "./BookmarkHandle";
// import { suggest } from "../api"; // Deprecated - now using ObjectModifierModal
import { llmService } from "../services/llmService";
import type { FileAttachment } from "../services/llmService";
import { PatchService } from "../services/patchService";

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

function PropertyCard({ p, onSelect, isSelected, onToggleDetails, dispatch, selectedLLM }: { 
  p: Property; 
  onSelect: () => void; 
  isSelected: boolean;
  onToggleDetails: () => void;
  dispatch: React.Dispatch<Action>;
  selectedLLM: 'openai' | 'gemini' | 'claude';
}) {
  
  console.log(`PropertyCard render: ${p.id}, isSelected: ${isSelected}, selectedStyle: ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2 shadow-lg' : ''}`);
  console.log(`Details Panel will render: ${isSelected ? 'YES' : 'NO'}`);
  
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
          {typeof p.value === "string" 
            ? (p.value || <span className="text-gray-400 italic">To be added...</span>) 
            : (p.value?.refObjectName 
                ? <span className="text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded-md border border-blue-200">
                    <span className="text-blue-500 text-xs font-semibold">object:</span> {p.value.refObjectName}
                  </span>
                : <span className="text-gray-400 italic">To be added...</span>)
          }
        </div>
        
        {/* File reference display - only show for OpenAI */}
        {p.fileReference && selectedLLM === 'openai' && (
          <div className="mt-1.5 flex items-center gap-2">
            <span className="text-green-600 text-xs font-medium bg-green-50 px-2 py-1 rounded-md border border-green-200">
              📎 {p.fileReference.fileName}
            </span>
            <button
              className="text-green-600 hover:text-green-700 text-xs"
              onClick={async (e) => {
                e.stopPropagation();
                try {
                  console.log('=== Downloading File from Property Card ===');
                  const { fileStorageService } = await import("../services/fileStorageService");
                  await fileStorageService.downloadFile(p.fileReference!);
                } catch (error) {
                  console.error('Download failed:', error);
                  alert(`Failed to download file: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
              }}
              title="Download file"
            >
              ⬇️
            </button>
          </div>
        )}
        
        {/* Show file unavailable notice for Gemini/Claude */}
        {p.fileReference && (selectedLLM === 'gemini' || selectedLLM === 'claude') && (
          <div className="mt-1.5 flex items-center gap-2">
            <span className="text-amber-600 text-xs font-medium bg-amber-50 px-2 py-1 rounded-md border border-amber-200">
              📎 {p.fileReference.fileName} (Not supported by {selectedLLM.charAt(0).toUpperCase() + selectedLLM.slice(1)})
            </span>
          </div>
        )}
        <div className="mt-2 text-xs opacity-70 capitalize truncate">{p.importance}</div>
      </button>
      
      {/* Expandable Details Panel */}
      {isSelected && (
        <div className="mt-3 overflow-hidden" data-testid="details-panel">
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
                      const updatedProperty = { ...p, name: e.target.value, updatedAt: Date.now() };
                      dispatch({
                        type: "UPSERT_PROPERTY",
                        payload: updatedProperty,
                      });
                      
                      // Debug: Log updated property
                      console.log('=== Property Name Updated ===');
                      console.log('Updated Property:', updatedProperty);
                      console.log('============================');
                    }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Value</label>
                  {typeof p.value === "object" && p.value?.refObjectName ? (
                    <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                      <span className="text-blue-600 font-medium text-sm">
                        <span className="text-blue-500 text-xs font-semibold">object:</span> {p.value.refObjectName}
                      </span>
                      <button 
                        className="text-xs text-gray-500 hover:text-gray-700 ml-auto"
                        onClick={() => dispatch({ type: "OPEN_MODAL", modal: "more-options", data: p })}
                      >
                        Change…
                      </button>
                    </div>
                  ) : (
                    <input
                      className="input text-sm"
                      defaultValue={typeof p.value === "string" ? (p.value || "") : ""}
                      onBlur={(e) => {
                        const nextVal = e.target.value;
                        const updatedProperty = { ...p, value: nextVal, updatedAt: Date.now() };
                        dispatch({
                          type: "UPSERT_PROPERTY",
                          payload: updatedProperty,
                        });
                        
                        // Debug: Log updated property
                        console.log('=== Property Value Updated ===');
                        console.log('Updated Property:', updatedProperty);
                        console.log('============================');
                      }}
                    />
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-gray-600">Importance</span>
                <ImportanceSegmented
                  value={p.importance}
                  onChange={(v) => {
                    const updatedProperty = { ...p, importance: v, updatedAt: Date.now() };
                    dispatch({
                      type: "UPSERT_PROPERTY",
                      payload: updatedProperty,
                    });
                    
                    // Debug: Log updated property
                    console.log('=== Property Importance Updated ===');
                    console.log('Updated Property:', updatedProperty);
                    console.log('==================================');
                  }}
                />
              </div>

              {/* File reference management in details panel - only for OpenAI */}
              {p.fileReference && selectedLLM === 'openai' && (
                <div className="pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-600">File Reference</span>
                    <div className="flex gap-2">
                      <button 
                        className="text-xs text-blue-600 hover:text-blue-700"
                        onClick={async () => {
                          try {
                            console.log('=== Downloading File from Details Panel ===');
                            const { fileStorageService } = await import("../services/fileStorageService");
                            await fileStorageService.downloadFile(p.fileReference!);
                          } catch (error) {
                            console.error('Download failed:', error);
                            alert(`Failed to download file: ${error instanceof Error ? error.message : 'Unknown error'}`);
                          }
                        }}
                      >
                        Download
                      </button>
    <button
                        className="text-xs text-red-600 hover:text-red-700"
                        onClick={async () => {
                          try {
                            const { fileStorageService } = await import("../services/fileStorageService");
                            await fileStorageService.removeFile(p.fileReference!.id);
                            const updatedProperty = { ...p, fileReference: undefined, updatedAt: Date.now() };
                            dispatch({
                              type: "UPSERT_PROPERTY",
                              payload: updatedProperty,
                            });
                          } catch (error) {
                            console.error('File removal failed:', error);
                            alert(`Failed to remove file: ${error instanceof Error ? error.message : 'Unknown error'}`);
                          }
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-green-600">📎</span>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-green-800">{p.fileReference.fileName}</div>
                        <div className="text-xs text-green-600">
                          {(p.fileReference.fileSize / 1024).toFixed(1)} KB • {p.fileReference.fileType}
                        </div>
                        <div className="text-xs text-green-500">
                          Uploaded: {new Date(p.fileReference.uploadTime).toLocaleString()}
                        </div>
                        <div className="text-xs text-green-400">
                          File ID: {p.fileReference.id}
                        </div>
                        <div className="text-xs text-green-400">
                          Stored: {p.fileReference.storedPath}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Show file unavailable notice for Gemini/Claude in details panel */}
              {p.fileReference && (selectedLLM === 'gemini' || selectedLLM === 'claude') && (
                <div className="pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-600">File Reference</span>
                  </div>
                  <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-amber-600">📎</span>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-amber-800">{p.fileReference.fileName}</div>
                        <div className="text-xs text-amber-600">
                          {(p.fileReference.fileSize / 1024).toFixed(1)} KB • {p.fileReference.fileType}
                        </div>
                        <div className="text-xs text-amber-500">
                          File attachments are not supported by {selectedLLM.charAt(0).toUpperCase() + selectedLLM.slice(1)}. Switch to OpenAI for file processing.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2 border-t border-gray-100">
                <button 
                  className="btn-primary text-xs px-3 py-1.5"
                  onClick={() => {
                    console.log('=== OK Button Clicked - Hiding Details Panel ===');
                    onToggleDetails();
                  }}
                >
                  OK
                </button>
                <button 
                  className="btn-ghost text-xs px-3 py-1.5"
                  onClick={() => dispatch({ type: "OPEN_MODAL", modal: "more-options", data: p })}
                >
                  More options…
                </button>
                <button 
                  className="btn-danger text-xs px-3 py-1.5"
                  onClick={() => {
                    console.log('=== Deleting Property ===');
                    console.log('Property to delete:', p);
                    console.log('======================');
                    dispatch({ type: "DELETE_PROPERTY", id: p.id });
                  }}
                >
                  Delete
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
  state, dispatch, onSendMessage, onCreateEmbeddedObject, onEmbedExistingObject, selectedLLM, onError
}: { 
  state: AppState; 
  dispatch: React.Dispatch<Action>;
  onSendMessage?: (message: string) => void;
  onCreateEmbeddedObject?: (propertyId: string, parentObjectId: string) => void;
  onEmbedExistingObject?: (propertyId: string, objectId: string, objectName: string) => void;
  selectedLLM: 'openai' | 'gemini' | 'claude';
  onError?: (title: string, message: string) => void;
}) {
  const { oop, selectedPropertyId, suggestions, modal } = state;
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"none" | "importance" | "name" | "time">("none");
  const [isSending, setIsSending] = useState(false);
  
  // Local state for main task and audience inputs to make them controlled
  const [mainTask, setMainTask] = useState(oop.main_task || "");
  const [audience, setAudience] = useState(oop.audience || "");

  // Sync local state when oop object changes (e.g., when switching objects)
  useEffect(() => {
    setMainTask(oop.main_task || "");
    setAudience(oop.audience || "");
  }, [oop.id, oop.main_task, oop.audience]);

  // Filter properties based on search term
  const filtered = oop.properties.filter((p: Property) => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (typeof p.value === "string" && p.value.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Sort properties based on user selection
  const sorted = [...filtered].sort((a: Property, b: Property) => {
    if (sortBy === "none") return 0; // No sorting, maintain original order
    
    if (sortBy === "importance") {
      return getImportanceOrder(a.importance) - getImportanceOrder(b.importance) || (b.updatedAt ?? 0) - (a.updatedAt ?? 0);
    }
    
    if (sortBy === "name") {
      return a.name.localeCompare(b.name);
    }
    
    if (sortBy === "time") {
      return (b.createdAt ?? 0) - (a.createdAt ?? 0);
    }
    
    return 0;
  });

  // Debug: Log current state whenever it changes
  useEffect(() => {
    console.log('=== Current JSON Object State ===');
    console.log(JSON.stringify(state.oop, null, 2));
    console.log('=== Properties Debug ===', { 
      allProperties: oop.properties, 
      filtered, 
      sorted, 
      selectedPropertyId,
      propertiesCount: oop.properties.length 
    });
    console.log('================================');
  }, [state.oop, oop.properties, filtered, sorted, selectedPropertyId]);

  // Auto-open Object Panel when OOP panel is displayed (if there are saved objects)
  useEffect(() => {
    if (state.openPanel && state.promptObjects.length > 0) {
      console.log('=== Auto-Opening Object Panel ===');
      console.log('OOP panel is open, promptObjects count:', state.promptObjects.length);
      dispatch({ type: "TOGGLE_OBJECT_PANEL", open: true });
      console.log('=== Object Panel Auto-Opened ===');
    }
  }, [state.openPanel, state.promptObjects.length, dispatch]);

  // Cycle through sorting options
  const cycleSort = () => {
    const sortOptions: Array<"none" | "importance" | "name" | "time"> = ["none", "importance", "name", "time"];
    const currentIndex = sortOptions.indexOf(sortBy);
    const nextIndex = (currentIndex + 1) % sortOptions.length;
    setSortBy(sortOptions[nextIndex]);
  };

  // Get importance order for display (avoid, normal, highlight)
  const getImportanceOrder = (importance: string) => {
    switch (importance) {
      case "avoid": return 0;
      case "normal": return 1;
      case "highlight": return 2;
      default: return 1;
    }
  };



  const handleAddProperty = (property: Property) => {
    dispatch({ type: "UPSERT_PROPERTY", payload: property });
    dispatch({ type: "CLOSE_MODAL" });
    
    // Debug: Log current state after adding property
    setTimeout(() => {
      console.log('=== Current JSON Object After Adding Property ===');
      console.log(JSON.stringify(state.oop, null, 2));
      console.log('===============================================');
    }, 100);
  };

  // handleAISuggestion is deprecated - now using ObjectModifierModal
  // const handleAISuggestion = async () => { ... };

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
    <aside className="panel-shell panel-float max-w-[50vw] w-full h-full z-50" style={{ width: "var(--panel-w)" }}>
      {/* Bookmark handle for closing panel */}
      <BookmarkHandle
        isOpen={true}
        position="right"
        onToggle={() => dispatch({ type: "TOGGLE_PANEL", open: false })}
      />
      
      {/* Fixed height container with flexbox layout */}
      <div className="flex flex-col h-full">
      {/* Header with Brief (main_task / audience) */}
        <div className="panel-chrome p-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="font-semibold text-text-onLight">OOPrompt</div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <input
              className="input"
            placeholder="Main task"
              value={mainTask}
              onChange={(e) => setMainTask(e.target.value)}
            onBlur={(e) => {
              const next: OOPromptObject = { ...oop, main_task: e.target.value };
              dispatch({ type: "SET_OOP", payload: next });
                
                // Debug: Log current state after updating main task
                setTimeout(() => {
                  console.log('=== Current JSON Object After Updating Main Task ===');
                  console.log(JSON.stringify(next, null, 2));
                  console.log('==================================================');
                }, 100);
            }}
          />
          <input
              className="input"
            placeholder="Audience"
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
            onBlur={(e) => {
              const next: OOPromptObject = { ...oop, audience: e.target.value };
              dispatch({ type: "SET_OOP", payload: next });
                
                // Debug: Log current state after updating audience
                setTimeout(() => {
                  console.log('=== Current JSON Object After Updating Audience ===');
                  console.log(JSON.stringify(next, null, 2));
                  console.log('==================================================');
                }, 100);
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
        <div className="panel-chrome p-3 flex gap-2 items-center flex-shrink-0">
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
            onClick={() => dispatch({ type: "OPEN_MODAL", modal: "object-modifier" })}
            title="AI Object Analysis"
          >
            <span className="text-sm">🤖</span>
          </button>
          <button 
            className="btn-tonal w-10 h-10 flex items-center justify-center"
            onClick={() => {
              console.log('=== Saving Current OOP Object ===');
              console.log('Current OOP object:', oop);
              dispatch({ type: "SAVE_PROMPT_OBJECT", payload: oop });
              console.log('=== OOP Object Saved ===');
            }}
            title="Save Object"
          >
            <span className="text-sm">💾</span>
        </button>
        <input 
            className="input flex-1 h-10" 
          placeholder="Search properties…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

        {/* Properties area with scrollbar */}
        <div className="flex-1 min-h-0">
          <div className="h-full overflow-y-auto">
            <div className="p-4">
              <div className="grid gap-4 grid-cols-1">
                {sorted.map((p: Property) => {
                  const isSelected = p.id === selectedPropertyId;
                  console.log(`Property ${p.id}: name="${p.name}", isSelected=${isSelected}, selectedPropertyId=${selectedPropertyId}, value="${p.value}"`);
                  return (
          <PropertyCard
            key={p.id}
            p={p}
                      isSelected={isSelected}
                      selectedLLM={selectedLLM}
                      onSelect={() => {
                        console.log(`Property ${p.id} clicked, current selectedPropertyId: ${selectedPropertyId}, will set to: ${isSelected ? 'undefined' : p.id}`);
                        // Toggle selection: if already selected, deselect; otherwise select
                        if (isSelected) {
                          dispatch({ type: "SELECT_PROPERTY", id: undefined });
                        } else {
                          dispatch({ type: "SELECT_PROPERTY", id: p.id });
                        }
                      }}
                      onToggleDetails={() => dispatch({ type: "SELECT_PROPERTY", id: undefined })}
                      dispatch={dispatch}
                    />
                  );
                })}
            </div>
            </div>
          </div>
      </div>

        {/* Save and Send buttons area - separate block */}
        <div className="panel-chrome p-4 flex-shrink-0 border-t border-divider space-y-3">
          {/* Save button */}
        <button 
            className="w-full py-2 px-4 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 rounded-xl transition-colors text-sm font-medium"
            onClick={() => {
              console.log('=== Save Button Clicked ===');
              console.log('Saving current OOP object:', oop);
              console.log('Object ID:', oop.id);
              console.log('Object name:', oop.name);
              console.log('Main task:', oop.main_task);
              console.log('Properties count:', oop.properties.length);
              
              // Create a new object with a unique ID for saving
              const objectToSave = {
                ...oop,
                id: oop.id === 'root' ? `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` : oop.id,
                name: oop.name || `Prompt Object ${Date.now()}`,
                createdAt: oop.id === 'root' ? Date.now() : oop.createdAt || Date.now(),
                updatedAt: Date.now()
              };
              
              console.log('Object to save with ID:', objectToSave.id);
              console.log('Is this a new object?', oop.id === 'root');
              
              console.log('Object to save:', objectToSave);
              
              // Save the current OOP object to the prompt objects list
              dispatch({ type: "SAVE_PROMPT_OBJECT", payload: objectToSave });
              
              // Auto-open the Object Panel to show the newly saved object
              dispatch({ type: "TOGGLE_OBJECT_PANEL", open: true });
              
              console.log('=== OOP Object Saved Successfully ===');
              console.log('=== Object Panel Auto-Opened ===');
            }}
          >
            💾 Save Prompt Object
        </button>
          
          {/* Send button */}
        <button 
            className={`btn-primary w-full py-3 text-base font-medium ${isSending ? 'opacity-75 cursor-not-allowed' : ''}`}
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
                
                // Step 2: Send to PROMPT_BUILDER assistant
                console.log('Building prompt with PROMPT_BUILDER assistant...');
                const builtPrompt = await llmService.buildPromptWithAssistant(promptData);
                console.log('Built prompt:', builtPrompt);
                
                // Step 3: Send the built prompt to LLM API
                console.log('Sending built prompt to LLM API...');
                
                // Console output: Final Prompt
                console.log('╔════════════════════════════════════════════════════════════════════════════════════╗');
                console.log('║                                  FINAL PROMPT SENT TO LLM                         ║');
                console.log('╚════════════════════════════════════════════════════════════════════════════════════╝');
                console.log(builtPrompt);
                console.log('═══════════════════════════════════════════════════════════════════════════════════════');
                
                // Extract file attachments from properties with property context
                const fileAttachments: FileAttachment[] = [];
                propertiesWithFiles.forEach(prop => {
                  if (prop.fileData) {
                    fileAttachments.push({
                      fileName: prop.fileData.fileName,
                      fileType: prop.fileData.fileType,
                      fileSize: prop.fileData.fileSize,
                      data: prop.fileData.data,
                      propertyName: prop.name,  // Include property name for association
                      propertyId: prop.id       // Include property ID for precise tracking
                    });
                  }
                });

                console.log('=== File Attachments Found ===');
                console.log('Total files:', fileAttachments.length);
                fileAttachments.forEach((file, index) => {
                  console.log(`File ${index + 1}: "${file.fileName}" (${file.fileType}, ${(file.fileSize / 1024).toFixed(1)} KB) → Property: "${file.propertyName}" (ID: ${file.propertyId})`);
                });
                console.log('=============================');

                const llmResponse = await llmService.chat([
                  { role: 'user', content: builtPrompt }
                ], selectedLLM, fileAttachments);
                console.log('LLM response:', llmResponse);
                
                // Step 4: Send both the built prompt and LLM response to chat panel
                if (onSendMessage) {
                  // Send confirmation that prompt was sent to LLM
                  onSendMessage(`📤 Prompt sent to LLM: Processing...`);
                  // Send the built prompt from the assistant (user side)
                  onSendMessage(`📝 Built Prompt: ${builtPrompt}`);
                  // Send the LLM response (AI side)
                  onSendMessage(`🤖 AI Response: ${llmResponse.content}`);
                }
                
                console.log('=== Send Process Completed ===');
                
                // Step 5: Auto-save the current OOP object before hiding
                const objectToSave = {
                  ...oop,
                  id: oop.id === 'root' ? `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` : oop.id,
                  name: oop.name || `Prompt Object ${Date.now()}`,
                  createdAt: oop.id === 'root' ? Date.now() : oop.createdAt || Date.now(),
                  updatedAt: Date.now()
                };
                console.log('Auto-saving object with ID:', objectToSave.id);
                dispatch({ type: "SAVE_PROMPT_OBJECT", payload: objectToSave });
                console.log('=== OOP Object Auto-Saved After Send ===');
                
                // Step 6: Automatically hide the OOP panel
                dispatch({ type: "TOGGLE_PANEL", open: false });
                
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
              }
            }}
            disabled={isSending}
          >
            {isSending ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Building Prompt...</span>
              </div>
            ) : (
              'Send'
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
    </aside>
  );
}
