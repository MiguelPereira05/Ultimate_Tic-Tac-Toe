# Ultimate Tic-Tac-Toe Deployment Guide

## Prerequisites
- Node.js 18+ installed
- Supabase account with configured database
- Git repository

## Deployment Options

### Option 1: Deploy to Vercel (Recommended - Easiest)

1. **Install Vercel CLI** (optional):
   ```bash
   npm i -g vercel
   ```

2. **Push to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin YOUR_GITHUB_REPO_URL
   git push -u origin main
   ```

3. **Deploy via Vercel Dashboard**:
   - Go to https://vercel.com
   - Click "Add New Project"
   - Import your GitHub repository
   - Configure environment variables:
     - `VITE_SUPABASE_URL`: Your Supabase project URL
     - `VITE_SUPABASE_ANON_KEY`: Your Supabase anon key
   - Click "Deploy"

4. **Or deploy via CLI**:
   ```bash
   vercel
   ```
   Follow prompts and add environment variables when asked.

### Option 2: Deploy to Netlify

1. **Build the project**:
   ```bash
   npm run build
   ```

2. **Deploy via Netlify Dashboard**:
   - Go to https://netlify.com
   - Drag and drop the `dist` folder
   - Or connect to GitHub and auto-deploy

3. **Configure environment variables** in Netlify dashboard:
   - Site settings → Environment variables
   - Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

### Option 3: Deploy to GitHub Pages

1. **Install gh-pages**:
   ```bash
   npm install --save-dev gh-pages
   ```

2. **Update package.json**:
   Add `"homepage": "https://yourusername.github.io/your-repo-name"` and deploy script

3. **Deploy**:
   ```bash
   npm run deploy
   ```

## Environment Variables

Your deployment platform needs these environment variables:

```
VITE_SUPABASE_URL=https://qloybiuusojmtdqlfwdc.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

## Post-Deployment Checklist

- [ ] Test authentication (signup/login)
- [ ] Test friend system
- [ ] Test multiplayer games
- [ ] Test real-time updates
- [ ] Verify game stats work
- [ ] Test on mobile devices
- [ ] Configure custom domain (optional)

## Supabase Configuration

Make sure your Supabase project has:
- ✅ Authentication enabled
- ✅ profiles table created
- ✅ friends table created
- ✅ games table created
- ✅ RLS policies enabled
- ✅ Realtime enabled on games table

## Troubleshooting

**Issue**: Environment variables not working
**Solution**: Make sure variables are prefixed with `VITE_` and restart the dev server

**Issue**: Real-time not working in production
**Solution**: Check Supabase project settings → API → Realtime is enabled

**Issue**: CORS errors
**Solution**: Add your production domain to Supabase allowed origins

## Quick Deploy Commands

```bash
# Build for production
npm run build

# Preview production build locally
npm run preview

# Deploy to Vercel
vercel --prod

# Deploy to Netlify
netlify deploy --prod
```
