import { useEffect, useReducer } from "react";
import type { OOPromptObject, Property, Suggestion, Conflict, SuggestionsState, ModalType } from "../types";

export type AppState = {
  oop: OOPromptObject;
  openPanel: boolean;
  objectPanelOpen: boolean;
  selectedPropertyId?: string;
  past: OOPromptObject[];
  future: OOPromptObject[];
  suggestions: SuggestionsState;
  modal: ModalType;
  modalData?: unknown;
  promptObjects: OOPromptObject[]; // Array of all saved prompt objects
  currentObjectId: string; // ID of the currently loaded object
  // Tab management for embedded objects
  openTabs: string[]; // Array of object IDs that are open in tabs
  activeTabId: string; // ID of the currently active tab
  // Save state tracking
  hasUnsavedChanges: boolean; // Track if current object has unsaved changes
  lastSavedState?: OOPromptObject; // Store last saved state for comparison
};

export type Action =
  | { type: "LOAD"; payload: OOPromptObject }
  | { type: "TOGGLE_PANEL"; open?: boolean }
  | { type: "TOGGLE_OBJECT_PANEL"; open?: boolean }
  | { type: "SET_OOP"; payload: OOPromptObject }          // Optimize (replace)
  | { type: "UPSERT_PROPERTY"; payload: Property }
  | { type: "DELETE_PROPERTY"; id: string }
  | { type: "SELECT_PROPERTY"; id?: string }
  | { type: "SET_SUGGESTIONS"; payload: { suggested: Suggestion[]; conflicts: Conflict[] } }
  | { type: "HIDE_SUGGESTIONS" }
  | { type: "OPEN_MODAL"; modal: ModalType; data?: unknown }
  | { type: "CLOSE_MODAL" }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "SAVE_PROMPT_OBJECT"; payload: OOPromptObject }
  | { type: "LOAD_PROMPT_OBJECT"; payload: OOPromptObject }
  | { type: "DELETE_PROMPT_OBJECT"; id: string }
  // New actions for tab management and embedding
  | { type: "OPEN_TAB"; objectId: string }
  | { type: "CLOSE_TAB"; objectId: string }
  | { type: "SWITCH_TAB"; objectId: string }
  | { type: "CREATE_EMBEDDED_OBJECT"; payload: { propertyId: string; parentObjectId: string } }
  | { type: "EMBED_EXISTING_OBJECT"; payload: { propertyId: string; objectId: string; objectName: string } }
  // Save state tracking actions
  | { type: "MARK_SAVED" }
  | { type: "MARK_UNSAVED" };

const KEY = "ooprompt_state_v1";

function pushHistory(state: AppState, next: OOPromptObject): AppState {
  const past = [...state.past, state.oop].slice(-20); // keep last 20
  return { ...state, oop: next, past, future: [] };
}

function logAction(oop: OOPromptObject, action: string, payload?: unknown): OOPromptObject {
  return {
    ...oop,
    log: [...oop.log, { ts: Date.now(), action, payload }]
  };
}

function reducer(state: AppState, action: Action, initial: OOPromptObject): AppState {
  switch (action.type) {
    case "LOAD":
      return { ...state, oop: action.payload };
    case "TOGGLE_PANEL":
      return { ...state, openPanel: action.open ?? !state.openPanel };
    case "TOGGLE_OBJECT_PANEL":
      return { ...state, objectPanelOpen: action.open ?? !state.objectPanelOpen };
    case "SET_OOP": {
      const updatedState = pushHistory(state, action.payload);
      
      // Also update the corresponding object in promptObjects if it exists
      const objectIndex = state.promptObjects.findIndex(obj => obj.id === action.payload.id);
      if (objectIndex >= 0) {
        const updatedPromptObjects = [...state.promptObjects];
        updatedPromptObjects[objectIndex] = {
          ...action.payload,
          updatedAt: Date.now()
        };
        
        return {
          ...updatedState,
          promptObjects: updatedPromptObjects,
          hasUnsavedChanges: true
        };
      }
      
      return { ...updatedState, hasUnsavedChanges: true };
    }
    case "UPSERT_PROPERTY": {
      const exists = state.oop.properties.some((p: Property) => p.id === action.payload.id);
      const props = exists
        ? state.oop.properties.map((p: Property) => p.id === action.payload.id ? action.payload : p)
        : [action.payload, ...state.oop.properties];
      const nextOop = logAction(state.oop, "UPSERT_PROPERTY", { propertyId: action.payload.id });
      return pushHistory({ ...state, hasUnsavedChanges: true }, { ...nextOop, properties: props } as OOPromptObject);
    }
    case "DELETE_PROPERTY": {
      const props = state.oop.properties.filter((p: Property) => p.id !== action.id);
      const nextOop = logAction(state.oop, "DELETE_PROPERTY", { propertyId: action.id });
      return pushHistory({ ...state, hasUnsavedChanges: true }, { ...nextOop, properties: props } as OOPromptObject);
    }
    case "SELECT_PROPERTY":
      return { ...state, selectedPropertyId: action.id };
    case "SET_SUGGESTIONS":
      return { 
        ...state, 
        suggestions: { 
          ...action.payload, 
          isVisible: true 
        } 
      };
    case "HIDE_SUGGESTIONS":
      return { 
        ...state, 
        suggestions: { 
          ...state.suggestions, 
          isVisible: false 
        } 
      };
    case "OPEN_MODAL":
      return { ...state, modal: action.modal, modalData: action.data };
    case "CLOSE_MODAL":
      return { ...state, modal: null, modalData: undefined };
    case "UNDO": {
      if (!state.past.length) return state;
      const prev = state.past[state.past.length - 1];
      const past = state.past.slice(0, -1);
      const future = [state.oop, ...state.future].slice(0, 20);
      return { ...state, oop: prev, past, future };
    }
    case "REDO": {
      if (!state.future.length) return state;
      const next = state.future[0];
      const future = state.future.slice(1);
      const past = [...state.past, state.oop].slice(-20);
      return { ...state, oop: next, past, future };
    }
    case "SAVE_PROMPT_OBJECT": {
      console.log('SAVE_PROMPT_OBJECT action:', action.payload);
      console.log('Current promptObjects:', state.promptObjects);
      
      // Check if this is an update to an existing object by comparing ID
      const existingIndex = state.promptObjects.findIndex(obj => obj.id === action.payload.id);
      
      console.log('Looking for existing object with ID:', action.payload.id);
      console.log('Existing object found at index:', existingIndex);
      
      let newPromptObjects;
      
      if (existingIndex >= 0) {
        // Update existing object with new timestamp
        console.log('Updating existing object at index:', existingIndex);
        console.log('Original object:', state.promptObjects[existingIndex]);
        const updatedObject = {
          ...action.payload,
          id: state.promptObjects[existingIndex].id, // Keep original ID
          createdAt: state.promptObjects[existingIndex].createdAt, // Keep original creation time
          updatedAt: Date.now() // Update timestamp
        };
        console.log('Updated object:', updatedObject);
        newPromptObjects = [...state.promptObjects];
        newPromptObjects[existingIndex] = updatedObject;
      } else {
        // Add new object with unique ID
        const newObject = {
          ...action.payload,
          id: `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        console.log('Adding new object:', newObject);
        newPromptObjects = [...state.promptObjects, newObject];
      }
      
      console.log('New promptObjects:', newPromptObjects);
      
      // If the saved object is the current object, mark as saved
      const isCurrentObject = action.payload.id === state.currentObjectId;
      
      return { 
        ...state, 
        promptObjects: newPromptObjects,
        hasUnsavedChanges: isCurrentObject ? false : state.hasUnsavedChanges,
        lastSavedState: isCurrentObject ? action.payload : state.lastSavedState
      };
    }
    case "LOAD_PROMPT_OBJECT": {
      return { ...state, oop: action.payload, currentObjectId: action.payload.id };
    }
    case "DELETE_PROMPT_OBJECT": {
      const newPromptObjects = state.promptObjects.filter(obj => obj.id !== action.id);
      // If we're deleting the currently loaded object, reset to default
      let newOop = state.oop;
      let newCurrentObjectId = state.currentObjectId;
      if (state.currentObjectId === action.id) {
        newOop = initial;
        newCurrentObjectId = initial.id;
      }
      return { ...state, promptObjects: newPromptObjects, oop: newOop, currentObjectId: newCurrentObjectId };
    }
    case "OPEN_TAB": {
      const newOpenTabs = state.openTabs.includes(action.objectId) 
        ? state.openTabs 
        : [...state.openTabs, action.objectId];
      return { ...state, openTabs: newOpenTabs, activeTabId: action.objectId };
    }
    case "CLOSE_TAB": {
      const newOpenTabs = state.openTabs.filter(id => id !== action.objectId);
      const newActiveTabId = state.activeTabId === action.objectId 
        ? (newOpenTabs.length > 0 ? newOpenTabs[newOpenTabs.length - 1] : state.currentObjectId)
        : state.activeTabId;
      return { ...state, openTabs: newOpenTabs, activeTabId: newActiveTabId };
    }
    case "SWITCH_TAB": {
      return { ...state, activeTabId: action.objectId };
    }
    case "CREATE_EMBEDDED_OBJECT": {
      // Find the property and parent object to get the property name and audience
      const parentObject = state.oop.id === action.payload.parentObjectId 
        ? state.oop 
        : state.promptObjects.find(obj => obj.id === action.payload.parentObjectId);
      
      const targetProperty = parentObject?.properties.find(prop => prop.id === action.payload.propertyId);
      const propertyName = targetProperty?.name || "Embedded Object";
      const parentAudience = parentObject?.audience || "";
      
      // Create a new embedded object with property name as both name and main_task for consistency
      const newEmbeddedObject: OOPromptObject = {
        id: `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: propertyName,
        main_task: propertyName,
        audience: parentAudience,
        properties: [],
        tabsOrder: [],
        log: [{ ts: Date.now(), action: "CREATE_EMBEDDED_OBJECT", payload: action.payload }],
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      // Update the property to reference the new embedded object
      const updatedProperties = state.oop.properties.map(prop => 
        prop.id === action.payload.propertyId 
          ? { 
              ...prop, 
              value: { 
                refObjectId: newEmbeddedObject.id, 
                refObjectName: newEmbeddedObject.name 
              },
              updatedAt: Date.now()
            }
          : prop
      );
      
      const updatedOop = { ...state.oop, properties: updatedProperties };
      
      // Add to prompt objects and open in new tab
      const newPromptObjects = [...state.promptObjects, newEmbeddedObject];
      const newOpenTabs = [...state.openTabs, newEmbeddedObject.id];
      
      return pushHistory({ 
        ...state, 
        promptObjects: newPromptObjects,
        openTabs: newOpenTabs,
        activeTabId: newEmbeddedObject.id
      }, updatedOop);
    }
    case "EMBED_EXISTING_OBJECT": {
      // Update the property to reference the existing object
      const updatedProperties = state.oop.properties.map(prop => 
        prop.id === action.payload.propertyId 
          ? { 
              ...prop, 
              value: { 
                refObjectId: action.payload.objectId, 
                refObjectName: action.payload.objectName 
              },
              updatedAt: Date.now()
            }
          : prop
      );
      
      const updatedOop = { ...state.oop, properties: updatedProperties };
      
      // Open the referenced object in a new tab
      const newOpenTabs = state.openTabs.includes(action.payload.objectId)
        ? state.openTabs
        : [...state.openTabs, action.payload.objectId];
      
      return pushHistory({ 
        ...state, 
        openTabs: newOpenTabs,
        activeTabId: action.payload.objectId
      }, updatedOop);
    }
    case "MARK_SAVED": {
      return { 
        ...state, 
        hasUnsavedChanges: false,
        lastSavedState: state.oop
      };
    }
    case "MARK_UNSAVED": {
      return { 
        ...state, 
        hasUnsavedChanges: true
      };
    }
    default:
      return state;
  }
}

export function useOOPrompt(initial: OOPromptObject) {
  const [state, dispatch] = useReducer(
    (state: AppState, action: Action) => reducer(state, action, initial),
    {
      oop: initial,
      openPanel: false,
      objectPanelOpen: false,
      selectedPropertyId: undefined,
      past: [],
      future: [],
      suggestions: { suggested: [], conflicts: [], isVisible: false },
      modal: null,
      modalData: undefined,
      promptObjects: [], // Start with no objects
      currentObjectId: initial.id,
      openTabs: [initial.id], // Start with the initial object as the first tab
      activeTabId: initial.id, // Initially active tab is the initial object
      hasUnsavedChanges: false, // Start with no unsaved changes
      lastSavedState: initial, // Initial state is considered saved
    }
  );

  // persist to chrome.storage (for extension) or localStorage (for web)
  // Save all important state including history, UI state, etc.
  useEffect(() => {
    // Debounce saves to avoid too frequent writes
    const timeoutId = setTimeout(() => {
      const dataToSave = {
        oop: state.oop,
        promptObjects: state.promptObjects,
        currentObjectId: state.currentObjectId,
        openPanel: state.openPanel,
        past: state.past, // Undo history
        future: state.future, // Redo history
        openTabs: state.openTabs,
        activeTabId: state.activeTabId,
        hasUnsavedChanges: state.hasUnsavedChanges,
        lastSavedState: state.lastSavedState
      };

      // Use chrome.storage if available (extension), otherwise fallback to localStorage
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        try {
          chrome.storage.local.set({ [KEY]: dataToSave }, () => {
            if (chrome.runtime.lastError) {
              console.error('Failed to save to chrome.storage:', chrome.runtime.lastError);
              // Fallback to localStorage
              try {
                localStorage.setItem(KEY, JSON.stringify(dataToSave));
                console.log('Saved to localStorage as fallback');
              } catch (localError) {
                console.error('Failed to save to localStorage:', localError);
              }
            } else {
              console.log('State saved successfully to chrome.storage');
            }
          });
        } catch (error) {
          console.error('Error saving to chrome.storage:', error);
          // Fallback to localStorage
          try {
            localStorage.setItem(KEY, JSON.stringify(dataToSave));
            console.log('Saved to localStorage as fallback');
          } catch (localError) {
            console.error('Failed to save to localStorage:', localError);
          }
        }
      } else {
        // Fallback to localStorage for web version
        try {
          localStorage.setItem(KEY, JSON.stringify(dataToSave));
          console.log('State saved successfully to localStorage');
        } catch (error) {
          console.error('Failed to save to localStorage:', error);
        }
      }
    }, 500); // Debounce by 500ms

    return () => clearTimeout(timeoutId);
  }, [state.oop, state.promptObjects, state.currentObjectId, state.openPanel, state.past, state.future, state.openTabs, state.activeTabId, state.hasUnsavedChanges, state.lastSavedState]);

  // hydrate from chrome.storage (for extension) or localStorage (for web)
  useEffect(() => {
    let hasLoaded = false;
    
    const loadData = (saved: any) => {
      if (hasLoaded) {
        console.log('Already loaded, skipping duplicate load');
        return;
      }
      
      if (!saved) {
        console.log('No saved data found');
        return;
      }
      
      hasLoaded = true;
      
      try {
        console.log('Loading saved data:', {
          promptObjectsCount: saved.promptObjects?.length || 0,
          currentObjectId: saved.currentObjectId,
          hasOop: !!saved.oop,
          openPanel: saved.openPanel
        });

        // Load prompt objects first (needed for loading current object)
        if (saved.promptObjects && Array.isArray(saved.promptObjects) && saved.promptObjects.length > 0) {
          console.log(`Loading ${saved.promptObjects.length} prompt objects`);
          // Load all prompt objects (including all versions/history)
          saved.promptObjects.forEach((obj: OOPromptObject) => {
            dispatch({ type: "SAVE_PROMPT_OBJECT", payload: obj });
          });
        }
        
        // Load current object
        if (saved.currentObjectId && saved.promptObjects && saved.promptObjects.length > 0) {
          const objectToLoad = saved.promptObjects.find((obj: OOPromptObject) => obj.id === saved.currentObjectId);
          if (objectToLoad) {
            console.log('Loading current object:', objectToLoad.id, objectToLoad.main_task);
            dispatch({ type: "LOAD_PROMPT_OBJECT", payload: objectToLoad });
          } else if (saved.oop) {
            console.log('Current object not found in promptObjects, loading saved oop');
            dispatch({ type: "LOAD", payload: saved.oop });
          }
        } else if (saved.oop && saved.oop.id !== initial.id) {
          // Fallback to saved oop if no currentObjectId and it's not the initial empty object
          console.log('Loading saved oop object');
          dispatch({ type: "LOAD", payload: saved.oop });
        }
        
        // Restore UI state
        if (saved.openPanel !== undefined) {
          dispatch({ type: "TOGGLE_PANEL", open: saved.openPanel });
        }
        
        console.log('Data loaded successfully');
      } catch (error) {
        console.error('Failed to load saved state:', error);
        hasLoaded = false; // Allow retry on error
      }
    };

    // Use chrome.storage if available (extension), otherwise fallback to localStorage
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      console.log('Loading from chrome.storage...');
      chrome.storage.local.get([KEY], (result) => {
        if (chrome.runtime.lastError) {
          console.error('Failed to load from chrome.storage:', chrome.runtime.lastError);
          // Try localStorage as fallback
          try {
            const raw = localStorage.getItem(KEY);
            if (raw) {
              const saved = JSON.parse(raw);
              loadData(saved);
            }
          } catch (error) {
            console.error('Failed to load from localStorage fallback:', error);
          }
          return;
        }
        console.log('Loaded from chrome.storage:', result);
        loadData(result[KEY]);
      });
    } else {
      // Fallback to localStorage for web version
      console.log('Using localStorage (chrome.storage not available)');
      try {
        const raw = localStorage.getItem(KEY);
        if (raw) {
          const saved = JSON.parse(raw);
          loadData(saved);
        } else {
          console.log('No data in localStorage');
        }
      } catch (error) {
        console.error('Failed to load from localStorage:', error);
      }
    }
  }, [initial]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              dispatch({ type: "REDO" });
            } else {
              dispatch({ type: "UNDO" });
            }
            break;
          case 'y':
            e.preventDefault();
            dispatch({ type: "REDO" });
            break;
          case '=':
          case '+':
            e.preventDefault();
            dispatch({ type: "TOGGLE_PANEL", open: true });
            break;
          case 'o':
            e.preventDefault();
            dispatch({ type: "TOGGLE_OBJECT_PANEL", open: true });
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return { state, dispatch };
}
