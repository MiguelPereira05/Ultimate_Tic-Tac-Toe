# Ultimate Tic-Tac-Toe - Deploy to Render

## Deployment Steps for Render

### 1. Push to GitHub (if not already done)
```bash
git init
git add .
git commit -m "Ready for deployment"
git branch -M main
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

### 2. Deploy on Render

1. **Go to https://render.com** and sign in
2. **Click "New +"** → Select **"Static Site"**
3. **Connect your GitHub repository**
4. **Configure the deployment**:

   **Name**: `ultimate-tic-tac-toe` (or your preferred name)
   
   **Branch**: `main`
   
   **Build Command**: `npm run build`
   
   **Publish Directory**: `dist`

5. **Add Environment Variables** (Click "Advanced" or go to Environment after creation):
   - **Key**: `VITE_SUPABASE_URL`  
     **Value**: `https://qloybiuusojmtdqlfwdc.supabase.co`
   
   - **Key**: `VITE_SUPABASE_ANON_KEY`  
     **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsb3liaXV1c29qbXRkcWxmd2RjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyMzI0NDQsImV4cCI6MjA4MDgwODQ0NH0.9oKW1FmfPA6072O-S6KL5lzRLFbvqlJuTn-ktqBFjpw`

6. **Click "Create Static Site"**

### 3. Auto-Deploy Setup

Render will automatically:
- ✅ Build your app with `npm run build`
- ✅ Deploy the `dist` folder
- ✅ Auto-deploy on every Git push
- ✅ Provide HTTPS by default
- ✅ Give you a free `.onrender.com` domain

### 4. Post-Deployment

Your app will be live at: `https://your-app-name.onrender.com`

**Test everything**:
- [ ] Sign up / Login
- [ ] Add friends
- [ ] Challenge friends to games
- [ ] Play against bot
- [ ] Check game stats
- [ ] Test on mobile

### Troubleshooting

**Issue**: Build fails
- Check that `node_modules` is in `.gitignore`
- Verify environment variables are set correctly

**Issue**: Blank page after deploy
- Check browser console for errors
- Verify Supabase URL and key are correct
- Make sure `dist` is the publish directory

**Issue**: Real-time not working
- Verify Supabase Realtime is enabled
- Check CORS settings in Supabase dashboard

### Custom Domain (Optional)

1. Go to your Render dashboard
2. Settings → Custom Domain
3. Add your domain and configure DNS

## Quick Reference

**Build Command**: `npm run build`
**Publish Directory**: `dist`
**Environment Variables**: 2 required (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
