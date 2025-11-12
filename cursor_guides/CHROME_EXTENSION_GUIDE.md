# Chrome Extension Conversion Guide

## ✅ Feasibility Assessment

**Your app is well-suited for Chrome extension conversion because:**
- ✅ Client-side only (no backend dependencies)
- ✅ Uses localStorage (works in extensions)
- ✅ Direct API calls to external services
- ✅ React-based (compatible with extensions)
- ✅ No server-side rendering

## 📋 General Steps

### Step 1: Update Build Configuration

Modify `vite.config.ts` to build for Chrome extension format.

### Step 2: Create Manifest File

Create `manifest.json` with proper permissions and structure.

### Step 3: Update Entry Points

Adjust how the app initializes (popup, side panel, or full page).

### Step 4: Handle Extension-Specific APIs

Update storage, API calls, and content security policy.

### Step 5: Test and Package

Build, test, and package for Chrome Web Store.

## 🛠️ Required Toolkits & Libraries

### Core Dependencies (Already Have)
- ✅ React 19
- ✅ TypeScript
- ✅ Vite (needs configuration)
- ✅ Tailwind CSS

### Additional Tools Needed

1. **@crxjs/vite-plugin** (Recommended)
   - Vite plugin specifically for Chrome extensions
   - Handles manifest generation and hot reload
   - Alternative: Manual manifest management

2. **chrome-types** (Optional but helpful)
   - TypeScript types for Chrome Extension API
   - `npm install -D @types/chrome`

3. **webextension-polyfill** (Optional)
   - Cross-browser compatibility
   - `npm install webextension-polyfill`

## 📁 Project Structure Changes

```
ooprompt/
├── public/
│   ├── manifest.json          # NEW: Extension manifest
│   └── icons/                 # NEW: Extension icons
│       ├── icon-16.png
│       ├── icon-48.png
│       └── icon-128.png
├── src/
│   ├── background/            # NEW: Background script (optional)
│   │   └── background.ts
│   ├── content/              # NEW: Content script (optional)
│   │   └── content.ts
│   └── ... (existing files)
├── vite.config.ts            # MODIFY: Add extension config
└── package.json              # MODIFY: Add build scripts
```

## 🔧 Implementation Steps

### 1. Install Required Packages

```bash
npm install -D @crxjs/vite-plugin @types/chrome
# OR for manual setup:
npm install -D @types/chrome webextension-polyfill
```

### 2. Update vite.config.ts

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import manifest from './public/manifest.json'

export default defineConfig({
  plugins: [
    react(),
    crx({ manifest })
  ],
  define: {
    'process.env': {}
  },
  envPrefix: 'VITE_',
  build: {
    rollupOptions: {
      input: {
        // Main app entry
        popup: 'index.html',
      },
    },
  },
})
```

### 3. Create manifest.json

```json
{
  "manifest_version": 3,
  "name": "OOPrompt",
  "version": "1.0.0",
  "description": "Object-Oriented Prompt Builder for AI",
  "permissions": [
    "storage",
    "activeTab"
  ],
  "host_permissions": [
    "https://api.openai.com/*",
    "https://generativelanguage.googleapis.com/*",
    "https://api.anthropic.com/*"
  ],
  "action": {
    "default_popup": "index.html",
    "default_icon": {
      "16": "icons/icon-16.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png"
    }
  },
  "icons": {
    "16": "icons/icon-16.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  },
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'; connect-src 'self' https://api.openai.com https://generativelanguage.googleapis.com https://api.anthropic.com https://api.allorigins.win https://corsproxy.io;"
  },
  "background": {
    "service_worker": "background.js"
  }
}
```

### 4. Update Storage Service (if needed)

Your `fileStorageService.ts` already uses localStorage, which works in extensions. However, you might want to use `chrome.storage` for better sync capabilities:

```typescript
// Optional: Update to use chrome.storage
class FileStorageService {
  private async storeFile(fileData: { id: string; data: string | null; metadata: FileReference }): Promise<void> {
    try {
      const result = await chrome.storage.local.get(['ooprompt_files']);
      const existingFiles = result.ooprompt_files || {};
      existingFiles[fileData.id] = fileData;
      await chrome.storage.local.set({ oOPrompt_files: existingFiles });
    } catch (error) {
      console.error('Failed to store file:', error);
      throw new Error('Storage failed');
    }
  }
}
```

### 5. Update API Calls for CSP

Your current API calls should work, but ensure they comply with Content Security Policy:

```typescript
// llmService.ts - Your current implementation should work
// Just ensure CORS headers are handled properly
```

### 6. Create Background Script (Optional)

```typescript
// src/background/background.ts
chrome.runtime.onInstalled.addListener(() => {
  console.log('OOPrompt extension installed');
});

// Optional: Handle context menu, notifications, etc.
```

### 7. Update package.json Scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "build:extension": "vite build",
    "package": "npm run build:extension && zip -r ooprompt-extension.zip dist/"
  }
}
```

## 🎯 Extension Types to Consider

### Option 1: Popup Extension (Recommended for your app)
- Opens in a popup when clicking extension icon
- Good for quick access
- Limited size (600x600px max recommended)

### Option 2: Side Panel Extension (Chrome 114+)
- Opens in browser side panel
- More space, better UX
- Requires `side_panel` permission

### Option 3: Full Page Extension
- Opens in new tab
- Maximum space
- Best for complex UIs

### Option 4: Content Script Integration
- Injects UI into web pages
- More complex but powerful
- Requires content script permissions

## 🔐 Permission Requirements

Based on your code, you'll need:

```json
{
  "permissions": [
    "storage",              // For localStorage/chrome.storage
    "activeTab"            // If you want to interact with current page
  ],
  "host_permissions": [
    "https://api.openai.com/*",
    "https://generativelanguage.googleapis.com/*",
    "https://api.anthropic.com/*",
    "https://api.allorigins.win/*",    // For CORS proxy
    "https://corsproxy.io/*"           // For CORS proxy
  ]
}
```

## ⚠️ Important Considerations

### 1. Content Security Policy (CSP)
- Extensions have stricter CSP
- Inline scripts are blocked
- External scripts must be whitelisted
- Your Vite build should handle this

### 2. API Keys Security
- **CRITICAL**: Never expose API keys in extension code
- Consider using a backend proxy for API keys
- Or use Chrome's `secrets` API (Chrome 118+)
- Or require users to input their own keys

### 3. Storage Limits
- localStorage: ~5-10MB per origin
- chrome.storage.local: ~10MB
- chrome.storage.sync: ~100KB (synced across devices)

### 4. File Handling
- File uploads work the same way
- File downloads need `downloads` permission
- Consider using IndexedDB for large files

## 📦 Build & Package

### Development
```bash
npm run dev
# Load unpacked extension from dist/ folder in Chrome
```

### Production Build
```bash
npm run build:extension
# Creates dist/ folder with all extension files
```

### Package for Chrome Web Store
```bash
npm run package
# Creates zip file ready for upload
```

## 🚀 Quick Start Checklist

- [ ] Install `@crxjs/vite-plugin` or configure manually
- [ ] Create `manifest.json` with proper permissions
- [ ] Update `vite.config.ts` for extension build
- [ ] Create extension icons (16x16, 48x48, 128x128)
- [ ] Test API calls work with extension CSP
- [ ] Update storage service (optional: use chrome.storage)
- [ ] Test in Chrome (chrome://extensions, Developer mode)
- [ ] Package and submit to Chrome Web Store

## 📚 Additional Resources

- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
- [Manifest V3 Migration Guide](https://developer.chrome.com/docs/extensions/mv3/intro/)
- [@crxjs/vite-plugin Docs](https://crxjs.dev/vite-plugin)
- [Chrome Extension Samples](https://github.com/GoogleChrome/chrome-extensions-samples)

## 🎨 UI Considerations

Your current UI should work well as:
- **Popup**: Compact version, hide some panels
- **Side Panel**: Full UI, perfect fit
- **Full Page**: Current UI works as-is

Consider responsive design for popup mode (smaller viewport).

