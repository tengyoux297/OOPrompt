# Privacy Policy Hosting Guide

You need to host your privacy policy at a publicly accessible URL for the Chrome Web Store. Here are several options:

## Option 1: GitHub Pages (Free & Easy) ⭐ Recommended

1. **Create a GitHub repository** (if you don't have one)
   - Go to https://github.com/new
   - Create a new repository (e.g., `ooprompt-privacy`)

2. **Upload the HTML file**
   - Upload `public/privacy-policy.html` to your repository
   - Rename it to `index.html` in the root of the repository

3. **Enable GitHub Pages**
   - Go to repository Settings → Pages
   - Select source: "Deploy from a branch"
   - Choose branch: `main` (or `master`)
   - Folder: `/ (root)`
   - Click Save

4. **Get your URL**
   - Your privacy policy will be at: `https://[your-username].github.io/[repository-name]/`
   - Example: `https://tengyoux.github.io/ooprompt-privacy/`

## Option 2: Netlify Drop (Free, No Account Needed)

1. Go to https://app.netlify.com/drop
2. Drag and drop the `public/privacy-policy.html` file
3. Rename it to `index.html` if needed
4. Get your URL (e.g., `https://random-name-123.netlify.app`)

## Option 3: Vercel (Free)

1. Sign up at https://vercel.com
2. Create a new project
3. Upload `public/privacy-policy.html` as `index.html`
4. Deploy and get your URL

## Option 4: Your Own Website

If you have a website, upload `public/privacy-policy.html` to your web server.

## Quick Setup Script

After hosting, update the date in the HTML file:

1. Open `public/privacy-policy.html`
2. Replace `[Date]` with today's date (e.g., "January 15, 2025")
3. Upload to your hosting service

## Testing

Before submitting to Chrome Web Store:
1. Visit your privacy policy URL in a browser
2. Make sure it loads correctly
3. Test on mobile device if possible
4. Verify all links work

## Chrome Web Store Submission

When submitting your extension:
- **Privacy Policy URL**: Enter your hosted URL
- Make sure the URL is accessible without authentication
- The URL should use HTTPS (most hosting services provide this automatically)

