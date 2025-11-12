# Step-by-Step Migration Guide

## Phase 1: Setup (30 minutes)

### 1.1 Install Dependencies
```bash
npm install -D @crxjs/vite-plugin @types/chrome
```

### 1.2 Create Extension Structure
```bash
mkdir -p public/icons src/background
```

### 1.3 Add Extension Icons
Create or download icons:
- `public/icons/icon-16.png` (16x16 pixels)
- `public/icons/icon-48.png` (48x48 pixels)  
- `public/icons/icon-128.png` (128x128 pixels)

You can use your existing logo or generate icons from a tool like:
- https://www.favicon-generator.org/
- https://realfavicongenerator.net/

## Phase 2: Configuration (45 minutes)

### 2.1 Update vite.config.ts
Replace your current `vite.config.ts` with the extension version (see `vite.config.extension.ts`)

### 2.2 Create manifest.json
Copy `manifest.example.json` to `public/manifest.json` and customize:
- Update version number
- Adjust permissions if needed
- Update description

### 2.3 Update package.json
Add extension-specific scripts:
```json
{
  "scripts": {
    "dev:extension": "vite --config vite.config.extension.ts",
    "build:extension": "tsc -b && vite build --config vite.config.extension.ts",
    "package:extension": "npm run build:extension && cd dist && zip -r ../ooprompt-extension.zip ."
  }
}
```

## Phase 3: Code Adjustments (1-2 hours)

### 3.1 Update Storage (Optional but Recommended)
Consider migrating from localStorage to chrome.storage for better sync:

**Option A: Keep localStorage** (Easiest - works as-is)
- No changes needed
- localStorage works in extensions

**Option B: Migrate to chrome.storage** (Better for sync)
- Update `useOOPrompt.ts` to use chrome.storage
- Update `fileStorageService.ts` to use chrome.storage

Example migration for useOOPrompt.ts:
```typescript
// Replace localStorage calls with chrome.storage
useEffect(() => {
  chrome.storage.local.set({
    ooprompt_state_v1: {
      oop: state.oop,
      promptObjects: state.promptObjects,
      currentObjectId: state.currentObjectId
    }
  });
}, [state.oop, state.promptObjects, state.currentObjectId]);
```

### 3.2 Handle API Keys Securely
**CRITICAL**: Your current setup exposes API keys in the frontend. For extensions:

**Option A: User Input** (Recommended)
- Add settings page for users to input their own API keys
- Store in chrome.storage.local (encrypted)
- Never commit keys to code

**Option B: Backend Proxy** (More secure)
- Create a simple backend that proxies API calls
- Store keys server-side
- Extension calls your backend instead

**Option C: Chrome Secrets API** (Chrome 118+)
- Use chrome.secrets API for secure key storage
- Requires additional permissions

### 3.3 Update CSP Headers
Your API calls should work, but verify:
- All external domains are in `host_permissions`
- CSP allows connections to those domains
- No inline scripts (Vite handles this)

### 3.4 Test File Handling
- File uploads: Should work as-is
- File downloads: May need `downloads` permission
- Large files: Consider IndexedDB instead of localStorage

## Phase 4: Testing (1 hour)

### 4.1 Build Extension
```bash
npm run build:extension
```

### 4.2 Load in Chrome
1. Open Chrome
2. Go to `chrome://extensions/`
3. Enable "Developer mode" (top right)
4. Click "Load unpacked"
5. Select the `dist/` folder

### 4.3 Test Functionality
- [ ] Extension popup opens
- [ ] UI renders correctly
- [ ] State persists (localStorage/chrome.storage)
- [ ] API calls work (OpenAI, Gemini, Claude)
- [ ] File uploads work
- [ ] All modals/panels work
- [ ] Keyboard shortcuts work

### 4.4 Test Different Extension Types
- **Popup**: Click extension icon
- **Side Panel**: Right-click extension icon → "Open side panel"
- **Full Page**: Create new tab with extension URL

## Phase 5: Optimization (Optional, 1-2 hours)

### 5.1 Reduce Bundle Size
- Analyze bundle: `npm run build:extension -- --analyze`
- Code split large dependencies
- Lazy load components

### 5.2 Add Extension-Specific Features
- Context menu integration
- Keyboard shortcuts (chrome.commands)
- Badge notifications
- Cross-tab communication

### 5.3 Improve UX for Extension Context
- Adjust UI for smaller popup viewport
- Add "Open in new tab" option
- Optimize for side panel layout

## Phase 6: Packaging & Distribution (30 minutes)

### 6.1 Create Package
```bash
npm run package:extension
```

### 6.2 Prepare Store Assets
- Screenshots (1280x800 or 640x400)
- Promotional images
- Store description
- Privacy policy

### 6.3 Submit to Chrome Web Store
1. Go to Chrome Web Store Developer Dashboard
2. Create new item
3. Upload zip file
4. Fill in store listing details
5. Submit for review

## Common Issues & Solutions

### Issue: API calls blocked by CSP
**Solution**: Ensure all domains are in `host_permissions` and CSP `connect-src`

### Issue: localStorage not persisting
**Solution**: Use chrome.storage instead, or ensure extension ID is consistent

### Issue: Icons not showing
**Solution**: Verify icon paths in manifest.json match actual file locations

### Issue: Popup too small
**Solution**: Use side panel or full page mode, or optimize UI for popup size

### Issue: API keys exposed
**Solution**: Implement user input or backend proxy (see Phase 3.2)

### Issue: Build errors
**Solution**: 
- Check TypeScript errors: `npm run build:extension`
- Verify all imports are correct
- Ensure manifest.json is valid JSON

## Quick Reference

### Development
```bash
npm run dev:extension    # Dev mode with hot reload
```

### Production
```bash
npm run build:extension # Build for production
npm run package:extension # Create zip for store
```

### Testing
1. Build: `npm run build:extension`
2. Load: Chrome → Extensions → Load unpacked → Select `dist/`
3. Test: Click extension icon

### Debugging
- Background script: `chrome://extensions/` → Service Worker → Inspect
- Popup: Right-click extension icon → Inspect popup
- Console: Open DevTools in popup/side panel

## Next Steps After Conversion

1. **User Onboarding**: Add tutorial for extension context
2. **Settings Page**: Create options page for API keys
3. **Keyboard Shortcuts**: Add chrome.commands for quick access
4. **Context Integration**: Add right-click menu options
5. **Sync**: Enable chrome.storage.sync for cross-device sync
6. **Analytics**: Add privacy-friendly analytics (optional)
7. **Updates**: Set up auto-update mechanism

## Estimated Total Time

- **Minimum**: 3-4 hours (basic conversion)
- **Recommended**: 6-8 hours (with optimizations)
- **Full Featured**: 10-12 hours (with all enhancements)

