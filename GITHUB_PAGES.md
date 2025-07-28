# GitHub Pages Deployment

This project is configured to automatically deploy to GitHub Pages using GitHub Actions.

## Setup Instructions

1. **Enable GitHub Pages in Repository Settings:**
   - Go to your repository on GitHub
   - Navigate to `Settings` > `Pages`
   - Under "Source", select `GitHub Actions`

2. **Push to Main Branch:**
   - The deployment will automatically trigger when you push to the `main` branch
   - GitHub Actions will build the project using Vite and deploy to GitHub Pages

3. **Access Your Site:**
   - Your site will be available at: `https://[your-username].github.io/stacexplorer/`
   - The deployment URL will also be shown in the Actions tab

## Local Development vs Production

- **Local Development:** `npm run dev` - runs on `http://localhost:3000`
- **Production Build:** `npm run build:gh-pages` - builds for GitHub Pages with correct base path
- **Preview Production Build:** `npm run preview` - preview the built version locally

## Configuration

The Vite configuration automatically:
- Sets the correct base path (`/stacexplorer/`) for GitHub Pages
- Configures the PWA manifest with the proper scope and start URL
- Optimizes the build for production deployment

## Workflow

The GitHub Actions workflow (`.github/workflows/deploy.yml`) will:
1. Checkout the code
2. Setup Node.js 18
3. Install dependencies with `npm ci`
4. Build the project with `npm run build`
5. Deploy to GitHub Pages

## Manual Deployment

If you need to deploy manually:
```bash
npm run build:gh-pages
```

Then upload the `dist/` folder contents to your hosting provider.