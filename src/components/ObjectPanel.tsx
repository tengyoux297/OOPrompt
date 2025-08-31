import { useState, useEffect } from "react";
import type { OOPromptObject } from "../types";
import { HistoryPopup } from "./HistoryPopup";

type Props = {
  objects: OOPromptObject[];
  selectedObjectId: string | undefined;
  onSelectObject: (objectId: string) => void;
  onDeleteObject: (objectId: string) => void;
  onOpenOOPPanel?: () => void; // New prop to open OOP panel
};

export function ObjectPanel({ objects, selectedObjectId, onSelectObject, onDeleteObject, onOpenOOPPanel }: Props) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [historyPopup, setHistoryPopup] = useState<{
    isOpen: boolean;
    objectId: string;
    position: { x: number; y: number };
  }>({
    isOpen: false,
    objectId: '',
    position: { x: 0, y: 0 }
  });

  // Debug logging for selectedObjectId changes
  useEffect(() => {
    console.log('ObjectPanel: selectedObjectId changed to:', selectedObjectId);
  }, [selectedObjectId]);



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
    onOpenOOPPanel?.(); // Automatically open OOP panel when an object is selected
  };

  const handleDeleteObject = (event: React.MouseEvent, objectId: string) => {
    event.stopPropagation(); // Prevent object selection when clicking delete
    if (confirm(`Are you sure you want to delete "${objects.find(obj => obj.id === objectId)?.name || 'this object'}"?`)) {
      onDeleteObject(objectId);
      onOpenOOPPanel?.(); // Automatically open OOP panel after deletion
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
    onOpenOOPPanel?.(); // Automatically open OOP panel when a version is selected
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
             {/* Object Panel - Always visible on left side */}
       <aside className="lg:fixed lg:top-16 lg:left-0 lg:bottom-0 lg:z-40 lg:h-[calc(100vh-4rem)] lg:w-80 w-full h-auto bg-white border-r border-gray-300 shadow-lg lg:shadow-lg order-first lg:order-none">
          
          <div className="flex flex-col h-full">
                         {/* Header */}
             <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white flex-shrink-0">
               {/* Mobile Toggle Button */}
               <div className="lg:hidden mb-3">
                 <button
                   onClick={() => setIsCollapsed(!isCollapsed)}
                   className="w-full p-2 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-between text-sm font-medium text-gray-700 transition-colors"
                 >
                   <span>History Prompts</span>
                   <svg 
                     className={`w-4 h-4 transition-transform ${isCollapsed ? 'rotate-180' : ''}`} 
                     fill="none" 
                     stroke="currentColor" 
                     viewBox="0 0 24 24"
                   >
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                   </svg>
                 </button>
               </div>
               
               {/* Blue Title Bar with Button */}
               <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg px-4 py-2 flex items-center justify-between">
                 <h3 className="text-white font-semibold text-sm">History Prompts</h3>
                 <button
                   onClick={onOpenOOPPanel}
                   className="p-1.5 text-white hover:text-blue-100 hover:bg-blue-500 rounded-lg transition-all duration-200"
                   aria-label="New prompt"
                   title="New prompt"
                 >
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                   </svg>
                 </button>
               </div>
             </div>

                         {/* Objects List */}
             <div className={`flex-1 overflow-y-auto min-h-0 p-3 space-y-2 transition-all duration-300 ${
               isCollapsed ? 'lg:block hidden' : 'block'
             }`}>
               {displayObjects.map((obj) => {
                 const isSelected = selectedObjectId === obj.id;
                 console.log(`Object ${obj.id} (${obj.main_task}): isSelected = ${isSelected}, selectedObjectId = ${selectedObjectId}`);
                 
                 return (
                   <div
                     key={obj.id}
                     className={`group cursor-pointer transition-all duration-200 hover:shadow-md border border-gray-200 hover:border-gray-300 px-4 py-4 rounded-xl bg-white ${
                       isSelected ? 'ring-2 ring-blue-500 ring-offset-2 border-blue-300 shadow-lg bg-blue-50' : 'hover:bg-gray-50'
                     }`}
                     onClick={() => handleObjectClick(obj.id)}
                   >
                     <div className="flex items-start justify-between">
                       <div className="flex-1 min-w-0 pr-3">
                         <div className="font-semibold text-sm leading-tight text-gray-900 mb-2 break-words line-clamp-2" title={obj.main_task}>
                           {obj.main_task || <span className="text-gray-400 italic">No main task</span>}
                         </div>
                         <div className="flex items-center gap-3 text-xs text-gray-500">
                           <span className="flex items-center gap-1">
                             <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                             </svg>
                             {obj.properties.length} propert{obj.properties.length !== 1 ? 'ies' : 'y'}
                           </span>
                           <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                           <span className="flex items-center gap-1">
                             <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                             </svg>
                             {obj.updatedAt ? new Date(obj.updatedAt).toLocaleDateString() : 'Just now'}
                           </span>
                         </div>
                       </div>
                       
                       {/* Action Buttons - Only visible on hover */}
                       <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                         {/* History Button */}
                         <button
                           onClick={(e) => handleHistoryClick(e, obj.id)}
                           className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 border border-transparent hover:border-blue-200"
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
                           className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 border border-transparent hover:border-red-200"
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
             <div className={`p-4 border-t border-gray-200 bg-gray-50 flex-shrink-0 transition-all duration-300 ${
               isCollapsed ? 'lg:block hidden' : 'block'
             }`}>
               <div className="text-center">
                 <div className="text-xs text-gray-500 mb-1">
                   {displayObjects.length} prompt{displayObjects.length !== 1 ? 's' : ''} in history
                 </div>
                 <div className="text-xs text-gray-400">
                   Click to load • Hover for actions
                 </div>
               </div>
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
