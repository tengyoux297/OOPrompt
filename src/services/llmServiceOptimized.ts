// Optimized LLM Service with faster polling and parallelization support
// This file demonstrates optimizations - integrate into llmService.ts

import type { OOPromptObject, Property, FileReference, ObjectModifierEnvelope } from '../types';

interface PollingOptions {
  initialDelay?: number;      // First poll delay (default: 250ms)
  maxDelay?: number;          // Maximum delay between polls (default: 2000ms)
  backoffMultiplier?: number; // Exponential backoff multiplier (default: 1.5)
  maxAttempts?: number;       // Maximum polling attempts (default: 120)
}

class OptimizedLLMService {
  // Optimized polling with exponential backoff
  private async pollRunStatus(
    threadId: string,
    runId: string,
    options: PollingOptions = {}
  ): Promise<'completed' | 'failed' | 'cancelled' | 'expired'> {
    const {
      initialDelay = 250,      // Start with 250ms (faster than 1000ms)
      maxDelay = 2000,         // Cap at 2 seconds
      backoffMultiplier = 1.5, // Increase delay by 50% each time
      maxAttempts = 120        // Max 2 minutes total (120 * 1s average)
    } = options;

    let delay = initialDelay;
    let attempts = 0;

    while (attempts < maxAttempts) {
      // Check status immediately on first attempt (no delay)
      if (attempts > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
        // Increase delay with exponential backoff, but cap at maxDelay
        delay = Math.min(delay * backoffMultiplier, maxDelay);
      }

      const statusResponse = await fetch(
        `https://api.openai.com/v1/threads/${threadId}/runs/${runId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.openaiApiKey}`,
            'OpenAI-Beta': 'assistants=v2'
          }
        }
      );

      if (statusResponse.ok) {
        const runData = await statusResponse.json();
        const status = runData.status;

        // If completed or failed, return immediately
        if (status === 'completed') return 'completed';
        if (status === 'failed') return 'failed';
        if (status === 'cancelled') return 'cancelled';
        if (status === 'expired') return 'expired';

        // If still queued or in_progress, continue polling
        if (status === 'queued' || status === 'in_progress') {
          attempts++;
          continue;
        }
      }

      attempts++;
    }

    throw new Error('Polling timeout: Run did not complete within maximum attempts');
  }

  // Optimized assistant call with faster polling
  async extractPropertiesWithAssistantOptimized(prompt: string): Promise<OOPObjectData> {
    // ... (same setup code as before) ...
    
    try {
      // Create thread
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

      // Add message
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

      // Run assistant
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

      // OPTIMIZED: Use faster polling with exponential backoff
      const status = await this.pollRunStatus(thread.id, run.id, {
        initialDelay: 250,      // Start checking after 250ms (vs 1000ms)
        maxDelay: 2000,         // Cap at 2 seconds
        backoffMultiplier: 1.5  // Gradually increase delay
      });

      if (status === 'completed') {
        // Get messages
        const messagesResponse = await fetch(
          `https://api.openai.com/v1/threads/${thread.id}/messages`,
          {
            headers: {
              'Authorization': `Bearer ${this.openaiApiKey}`,
              'OpenAI-Beta': 'assistants=v2'
            }
          }
        );

        if (messagesResponse.ok) {
          const messages = await messagesResponse.json();
          const lastMessage = messages.data[0];
          
          try {
            const oopObject = JSON.parse(lastMessage.content[0].text.value);
            return oopObject;
          } catch (parseError) {
            throw new Error('Invalid JSON response from assistant');
          }
        } else {
          throw new Error('Failed to get messages from assistant');
        }
      } else {
        throw new Error(`Assistant run ${status}`);
      }
    } catch (error) {
      console.error('Assistant-based property extraction failed:', error);
      throw error;
    }
  }

  // Parallel execution helper
  async executeInParallel<T>(
    tasks: Array<() => Promise<T>>,
    maxConcurrency: number = 3
  ): Promise<T[]> {
    const results: T[] = [];
    const executing: Promise<void>[] = [];

    for (const task of tasks) {
      const promise = task().then(result => {
        results.push(result);
      });

      executing.push(promise);

      if (executing.length >= maxConcurrency) {
        await Promise.race(executing);
        executing.splice(executing.findIndex(p => p === promise), 1);
      }
    }

    await Promise.all(executing);
    return results;
  }

  // Example: Parallel property extraction for multiple prompts
  async extractPropertiesParallel(prompts: string[]): Promise<OOPObjectData[]> {
    const tasks = prompts.map(prompt => 
      () => this.extractPropertiesWithAssistantOptimized(prompt)
    );
    
    return this.executeInParallel(tasks, 3); // Max 3 concurrent requests
  }
}

// Helper function to create optimized polling
export function createOptimizedPoller(
  threadId: string,
  runId: string,
  apiKey: string,
  options: PollingOptions = {}
): Promise<'completed' | 'failed' | 'cancelled' | 'expired'> {
  const {
    initialDelay = 250,
    maxDelay = 2000,
    backoffMultiplier = 1.5,
    maxAttempts = 120
  } = options;

  let delay = initialDelay;
  let attempts = 0;

  return new Promise(async (resolve, reject) => {
    while (attempts < maxAttempts) {
      if (attempts > 0) {
        await new Promise(r => setTimeout(r, delay));
        delay = Math.min(delay * backoffMultiplier, maxDelay);
      }

      try {
        const statusResponse = await fetch(
          `https://api.openai.com/v1/threads/${threadId}/runs/${runId}`,
          {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'OpenAI-Beta': 'assistants=v2'
            }
          }
        );

        if (statusResponse.ok) {
          const runData = await statusResponse.json();
          const status = runData.status;

          if (status === 'completed') return resolve('completed');
          if (status === 'failed') return resolve('failed');
          if (status === 'cancelled') return resolve('cancelled');
          if (status === 'expired') return resolve('expired');

          if (status === 'queued' || status === 'in_progress') {
            attempts++;
            continue;
          }
        }
      } catch (error) {
        reject(error);
        return;
      }

      attempts++;
    }

    reject(new Error('Polling timeout'));
  });
}

