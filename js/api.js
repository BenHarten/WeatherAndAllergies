// ============ CONFIGURATION & CONSTANTS ============
const CONFIG = {
  GEOAPIFY_KEY: '308aa1f469dd4868b6676fc094a5a6d2',
  DEFAULT_LAT: 52.52,
  DEFAULT_LON: 13.405,
  DEFAULT_LOCATION: 'Berlin',
  // Time constants (milliseconds)
  MS_PER_DAY: 86400000,
  // Forecast configuration
  INITIAL_FORECAST_DAYS: 7,
  MAX_FORECAST_DAYS: 16,
  // API caching (30 minutes)
  CACHE_TTL: 1800000,
  // DWD Proxy URL - Railway deployment or local
  // Replace with your Railway URL after deployment: 'https://your-app.up.railway.app'
  DWD_PROXY_URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? '' 
    : 'https://your-railway-app.up.railway.app'
};

const APIS = {
  geoapifySearch: (q) => `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(q)}&limit=5&apiKey=${CONFIG.GEOAPIFY_KEY}`,
  geoapifyReverse: (lat, lon) => `https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lon}&apiKey=${CONFIG.GEOAPIFY_KEY}`,
  openMeteoWeather: (lat, lon) => `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=Europe%2FBerlin`,
  openMeteoPollen: (lat, lon) => `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&hourly=alder_pollen,birch_pollen,grass_pollen,mugwort_pollen,olive_pollen,ragweed_pollen,european_aqi&timezone=Europe%2FBerlin`,
  openMeteoForecast: (lat, lon, days) => `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max&hourly=weather_code,temperature_2m,precipitation_probability,wind_speed_10m&timezone=Europe%2FBerlin&forecast_days=${days}`
};
