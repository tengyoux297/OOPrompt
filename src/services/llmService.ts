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

  constructor() {
    // Try VITE_ prefixed keys first, then fallback to non-prefixed
    this.openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.OPENAI_API_KEY || '';
    this.geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY || '';
    this.claudeApiKey = import.meta.env.VITE_CLAUDE_API_KEY || import.meta.env.CLAUDE_API_KEY || '';
    
    // Get the PROPERTY_EXTRACTOR assistant ID
    this.propertyExtractorId = import.meta.env.VITE_PROPERTY_EXTRACTOR || import.meta.env.PROPERTY_EXTRACTOR || '';
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
    if (!this.geminiApiKey) {
      throw new Error('Gemini API key not configured');
    }

    try {
      // Convert messages to Gemini format
      const geminiMessages = messages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : msg.role,
        parts: [{ text: msg.content }]
      }));

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${this.geminiApiKey}`, {
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
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
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
    if (!this.claudeApiKey) {
      throw new Error('Claude API key not configured');
    }

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.claudeApiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 1000,
          messages: messages,
        }),
      });

      if (!response.ok) {
        throw new Error(`Claude API error: ${response.status}`);
      }

      const data = await response.json();
      return {
        content: data.content[0].text,
        provider: 'claude',
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('Claude API error:', error);
      throw error;
    }
  }

  // Main chat method - tries providers in order
  async chat(messages: ChatMessage[], preferredProvider?: LLMProvider): Promise<LLMResponse> {
    const providers: LLMProvider[] = preferredProvider ? [preferredProvider] : ['openai', 'gemini', 'claude'];
    
    for (const provider of providers) {
      try {
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
}

export const llmService = new LLMService();
