// Placeholder API functions - no real network calls
// const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export async function extractProperties(
  prompt: string, 
  main_task: string, 
  audience: string
): Promise<{ properties: Array<{ name: string; value: string }> }> {
  console.log('API: extractProperties', { prompt, main_task, audience });
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Return mock extracted properties
  return {
    properties: [
      { name: "Tone", value: "mysterious, hopeful" },
      { name: "Style", value: "descriptive, engaging" },
      { name: "Length", value: "medium" }
    ]
  };
}

export async function suggest(
  properties: Array<{ name: string; value: string }>, 
  main_task: string, 
  audience: string
): Promise<{ 
    suggested: Array<{ name: string; value: string }>;
    conflicts: Array<{ 
      name: string; 
      valueA: string; 
      valueB: string; 
      reason: string;
    }>;
  }> {
  console.log('API: suggest', { properties, main_task, audience });
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return {
    suggested: [
      { name: "Pacing", value: "steady build-up" },
      { name: "Emotion", value: "hopeful anticipation" }
    ],
    conflicts: [
      {
        name: "Tone",
        valueA: "mysterious, hopeful",
        valueB: "dark, ominous",
        reason: "Conflicting emotional directions"
      }
    ]
  };
}

export async function generateExamples(
  property: { name: string; value: string }
): Promise<{ examples: string[] }> {
  console.log('API: generateExamples', property);
  await new Promise(resolve => setTimeout(resolve, 300));
  
  return {
    examples: [
      `Example 1 for ${property.name}: ${property.value}`,
      `Example 2 for ${property.name}: ${property.value}`,
      `Example 3 for ${property.name}: ${property.value}`
    ]
  };
}
