import { useState, useEffect } from "react";
import type { OOPromptObject } from "../types";
import { HistoryPopup } from "./HistoryPopup";

type Props = {
  objects: OOPromptObject[];
  selectedObjectId: string | undefined;
  onSelectObject: (objectId: string) => void;
  onDeleteObject: (objectId: string) => void;
  isOpen: boolean;
  onToggle: () => void;
};

export function HistoryPanel({ objects, selectedObjectId, onSelectObject, onDeleteObject, isOpen, onToggle }: Props) {
  const [historyPopup, setHistoryPopup] = useState<{
    isOpen: boolean;
    objectId: string;
    position: { x: number; y: number };
  }>({
    isOpen: false,
    objectId: '',
    position: { x: 0, y: 0 }
  });

  // Get all objects that should be displayed on the panel
  const getDisplayObjects = () => {
    const uniqueObjects = new Map<string, OOPromptObject>();
    
    // First, group all objects by main_task + audience
    objects.forEach(obj => {
      const key = `${obj.main_task || ''}|${obj.audience || ''}`;
      
      if (!uniqueObjects.has(key) || obj.updatedAt > uniqueObjects.get(key)!.updatedAt) {
        uniqueObjects.set(key, obj);
      }
    });
    
    // Convert to array and sort by most recently updated
    const latestVersions = Array.from(uniqueObjects.values()).sort((a, b) => b.updatedAt - a.updatedAt);
    
    // If there's a currently selected object, update the corresponding unique object
    if (selectedObjectId) {
      const selectedObject = objects.find(obj => obj.id === selectedObjectId);
      if (selectedObject) {
        const key = `${selectedObject.main_task || ''}|${selectedObject.audience || ''}`;
        
        // Find the index of the object with the same key in latestVersions
        const existingIndex = latestVersions.findIndex(obj => 
          `${obj.main_task || ''}|${obj.audience || ''}` === key
        );
        
        if (existingIndex >= 0) {
          // Replace the existing object with the selected one (to show the loaded version)
          latestVersions[existingIndex] = selectedObject;
        }
        // If not found, it means this is a completely new object, so add it
        else {
          latestVersions.unshift(selectedObject);
        }
      }
    }
    
    return latestVersions;
  };

  const displayObjects = getDisplayObjects();

  const handleObjectClick = (objectId: string) => {
    console.log('HistoryPanel: handleObjectClick called with:', objectId);
    onSelectObject(objectId);
  };

  const handleDeleteObject = (event: React.MouseEvent, objectId: string) => {
    event.stopPropagation(); // Prevent object selection when clicking delete
    event.preventDefault(); // Prevent any default behavior
    const obj = objects.find(obj => obj.id === objectId);
    const objName = obj?.name || obj?.main_task || 'this object';
    if (!obj) return;

    // Sidebar cards represent a "prompt" that may have multiple saved versions.
    // Delete all versions with the same (main_task, audience) so the card disappears reliably.
    const versionsToDelete = objects.filter(o =>
      o.main_task === obj.main_task && o.audience === obj.audience
    );

    const suffix = versionsToDelete.length > 1 ? ` (and ${versionsToDelete.length - 1} older version(s))` : "";
    if (window.confirm(`Delete "${objName}"${suffix}?`)) {
      console.log('HistoryPanel: Deleting prompt versions:', versionsToDelete.map(v => v.id));
      versionsToDelete.forEach(v => onDeleteObject(v.id));
    }
  };

  const handleHistoryClick = (event: React.MouseEvent, objectId: string) => {
    event.stopPropagation(); // Prevent object selection when clicking history
    const rect = event.currentTarget.getBoundingClientRect();
    setHistoryPopup({
      isOpen: true,
      objectId,
      position: { x: rect.left, y: rect.top }
    });
  };

  const closeHistoryPopup = () => {
    setHistoryPopup(prev => ({ ...prev, isOpen: false }));
  };

  const handleSelectVersion = (version: OOPromptObject) => {
    console.log('HistoryPanel: handleSelectVersion called with version:', version.id, version.main_task);
    onSelectObject(version.id);
    closeHistoryPopup();
  };

  // Get all versions of the current object for history
  const getObjectVersions = (objectId: string) => {
    const currentObject = objects.find(obj => obj.id === objectId);
    if (!currentObject) return [];
    
    // Find all objects with the same main_task and audience as versions
    const allVersions = objects.filter(obj => 
      obj.main_task === currentObject.main_task && 
      obj.audience === currentObject.audience
    ).sort((a, b) => b.updatedAt - a.updatedAt);
    
    return allVersions;
  };

  return (
    <>
      {/* History Panel - Left Sidebar */}
      <aside className={`bg-gray-100 flex flex-col transition-all duration-300 ${
        isOpen ? 'w-[200px]' : 'w-0'
      } overflow-hidden border-r border-gray-200 relative`}>
        <div className="flex flex-col h-full min-w-[200px]">
          {/* Objects List */}
          <div className="flex-1 overflow-y-auto min-h-0 p-3 space-y-2.5">
            {displayObjects.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-xs text-gray-500 italic">
                  You have not made any prompts yet.
                </p>
              </div>
            ) : (
              displayObjects.map((obj) => {
                const isSelected = selectedObjectId === obj.id;
                
                return (
                  <div
                    key={obj.id}
                    className={`group cursor-pointer transition-all duration-200 hover:shadow-md border border-gray-200 hover:border-gray-300 px-4 py-3 rounded-xl bg-white ${
                      isSelected ? 'ring-2 ring-blue-500 ring-offset-2 border-blue-300 shadow-lg bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => handleObjectClick(obj.id)}
                  >
                    <div className="flex flex-col">
                      {/* Main Task - Single line with truncation */}
                      <div className="font-semibold text-sm text-gray-900 truncate mb-2" title={obj.main_task}>
                        {obj.main_task || <span className="text-gray-400 italic">No main task</span>}
                      </div>
                      
                      {/* Action Buttons - Below the text */}
                      <div className="flex items-center gap-1">
                        {/* History Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleHistoryClick(e, obj.id);
                          }}
                          onMouseDown={(e) => {
                            e.stopPropagation(); // Prevent card click on mousedown
                          }}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all duration-200 relative z-20"
                          aria-label={`View history for ${obj.name || obj.main_task || 'object'}`}
                          title="View version history"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                        
                        {/* Delete Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            handleDeleteObject(e, obj.id);
                          }}
                          onMouseDown={(e) => {
                            e.stopPropagation(); // Prevent card click on mousedown
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all duration-200 relative z-20"
                          aria-label={`Delete ${obj.name || obj.main_task || 'object'}`}
                          title="Delete object"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </aside>

      {/* History Popup */}
      {historyPopup.isOpen && (
        <HistoryPopup
          object={objects.find(obj => obj.id === historyPopup.objectId)!}
          versions={getObjectVersions(historyPopup.objectId)}
          isOpen={historyPopup.isOpen}
          onClose={closeHistoryPopup}
          onSelectVersion={handleSelectVersion}
          position={historyPopup.position}
        />
      )}
    </>
  );
}

