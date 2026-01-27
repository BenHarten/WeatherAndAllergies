# Railway Deployment Quick Guide

## ✅ Pre-deployment Checklist
- [x] Procfile created
- [x] runtime.txt created
- [x] server.py updated for Railway
- [x] api.js configured for dynamic proxy URL
- [ ] Code pushed to GitHub
- [ ] Railway account created
- [ ] Railway deployment complete
- [ ] Railway URL added to api.js

## 🚀 Step-by-Step Deployment

### 1. Push to GitHub (5 minutes)
```bash
cd "/Users/I513878/Private (local)/WeatherAndAllergies"
git status  # Check what changed
git add .
git commit -m "Add Railway deployment configuration"
git push origin main
```

### 2. Deploy to Railway (10 minutes)

**a) Create Account**
- Visit: https://railway.app
- Click "Login with GitHub"
- Authorize Railway

**b) Create Project**
- Click "New Project"
- Select "Deploy from GitHub repo"
- Choose: WeatherAndAllergies
- Click "Deploy Now"

**c) Wait for Build**
- Watch build logs
- Wait for "Success ✓" status
- Should take ~2 minutes

**d) Generate Domain**
- Click your deployment
- Go to "Settings" tab
- Under "Networking" → click "Generate Domain"
- Copy the URL (save it!)

Example URL: `https://weatherandallergies-production.up.railway.app`

### 3. Update Configuration (2 minutes)

**Edit js/api.js** (line 14):
```javascript
DWD_PROXY_URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
  ? '' 
  : 'https://YOUR-ACTUAL-RAILWAY-URL-HERE.up.railway.app'
```

**Push changes:**
```bash
git add js/api.js
git commit -m "Add Railway proxy URL"
git push origin main
```

### 4. Test (1 minute)

**Test Railway endpoint directly:**
```bash
curl https://YOUR-RAILWAY-URL.up.railway.app/api/dwd-pollen
```
Should return JSON with pollen data.

**Test on GitHub Pages:**
1. Open your GitHub Pages site
2. Open browser console (F12)
3. Refresh page
4. Look for: "✅ Using DWD pollen data"
5. Click allergy forecast → should show 8 pollen types

## 🎯 What Each File Does

- **Procfile**: Tells Railway how to start your server
- **runtime.txt**: Specifies Python version
- **server.py**: Updated to use Railway's PORT environment variable
- **api.js**: Configured to use Railway URL on GitHub Pages, localhost URL locally

## 💰 Cost Monitoring

Check Railway dashboard:
- Settings → Usage
- Should show ~$0.10-0.20/day
- Free tier: $5/month credit
- You'll be notified before any charges

## ❓ Common Issues

**"Build failed"**
→ Check Railway logs, ensure Procfile is in repo root

**"404 on /api/dwd-pollen"**
→ Verify deployment is "Active" in Railway dashboard

**"Still using Open-Meteo"**
→ Check api.js has correct Railway URL
→ Clear browser cache and refresh

**"Slow first load"**
→ Railway doesn't sleep (unlike Render), should be instant

## 📝 Next Steps After Deployment

1. Monitor Railway usage for first week
2. Check GitHub Pages shows DWD data
3. Test on mobile devices
4. (Optional) Set up custom domain on Railway
