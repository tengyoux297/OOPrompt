// LLM API Service for multiple providers
export type LLMProvider = 'openai' | 'gemini' | 'claude';

// Import types from the main types file
import type { OOPromptObject, Property, FileReference, ObjectModifierEnvelope } from '../types';
// Import system prompts
import { getSystemPrompt } from '../config/systemPrompts';


// Use the proper types from the main types file with extensions for internal use
interface PropertyData extends Property {
  fileNote?: string; // Additional field for internal processing
}

interface OOPObjectData extends Omit<OOPromptObject, 'properties'> {
  properties: PropertyData[];
}

export interface LLMResponse {
  content: string;
  provider: LLMProvider;
  timestamp: Date;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface FileAttachment {
  fileName: string;
  fileType: string;
  fileSize: number;
  data: string | ArrayBuffer | null;
  propertyName?: string; // Add property context for better association
  propertyId?: string;   // Add property ID for precise tracking
}

// Remove this duplicate interface - we already have the proper one in types.ts

class LLMService {
  private openaiApiKey: string;
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheTTL = 5 * 60 * 1000;
  private pendingRequests = new Map<string, Promise<any>>();

  constructor() {
    // Get default API keys from environment
    const defaultOpenaiApiKey = import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.OPENAI_API_KEY || '';
    
    // Initialize with default key, will be updated from storage if available
    this.openaiApiKey = defaultOpenaiApiKey;
    
    // Load custom API key from storage
    this.loadCustomApiKey();
    
    // Debug logging for API keys
    console.log('LLM Service initialized with API keys:');
    console.log('OpenAI:', !!this.openaiApiKey);
  }

  private async loadCustomApiKey(): Promise<void> {
    try {
      // Try chrome.storage first (for extension)
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const result = await chrome.storage.local.get('customOpenaiApiKey');
        if (result && result.customOpenaiApiKey && typeof result.customOpenaiApiKey === 'string' && result.customOpenaiApiKey.trim()) {
          this.openaiApiKey = result.customOpenaiApiKey.trim();
          console.log('Loaded custom OpenAI API key from chrome.storage');
          return;
        }
      }
      
      // Fallback to localStorage (for web) - synchronous
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem('customOpenaiApiKey');
        if (stored && stored.trim()) {
          this.openaiApiKey = stored.trim();
          console.log('Loaded custom OpenAI API key from localStorage');
          return;
        }
      }
      
      // If no custom key found, use default from env
      const defaultKey = this.getDefaultApiKey();
      if (defaultKey && defaultKey.trim()) {
        this.openaiApiKey = defaultKey.trim();
      } else {
        this.openaiApiKey = '';
      }
    } catch (error) {
      console.error('Failed to load custom API key:', error);
      // On error, fall back to default
      const defaultKey = this.getDefaultApiKey();
      this.openaiApiKey = defaultKey ? defaultKey.trim() : '';
    }
  }

  // Ensure API key is loaded before making requests
  private async ensureApiKeyLoaded(): Promise<void> {
    // If we're using chrome.storage, make sure it's loaded
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      // Check if we've already loaded (by checking if key differs from default)
      const defaultKey = import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.OPENAI_API_KEY || '';
      if (this.openaiApiKey === defaultKey) {
        // Might not be loaded yet, try loading
        await this.loadCustomApiKey();
      }
    }
  }

  async setCustomApiKey(apiKey: string): Promise<void> {
    const defaultKey = import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.OPENAI_API_KEY || '';
    
    // If empty, use default and remove custom key
    if (!apiKey.trim()) {
      this.openaiApiKey = defaultKey;
      try {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          await chrome.storage.local.remove('customOpenaiApiKey');
        } else if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.removeItem('customOpenaiApiKey');
        }
        console.log('Reset to default OpenAI API key');
      } catch (error) {
        console.error('Failed to remove custom API key:', error);
      }
      return;
    }

    // Validate API key format
    if (!apiKey.trim().startsWith('sk-') || apiKey.trim().length < 20) {
      throw new Error('Invalid API key format. OpenAI API keys should start with "sk-" and be at least 20 characters long.');
    }

    // Save custom key
    this.openaiApiKey = apiKey.trim();
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        await chrome.storage.local.set({ customOpenaiApiKey: apiKey.trim() });
        console.log('Saved custom OpenAI API key to chrome.storage');
      } else if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('customOpenaiApiKey', apiKey.trim());
        console.log('Saved custom OpenAI API key to localStorage');
      }
    } catch (error) {
      console.error('Failed to save custom API key:', error);
      throw new Error('Failed to save API key');
    }
  }

  getCurrentApiKey(): string {
    return this.openaiApiKey;
  }

  getDefaultApiKey(): string {
    return import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.OPENAI_API_KEY || '';
  }

  hasCustomApiKey(): boolean {
    const defaultKey = this.getDefaultApiKey();
    return this.openaiApiKey !== defaultKey && this.openaiApiKey !== '';
  }

  hasApiKey(): boolean {
    // Check if there's any API key available (default or custom)
    // Exclude placeholder values
    const key = this.openaiApiKey.trim();
    if (!key || key === '') {
      return false;
    }
    // Check for common placeholder patterns
    if (key.includes('your_') || key.includes('YOUR_') || key.includes('api_key_here')) {
      return false;
    }
    // Must start with 'sk-' for OpenAI keys
    if (key.startsWith('sk-') && key.length >= 20) {
      return true;
    }
    // For other formats, just check it's not empty
    return key.length > 0;
  }

  async checkAndLoadApiKey(): Promise<boolean> {
    // Ensure API key is loaded from storage
    await this.loadCustomApiKey();
    const hasKey = this.hasApiKey();
    console.log('API key check:', {
      hasKey,
      keyLength: this.openaiApiKey.length,
      keyPreview: this.openaiApiKey.substring(0, 7) + '...',
      hasDefaultKey: !!this.getDefaultApiKey()
    });
    return hasKey;
  }

  // Set default system prompt (will be automatically added to all chat requests)

  private getCacheKey(method: string, ...args: any[]): string {
    return `${method}:${JSON.stringify(args)}`;
  }

  private async withRequestDedup<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const existing = this.pendingRequests.get(key) as Promise<T> | undefined;
    if (existing) return existing;
    const promise = fn().finally(() => this.pendingRequests.delete(key));
    this.pendingRequests.set(key, promise);
    return promise;
  }


  // Parallel execution helper with simple concurrency control
  private async executeInParallel<T>(
    tasks: Array<() => Promise<T>>,
    maxConcurrency: number = 3
  ): Promise<T[]> {
    const results: T[] = [];
    let index = 0;

    async function worker() {
      while (index < tasks.length) {
        const current = index++;
        const result = await tasks[current]();
        results[current] = result;
      }
    }

    const workers = Array.from({ length: Math.min(maxConcurrency, tasks.length) }, () => worker());
    await Promise.all(workers);
    return results;
  }

  // OpenAI Chat Completion - Use regular Chat Completions API (faster, simpler for general purpose)
  async chatWithOpenAI(
    messages: ChatMessage[],
    fileAttachments?: FileAttachment[]
  ): Promise<LLMResponse> {
    if (!this.openaiApiKey) {
      throw new Error("OpenAI API key not configured");
    }
  
    try {
      console.log("Using OpenAI Responses API (recommended)...");
      return await this.chatWithOpenAIResponses(messages, fileAttachments || []);
    } catch (error) {
      console.error("OpenAI Responses API error:", error);
      throw error;
    }
  }

  // Regular OpenAI Chat Completions API (simpler, faster, no polling needed)
  private async chatWithOpenAIResponses(
    messages: ChatMessage[],
    fileAttachments: FileAttachment[]
  ): Promise<LLMResponse> {
    // 1) Normalize and split system vs non-system messages
    const normalized = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));
  
    const systemMessages = normalized.filter((m) => m.role === "system");
    const nonSystemMessages = normalized.filter((m) => m.role !== "system");
  
    // 2) Determine instructions:
    //    - If caller provided system messages, combine them
    //    - Else no instructions
    const instructions =
      systemMessages.length > 0
        ? systemMessages.map((m) => m.content).join("\n\n")
        : undefined;
  
    // 3) File attachments: keep your existing "text note" approach
    //    (Responses API supports tools like file_search, but that is a different integration surface.)
    const nonSystemWithFiles = this.injectFileNotesIntoLastUserMessage(
      nonSystemMessages,
      fileAttachments
    );
  
    // 4) Build Responses API `input` in role-based form
    //    OpenAI Responses API accepts an array of role/content items. :contentReference[oaicite:1]{index=1}
    const input = nonSystemWithFiles.map((m) => ({
      role: m.role,
      content: m.content,
    }));
  
    // 5) Call OpenAI
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-5.2",
        // Recommended pattern: keep system-level instructions in `instructions`
        instructions,
        input,
        temperature: 0.7,
        max_output_tokens: 2000,
      }),
    });
  
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Responses API error:", response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }
  
    const data = await response.json();
  
    // `output_text` is the simplest way to read text output in Responses. :contentReference[oaicite:2]{index=2}
    const content =
      typeof data.output_text === "string" && data.output_text.trim()
        ? data.output_text
        : this.extractTextFromResponsesOutput(data);
  
    if (!content) {
      throw new Error("Invalid response format from OpenAI Responses API (no text output found)");
    }
  
    return {
      content,
      provider: "openai",
      timestamp: new Date(),
    };
  }

  private injectFileNotesIntoLastUserMessage(
    messages: Array<{ role: string; content: string }>,
    fileAttachments: FileAttachment[]
  ): Array<{ role: string; content: string }> {
    if (!fileAttachments || fileAttachments.length === 0) return messages;
  
    const fileInfo = fileAttachments
      .map((file) => {
        const sizeKb = (file.fileSize / 1024).toFixed(1);
        const propCtx =
          file.propertyName || file.propertyId
            ? ` (property: ${file.propertyName ?? ""}${file.propertyName && file.propertyId ? ", " : ""}${
                file.propertyId ?? ""
              })`
            : "";
        return `[File attached: ${file.fileName} (${file.fileType}, ${sizeKb} KB)${propCtx}]`;
      })
      .join("\n");
  
    const lastUserIndex = [...messages]
      .map((m, i) => (m.role === "user" ? i : -1))
      .filter((i) => i !== -1)
      .pop();
  
    if (lastUserIndex === undefined) return messages;
  
    const updated = messages.map((m, i) => {
      if (i !== lastUserIndex) return m;
      return {
        ...m,
        content:
          `${m.content}\n\n` +
          `Attached files (references only):\n${fileInfo}\n\n` +
          `Note: In this stateless Responses API mode, file contents are not uploaded or searchable unless you implement file handling (e.g., file_search / your own retrieval).`,
      };
    });
  
    console.log(`Including file references for ${fileAttachments.length} files (as text notes)`);
    return updated;
  }
  
  /**
   * Fallback extractor: if output_text is missing, try to derive text from `output`.
   * This is defensive parsing to avoid brittle failures if response shape changes.
   */
  private extractTextFromResponsesOutput(data: any): string {
    try {
      // Common shape: data.output is an array of items; some contain content blocks
      const output = data?.output;
      if (!Array.isArray(output)) return "";
  
      const texts: string[] = [];
  
      for (const item of output) {
        // Some items have `content` which is an array of blocks
        const contentBlocks = item?.content;
        if (Array.isArray(contentBlocks)) {
          for (const block of contentBlocks) {
            // Typical text block: { type: "output_text", text: "..." } or similar
            if (typeof block?.text === "string") texts.push(block.text);
            if (typeof block?.value === "string") texts.push(block.value);
          }
        }
  
        // Some items may embed text directly
        if (typeof item?.text === "string") texts.push(item.text);
      }
  
      return texts.join("\n").trim();
    } catch {
      return "";
    }
  }



  // Property extraction using OpenAI Assistant
  async extractPropertiesWithAssistant(prompt: string): Promise<OOPObjectData> {
    await this.ensureApiKeyLoaded();
    if (!this.openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Simple cache
    const cacheKey = this.getCacheKey('extractPropertiesWithAssistant', prompt);
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }

    // Deduplicate concurrent identical requests
    return this.withRequestDedup(cacheKey, async () => {
      const result = await this.extractPropertiesWithAssistantInternal(prompt);
      this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
      return result;
    });
  }

  // Internal implementation kept separate for caching/dedup
  private async extractPropertiesWithAssistantInternal(prompt: string): Promise<OOPObjectData> {
    console.log('Extracting properties using Responses API with PROPERTY_EXTRACTOR system prompt');
    
    try {
      // Use Responses API with PROPERTY_EXTRACTOR system prompt
      const response = await this.chatWithOpenAI([
        { role: 'system', content: getSystemPrompt('PROPERTY_EXTRACTOR') },
        { role: 'user', content: prompt }
      ]);

      try {
        // Parse the JSON response
        const oopObject = JSON.parse(response.content);
        return oopObject;
      } catch (parseError) {
        console.error('Failed to parse response:', parseError);
        console.error('Raw response:', response.content);
        throw new Error('Invalid JSON response from API');
      }
    } catch (error) {
      console.error('Property extraction failed:', error);
      throw error;
    }
  }


  // Build prompt using PROMPT_BUILDER system prompt
  async buildPromptWithAssistant(oopObject: OOPObjectData): Promise<string> {
    await this.ensureApiKeyLoaded();
    if (!this.openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }
    
    console.log('Building prompt using Responses API with PROMPT_BUILDER system prompt');
    
    // Count files for property-file associations
    const propertiesWithFiles = oopObject.properties?.filter((prop: PropertyData) => prop.fileData) || [];
    
    // Clean the OOP object to remove fileData (which contains large binary data)
    const cleanOopObject = {
      ...oopObject,
      properties: oopObject.properties?.map((prop: PropertyData) => {
        const cleanProp = { ...prop };
        // Remove fileData to avoid sending large binary data
        if (cleanProp.fileData) {
          delete cleanProp.fileData;
          // Enhanced property-specific file note
          if (cleanProp.fileReference) {
            const fileRef = cleanProp.fileReference as FileReference;
            cleanProp.fileNote = `File "${fileRef.fileName}" (${fileRef.fileType}) is specifically attached to this "${prop.name}" property and should be used to fulfill the requirements for this property.`;
          }
        }
        return cleanProp;
      }) || []
    };
    
    console.log('Cleaned OOP object for PROMPT_BUILDER:', cleanOopObject);
    console.log(`Properties with files: ${propertiesWithFiles.length}`);

    try {
      // Build input according to PROMPT_BUILDER prompt format
      const inputData: any = {
        ooprompt: cleanOopObject
      };
      
      // If there are embedded objects (ValueRefs), we need objectIndex
      // For now, we'll send just the ooprompt - objectIndex can be added later if needed
      
      // Use Responses API with PROMPT_BUILDER system prompt
      const response = await this.chatWithOpenAI([
        { role: 'system', content: getSystemPrompt('PROMPT_BUILDER') },
        { role: 'user', content: JSON.stringify(inputData, null, 2) }
      ]);

      // Return the prompt text (should be plain text, not JSON)
      return response.content.trim();
    } catch (error) { 
      console.error('Prompt building failed:', error); 
      throw error; 
    }
  }

  // Merge free text with current OOP object using PROPERTY_ADDER system prompt
  async mergeFreeTextWithOOP(freeText: string, currentOOP: OOPObjectData): Promise<OOPObjectData> {
    await this.ensureApiKeyLoaded();
    if (!this.openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }
    
    console.log('Merging free text with current OOP object using Responses API...');
    console.log('Free text:', freeText);
    console.log('Current OOP:', currentOOP);
    
    try {
      // Prepare input according to PROPERTY_ADDER prompt format
      const inputData = {
        current: currentOOP,
        addition_text: freeText
      };

      // Use Responses API with PROPERTY_ADDER system prompt
      const response = await this.chatWithOpenAI([
        { role: 'system', content: getSystemPrompt('PROPERTY_ADDER') },
        { role: 'user', content: JSON.stringify(inputData, null, 2) }
      ]);

      try {
        // Parse the JSON response
        const updatedOOP = JSON.parse(response.content);
        console.log('Successfully parsed updated OOP object:', updatedOOP);
        return updatedOOP;
      } catch (parseError) {
        console.error('Failed to parse JSON response:', parseError);
        console.error('Raw response text:', response.content);
        throw new Error('Invalid JSON response from API');
      }
    } catch (error) { 
      console.error('OOP merging failed:', error); 
      throw error; 
    }
  }

  // Generate examples using EXAMPLE_GENERATOR system prompt
  async generateExamples(propertyName: string, oopromptObject: OOPObjectData): Promise<{ examples: string[] }> {
    await this.ensureApiKeyLoaded();
    if (!this.openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      console.log('Generating examples for property:', propertyName);

      // Prepare input according to EXAMPLE_GENERATOR prompt format
      const inputData = {
        ooprompt: oopromptObject,
        propertyName: propertyName
      };

      // Use Responses API with EXAMPLE_GENERATOR system prompt
      const response = await this.chatWithOpenAI([
        { role: 'system', content: getSystemPrompt('EXAMPLE_GENERATOR') },
        { role: 'user', content: JSON.stringify(inputData, null, 2) }
      ]);

      console.log('ExampleGenerator response:', response.content);
      
      // Try to parse the JSON array response
      try {
        const examples = JSON.parse(response.content);
        if (Array.isArray(examples)) {
          console.log('Successfully parsed examples:', examples);
          return { examples };
        } else {
          throw new Error('Response is not an array');
        }
      } catch (parseError) {
        console.error('Failed to parse JSON response:', parseError);
        console.error('Raw response text:', response.content);
        throw new Error('Invalid JSON array format in response');
      }
    } catch (error) { 
      console.error('Example generation failed:', error); 
      throw error; 
    }
  }

  // Batch: Generate examples for multiple properties in parallel
  async generateExamplesBatch(
    propertyNames: string[],
    oopromptObject: OOPObjectData,
    maxConcurrency: number = 3
  ): Promise<{ examplesByProperty: Record<string, string[]> }> {
    const tasks = propertyNames.map((name) => async () => {
      const res = await this.generateExamples(name, oopromptObject);
      return { name, examples: res.examples };
    });

    const results = await this.executeInParallel(tasks, maxConcurrency);
    const examplesByProperty: Record<string, string[]> = {};
    for (const r of results) {
      examplesByProperty[r.name] = r.examples;
    }
    return { examplesByProperty };
  }

  // Object Modifier assistant for AI suggestions and analysis
  async analyzeObjectModifier(
    oopromptObject: OOPromptObject,
    requestType: "conflict_check" | "more_possible_properties" | "modify_language",
    cursor?: string
  ): Promise<ObjectModifierEnvelope> {
    await this.ensureApiKeyLoaded();
    if (!this.openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    console.log('Analyzing object using Responses API with OBJECT_MODIFIER system prompt');
    console.log('Request type:', requestType);
    console.log('Cursor:', cursor);

    try {
      // Prepare input according to OBJECT_MODIFIER prompt format
      // The prompt expects: ooprompt and requestType
      const inputData: any = {
        ooprompt: oopromptObject,
        requestType: requestType
      };
      
      // Add cursor if provided
      if (cursor) {
        inputData.cursor = cursor;
      }

      // Use Responses API with OBJECT_MODIFIER system prompt
      const response = await this.chatWithOpenAI([
        { role: 'system', content: getSystemPrompt('OBJECT_MODIFIER') },
        { role: 'user', content: JSON.stringify(inputData, null, 2) }
      ]);

      console.log('OBJECT_MODIFIER response:', response.content);
      
      // Try to parse the JSON response
      try {
        // Extract JSON from response - handle markdown code fences and extra text
        let jsonContent = response.content.trim();
        
        // Remove markdown code fences if present (```json ... ``` or ``` ... ```)
        jsonContent = jsonContent.replace(/^```(?:json)?\s*\n?/i, '');
        jsonContent = jsonContent.replace(/\n?```\s*$/i, '');
        
        // Try to find JSON object boundaries - use a more robust approach
        // Find the first { and last } to extract the complete JSON object
        const firstBrace = jsonContent.indexOf('{');
        const lastBrace = jsonContent.lastIndexOf('}');
        
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          jsonContent = jsonContent.substring(firstBrace, lastBrace + 1);
        } else {
          // Fallback: try regex match
          const jsonMatch = jsonContent.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            jsonContent = jsonMatch[0];
          }
        }
        
        // Try to fix common JSON issues before parsing
        // Remove trailing commas before } or ]
        jsonContent = jsonContent.replace(/,(\s*[}\]])/g, '$1');
        
        const envelope = JSON.parse(jsonContent);
        
        // Basic validation of the envelope structure
        if (envelope.schemaVersion !== "1.0" || !envelope.requestType || !envelope.oopromptId) {
          throw new Error('Invalid envelope structure returned by API');
        }
        
        console.log('Successfully parsed OBJECT_MODIFIER envelope:', envelope);
        return envelope;
      } catch (parseError) {
        console.error('Failed to parse JSON response:', parseError);
        console.error('Raw response text:', response.content);
        console.error('Cleaned JSON attempt:', response.content.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, ''));
        throw new Error(`Invalid JSON format in response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
      }
    } catch (error) { 
      console.error('OBJECT_MODIFIER analysis failed:', error); 
      throw error; 
    }
  }

  // Batch: Run multiple Object Modifier analyses in parallel
  async analyzeObjectModifierBatch(
    oopromptObject: OOPromptObject,
    requestTypes: Array<"conflict_check" | "more_possible_properties" | "modify_language">,
    cursor?: string,
    maxConcurrency: number = 2
  ): Promise<Record<string, ObjectModifierEnvelope>> {
    const tasks = requestTypes.map((type) => async () => {
      const res = await this.analyzeObjectModifier(oopromptObject, type, cursor);
      return { type, res };
    });

    const results = await this.executeInParallel(tasks, maxConcurrency);
    const byType: Record<string, ObjectModifierEnvelope> = {};
    for (const r of results) {
      byType[r.type] = r.res;
    }
    return byType;
  }
}

export const llmService = new LLMService();
