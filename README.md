# OOPrompt Chrome Extension

Object-Oriented Prompt Builder for AI - Structure and optimize your AI prompts with a powerful, structured approach.

## Features

- Structured Prompt Building: Create prompts with properties, emphasis levels, and hierarchical organization
- AI Integration: Send prompts directly to OpenAI's ChatGPT API
- Property Management: Add, edit, and organize properties with emphasis levels (Important, Normal, Avoid)
- Prompt Library: Save and manage multiple prompt objects
- File Attachments: Attach files to properties for context
- Smart Suggestions: AI-powered property suggestions and conflict detection

## Installation (Unpacked Extension)

To load this extension in Chrome for development or testing:

### Prerequisites

- Google Chrome browser
- Node.js (for building the extension)

### Step 1: Build the Extension

1. Open a terminal/command prompt in the project directory
2. Install dependencies (if not already installed):

   ```
   npm install
   ```
3. Build the extension:

   ```
   npm run build:extension
   ```

   This creates a dist/ folder with all the extension files.

### Step 2: Load Extension in Chrome

1. Open Google Chrome
2. Navigate to the extensions page:
   - Type chrome://extensions/ in the address bar, OR
   - Go to Menu (three dots) → Extensions → Manage Extensions
3. Enable Developer Mode:
   - Toggle the "Developer mode" switch in the top-right corner
4. Load the extension:
   - Click "Load unpacked" button
   - Navigate to your project folder
   - Select the dist/ folder (NOT the root project folder)
   - Click "Select Folder"

### Step 3: Verify Installation

- You should see the OOPrompt extension in your extensions list
- The extension icon should appear in your Chrome toolbar
- Click the icon to open the extension popup

### Step 4: Configure API Key (Required)

1. Open the extension
2. Click on "Settings" (if available) or look for API key configuration
3. Enter your OpenAI API key
   - Get your API key from: https://platform.openai.com/api-keys
   - The key is stored locally on your device

## Development

### Build Commands

Build extension for production:

```
npm run build:extension
```

Development mode with hot reload:

```
npm run dev:extension
```

Create ZIP package for Chrome Web Store:

```
npm run package
```

### Project Structure

```
ooprompt/
├── public/
│   ├── manifest.json       # Extension manifest
│   ├── icons/              # Extension icons
│   └── privacy-policy.html # Privacy policy
├── src/
│   ├── components/         # React components
│   ├── services/           # API services
│   ├── state/              # State management
│   └── types.ts            # TypeScript types
└── dist/                   # Built extension (generated)
```

## Troubleshooting

### Extension Not Loading

- Check Developer Mode: Make sure "Developer mode" is enabled
- Select Correct Folder: Make sure you selected the dist/ folder, not the root folder
- Check for Errors: Look at the extensions page for error messages
- Rebuild: Try running npm run build:extension again

### Extension Not Working

- Check Console: Right-click extension icon → "Inspect popup" → Check Console tab for errors
- Check API Key: Make sure your OpenAI API key is configured correctly
- Check Permissions: The extension needs permission to access OpenAI API

### Build Errors

- Clear node_modules: Delete node_modules folder and run npm install again
- Check Node Version: Make sure you're using Node.js 18.x or compatible version
- Check Dependencies: Run npm install to ensure all dependencies are installed

## Updating the Extension

After making changes to the code:

1. Rebuild the extension:

   ```
   npm run build:extension
   ```
2. Reload the extension in Chrome:

   - Go to chrome://extensions/
   - Find OOPrompt extension
   - Click the refresh/reload icon
