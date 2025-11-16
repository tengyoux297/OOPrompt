// API functions using LLM service
import { llmService } from './services/llmService';

export async function extractProperties(
  prompt: string, 
  main_task: string, 
  audience: string
): Promise<{ properties: Array<{ name: string; value: string }> }> {
  console.log('API: extractProperties', { prompt, main_task, audience });
  
  try {
    return await llmService.extractProperties(prompt, main_task, audience);
  } catch (error) {
    console.error('Property extraction failed:', error);
    // Fallback to mock data if LLM fails
    return {
      properties: [
        { name: "Tone", value: "mysterious, hopeful" },
        { name: "Style", value: "descriptive, engaging" },
        { name: "Length", value: "medium" }
      ]
    };
  }
}

export async function suggest(
  _properties: Array<{ name: string; value: string }>, 
  _main_task: string, 
  _audience: string
): Promise<{ 
    suggested: Array<{ name: string; value: string }>;
    conflicts: Array<{ 
      name: string; 
      valueA: string; 
      valueB: string; 
      reason: string;
    }>;
  }> {
  console.log('API: suggest - DEPRECATED, use ObjectModifier assistant instead');
  console.log('This function is kept for backward compatibility but should not be used');
  
  // Return empty results to encourage using the new ObjectModifier
  return {
    suggested: [],
    conflicts: []
  };
}

export async function generateExamples(
  property: { name: string; value: string },
  oopromptObject: any // Full OOPromptObject for context
): Promise<{ examples: string[] }> {
  console.log('API: generateExamples', { property, oopromptObject });
  
  try {
    // Call the real LLM service to generate examples
    const result = await llmService.generateExamples(property.name, oopromptObject);
    return result;
  } catch (error) {
    console.error('Failed to generate examples:', error);
    // Return empty examples array on error
    return { examples: [] };
  }
}

export async function generateExamplesMultiple(
  properties: Array<{ name: string; value: string }>,
  oopromptObject: any,
  maxConcurrency: number = 3
): Promise<Record<string, string[]>> {
  console.log('API: generateExamplesMultiple', { count: properties.length });
  try {
    const names = properties.map(p => p.name);
    const result = await llmService.generateExamplesBatch(names, oopromptObject, maxConcurrency);
    return result.examplesByProperty;
  } catch (error) {
    console.error('Failed to generate multiple examples:', error);
    return {};
  }
}