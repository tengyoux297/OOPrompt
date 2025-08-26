import { useState, useEffect } from "react";
import type { OOPromptObject } from "../types";
import { BookmarkHandle } from "./BookmarkHandle";
import { HistoryPopup } from "./HistoryPopup";

type Props = {
  objects: OOPromptObject[];
  selectedObjectId: string | undefined;
  isOpen: boolean;
  onToggle: () => void;
  onSelectObject: (objectId: string) => void;
  onDeleteObject: (objectId: string) => void;
  onClose: () => void;
};

export function ObjectPanel({ objects, selectedObjectId, isOpen, onToggle, onSelectObject, onDeleteObject, onClose }: Props) {
  const [historyPopup, setHistoryPopup] = useState<{
    isOpen: boolean;
    objectId: string;
    position: { x: number; y: number };
  }>({
    isOpen: false,
    objectId: '',
    position: { x: 0, y: 0 }
  });

  const togglePanel = () => {
    onToggle();
  };

  // Debug logging for selectedObjectId changes
  useEffect(() => {
    console.log('ObjectPanel: selectedObjectId changed to:', selectedObjectId);
  }, [selectedObjectId]);

  // Don't show anything if there are no objects
  if (objects.length === 0) {
    return null;
  }



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
    console.log('ObjectPanel: handleObjectClick called with:', objectId);
    onSelectObject(objectId);
    // Keep the panel open so user can see other objects
  };

  const handleDeleteObject = (event: React.MouseEvent, objectId: string) => {
    event.stopPropagation(); // Prevent object selection when clicking delete
    if (confirm(`Are you sure you want to delete "${objects.find(obj => obj.id === objectId)?.name || 'this object'}"?`)) {
      onDeleteObject(objectId);
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
    console.log('ObjectPanel: handleSelectVersion called with version:', version.id, version.main_task);
    onSelectObject(version.id);
    closeHistoryPopup();
  };

  // Get all versions of the current object for history
  const getObjectVersions = (objectId: string) => {
    const currentObject = objects.find(obj => obj.id === objectId);
    if (!currentObject) return [];
    
    // Find all objects with the same main_task and audience as versions
    // This will show the complete history of this specific object
    const allVersions = objects.filter(obj => 
      obj.main_task === currentObject.main_task && 
      obj.audience === currentObject.audience
    ).sort((a, b) => b.updatedAt - a.updatedAt);
    
    console.log('Current object:', currentObject.main_task, currentObject.audience);
    console.log('All versions found:', allVersions.length);
    console.log('Versions:', allVersions.map(v => ({ id: v.id, updatedAt: new Date(v.updatedAt).toLocaleString() })));
    
    return allVersions;
  };

  return (
    <>
      {/* Bookmark handle - only visible when panel is closed */}
      {!isOpen && (
        <BookmarkHandle
          isOpen={false}
          onToggle={togglePanel}
          position="left"
          className="z-40"
        />
      )}

      {/* Object Panel */}
      {isOpen && (
        <aside className="fixed top-0 left-0 bottom-0 z-50 h-screen w-80 bg-white border-r border-gray-200 shadow-lg">
          {/* Bookmark handle for closing panel - positioned on right edge of panel */}
          <BookmarkHandle
            isOpen={true}
            position="left"
            onToggle={togglePanel}
            className="z-10"
          />
          
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="panel-chrome p-4 border-b border-divider flex-shrink-0">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Object Panel</h2>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Close object panel"
                >
                  ×
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {displayObjects.length} unique prompt object{displayObjects.length !== 1 ? 's' : ''} available
              </p>
              {/* Debug info */}
              <p className="text-xs text-gray-400 mt-1">
                Selected: {selectedObjectId || 'none'}
              </p>
            </div>

            {/* Objects List */}
            <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-4">
              {displayObjects.map((obj) => {
                const isSelected = selectedObjectId === obj.id;
                console.log(`Object ${obj.id} (${obj.main_task}): isSelected = ${isSelected}, selectedObjectId = ${selectedObjectId}`);
                
                return (
                  <div
                    key={obj.id}
                    className={`card-base cursor-pointer transition-all duration-200 hover:shadow-md p-4 ${
                      isSelected ? 'ring-2 ring-blue-500 ring-offset-2 shadow-lg' : ''
                    }`}
                    onClick={() => handleObjectClick(obj.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0 pr-3">
                        <div className="font-semibold text-sm leading-tight text-gray-900 mb-2 break-words" title={obj.main_task}>
                          {obj.main_task || <span className="text-gray-400 italic">No main task</span>}
                        </div>
                        <div className="text-sm text-gray-600 mb-1">
                          {obj.properties.length} propert{obj.properties.length !== 1 ? 'ies' : 'y'}
                        </div>
                        <div className="text-sm text-gray-500">
                          Last updated: {obj.updatedAt ? new Date(obj.updatedAt).toLocaleString() : 
                            obj.log && obj.log.length > 0 ? new Date(obj.log[obj.log.length - 1].ts).toLocaleString() : 
                            'Just now'}
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {/* History Button */}
                        <button
                          onClick={(e) => handleHistoryClick(e, obj.id)}
                          className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                          aria-label={`View history for ${obj.name}`}
                          title="View version history"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                        
                        {/* Delete Button */}
                        <button
                          onClick={(e) => handleDeleteObject(e, obj.id)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          aria-label={`Delete ${obj.name}`}
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
              })}
            </div>

            {/* Footer */}
            <div className="panel-chrome p-4 border-t border-divider flex-shrink-0">
              <div className="text-sm text-gray-500 text-center">
                Click on an object to load it into the OOP panel
              </div>
            </div>
          </div>
        </aside>
      )}

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
