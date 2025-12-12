# Privacy Policy for OOPrompt Chrome Extension

**Last Updated:** [Date]

## Introduction

OOPrompt ("we," "our," or "the extension") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, store, and protect your information when you use the OOPrompt Chrome extension.

## Information We Collect

### User-Provided Data

- **Prompt Objects**: The extension stores prompt objects, properties, and structured data that you create within the extension.
- **File Attachments**: If you choose to attach files to properties, these files are stored locally on your device.
- **API Keys**: If you configure API keys for AI services (OpenAI, Google Gemini, Anthropic Claude), these are stored locally on your device.
- **Application State**: The extension stores your application state, including saved prompts, history, and preferences.

### Automatically Collected Data

- **No Tracking**: The extension does not collect, track, or transmit any personal information, browsing history, or usage analytics.
- **No Analytics**: We do not use analytics services or tracking technologies.

## How We Store Your Data

All data collected by the extension is stored **locally on your device** using:

- Chrome's `chrome.storage.local` API (for Chrome extension)
- Browser's `localStorage` (as fallback)

**We do not transmit, upload, or sync your data to any external servers or third-party services**, except when you explicitly choose to send prompts to AI services.

## How We Use Your Data

Your data is used solely for:

1. **Local Functionality**: Storing your prompt objects and application state to provide continuity across browser sessions.
2. **AI Service Integration**: When you explicitly choose to send a prompt to an AI service (OpenAI, Gemini, or Claude), your prompt data is transmitted to that service's API. This transmission only occurs when you actively trigger it.

## Third-Party Services

### AI Service Providers

When you use the extension to send prompts to AI services, your prompt data is transmitted to:

- **OpenAI** (api.openai.com) - If you use ChatGPT
- **Google** (generativelanguage.googleapis.com) - If you use Gemini
- **Anthropic** (api.anthropic.com) - If you use Claude

These transmissions are made directly from your browser to the selected AI service using your own API keys. We do not intercept, store, or have access to these communications.

### CORS Proxy Services

The extension may use CORS proxy services (api.allorigins.win, corsproxy.io) as fallback options when direct API calls encounter cross-origin restrictions. These services act as intermediaries and do not store your data.

**Important**: Your API keys are stored locally and never shared with us or any third parties except the AI service provider you choose.

## Data Sharing

**We do not share, sell, or rent your data to any third parties.** Your data remains on your device unless you explicitly choose to send prompts to AI services.

## Data Security

- All data is stored locally on your device using Chrome's secure storage APIs.
- API keys are stored locally and never transmitted to our servers.
- The extension uses Content Security Policy (CSP) to prevent unauthorized code execution.
- All code is bundled locally - no remote code is executed.

## Your Rights

You have full control over your data:

- **Access**: All your data is stored locally and accessible through the extension interface.
- **Delete**: You can delete prompt objects, files, and clear all data through the extension's interface.
- **Export**: You can copy or export your prompt objects at any time.
- **Uninstall**: Uninstalling the extension removes all locally stored data (Chrome will clear chrome.storage.local data).

## Children's Privacy

The extension is not intended for users under the age of 13. We do not knowingly collect information from children.

## Changes to This Privacy Policy

We may update this Privacy Policy from time to time. We will notify you of any changes by updating the "Last Updated" date at the top of this policy.

## Contact Us

If you have questions about this Privacy Policy, please contact us through the Chrome Web Store listing or tengyoux@ucla.edu.

## Compliance

This extension complies with:

- Chrome Web Store Developer Program Policies
- General Data Protection Regulation (GDPR) principles (data stored locally, user control)
- California Consumer Privacy Act (CCPA) principles (no data sharing, local storage)

---

**Summary**: OOPrompt stores all data locally on your device. We do not collect, track, or share your personal information. Data is only transmitted to AI services when you explicitly choose to use them.
