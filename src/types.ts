export type Emphasis = "avoid" | "normal" | "important";
export type ValueRef = { refObjectId: string; refObjectName: string };

export type Property = {
  id: string;
  name: string;
  value: string | ValueRef;
  emphasis: Emphasis;            // single-select via segmented control
  examples?: string[];
  source?: "user" | "ai-suggested" | "ai-extracted";
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
  createdAt: number;
  updatedAt: number;
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

// New types for VITE_OBJECT_MODIFIER assistant
export type JsonPatchOp = {
  op: "add" | "remove" | "replace" | "test";
  path: string;
  value?: any;
};

export type ResolutionOption = {
  resolutionId: string;
  title: string;
  description: string;
  patch: JsonPatchOp[];
  confidence: number;
};

export type ConflictItem = {
  conflictId: string;
  severity: "error" | "warning" | "info";
  title: string;
  description: string;
  propertiesInvolved: string[];
  category: "duplicate_name" | "logic_conflict" | "singular_value_conflict";
  rationale: string;
  suggestedResolutions: ResolutionOption[];
  uiGroup?: "errors" | "warnings" | "infos";
};

export type SuggestedPropertyItem = {
  suggestionId: string;
  name: string;
  rationale: string;
  valueTemplate?: {
    type: "string" | "number" | "enum" | "json";
    placeholder?: string;
    example?: string;
    enumValues?: string[];
  };
  confidence: number;
  patch?: JsonPatchOp[];
};

export type LanguageModificationItem = {
  modId: string;
  scope: "property";
  targetId: string;
  current: { name?: string; value?: string };
  proposed: { name?: string; value?: string };
  rationale: string;
  confidence: number;
  patch: JsonPatchOp[];
};

export type ObjectModifierEnvelope = {
  schemaVersion: "1.0";
  requestType: "conflict_check" | "more_possible_properties" | "modify_language";
  oopromptId: string;
  summary: {
    total: number;
    errors: number;
    warnings: number;
    infos: number;
    hasMore: boolean;
    cursor: string | null;
  };
  uiHints: {
    grouping: "severity";
    defaultOpenSection: "errors";
  };
  conflicts?: ConflictItem[];
  suggestedProperties?: SuggestedPropertyItem[];
  languageModifications?: LanguageModificationItem[];
  metadata?: Record<string, unknown>;
};

export type ModalType = "add-property" | "conflict-resolve" | "examples" | "more-options" | "object-modifier" | null;
