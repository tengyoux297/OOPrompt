// Service to inject prompts into web pages using activeTab permission
// This is more secure than using content_scripts with <all_urls>

/**
 * Function that gets injected into the page to inject the prompt
 * This function runs in the page context, not the extension context
 * Must be a standalone function (not a class method) for chrome.scripting.executeScript
 */
function injectPromptIntoPage(prompt: string): void {
  // Helper function to show notification
  const showNotification = (message: string): void => {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #10b981;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      z-index: 10000;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      animation: slideIn 0.3s ease-out;
    `;
    
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'slideIn 0.3s ease-out reverse';
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
        if (document.head.contains(style)) {
          document.head.removeChild(style);
        }
      }, 300);
    }, 3000);
  };

  // Try to find common input fields (textarea, input, contenteditable divs)
  const textareas = document.querySelectorAll('textarea');
  const inputs = document.querySelectorAll('input[type="text"], input[type="search"]');
  const contentEditable = document.querySelectorAll('[contenteditable="true"]');
  
  // Priority: textarea > contenteditable > input
  if (textareas.length > 0) {
    // Find the largest or most visible textarea
    let targetTextarea: HTMLTextAreaElement | null = null;
    let maxArea = 0;
    
    textareas.forEach((textarea) => {
      const area = textarea.offsetWidth * textarea.offsetHeight;
      if (area > maxArea && textarea.offsetParent !== null) {
        maxArea = area;
        targetTextarea = textarea as HTMLTextAreaElement;
      }
    });
    
    if (targetTextarea) {
      targetTextarea.value = prompt;
      targetTextarea.dispatchEvent(new Event('input', { bubbles: true }));
      targetTextarea.dispatchEvent(new Event('change', { bubbles: true }));
      targetTextarea.focus();
      showNotification('Prompt injected successfully!');
      return;
    }
  }
  
  // Try contenteditable divs (like ChatGPT, Claude, etc.)
  if (contentEditable.length > 0) {
    const target = contentEditable[0] as HTMLElement;
    target.textContent = prompt;
    target.dispatchEvent(new Event('input', { bubbles: true }));
    target.focus();
    showNotification('Prompt injected successfully!');
    return;
  }
  
  // Try regular input fields
  if (inputs.length > 0) {
    const target = inputs[0] as HTMLInputElement;
    target.value = prompt;
    target.dispatchEvent(new Event('input', { bubbles: true }));
    target.dispatchEvent(new Event('change', { bubbles: true }));
    target.focus();
    showNotification('Prompt injected successfully!');
    return;
  }
  
  // If no input found, copy to clipboard
  const textarea = document.createElement('textarea');
  textarea.value = prompt;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
  
  showNotification('Prompt copied to clipboard! Paste it into the input field.');
}

export class PromptInjectionService {
  /**
   * Injects a prompt into the active tab's input fields
   * Requires activeTab permission (granted when user clicks extension icon)
   */
  static async injectPrompt(prompt: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get the active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab.id) {
        return { success: false, error: 'No active tab found' };
      }

      // Inject the prompt injection script into the active tab
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: injectPromptIntoPage,
        args: [prompt]
      });

      return { success: true };
    } catch (error) {
      console.error('Failed to inject prompt:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}

export const promptInjectionService = new PromptInjectionService();
