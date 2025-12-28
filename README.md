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

```bash
python3 -m http.server 8000
# Then open http://localhost:8000 in your browser
```

## API Details

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

