// Background service worker for Chrome extension
// This runs in the background and can handle extension lifecycle events

// Listen for extension installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log('OOPrompt extension installed', details);
  
  if (details.reason === 'install') {
    // First time installation
    console.log('First time install - setting up defaults');
    // You could set default settings here
  } else if (details.reason === 'update') {
    // Extension updated
    console.log('Extension updated to version', chrome.runtime.getManifest().version);
  }
});

// Optional: Handle messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message);
  
  if (message.type === 'GET_STORAGE') {
    // Handle storage requests
    chrome.storage.local.get(message.keys, (data) => {
      sendResponse(data);
    });
    return true; // Indicates async response
  }
  
  return false;
});

// Optional: Context menu integration
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'ooprompt-extract',
    title: 'Extract properties with OOPrompt',
    contexts: ['selection']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'ooprompt-extract') {
    // Open extension popup with selected text
    chrome.action.openPopup();
  }
});

