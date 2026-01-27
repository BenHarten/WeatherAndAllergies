# Weather & Allergies — GitHub Pages Website

A modern, static website for displaying current weather data and pollen information. Hosted on **GitHub Pages** — completely free and without a backend server.

## Features

- **Modern UI**: Glassmorphism design with Dark Mode (responsive)
- **Weather**: Current data + 7-16 day forecast via **Open-Meteo** (free, CORS-friendly, no API key needed)
- **Pollen / Allergies**: Forecasts via **Open-Meteo** (free, CORS-friendly, no API key needed)
- **Location Search & Geolocation**: Geocoding via **Geoapify** (free, API key with domain restriction)
- **Geolocation**: Browser geolocation with reverse geocoding (displays city names)
- **Forecast Modal**: Clickable weather forecast with temperature and weather description
- **German UI**: All website texts and weather descriptions in German

## Setup

### 1. Create Geoapify API Key

1. Go to [geoapify.com](https://geoapify.com) and sign up (free)
2. Create a new API key
3. **Important**: Set restrictions:
   - Go to **API Keys** → your key → **Restrict to domain/origin**
   - Add your GitHub Pages URL: `https://<your-username>.github.io`
   - Save the changes
4. Copy the API key
5. Open `js/app.js` and replace the `GEOAPIFY_API_KEY`:
   ```javascript
   const GEOAPIFY_API_KEY = 'your-api-key-here';
   ```

### 2. Clone & Push Repository

```bash
git clone <your-repo-url>
cd WeatherAndAllergies
git add .
git commit -m "Add Geoapify API key"
git push origin main
```

### 3. Enable GitHub Pages

1. In your GitHub repository, go to **Settings** → **Pages**
2. Configure:
   - **Source**: `Deploy from a branch`
   - **Branch**: `main` 
   - **Folder**: `/ (root)`
   - Click **Save**
3. After ~1–2 minutes, your site will be live at:
   ```
   https://<username>.github.io/<repo-name>/
   ```

## Local Testing

### Without Python Server (Simple Static Testing)
```bash
cd WeatherAndAllergies
python3 -m http.server 8000
# Then open http://localhost:8000 in your browser
# Uses Open-Meteo only (no hazelnut pollen data)
```

### With Python Proxy Server (Full DWD Support)
```bash
# Terminal 1: Start the Python proxy server
cd WeatherAndAllergies
python3 server.py
# Server starts at http://localhost:8000
# Proxies DWD pollen API at /api/dwd-pollen

# The app will try DWD first, then fall back to Open-Meteo if needed
```

### GitHub Pages Deployment
When deployed to GitHub Pages:
- ✅ **Open-Meteo works**: Weather, pollen for 6 types (alder, birch, grass, mugwort, olive, ragweed)
- ❌ **DWD unavailable by default**: Requires Python server (not supported on GitHub Pages static hosting)
- **Fallback**: App automatically uses Open-Meteo when DWD proxy is unavailable
- **Solution**: Deploy DWD proxy to Railway.app (see below for full DWD support on GitHub Pages)

## Deploy DWD Proxy to Railway.app (Optional - Get Full 8 Pollen Types on GitHub Pages)

To enable DWD pollen data (including hazelnut, ash, rye) on your GitHub Pages site, deploy the proxy server to Railway.app:

### Step 1: Push Your Code to GitHub

```bash
cd WeatherAndAllergies
git add .
git commit -m "Add Railway configuration"
git push origin main
```

### Step 2: Deploy to Railway.app

1. **Sign up at Railway.app**
   - Go to [railway.app](https://railway.app)
   - Click "Login with GitHub"
   - Authorize Railway to access your repositories

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your `WeatherAndAllergies` repository
   - Click "Deploy Now"

3. **Wait for Deployment** (~2 minutes)
   - Railway will automatically detect the `Procfile`
   - Watch the build logs in the dashboard
   - Wait for "Success" status

4. **Get Your Railway URL**
   - Click on your deployment
   - Go to "Settings" tab
   - Click "Generate Domain" under "Networking"
   - Copy the URL (e.g., `https://weatherandallergies-production.up.railway.app`)

### Step 3: Update Your App Configuration

1. **Open `js/api.js` in your repository**
2. **Find line 14** and replace `'https://your-railway-app.up.railway.app'` with your actual Railway URL:

```javascript
DWD_PROXY_URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
  ? '' 
  : 'https://weatherandallergies-production.up.railway.app'  // ← Your Railway URL here
```

3. **Commit and push**:
```bash
git add js/api.js
git commit -m "Add Railway proxy URL"
git push origin main
```

4. **Wait 1-2 minutes** for GitHub Pages to rebuild

### Step 4: Test Your Deployment

1. Open your GitHub Pages site
2. Open browser console (F12)
3. Look for: `✅ Using DWD pollen data`
4. Check allergy forecast shows 8 pollen types (including Hasel/hazelnut)

### Railway.app Cost & Limits

- **Free tier**: $5/month credit (enough for this proxy)
- **Usage**: Lightweight proxy uses ~$2-3/month
- **Monitoring**: Railway shows usage in dashboard
- **Billing**: Requires credit card but won't charge if under $5/month
- **Auto-sleep**: No sleep on Railway (instant response always)

### Troubleshooting Railway Deployment

**Build fails?**
- Check Railway logs for Python errors
- Ensure `Procfile` and `runtime.txt` are in repository root

**404 on /api/dwd-pollen?**
- Verify Railway deployment shows "Active"
- Check Railway logs for startup errors
- Test directly: `https://your-app.up.railway.app/api/dwd-pollen`

**CORS errors?**
- Railway should handle CORS automatically (server.py has CORS headers)
- If issues persist, check Railway logs for request details

## Mock Mode (Testing)

Mock mode allows you to test the app with predefined weather and pollen data without needing live API calls. Useful for testing different scenarios locally.

### Enable Mock Mode

Choose one of these methods:

**Option 1: URL Parameter**
```
http://localhost:8000/?mock=true
```

**Option 2: Browser Console**
```javascript
localStorage.setItem('useMockAPI', 'true');
// Reload the page
```

### Available Scenarios

The app comes with 4 pre-built test scenarios:

| Scenario | Weather | Temp | Pollen Level | Use Case |
|----------|---------|------|--------------|----------|
| `spring_high_pollen` | Clear (0°C) | 18°C | **High** (birch, grass) | Test high pollen alerts |
| `winter_low_pollen` | Rainy (61°C) | 5°C | **Low** | Test minimal pollen display |
| `stormy_moderate_pollen` | Thunderstorm (95°C) | 12°C | **Moderate** | Test storm + moderate pollen |
| `extreme_pollen` | Cloudy (2°C) | 22°C | **Very High** (all types) | Test worst-case scenario |

### Debug Commands

When mock mode is enabled, use these commands in the browser console:

```javascript
// Show all available scenarios
debugApp.scenarios()

// Switch to a specific scenario (instantly reloads data)
debugApp.switchScenario('winter_low_pollen')

// Check current mock status
debugApp.status()

// View current mock data as JSON
debugApp.data()

// Enable/disable mock mode
debugApp.enableMock()
debugApp.disableMock()

// Show help
debugApp.help()
```

### Customizing Mock Data

Edit mock scenarios in `js/mock-data.js`:

```javascript
const MOCK_SCENARIOS = {
  spring_high_pollen: {
    weather: {
      current_weather: {
        weathercode: 0,        // See WEATHER_CODES in data.js
        temperature: 18,
        windspeed: 12,
        winddirection: 45
      }
    },
    pollen: {
      hourly: {
        alder_pollen: Array(24).fill(0, 0, 12).concat(Array(12).fill(45)),
        birch_pollen: Array(24).fill(0, 0, 12).concat(Array(12).fill(120)),
        // ... more pollen types
        european_aqi: Array(24).fill(null, 0, 18).concat([45, 48, 50, 52, 50, 48])
      }
    }
  }
}
```

To add a new scenario, just add a new object to `MOCK_SCENARIOS` with the same structure.

## API Details

### DWD Pollen (Local Development Only)
- **URL**: Via Python proxy at `/api/dwd-pollen` (proxies Deutscher Wetterdienst)
- **Setup**: Requires `server.py` running locally
- **Advantages**:
  - ✓ 8 pollen types (includes **Hazelnut, Ash, Rye**)
  - ✓ Germany-focused with regional data
  - ✓ Detailed forecasts
- **Limitation**: Cannot run on GitHub Pages (requires backend server)
- **Documentation**: https://www.dwd.de

### Open-Meteo (Weather)

- **URL**: https://api.open-meteo.com/v1/forecast
- **Advantages**:
  - ✓ Free, unlimited
  - ✓ No API key needed
  - ✓ CORS enabled
  - ✓ Full support for German cities
- **Documentation**: https://open-meteo.com/en/docs

### Open-Meteo (Pollen / Allergies)

- **URL**: https://air-quality-api.open-meteo.com/v1/air-quality
- **Advantages**:
  - ✓ Free, unlimited
  - ✓ No API key needed
  - ✓ CORS enabled
  - ✓ Pollen forecasts for 6 allergen types (alder, birch, grass, mugwort, olive, ragweed)
- **Documentation**: https://open-meteo.com/en/docs/air-quality-api

### Geoapify (Geocoding & Reverse Geocoding)

- **Function**: Geocoding for location search + reverse geocoding (coordinates → city names)
- **Advantages**: Free tier with 3,000 requests/day, CORS enabled, domain restriction available
- **Documentation**: https://geoapify.com/api/geocoding-api

## Project Structure

```
.
├── index.html          # Main HTML
├── css/
│   └── style.css       # Glassmorphism design
├── js/
│   └── app.js          # Logic (API calls, DOM manipulation)
├── README.md           # This file
├── .gitignore          # Git ignore rules
└── LICENSE             # MIT (optional)
```

## Technology Stack

### Frontend
- **HTML5**: Semantic markup for structure
- **CSS3**: Custom CSS with CSS variables for theming, glassmorphism effects, responsive design with media queries
- **Vanilla JavaScript (ES6+)**: No frameworks, no build tools required
  - Fetch API for HTTP requests
  - DOM manipulation and event handling
  - Async/await for clean asynchronous code
  - Browser Geolocation API for location detection

### APIs (All Free & CORS-Enabled)
- **Open-Meteo**: Weather forecasts and air quality/pollen data
  - Current weather observations
  - 7-16 day weather forecasts
  - Hourly pollen concentrations for 6 allergen types
- **Geoapify**: Geocoding and reverse geocoding
  - Forward geocoding (search by location name)
  - Reverse geocoding (coordinates → city names)

### Hosting
- **GitHub Pages**: Free static site hosting directly from git repository
  - No backend server needed
  - Automatic HTTPS
  - Built-in CI/CD via GitHub Actions

### Design Patterns
- **Glassmorphism**: Frosted glass effect with backdrop blur and semi-transparent backgrounds
- **Responsive Design**: Mobile-first approach with breakpoints for tablets/desktops
- **Client-Side Only**: All data fetching and processing happens in the browser

### Browser Support
- Modern browsers with ES6 support (Chrome, Firefox, Safari, Edge)
- Requires browser Geolocation API support
- Requires Fetch API support

## Customization & Extensions

### Add More Pollen Types
Edit the `getPollenFallback()` function in `js/app.js`:

```javascript
types=['Ambrosia', 'Birch', 'Grass', 'Ragweed', ...];
```

### Change Language
All German texts are in HTML and JS. Simply find and replace.

### Customize Colors
All CSS variables are defined at the top of `css/style.css` (e.g., `--accent`, `--bg1`).

## Troubleshooting

**Q: "Unauthorized" error with Geoapify on GitHub Pages?**
- A: Make sure your API key is restricted to your GitHub Pages domain in the Geoapify console. Wait 1–2 minutes after saving for changes to propagate.

**Q: Location search not working?**
- A: Verify your Geoapify API key is valid and you haven't exceeded your quota (free tier: 3,000 requests/day).

**Q: CORS errors?**
- A: Open-Meteo and Geoapify have CORS enabled. If using a custom endpoint, consider a CORS proxy (not recommended for production).

## License

This template is open source (MIT). Use it freely for your projects!

---

**Questions?** Feel free to open a GitHub issue or expand this README.

