// LLM API Service for multiple providers
export type LLMProvider = 'openai' | 'gemini' | 'claude';

// Import types from the main types file
import type { OOPromptObject, Property, FileReference, ObjectModifierEnvelope } from '../types';

// Type definitions for internal use
interface OpenAIMessageData {
  role: string;
  content: string;
  attachments?: Array<{
    file_id: string;
    tools: Array<{ type: string }>;
  }>;
}

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
  private geminiApiKey: string;
  private claudeApiKey: string;
  private propertyExtractorId: string;
  private propertyAdderId: string;
  private promptBuilderId: string;
  private exampleGeneratorId: string;

  constructor() {
    // Try VITE_ prefixed keys first, then fallback to non-prefixed
    this.openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.OPENAI_API_KEY || '';
    this.geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY || '';
    this.claudeApiKey = import.meta.env.VITE_CLAUDE_API_KEY || import.meta.env.CLAUDE_API_KEY || '';
    
    // Get the PROPERTY_EXTRACTOR assistant ID
    this.propertyExtractorId = import.meta.env.VITE_PROPERTY_EXTRACTOR || import.meta.env.PROPERTY_EXTRACTOR || '';
    // Get the PROPERTY_ADDER assistant ID
    this.propertyAdderId = import.meta.env.VITE_PROPERTY_ADDER || import.meta.env.PROPERTY_ADDER || '';
    // Get the PROMPT_BUILDER assistant ID
    this.promptBuilderId = import.meta.env.VITE_PROMPT_BUILDER || import.meta.env.PROMPT_BUILDER || '';
    // Get the EXAMPLE_GENERATOR assistant ID
    this.exampleGeneratorId = import.meta.env.VITE_EXAMPLE_GENERATOR || import.meta.env.EXAMPLE_GENERATOR || '';
    
    // Debug logging for API keys
    console.log('LLM Service initialized with API keys:');
    console.log('OpenAI:', !!this.openaiApiKey);
    console.log('Gemini:', !!this.geminiApiKey);
    console.log('Claude:', !!this.claudeApiKey);
    console.log('PROPERTY_EXTRACTOR:', !!this.propertyExtractorId);
    console.log('PROPERTY_ADDER:', !!this.propertyAdderId);
    console.log('PROMPT_BUILDER:', !!this.promptBuilderId);
    console.log('EXAMPLE_GENERATOR:', !!this.exampleGeneratorId);
  }

  // OpenAI Chat Completion with optional file attachments
  async chatWithOpenAI(messages: ChatMessage[], fileAttachments?: FileAttachment[]): Promise<LLMResponse> {
    if (!this.openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      // If we have file attachments, try the OpenAI Assistants API v2
      if (fileAttachments && fileAttachments.length > 0) {
        try {
          console.log('Attempting to use OpenAI Assistants API v2 for file processing...');
          return await this.chatWithOpenAIAssistants(messages, fileAttachments);
        } catch (assistantError) {
          console.warn('OpenAI Assistants API failed, falling back to regular chat completion:', assistantError);
          
          // Fallback: Modify the message to include file information
          const modifiedMessages = messages.map(msg => {
            if (msg.role === 'user') {
              const fileInfo = fileAttachments.map(file => 
                `[File: ${file.fileName} - ${file.fileType} - ${(file.fileSize / 1024).toFixed(1)} KB]`
              ).join(', ');
              
              return {
                ...msg,
                content: `${msg.content}\n\nNote: The following files were attached but cannot be processed in this mode: ${fileInfo}\nPlease provide a response based on the available information.`
              };
            }
            return msg;
          });

          // Use regular chat completion API with modified message
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.openaiApiKey}`,
            },
            body: JSON.stringify({
              model: 'gpt-4',
              messages: modifiedMessages,
              max_tokens: 2000,
              temperature: 0.7,
            }),
          });

          if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.status}`);
          }

          const data = await response.json();
          return {
            content: data.choices[0].message.content,
            provider: 'openai',
            timestamp: new Date(),
          };
        }
      }

      // No files or fallback case - use the regular chat completion API
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openaiApiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: messages,
          max_tokens: 2000, // Increased for better responses
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      return {
        content: data.choices[0].message.content,
        provider: 'openai',
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw error;
    }
  }

  // OpenAI Assistants API v2 for file handling
  private async chatWithOpenAIAssistants(messages: ChatMessage[], fileAttachments: FileAttachment[]): Promise<LLMResponse> {
    try {
      // Create a new thread
      const threadResponse = await fetch('https://api.openai.com/v1/threads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'OpenAI-Beta': 'assistants=v2'
        }
      });

      if (!threadResponse.ok) {
        throw new Error(`Failed to create thread: ${threadResponse.status}`);
      }

      const thread = await threadResponse.json();
      const threadId = thread.id;

      // Upload files to OpenAI
      const fileIds: string[] = [];
      console.log(`Uploading ${fileAttachments.length} files to OpenAI...`);
      
      for (const file of fileAttachments) {
        if (file.data && typeof file.data === 'string') {
          console.log(`Uploading file: ${file.fileName} (${file.fileType}, ${(file.fileSize / 1024).toFixed(1)} KB)`);
          
          try {
            // Convert data URL to blob
            const response = await fetch(file.data);
            const blob = await response.blob();
            
            console.log(`Converted to blob: ${blob.size} bytes, type: ${blob.type}`);
            
            // Create FormData for file upload
            const formData = new FormData();
            formData.append('file', blob, file.fileName);
            formData.append('purpose', 'assistants');

            const uploadResponse = await fetch('https://api.openai.com/v1/files', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${this.openaiApiKey}`,
              },
              body: formData
            });

            if (uploadResponse.ok) {
              const uploadedFile = await uploadResponse.json();
              console.log(`File uploaded successfully: ${file.fileName} -> ${uploadedFile.id}`);
              fileIds.push(uploadedFile.id);
            } else {
              const errorText = await uploadResponse.text();
              console.error(`File upload failed for ${file.fileName}:`, uploadResponse.status, errorText);
              throw new Error(`File upload failed: ${uploadResponse.status} - ${errorText}`);
            }
          } catch (error) {
            console.error(`Error uploading file ${file.fileName}:`, error);
            throw error;
          }
        }
      }
      
      console.log(`Successfully uploaded ${fileIds.length} files. File IDs:`, fileIds);

      // Add messages to thread
      for (const message of messages) {
        const messageData: OpenAIMessageData = {
          role: message.role,
          content: message.content
        };

        // Add file attachments to the first user message
        if (message.role === 'user' && fileIds.length > 0) {
          messageData.attachments = fileIds.map(fileId => ({
            file_id: fileId,
            tools: [{ type: "file_search" }]
          }));
        }

        console.log('Sending message data:', JSON.stringify(messageData, null, 2));

        const messageResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.openaiApiKey}`,
            'OpenAI-Beta': 'assistants=v2'
          },
          body: JSON.stringify(messageData)
        });

        if (!messageResponse.ok) {
          const errorText = await messageResponse.text();
          console.error('Message creation error:', messageResponse.status, errorText);
          throw new Error(`Failed to add message: ${messageResponse.status} - ${errorText}`);
        }
      }

      // Create a run with the PROMPT_BUILDER assistant
      const runBody: { assistant_id: string; tools?: Array<{ type: string }> } = {
        assistant_id: this.promptBuilderId
      };

      // Enable file_search tool if we have files
      if (fileIds.length > 0) {
        runBody.tools = [{ type: "file_search" }];
      }

      console.log('Creating run with body:', JSON.stringify(runBody, null, 2));

      const runResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'OpenAI-Beta': 'assistants=v2'
        },
        body: JSON.stringify(runBody)
      });

      if (!runResponse.ok) {
        throw new Error(`Failed to create run: ${runResponse.status}`);
      }

      const run = await runResponse.json();
      const runId = run.id;

      // Wait for the run to complete
      let runStatus = 'queued';
      while (runStatus === 'queued' || runStatus === 'in_progress') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const statusResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}`, {
          headers: {
            'Authorization': `Bearer ${this.openaiApiKey}`,
            'OpenAI-Beta': 'assistants=v2'
          }
        });

        if (statusResponse.ok) {
          const runData = await statusResponse.json();
          runStatus = runData.status;
        }
      }

      if (runStatus === 'failed') {
        throw new Error('Assistant run failed');
      }

      // Get the response messages
      const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'OpenAI-Beta': 'assistants=v2'
        }
      });

      if (messagesResponse.ok) {
        const messagesData = await messagesResponse.json();
        const lastMessage = messagesData.data[0]; // Get the most recent message
        
        return {
          content: lastMessage.content[0].text.value,
          provider: 'openai',
          timestamp: new Date(),
        };
      } else {
        throw new Error('Failed to get response messages');
      }
    } catch (error) {
      console.error('OpenAI Assistants API error:', error);
      throw error;
    }
  }

  // Google Gemini Chat with optional file attachments
  async chatWithGemini(messages: ChatMessage[], fileAttachments?: FileAttachment[]): Promise<LLMResponse> {
    console.log('Gemini API key configured:', !!this.geminiApiKey);
    if (!this.geminiApiKey) {
      throw new Error('Gemini API key not configured');
    }

    try {
      // Handle file attachments by modifying the message content
      let processedMessages = messages;
      if (fileAttachments && fileAttachments.length > 0) {
        console.log(`Gemini: Processing ${fileAttachments.length} file attachments as text references...`);
        
        processedMessages = messages.map(msg => {
          if (msg.role === 'user') {
            const fileInfo = fileAttachments.map(file => 
              `[File: ${file.fileName} - ${file.fileType} - ${(file.fileSize / 1024).toFixed(1)} KB]`
            ).join(', ');
            
            return {
              ...msg,
              content: `${msg.content}\n\nNote: The following files were referenced but cannot be directly processed by Gemini: ${fileInfo}\nPlease provide a response based on the available text information and acknowledge the attached files.`
            };
          }
          return msg;
        });
      }

      // Convert messages to Gemini format
      const geminiMessages = processedMessages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : msg.role,
        parts: [{ text: msg.content }]
      }));

      const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${this.geminiApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: geminiMessages,
          generationConfig: {
            maxOutputTokens: 2000, // Increased for better responses
            temperature: 0.7,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Gemini API error:', response.status, errorText);
        throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('Gemini API response:', data);
      return {
        content: data.candidates[0].content.parts[0].text,
        provider: 'gemini',
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('Gemini API error:', error);
      throw error;
    }
  }

  // Anthropic Claude Chat with optional file attachments
  async chatWithClaude(messages: ChatMessage[], fileAttachments?: FileAttachment[]): Promise<LLMResponse> {
    console.log('Claude API key configured:', !!this.claudeApiKey);
    if (!this.claudeApiKey) {
      throw new Error('Claude API key not configured');
    }

    try {
      console.log('Attempting Claude API call...');
      console.log('API Key length:', this.claudeApiKey?.length || 0);
      
      // Handle file attachments by modifying the message content
      let processedMessages = messages;
      if (fileAttachments && fileAttachments.length > 0) {
        console.log(`Claude: Processing ${fileAttachments.length} file attachments as text references...`);
        
        processedMessages = messages.map(msg => {
          if (msg.role === 'user') {
            const fileInfo = fileAttachments.map(file => 
              `[File: ${file.fileName} - ${file.fileType} - ${(file.fileSize / 1024).toFixed(1)} KB]`
            ).join(', ');
            
            return {
              ...msg,
              content: `${msg.content}\n\nNote: The following files were referenced but cannot be directly processed by Claude: ${fileInfo}\nPlease provide a response based on the available text information and acknowledge the attached files.`
            };
          }
          return msg;
        });
      }
      
      console.log('Processed messages:', processedMessages);
      
      // Try multiple CORS proxies to find one that works
      const corsProxies = [
        'https://api.allorigins.win/raw?url=',
        'https://corsproxy.io/?',
        'https://cors-anywhere.herokuapp.com/'
      ];
      
      let response;
      let lastError;
      
      for (const proxy of corsProxies) {
        try {
          console.log(`Trying CORS proxy: ${proxy}`);
          
          if (proxy === 'https://cors-anywhere.herokuapp.com/') {
            // Special handling for cors-anywhere
            response = await fetch(proxy + 'https://api.anthropic.com/v1/messages', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-api-key': this.claudeApiKey,
                'anthropic-version': '2023-06-01',
                'User-Agent': 'OOPrompt-App/1.0',
                'Origin': 'http://localhost:5173',
              },
              body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 2000, // Increased for better responses
                messages: processedMessages,
              }),
            });
          } else {
            // For other proxies, use different approach
            const proxyUrl = proxy === 'https://api.allorigins.win/raw?url=' 
              ? `${proxy}${encodeURIComponent('https://api.anthropic.com/v1/messages')}`
              : `${proxy}https://api.anthropic.com/v1/messages`;
             
            response = await fetch(proxyUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-api-key': this.claudeApiKey,
                'anthropic-version': '2023-06-01',
                'User-Agent': 'OOPrompt-App/1.0',
              },
              body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 2000, // Increased for better responses
                messages: processedMessages,
              }),
            });
          }
          
          // If we get here, the proxy worked
          console.log(`CORS proxy ${proxy} succeeded`);
          break;
          
        } catch (error) {
          console.log(`CORS proxy ${proxy} failed:`, error);
          lastError = error;
          continue;
        }
      }
      
      if (!response) {
        throw new Error(`All CORS proxies failed. Last error: ${lastError}`);
      }
      
      console.log('Claude API response status:', response.status);
      console.log('Claude API response headers:', response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Claude API error:', response.status, errorText);
        throw new Error(`Claude API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('Claude API response data:', data);
      return {
        content: data.content[0].text,
        provider: 'claude',
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('Claude API error:', error);
      
      // Handle network errors more gracefully
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Claude API network error: Please check your internet connection and try again');
      }
      
      // Handle other errors
      if (error instanceof Error) {
        throw error;
      }
      
      throw new Error(`Claude API error: ${error}`);
    }
  }

  // Main chat method - tries providers in order
  async chat(messages: ChatMessage[], preferredProvider?: LLMProvider, fileAttachments?: FileAttachment[]): Promise<LLMResponse> {
    // If preferred provider is specified, only try that one (no fallback)
    if (preferredProvider) {
      console.log(`Using preferred provider: ${preferredProvider}`);
      try {
        switch (preferredProvider) {
          case 'openai':
            return await this.chatWithOpenAI(messages, fileAttachments);
          case 'gemini':
            return await this.chatWithGemini(messages, fileAttachments);
          case 'claude':
            return await this.chatWithClaude(messages, fileAttachments);
          default:
            throw new Error(`Unknown provider: ${preferredProvider}`);
        }
      } catch (error) {
        console.error(`${preferredProvider} failed:`, error);
        throw error; // Re-throw the error instead of falling back
      }
    }
    
    // If no preferred provider, try all providers in order (fallback only for default behavior)
    const providers: LLMProvider[] = ['openai', 'gemini', 'claude'];
    console.log('Chat method called with providers:', providers, 'preferred: none (fallback mode)');
    
    for (const provider of providers) {
      try {
        console.log(`Trying provider: ${provider}`);
        switch (provider) {
          case 'openai':
            return await this.chatWithOpenAI(messages, fileAttachments);
          case 'gemini':
            return await this.chatWithGemini(messages, fileAttachments);
          case 'claude':
            return await this.chatWithClaude(messages, fileAttachments);
          default:
            throw new Error(`Unknown provider: ${provider}`);
        }
      } catch (error) {
        console.warn(`${provider} failed, trying next provider:`, error);
        continue;
      }
    }
    
    throw new Error('All LLM providers failed');
  }

  // Property extraction using OpenAI Assistant
  async extractPropertiesWithAssistant(prompt: string): Promise<OOPObjectData> {
    if (!this.openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }
    
    if (!this.propertyExtractorId) {
      throw new Error('PROPERTY_EXTRACTOR assistant ID not configured. Please set VITE_PROPERTY_EXTRACTOR in your .env file');
    }
    
    console.log('Using assistant ID:', this.propertyExtractorId);
    console.log('API key configured:', !!this.openaiApiKey);

    try {
      // Create a thread
      const threadResponse = await fetch('https://api.openai.com/v1/threads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'OpenAI-Beta': 'assistants=v2'
        }
      });

      if (!threadResponse.ok) {
        const errorText = await threadResponse.text();
        console.error('Thread creation error:', threadResponse.status, errorText);
        throw new Error(`Failed to create thread: ${threadResponse.status} - ${errorText}`);
      }

      const thread = await threadResponse.json();

      // Add message to thread
      const messageResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'OpenAI-Beta': 'assistants=v2'
        },
        body: JSON.stringify({
          role: 'user',
          content: prompt
        })
      });

      if (!messageResponse.ok) {
        throw new Error(`Failed to add message: ${messageResponse.status}`);
      }

      // Run the assistant
      const runResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'OpenAI-Beta': 'assistants=v2'
        },
        body: JSON.stringify({
          assistant_id: this.propertyExtractorId
        })
      });

      if (!runResponse.ok) {
        throw new Error(`Failed to run assistant: ${runResponse.status}`);
      }

      const run = await runResponse.json();

      // Poll for completion
      let runStatus = run.status;
      while (runStatus === 'queued' || runStatus === 'in_progress') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const statusResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs/${run.id}`, {
          headers: {
            'Authorization': `Bearer ${this.openaiApiKey}`,
            'OpenAI-Beta': 'assistants=v2'
          }
        });
        
        if (statusResponse.ok) {
          const runData = await statusResponse.json();
          runStatus = runData.status;
        }
      }

      if (runStatus === 'completed') {
        // Get the messages
        const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
          headers: {
            'Authorization': `Bearer ${this.openaiApiKey}`,
            'OpenAI-Beta': 'assistants=v2'
          }
        });

        if (messagesResponse.ok) {
          const messages = await messagesResponse.json();
          const lastMessage = messages.data[0]; // Get the assistant's response
          
          try {
            // Parse the JSON response
            const oopObject = JSON.parse(lastMessage.content[0].text.value);
            return oopObject;
          } catch (parseError) {
            console.error('Failed to parse assistant response:', parseError);
            throw new Error('Invalid JSON response from assistant');
          }
        } else {
          throw new Error('Failed to get messages from assistant');
        }
      } else {
        throw new Error(`Assistant run failed with status: ${runStatus}`);
      }
    } catch (error) {
      console.error('Assistant-based property extraction failed:', error);
      throw error;
    }
  }

  // Property extraction using LLM (fallback method)
  async extractProperties(prompt: string, mainTask: string, audience: string): Promise<{ properties: Array<{ name: string; value: string }> }> {
    const systemMessage = `You are an expert at analyzing content and extracting key properties. 
    Given a piece of content, main task, and target audience, identify the most important properties that define the content's characteristics.
    
    Return ONLY a JSON array of objects with "name" and "value" fields. Example:
    [{"name": "Tone", "value": "professional, friendly"}, {"name": "Style", "value": "conversational, clear"}]
    
    Focus on properties that are relevant to the main task and audience.`;

    const userMessage = `Content: ${prompt}
    Main Task: ${mainTask}
    Target Audience: ${audience}
    
    Extract the key properties.`;

    try {
      const response = await this.chat([
        { role: 'system', content: systemMessage },
        { role: 'user', content: userMessage }
      ]);

      // Try to parse JSON from response
      try {
        const properties = JSON.parse(response.content);
        return { properties };
      } catch (parseError) {
        // If JSON parsing fails, try to extract properties from text
        console.warn('Failed to parse JSON, extracting from text:', parseError);
        return this.extractPropertiesFromText(response.content);
      }
    } catch (error) {
      console.error('Property extraction failed:', error);
      throw error;
    }
  }

  // Fallback property extraction from text
  private extractPropertiesFromText(text: string): { properties: Array<{ name: string; value: string }> } {
    // Simple fallback - extract key-value pairs from text
    const lines = text.split('\n');
    const properties: Array<{ name: string; value: string }> = [];
    
    for (const line of lines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const name = line.substring(0, colonIndex).trim();
        const value = line.substring(colonIndex + 1).trim();
        if (name && value) {
          properties.push({ name, value });
        }
      }
    }
    
    return { properties: properties.length > 0 ? properties : [{ name: "Content", value: "Analysis completed" }] };
  }

  // Build prompt using PROMPT_BUILDER assistant
  async buildPromptWithAssistant(oopObject: OOPObjectData): Promise<string> {
    if (!this.openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }
    
    if (!this.promptBuilderId) {
      throw new Error('PROMPT_BUILDER assistant ID not configured. Please set VITE_PROMPT_BUILDER in your .env file');
    }
    
    console.log('Using PROMPT_BUILDER assistant ID:', this.promptBuilderId);
    console.log('API key configured:', !!this.openaiApiKey);
    
    // Count files for property-file associations
    const propertiesWithFiles = oopObject.properties?.filter((prop: PropertyData) => prop.fileData) || [];
    
    // Clean the OOP object to remove fileData (which contains large binary data)
    const cleanOopObject = {
      ...oopObject,
      properties: oopObject.properties?.map((prop: PropertyData) => {
        const cleanProp = { ...prop };
        // Remove fileData to avoid sending large binary data to the assistant
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
      // Create a thread
      const threadResponse = await fetch('https://api.openai.com/v1/threads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'OpenAI-Beta': 'assistants=v2'
        }
      });

      if (!threadResponse.ok) {
        const errorText = await threadResponse.text();
        console.error('Thread creation error:', threadResponse.status, errorText);
        throw new Error(`Failed to create thread: ${threadResponse.status} - ${errorText}`);
      }

      const thread = await threadResponse.json();

      // Build enhanced message content with file-property associations
      let messageContent = `Please build a prompt based on this OOP object: ${JSON.stringify(cleanOopObject, null, 2)}`;
      
      // Add explicit file-property associations if files exist
      if (propertiesWithFiles.length > 0) {
        const fileAssociations = propertiesWithFiles.map((prop: PropertyData) => {
          const fileRef = prop.fileReference as FileReference | undefined;
          return `- File "${fileRef?.fileName || 'Unknown'}" (${fileRef?.fileType || 'Unknown'}) → Property "${prop.name}": Use this file specifically to understand and fulfill the requirements for the "${prop.name}" property.`;
        }).join('\n');
        
        messageContent += `\n\n🔗 IMPORTANT FILE-PROPERTY ASSOCIATIONS:\nThe following files are attached and should be used for their specific properties:\n\n${fileAssociations}\n\nWhen building the prompt, ensure that each file's content influences its associated property specifically. Reference these file associations in the final prompt so the AI knows which file to use for which property requirement.`;
      }
      
      console.log('Message content length:', messageContent.length);
      console.log('Message content preview:', messageContent.substring(0, 500) + (messageContent.length > 500 ? '...' : ''));
      console.log('File associations included:', propertiesWithFiles.length > 0);
      
      const messageResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'OpenAI-Beta': 'assistants=v2'
        },
        body: JSON.stringify({ 
          role: 'user', 
          content: messageContent 
        })
      });
      
      if (!messageResponse.ok) { 
        const errorText = await messageResponse.text();
        console.error('Message creation error:', messageResponse.status, errorText);
        throw new Error(`Failed to add message: ${messageResponse.status} - ${errorText}`); 
      }

      // Run the assistant
      const runResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'OpenAI-Beta': 'assistants=v2'
        },
        body: JSON.stringify({ assistant_id: this.promptBuilderId })
      });
      
      if (!runResponse.ok) { 
        throw new Error(`Failed to run assistant: ${runResponse.status}`); 
      }
      
      const run = await runResponse.json();

      // Poll for completion
      let runStatus = run.status;
      while (runStatus === 'queued' || runStatus === 'in_progress') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const statusResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs/${run.id}`, {
          headers: { 
            'Authorization': `Bearer ${this.openaiApiKey}`, 
            'OpenAI-Beta': 'assistants=v2' 
          }
        });
        
        if (statusResponse.ok) { 
          const runData = await statusResponse.json(); 
          runStatus = runData.status; 
        }
      }

      if (runStatus === 'completed') {
        // Get the messages
        const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
          headers: { 
            'Authorization': `Bearer ${this.openaiApiKey}`, 
            'OpenAI-Beta': 'assistants=v2' 
          }
        });
        
        if (messagesResponse.ok) {
          const messages = await messagesResponse.json();
          const lastMessage = messages.data[0]; // Get the assistant's response
          
          // Return the text content from the assistant
          return lastMessage.content[0].text.value;
        } else {
          throw new Error('Failed to get messages from assistant');
        }
      } else { 
        throw new Error(`Assistant run failed with status: ${runStatus}`); 
      }
    } catch (error) { 
      console.error('Assistant-based prompt building failed:', error); 
      throw error; 
    }
  }

  // Merge free text with current OOP object using OpenAI Assistant
  async mergeFreeTextWithOOP(freeText: string, currentOOP: OOPObjectData): Promise<OOPObjectData> {
    if (!this.openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }
    if (!this.propertyAdderId) {
      throw new Error('PROPERTY_ADDER assistant ID not configured. Please set VITE_PROPERTY_ADDER in your .env file');
    }
    console.log('Using PROPERTY_ADDER assistant ID:', this.propertyAdderId);
    console.log('Merging free text with current OOP object...');
    console.log('Free text:', freeText);
    console.log('Current OOP:', currentOOP);
    
    try {
      // Create a thread
      const threadResponse = await fetch('https://api.openai.com/v1/threads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'OpenAI-Beta': 'assistants=v2'
        }
      });

      if (!threadResponse.ok) {
        const errorText = await threadResponse.text();
        console.error('Thread creation error:', threadResponse.status, errorText);
        throw new Error(`Failed to create thread: ${threadResponse.status} - ${errorText}`);
      }

      const thread = await threadResponse.json();
      console.log('Thread created:', thread.id);

      // Add message to thread with the free text and current OOP object
      const messageResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'OpenAI-Beta': 'assistants=v2'
        },
        body: JSON.stringify({ 
          role: 'user', 
          content: `Please merge this free text description with the current OOP object to create an updated JSON object. 

Free text description: "${freeText}"

Current OOP object: ${JSON.stringify(currentOOP, null, 2)}

Please return ONLY the updated JSON object, maintaining the same structure but with any new properties or modifications based on the free text description. Do not include any explanations or markdown formatting - just the pure JSON object.` 
        })
      });
      
      if (!messageResponse.ok) { 
        throw new Error(`Failed to add message: ${messageResponse.status}`); 
      }

      const message = await messageResponse.json();
      console.log('Message sent:', message.id);

      // Run the assistant
      const runResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'OpenAI-Beta': 'assistants=v2'
        },
        body: JSON.stringify({ assistant_id: this.propertyAdderId })
      });
      
      if (!runResponse.ok) { 
        throw new Error(`Failed to run assistant: ${runResponse.status}`); 
      }
      
      const run = await runResponse.json();
      console.log('Run created:', run.id);

      // Poll for completion
      let runStatus = run.status;
      while (runStatus === 'queued' || runStatus === 'in_progress') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const statusResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs/${run.id}`, {
          headers: { 
            'Authorization': `Bearer ${this.openaiApiKey}`, 
            'OpenAI-Beta': 'assistants=v2' 
          }
        });
        
        if (statusResponse.ok) { 
          const runData = await statusResponse.json(); 
          runStatus = runData.status; 
          console.log('Run status:', runStatus);
        }
      }

      if (runStatus === 'completed') {
        // Get the messages
        const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
          headers: { 
            'Authorization': `Bearer ${this.openaiApiKey}`, 
            'OpenAI-Beta': 'assistants=v2' 
          }
        });
        
        if (messagesResponse.ok) {
          const messages = await messagesResponse.json();
          const lastMessage = messages.data[0]; // Get the assistant's response
          const responseText = lastMessage.content[0].text.value;
          
          console.log('Assistant response:', responseText);
          
          // Try to parse the JSON response
          try {
            const updatedOOP = JSON.parse(responseText);
            console.log('Successfully parsed updated OOP object:', updatedOOP);
            return updatedOOP;
          } catch (parseError) {
            console.error('Failed to parse JSON response:', parseError);
            console.error('Raw response text:', responseText);
            throw new Error('Assistant returned invalid JSON format');
          }
        } else {
          throw new Error('Failed to get messages from assistant');
        }
      } else { 
        throw new Error(`Assistant run failed with status: ${runStatus}`); 
      }
    } catch (error) { 
      console.error('Assistant-based OOP merging failed:', error); 
      throw error; 
    }
  }

  // Generate examples using ExampleGenerator assistant
  async generateExamples(propertyName: string, oopromptObject: OOPObjectData): Promise<{ examples: string[] }> {
    if (!this.exampleGeneratorId) {
      throw new Error('EXAMPLE_GENERATOR assistant ID not configured');
    }

    try {
      console.log('Generating examples for property:', propertyName);
      console.log('Using ExampleGenerator assistant:', this.exampleGeneratorId);

      // Create a thread
      const threadResponse = await fetch('https://api.openai.com/v1/threads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'OpenAI-Beta': 'assistants=v2'
        }
      });

      if (!threadResponse.ok) {
        const errorText = await threadResponse.text();
        console.error('Thread creation error:', threadResponse.status, errorText);
        throw new Error(`Failed to create thread: ${threadResponse.status} - ${errorText}`);
      }

      const thread = await threadResponse.json();
      console.log('Thread created:', thread.id);

      // Prepare the input data according to the specified format
      const inputData = {
        ooprompt: oopromptObject,
        propertyName: propertyName
      };

      // Add message to thread with the input data
      const messageResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'OpenAI-Beta': 'assistants=v2'
        },
        body: JSON.stringify({ 
          role: 'user', 
          content: `Please generate examples for the property "${propertyName}" based on the following OOPrompt object context:

${JSON.stringify(inputData, null, 2)}

Remember to:
- Read the main_task, audience, and other properties for context
- Generate several example values that make sense for this property
- Return only a JSON array of strings
- Make examples concise, relevant, and varied` 
        })
      });
      
      if (!messageResponse.ok) { 
        throw new Error(`Failed to add message: ${messageResponse.status}`); 
      }

      const message = await messageResponse.json();
      console.log('Message sent:', message.id);

      // Run the ExampleGenerator assistant
      const runResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'OpenAI-Beta': 'assistants=v2'
        },
        body: JSON.stringify({ assistant_id: this.exampleGeneratorId })
      });
      
      if (!runResponse.ok) { 
        throw new Error(`Failed to run assistant: ${runResponse.status}`); 
      }
      
      const run = await runResponse.json();
      console.log('Run created:', run.id);

      // Poll for completion
      let runStatus = run.status;
      while (runStatus === 'queued' || runStatus === 'in_progress') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const statusResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs/${run.id}`, {
          headers: { 
            'Authorization': `Bearer ${this.openaiApiKey}`, 
            'OpenAI-Beta': 'assistants=v2' 
          }
        });
        
        if (statusResponse.ok) { 
          const runData = await statusResponse.json(); 
          runStatus = runData.status; 
          console.log('Run status:', runStatus);
        }
      }

      if (runStatus === 'completed') {
        // Get the messages
        const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
          headers: { 
            'Authorization': `Bearer ${this.openaiApiKey}`, 
            'OpenAI-Beta': 'assistants=v2' 
          }
        });
        
        if (messagesResponse.ok) {
          const messages = await messagesResponse.json();
          const lastMessage = messages.data[0]; // Get the assistant's response
          const responseText = lastMessage.content[0].text.value;
          
          console.log('ExampleGenerator response:', responseText);
          
          // Try to parse the JSON array response
          try {
            const examples = JSON.parse(responseText);
            if (Array.isArray(examples)) {
              console.log('Successfully parsed examples:', examples);
              return { examples };
            } else {
              throw new Error('Assistant response is not an array');
            }
          } catch (parseError) {
            console.error('Failed to parse JSON response:', parseError);
            console.error('Raw response text:', responseText);
            throw new Error('ExampleGenerator returned invalid JSON array format');
          }
        } else {
          throw new Error('Failed to get messages from ExampleGenerator');
        }
      } else { 
        throw new Error(`ExampleGenerator run failed with status: ${runStatus}`); 
      }
    } catch (error) { 
      console.error('Example generation failed:', error); 
      throw error; 
    }
  }

  // Object Modifier assistant for AI suggestions and analysis
  async analyzeObjectModifier(
    oopromptObject: OOPromptObject,
    requestType: "conflict_check" | "more_possible_properties" | "modify_language",
    cursor?: string
  ): Promise<ObjectModifierEnvelope> {
    if (!this.openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Get the OBJECT_MODIFIER assistant ID from environment
    const objectModifierId = import.meta.env.VITE_OBJECT_MODIFIER || import.meta.env.OBJECT_MODIFIER || '';
    if (!objectModifierId) {
      throw new Error('OBJECT_MODIFIER assistant ID not configured. Please set VITE_OBJECT_MODIFIER in your .env file');
    }

    console.log('Using OBJECT_MODIFIER assistant ID:', objectModifierId);
    console.log('Request type:', requestType);
    console.log('Cursor:', cursor);

    try {
      // Create a thread
      const threadResponse = await fetch('https://api.openai.com/v1/threads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'OpenAI-Beta': 'assistants=v2'
        }
      });

      if (!threadResponse.ok) {
        const errorText = await threadResponse.text();
        console.error('Thread creation error:', threadResponse.status, errorText);
        throw new Error(`Failed to create thread: ${threadResponse.status} - ${errorText}`);
      }

      const thread = await threadResponse.json();
      console.log('Thread created:', thread.id);

      // Prepare the request data (for logging purposes)
      console.log('Request data:', {
        oopromptObject: oopromptObject.id,
        requestType,
        cursor: cursor || null
      });

      // Add message to thread
      const messageResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'OpenAI-Beta': 'assistants=v2'
        },
        body: JSON.stringify({ 
          role: 'user', 
          content: `Please analyze this OOPrompt object and provide ${requestType} analysis.

Request Type: ${requestType}
${cursor ? `Cursor: ${cursor}` : ''}

OOPrompt Object: ${JSON.stringify(oopromptObject, null, 2)}

Please return a JSON response in the exact envelope format specified in the schema. The response must include:
- schemaVersion: "1.0"
- requestType: "${requestType}"
- oopromptId: "${oopromptObject.id}"
- summary with counts and pagination info
- uiHints for UI guidance
- The appropriate data array based on requestType
- metadata if needed

Ensure the response is valid JSON that can be parsed directly.` 
        })
      });
      
      if (!messageResponse.ok) { 
        throw new Error(`Failed to add message: ${messageResponse.status}`); 
      }

      const message = await messageResponse.json();
      console.log('Message sent:', message.id);

      // Run the OBJECT_MODIFIER assistant
      const runResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'OpenAI-Beta': 'assistants=v2'
        },
        body: JSON.stringify({ assistant_id: objectModifierId })
      });
      
      if (!runResponse.ok) { 
        throw new Error(`Failed to run assistant: ${runResponse.status}`); 
      }
      
      const run = await runResponse.json();
      console.log('Run created:', run.id);

      // Poll for completion
      let runStatus = run.status;
      while (runStatus === 'queued' || runStatus === 'in_progress') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const statusResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs/${run.id}`, {
          headers: { 
            'Authorization': `Bearer ${this.openaiApiKey}`, 
            'OpenAI-Beta': 'assistants=v2' 
          }
        });
        
        if (statusResponse.ok) { 
          const runData = await statusResponse.json(); 
          runStatus = runData.status; 
          console.log('Run status:', runStatus);
        }
      }

      if (runStatus === 'completed') {
        // Get the messages
        const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
          headers: { 
            'Authorization': `Bearer ${this.openaiApiKey}`, 
            'OpenAI-Beta': 'assistants=v2' 
          }
        });
        
        if (messagesResponse.ok) {
          const messages = await messagesResponse.json();
          const lastMessage = messages.data[0]; // Get the assistant's response
          const responseText = lastMessage.content[0].text.value;
          
          console.log('OBJECT_MODIFIER response:', responseText);
          
          // Try to parse the JSON response
          try {
            const envelope = JSON.parse(responseText);
            
            // Basic validation of the envelope structure
            if (envelope.schemaVersion !== "1.0" || !envelope.requestType || !envelope.oopromptId) {
              throw new Error('Invalid envelope structure returned by assistant');
            }
            
            console.log('Successfully parsed OBJECT_MODIFIER envelope:', envelope);
            return envelope;
          } catch (parseError) {
            console.error('Failed to parse JSON response:', parseError);
            console.error('Raw response text:', responseText);
            throw new Error('OBJECT_MODIFIER assistant returned invalid JSON format');
          }
        } else {
          throw new Error('Failed to get messages from OBJECT_MODIFIER assistant');
        }
      } else { 
        throw new Error(`OBJECT_MODIFIER run failed with status: ${runStatus}`); 
      }
    } catch (error) { 
      console.error('OBJECT_MODIFIER analysis failed:', error); 
      throw error; 
    }
  }
}

export const llmService = new LLMService();
