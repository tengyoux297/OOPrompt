export type Importance = "avoid" | "normal" | "highlight";
export type ValueRef = { refObjectId: string; refObjectName: string };

export type Property = {
  id: string;
  name: string;
  value: string | ValueRef;
  importance: Importance;            // single-select via segmented control
  examples?: string[];
  source?: "user" | "ai-suggested";
  createdAt: number;
  updatedAt: number;
};

export type OOPromptObject = {
  id: string;
  name: string;
  main_task: string;
  audience: string;
  properties: Property[];
  tabsOrder: string[];
  log: { ts: number; action: string; payload?: unknown }[];
};

// UI state types
export type Suggestion = {
  name: string;
  value: string;
};

export type Conflict = {
  name: string;
  valueA: string;
  valueB: string;
  reason: string;
};

export type SuggestionsState = {
  suggested: Suggestion[];
  conflicts: Conflict[];
  isVisible: boolean;
};

export type ModalType = "add-property" | "conflict-resolve" | "examples" | "more-options" | null;
