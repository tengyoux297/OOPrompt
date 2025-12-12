# How to Reupload Extension to Chrome Web Store

## Step 1: Update Version Number (Important!)

Before rebuilding, **increment the version number** in `public/manifest.json`:

```json
{
  "version": "1.0.1"  // Change from 1.0.0 to 1.0.1 (or higher)
}
```

**Chrome Web Store requires each upload to have a higher version number.**

## Step 2: Build the Extension

Run the build command:

```bash
npm run build:extension
```

This creates the `dist/` folder with all extension files.

## Step 3: Create ZIP Package

Run the package command:

```bash
npm run package
```

This will:
1. Build the extension
2. Create `ooprompt-extension.zip` in the project root

**OR manually create ZIP:**
1. Navigate to the `dist/` folder
2. Select all files and folders inside `dist/`
3. Right-click → "Send to" → "Compressed (zipped) folder"
4. Name it `ooprompt-extension.zip`

## Step 4: Upload to Chrome Web Store

### If This is an UPDATE (Extension Already Published):

1. Go to https://chrome.google.com/webstore/devconsole
2. Sign in with your Google account
3. Click on your extension (OOPrompt)
4. Click **"Package"** tab (or "Upload new package")
5. Click **"Upload updated package"**
6. Select your `ooprompt-extension.zip` file
7. Click **"Upload"**
8. Fill out **"What's new in this version?"** section:
   - Example: "Fixed broad host permissions warning by using activeTab permission instead of content scripts"
9. Click **"Submit for review"**

### If This is a NEW Submission:

1. Go to https://chrome.google.com/webstore/devconsole
2. Click **"New Item"**
3. Upload your `ooprompt-extension.zip` file
4. Fill out all required information:
   - Name, description, screenshots, etc.
   - Privacy policy URL
   - Permission justifications
5. Click **"Submit for review"**

## Step 5: Wait for Review

- **First submission**: Usually 1-3 business days
- **Updates**: Usually faster (few hours to 1 day)
- You'll receive email notifications about status

## Important Notes

### Before Uploading:

✅ **Check version number** - Must be higher than previous version  
✅ **Test locally** - Load unpacked extension in Chrome to verify it works  
✅ **Verify manifest.json** - Make sure all paths are correct  
✅ **Check icons** - Ensure all icon sizes (16, 48, 128) are present  
✅ **Privacy policy URL** - Must be accessible and working  

### Common Issues:

❌ **"Version must be higher"** - Increment version in manifest.json  
❌ **"Missing icons"** - Ensure icon-16.png, icon-48.png, icon-128.png exist  
❌ **"Invalid manifest"** - Check JSON syntax in manifest.json  
❌ **"Privacy policy not accessible"** - Verify your privacy policy URL works  

## Quick Command Summary

```bash
# 1. Update version in public/manifest.json (manually)

# 2. Build extension
npm run build:extension

# 3. Create ZIP package
npm run package

# 4. Upload ooprompt-extension.zip to Chrome Web Store
```

## Testing Before Upload

1. Go to `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select the `dist/` folder
5. Test all functionality
6. If everything works, proceed with ZIP upload
