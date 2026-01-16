// Content script to inject prompts into web pages

// Listen for messages from the extension popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PING') {
    // Respond to ping to confirm script is loaded
    sendResponse({ success: true, loaded: true });
    return true;
  }
  
  if (message.type === 'INJECT_PROMPT') {
    try {
      injectPrompt(message.prompt);
      sendResponse({ success: true });
    } catch (error) {
      console.error('Failed to inject prompt:', error);
      sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
    return true; // Indicates async response
  }
  
  return false;
});

function injectPrompt(prompt: string) {
  // Try to find common input fields (textarea, input, contenteditable divs)
  const textareas = document.querySelectorAll('textarea');
  const inputs = document.querySelectorAll('input[type="text"], input[type="search"]');
  const contentEditable = document.querySelectorAll('[contenteditable="true"]');
  
  // Priority: textarea > contenteditable > input
  if (textareas.length > 0) {
    // Find the largest or most visible textarea
    let targetTextarea: HTMLTextAreaElement | null = null;
    let maxArea = 0;
    
    for (let i = 0; i < textareas.length; i++) {
      const textarea = textareas[i] as HTMLTextAreaElement;
      const area = textarea.offsetWidth * textarea.offsetHeight;
      if (area > maxArea && textarea.offsetParent !== null) {
        maxArea = area;
        targetTextarea = textarea;
      }
    }
    
    if (targetTextarea) {
      targetTextarea.value = prompt;
      targetTextarea.dispatchEvent(new Event('input', { bubbles: true }));
      targetTextarea.dispatchEvent(new Event('change', { bubbles: true }));
      targetTextarea.focus();
      return;
    }
  }
  
  // Try contenteditable divs (like ChatGPT, Claude, etc.)
  if (contentEditable.length > 0) {
    const target = contentEditable[0] as HTMLElement;
    target.textContent = prompt;
    target.dispatchEvent(new Event('input', { bubbles: true }));
    target.focus();
    return;
  }
  
  // Try regular input fields
  if (inputs.length > 0) {
    const target = inputs[0] as HTMLInputElement;
    target.value = prompt;
    target.dispatchEvent(new Event('input', { bubbles: true }));
    target.dispatchEvent(new Event('change', { bubbles: true }));
    target.focus();
    return;
  }
  
  // If no input found, create a temporary textarea and copy to clipboard
  const textarea = document.createElement('textarea');
  textarea.value = prompt;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
  
  // Show a notification
  showNotification('Prompt copied to clipboard! Paste it into the input field.');
}

function showNotification(message: string) {
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
  
  // Add animation
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
      document.body.removeChild(notification);
      document.head.removeChild(style);
    }, 300);
  }, 3000);
}

