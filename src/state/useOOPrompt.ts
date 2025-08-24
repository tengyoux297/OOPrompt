import { useEffect, useReducer } from "react";
import type { OOPromptObject, Property, Suggestion, Conflict, SuggestionsState, ModalType } from "../types";

export type AppState = {
  oop: OOPromptObject;
  openPanel: boolean;
  selectedPropertyId?: string;
  past: OOPromptObject[];
  future: OOPromptObject[];
  suggestions: SuggestionsState;
  modal: ModalType;
  modalData?: unknown;
};

export type Action =
  | { type: "LOAD"; payload: OOPromptObject }
  | { type: "TOGGLE_PANEL"; open?: boolean }
  | { type: "SET_OOP"; payload: OOPromptObject }          // Optimize (replace)
  | { type: "UPSERT_PROPERTY"; payload: Property }
  | { type: "DELETE_PROPERTY"; id: string }
  | { type: "SELECT_PROPERTY"; id?: string }
  | { type: "SET_SUGGESTIONS"; payload: { suggested: Suggestion[]; conflicts: Conflict[] } }
  | { type: "HIDE_SUGGESTIONS" }
  | { type: "OPEN_MODAL"; modal: ModalType; data?: unknown }
  | { type: "CLOSE_MODAL" }
  | { type: "UNDO" }
  | { type: "REDO" };

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

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "LOAD":
      return { ...state, oop: action.payload };
    case "TOGGLE_PANEL":
      return { ...state, openPanel: action.open ?? !state.openPanel };
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
    default:
      return state;
  }
}

export function useOOPrompt(initial: OOPromptObject) {
  const [state, dispatch] = useReducer(reducer, {
    oop: initial,
    openPanel: false,
    selectedPropertyId: undefined,
    past: [],
    future: [],
    suggestions: { suggested: [], conflicts: [], isVisible: false },
    modal: null,
    modalData: undefined,
  });

  // persist
  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(state.oop));
  }, [state.oop]);

  // hydrate
  useEffect(() => {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      try { dispatch({ type: "LOAD", payload: JSON.parse(raw) }); } catch {}
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
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return { state, dispatch };
}
