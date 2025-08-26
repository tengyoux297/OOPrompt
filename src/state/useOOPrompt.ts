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
  | { type: "DELETE_PROMPT_OBJECT"; id: string };

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
    case "SET_OOP":
      return pushHistory(state, action.payload);
    case "UPSERT_PROPERTY": {
      const exists = state.oop.properties.some((p: Property) => p.id === action.payload.id);
      const props = exists
        ? state.oop.properties.map((p: Property) => p.id === action.payload.id ? action.payload : p)
        : [action.payload, ...state.oop.properties];
      const nextOop = logAction(state.oop, "UPSERT_PROPERTY", { propertyId: action.payload.id });
      return pushHistory(state, { ...nextOop, properties: props } as OOPromptObject);
    }
    case "DELETE_PROPERTY": {
      const props = state.oop.properties.filter((p: Property) => p.id !== action.id);
      const nextOop = logAction(state.oop, "DELETE_PROPERTY", { propertyId: action.id });
      return pushHistory(state, { ...nextOop, properties: props } as OOPromptObject);
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
      return { ...state, promptObjects: newPromptObjects };
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
    }
  );

  // persist
  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify({
      oop: state.oop,
      promptObjects: state.promptObjects,
      currentObjectId: state.currentObjectId
    }));
  }, [state.oop, state.promptObjects, state.currentObjectId]);

  // hydrate
  useEffect(() => {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      try { 
        const saved = JSON.parse(raw);
        if (saved.oop) {
          dispatch({ type: "LOAD", payload: saved.oop });
        }
        if (saved.promptObjects) {
          saved.promptObjects.forEach((obj: OOPromptObject) => {
            dispatch({ type: "SAVE_PROMPT_OBJECT", payload: obj });
          });
        }
        if (saved.currentObjectId) {
          dispatch({ type: "LOAD_PROMPT_OBJECT", payload: saved.promptObjects?.find((obj: OOPromptObject) => obj.id === saved.currentObjectId) || initial });
        }
      } catch {}
    }
  }, []);

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
