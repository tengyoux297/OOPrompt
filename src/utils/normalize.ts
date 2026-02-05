/**
 * Shared utility functions for normalizing OOPromptObject and Property structures
 * This ensures consistency across the application
 */

import type { OOPromptObject, Property } from '../types';

/**
 * Normalizes an OOPromptObject to ensure it has the correct structure
 * This is critical for ensuring JSON serialization works correctly
 */
export function normalizeOOPromptObject(obj: OOPromptObject): OOPromptObject {
  const normalized: OOPromptObject = {
    id: obj.id || 'root',
    name: obj.name || '',
    main_task: obj.main_task || '',
    audience: obj.audience || '',
    properties: (obj.properties || []).map(prop => normalizeProperty(prop)),
    tabsOrder: Array.isArray(obj.tabsOrder) ? obj.tabsOrder : (obj.tabsOrder ? [obj.tabsOrder] : ['root']),
    log: Array.isArray(obj.log) ? obj.log : [],
    createdAt: typeof obj.createdAt === 'number' ? obj.createdAt : Date.now(),
    updatedAt: typeof obj.updatedAt === 'number' ? obj.updatedAt : Date.now(),
  };
  
  return normalized;
}

/**
 * Normalizes a Property to ensure it has the correct structure
 */
export function normalizeProperty(prop: Property): Property {
  const normalized: Property = {
    id: prop.id || `p${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: typeof prop.name === 'string' ? prop.name : '',
    value: prop.value || '',
    emphasis: prop.emphasis || 'normal',
    createdAt: typeof prop.createdAt === 'number' ? prop.createdAt : Date.now(),
    updatedAt: typeof prop.updatedAt === 'number' ? prop.updatedAt : Date.now(),
  };
  
  // Add optional fields if they exist
  if (prop.examples && Array.isArray(prop.examples)) {
    normalized.examples = prop.examples;
  }
  if (prop.source) {
    normalized.source = prop.source;
  }
  
  return normalized;
}
