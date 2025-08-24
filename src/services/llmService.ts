// LLM API Service for multiple providers
export type LLMProvider = 'openai' | 'gemini' | 'claude';

export interface LLMResponse {
  content: string;
  provider: LLMProvider;
  timestamp: Date;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

class LLMService {
  private openaiApiKey: string;
  private geminiApiKey: string;
  private claudeApiKey: string;
  private propertyExtractorId: string;
  private promptBuilderId: string;

  constructor() {
    // Try VITE_ prefixed keys first, then fallback to non-prefixed
    this.openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.OPENAI_API_KEY || '';
    this.geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY || '';
    this.claudeApiKey = import.meta.env.VITE_CLAUDE_API_KEY || import.meta.env.CLAUDE_API_KEY || '';
    
    // Get the PROPERTY_EXTRACTOR assistant ID
    this.propertyExtractorId = import.meta.env.VITE_PROPERTY_EXTRACTOR || import.meta.env.PROPERTY_EXTRACTOR || '';
    // Get the PROMPT_BUILDER assistant ID
    this.promptBuilderId = import.meta.env.VITE_PROMPT_BUILDER || import.meta.env.PROMPT_BUILDER || '';
    
    // Debug logging for API keys
    console.log('LLM Service initialized with API keys:');
    console.log('OpenAI:', !!this.openaiApiKey);
    console.log('Gemini:', !!this.geminiApiKey);
    console.log('Claude:', !!this.claudeApiKey);
  }

  // OpenAI Chat Completion
  async chatWithOpenAI(messages: ChatMessage[]): Promise<LLMResponse> {
    if (!this.openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openaiApiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: messages,
          max_tokens: 1000,
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

  // Google Gemini Chat
  async chatWithGemini(messages: ChatMessage[]): Promise<LLMResponse> {
    console.log('Gemini API key configured:', !!this.geminiApiKey);
    if (!this.geminiApiKey) {
      throw new Error('Gemini API key not configured');
    }

    try {
      // Convert messages to Gemini format
      const geminiMessages = messages.map(msg => ({
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
            maxOutputTokens: 1000,
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

  // Anthropic Claude Chat
  async chatWithClaude(messages: ChatMessage[]): Promise<LLMResponse> {
    console.log('Claude API key configured:', !!this.claudeApiKey);
    if (!this.claudeApiKey) {
      throw new Error('Claude API key not configured');
    }

    try {
      console.log('Attempting Claude API call...');
      console.log('API Key length:', this.claudeApiKey?.length || 0);
      console.log('Messages:', messages);
      
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
                max_tokens: 1000,
                messages: messages,
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
                max_tokens: 1000,
                messages: messages,
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
  async chat(messages: ChatMessage[], preferredProvider?: LLMProvider): Promise<LLMResponse> {
    // If preferred provider is specified, only try that one (no fallback)
    if (preferredProvider) {
      console.log(`Using preferred provider: ${preferredProvider}`);
      try {
        switch (preferredProvider) {
          case 'openai':
            return await this.chatWithOpenAI(messages);
          case 'gemini':
            return await this.chatWithGemini(messages);
          case 'claude':
            return await this.chatWithClaude(messages);
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
            return await this.chatWithOpenAI(messages);
          case 'gemini':
            return await this.chatWithGemini(messages);
          case 'claude':
            return await this.chatWithClaude(messages);
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
  async extractPropertiesWithAssistant(prompt: string): Promise<any> {
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
  async buildPromptWithAssistant(oopObject: any): Promise<string> {
    if (!this.openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }
    
    if (!this.promptBuilderId) {
      throw new Error('PROMPT_BUILDER assistant ID not configured. Please set VITE_PROMPT_BUILDER in your .env file');
    }
    
    console.log('Using PROMPT_BUILDER assistant ID:', this.promptBuilderId);
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

      // Add message to thread with the OOP object
      const messageResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'OpenAI-Beta': 'assistants=v2'
        },
        body: JSON.stringify({ 
          role: 'user', 
          content: `Please build a prompt based on this OOP object: ${JSON.stringify(oopObject, null, 2)}` 
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
}

export const llmService = new LLMService();
