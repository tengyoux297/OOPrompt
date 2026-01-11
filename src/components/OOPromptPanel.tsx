import React, { useState, useEffect, useMemo } from "react";
import type { AppState, Action } from "../state/useOOPrompt";
import type { Emphasis as PropertyEmphasis, OOPromptObject, Property, Suggestion, Conflict } from "../types";
import { AddPropertyModal } from "./AddPropertyModal";
import { ConflictResolveModal } from "./ConflictResolveModal";
import { MoreOptionsModal } from "./MoreOptionsModal";
import { ObjectModifierModal } from "./ObjectModifierModal";
import { SuggestionsBanner } from "./SuggestionsBanner";
// import { suggest } from "../api"; // Deprecated - now using ObjectModifierModal
import { llmService } from "../services/llmService";
import type { FileAttachment } from "../services/llmService";
import { PatchService } from "../services/patchService";



function ActionSegmented({
  value, onChange
}: { value: PropertyEmphasis; onChange: (v: PropertyEmphasis) => void }) {
  const opts: PropertyEmphasis[] = ["important", "normal", "avoid"];
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
  
  const base = "bg-white border border-gray-200 rounded p-2.5 w-full transition-all duration-200 hover:shadow-sm";
  const selectedStyle = isSelected ? "ring-1 ring-black ring-offset-1 shadow-md" : "";

  return (
    <div className="w-full">
      <div onClick={onSelect} className={`${base} ${selectedStyle} cursor-pointer`}>
        <div className="grid grid-cols-[1fr_1fr_auto] gap-2.5 items-start">
          {/* Name Column */}
          <div className="text-left">
            <div className="text-[10px] text-gray-500 mb-0.5">Name</div>
            <div className="text-xs font-semibold text-gray-900">{p.name || <span className="text-gray-400 italic">No name</span>}</div>
          </div>
          
          {/* Value Column */}
          <div className="text-left">
            <div className="text-[10px] text-gray-500 mb-0.5">Value</div>
            <div className="text-xs text-gray-700">
          {typeof p.value === "string" 
            ? (p.value || <span className="text-gray-400 italic">To be added...</span>) 
            : (p.value?.refObjectName 
                    ? <span className="text-blue-600 font-medium">
                        <span className="text-blue-500 text-[10px] font-semibold">object: </span>{p.value.refObjectName}
                  </span>
                : <span className="text-gray-400 italic">To be added...</span>)
          }
            </div>
          </div>
          
          {/* Action Icons Column */}
          <div className="flex flex-col items-center gap-0.5">
            {/* Edit Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSelect();
              }}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
              aria-label="Edit property"
              title="Edit property"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
            
            {/* Delete Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Are you sure you want to delete "${p.name}"?`)) {
                  dispatch({ type: "DELETE_PROPERTY", id: p.id });
                }
              }}
              className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
              aria-label="Delete property"
              title="Delete property"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* File reference display - only show for OpenAI */}
        {p.fileReference && selectedLLM === 'openai' && (
          <div className="mt-1.5 flex items-center gap-1.5">
            <span className="text-green-600 text-[10px] font-medium bg-green-50 px-1.5 py-0.5 rounded border border-green-200">
              📎 {p.fileReference.fileName}
            </span>
            <button
              className="text-green-600 hover:text-green-700 text-[10px]"
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
          <div className="mt-1.5 flex items-center gap-1.5">
            <span className="text-amber-600 text-[10px] font-medium bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
              📎 {p.fileReference.fileName} (Not supported by {selectedLLM.charAt(0).toUpperCase() + selectedLLM.slice(1)})
            </span>
          </div>
        )}
      </div>
      
      {/* Expandable Details Panel */}
      {isSelected && (
        <div className="mt-3 overflow-hidden" data-testid="details-panel">
          <div className="bg-white rounded-lg border-2 border-gray-300 shadow-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Property Details</h3>
              <button 
                onClick={onToggleDetails}
                className="text-gray-400 hover:text-gray-600 transition-colors text-lg leading-none"
                aria-label="Close details"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                  <input
                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  <label className="block text-xs font-medium text-gray-700 mb-1">Value</label>
                  {typeof p.value === "object" && p.value?.refObjectName ? (
                    <div className="flex items-center gap-2 p-1.5 bg-blue-50 border border-blue-200 rounded-md">
                      <span className="text-blue-600 font-medium text-xs">
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
                      className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-gray-700">Emphasis</label>
                <div className="flex gap-2">
                  {(["normal", "important", "avoid"] as const).map((option) => {
                    const displayLabel = option === "important" ? "Important" : option.charAt(0).toUpperCase() + option.slice(1);
                    const isSelected = p.action === option;
                    return (
                      <label
                        key={option}
                        className={`flex items-center gap-1.5 cursor-pointer px-2 py-1.5 rounded-lg border transition-colors flex-1 ${
                          isSelected
                            ? "bg-blue-50 border-blue-300"
                            : "bg-white border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name={`emphasis-${p.id}`}
                          value={option}
                          checked={isSelected}
                          onChange={() => {
                            const updatedProperty = { ...p, action: option, updatedAt: Date.now() };
                            dispatch({
                              type: "UPSERT_PROPERTY",
                              payload: updatedProperty,
                            });
                            
                            // Debug: Log updated property
                            console.log('=== Property Emphasis Updated ===');
                            console.log('Updated Property:', updatedProperty);
                            console.log('==================================');
                          }}
                          className="w-3 h-3 text-blue-600 border-gray-300 focus:ring-blue-500 focus:ring-1"
                        />
                        <span className={`text-xs ${isSelected ? "text-blue-900 font-medium" : "text-gray-700"}`}>
                          {displayLabel}
                        </span>
                      </label>
                    );
                  })}
                </div>
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
                  <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-green-600 text-xs">📎</span>
                      <div className="flex-1">
                        <div className="text-xs font-medium text-green-800">{p.fileReference.fileName}</div>
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
                  <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-amber-600 text-xs">📎</span>
                      <div className="flex-1">
                        <div className="text-xs font-medium text-amber-800">{p.fileReference.fileName}</div>
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

              <div className="flex gap-2 pt-3 border-t border-gray-200">
                <button 
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors"
                  onClick={() => {
                    console.log('=== SAVE Button Clicked - Hiding Details Panel ===');
                    onToggleDetails();
                  }}
                >
                  save
                </button>
                <button 
                  className="px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-900 text-xs font-medium rounded-lg transition-colors"
                  onClick={() => {
                    console.log('=== CANCEL Button Clicked - Hiding Details Panel ===');
                    onToggleDetails();
                  }}
                >
                  cancel
                </button>
                <button 
                  className="px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-900 text-xs font-medium rounded-lg transition-colors"
                  onClick={() => {
                    dispatch({ type: "OPEN_MODAL", modal: "more-options", data: p });
                  }}
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
  const [showSuccess, setShowSuccess] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const { oop, selectedPropertyId, suggestions, modal } = state;
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"none" | "action" | "name" | "time">("none");
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

  // Filter properties based on search term
  const filtered = (oop?.properties || []).filter((p: Property) => {
    try {
      if (!p || !p.name) return false;
      return p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (typeof p.value === "string" && p.value.toLowerCase().includes(searchTerm.toLowerCase()));
    } catch (error) {
      console.error('Error filtering property:', error, p);
      return false;
    }
  });

  // Sort properties based on user selection
  // Use useMemo to avoid minification issues and improve performance
  const sorted = useMemo(() => {
    if (sortBy === "none") {
      return filtered;
    }
    
    try {
      const sortedArray = [...filtered];
      
      if (sortBy === "action") {
        sortedArray.sort((propA: Property, propB: Property) => {
          const orderA = getActionOrder(propA.action);
          const orderB = getActionOrder(propB.action);
          if (orderA !== orderB) {
            return orderA - orderB;
          }
          // Fallback to time if action order is the same
          const timeA = propA.updatedAt ?? propA.createdAt ?? 0;
          const timeB = propB.updatedAt ?? propB.createdAt ?? 0;
          return timeB - timeA;
        });
      } else if (sortBy === "name") {
        sortedArray.sort((propA: Property, propB: Property) => {
          return propA.name.localeCompare(propB.name);
        });
      } else if (sortBy === "time") {
        sortedArray.sort((propA: Property, propB: Property) => {
          const timeA = propA.createdAt ?? propA.updatedAt ?? 0;
          const timeB = propB.createdAt ?? propB.updatedAt ?? 0;
          return timeB - timeA;
        });
      }
      
      return sortedArray;
    } catch (error) {
      console.error('Error during sorting:', error);
      return filtered; // Fallback to unsorted on error
    }
  }, [filtered, sortBy]);

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
      firstProperty: filtered[0] ? { name: filtered[0].name, action: filtered[0].action, createdAt: filtered[0].createdAt, updatedAt: filtered[0].updatedAt } : null
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

  // Cycle through sorting options
  const cycleSort = () => {
    try {
      const sortOptions: Array<"none" | "action" | "name" | "time"> = ["none", "action", "name", "time"];
      const currentIndex = sortOptions.indexOf(sortBy);
      const nextIndex = (currentIndex + 1) % sortOptions.length;
      const newSortBy = sortOptions[nextIndex];
      
      console.log(`Sorting: ${sortBy} -> ${newSortBy}`);
      setSortBy(newSortBy);
    } catch (error) {
      console.error('Error in cycleSort:', error);
      // Reset to no sorting on error
      setSortBy("none");
    }
  };

  // Get action order for display (avoid, normal, important)
  const getActionOrder = (action: string) => {
    console.log(`getActionOrder called with: "${action}"`);
    switch (action) {
      case "avoid": 
        console.log('Returning 0 for avoid');
        return 0;
      case "normal": 
        console.log('Returning 1 for normal');
        return 1;
      case "important": 
        console.log('Returning 2 for important');
        return 2;
      default: 
        console.log(`Unknown action "${action}", returning 1`);
        return 1;
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
              action: "normal",
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
        {/* Header Section */}
        <div className="panel-chrome p-3 flex-shrink-0 border-b border-gray-200">
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label className="block text-[10px] font-medium text-gray-600 mb-1">Main Task</label>
              <input
                className="input text-xs"
                placeholder="What do you want to accomplish?"
                value={mainTask}
                onChange={(e) => setMainTask(e.target.value)}
                onBlur={(e) => {
                  const next: OOPromptObject = { ...oop, main_task: e.target.value };
                  dispatch({ type: "SET_OOP", payload: next });
                }}
              />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-gray-600 mb-1">Audience</label>
              <input
                className="input text-xs"
                placeholder="Who is this for?"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                onBlur={(e) => {
                  const next: OOPromptObject = { ...oop, audience: e.target.value };
                  dispatch({ type: "SET_OOP", payload: next });
                }}
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-1.5">
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
              className="px-2 py-1 text-[10px] font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors flex items-center gap-1 relative"
              title="Save prompt object to history"
            >
              {showSaveSuccess ? (
                <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              )}
              <span>{showSaveSuccess ? 'Saved!' : 'SAVE'}</span>
            </button>
            
            {/* ADD AI SUGGESTIONS Button */}
            <button
              onClick={() => dispatch({ type: "OPEN_MODAL", modal: "object-modifier" })}
              className="px-2 py-1 text-[10px] font-medium text-yellow-800 bg-yellow-100 border border-yellow-300 rounded hover:bg-yellow-200 transition-colors flex items-center gap-1"
              title="Add AI Suggestions"
            >
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 12l10 10 10-10L12 2z" />
              </svg>
              <span>ADD AI SUGGESTIONS</span>
            </button>
            
            {/* + ADD PROPERTY Button */}
            <button
              onClick={() => dispatch({ type: "OPEN_MODAL", modal: "add-property" })}
              className="px-2 py-1 text-[10px] font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors flex items-center gap-1"
              title="Add Property"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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


        {/* Properties area with scrollbar */}
        <div className="flex-1 min-h-0 overflow-y-auto bg-gray-50/30">
          <div className="p-3">
            <div className="space-y-2">
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
                  } catch (error) {
                    console.error('Error rendering property:', error, p);
                    return null;
                  }
                })}
              
            </div>
          </div>
        </div>

        {/* Action buttons area */}
        <div className="panel-chrome p-2.5 flex-shrink-0 border-t border-gray-200 bg-white space-y-2">
          
          {/* Built prompt display */}
          {builtPrompt && !isSending && (
            <div className="space-y-2">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded p-2.5 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-[10px]">✓</span>
                  </div>
                    <span className="text-green-800 font-semibold text-xs">Prompt Built Successfully</span>
                </div>
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
                {isPromptPanelExpanded && (
                  <div className="bg-white rounded border border-green-200 p-2 max-h-32 overflow-y-auto text-xs text-gray-800 whitespace-pre-wrap font-mono leading-relaxed">
                  {builtPrompt}
                </div>
                )}
              </div>
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(builtPrompt);
                      setShowSuccess(true);
                      setTimeout(() => {
                        setShowSuccess(false);
                      }, 2000);
                    } catch (clipboardError) {
                      if (onError) {
                      onError('Copy Failed', 'Could not copy prompt to clipboard. Please copy it manually from the preview above.');
                    }
                  }
                }}
                className="btn-primary w-full py-2 text-xs font-semibold shadow-md hover:shadow-lg transition-shadow"
              >
                <span className="mr-1.5">📋</span>
                Copy to Clipboard
              </button>
              {showSuccess && (
                <div className="flex items-center justify-center gap-1.5 py-1.5 px-3 bg-green-50 border border-green-300 rounded text-green-700 text-xs font-medium">
                  <span className="text-green-600">✓</span>
                  <span>Copied to clipboard!</span>
                </div>
              )}
            </div>
          )}
          
          {/* Build Prompt button */}
          <button 
            className={`btn-primary w-full py-2 text-xs font-semibold shadow-md hover:shadow-lg transition-all ${isSending ? 'opacity-75 cursor-not-allowed' : ''}`}
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
                
                // Store the built prompt
                setBuiltPrompt(prompt);
                setIsPromptPanelExpanded(true); // Reset to expanded when new prompt is built
                
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
                <span>Building...</span>
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

