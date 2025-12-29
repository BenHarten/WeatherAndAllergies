// ============ CONFIGURATION & CONSTANTS ============
const CONFIG = {
  GEOAPIFY_KEY: '308aa1f469dd4868b6676fc094a5a6d2',
  DEFAULT_LAT: 52.52,
  DEFAULT_LON: 13.405,
  DEFAULT_LOCATION: 'Berlin'
};

const APIS = {
  geoapifySearch: (q) => `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(q)}&limit=5&apiKey=${CONFIG.GEOAPIFY_KEY}`,
  geoapifyReverse: (lat, lon) => `https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lon}&apiKey=${CONFIG.GEOAPIFY_KEY}`,
  openMeteoWeather: (lat, lon) => `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=Europe%2FBerlin`,
  openMeteoPollen: (lat, lon) => `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&hourly=alder_pollen,birch_pollen,grass_pollen,mugwort_pollen,olive_pollen,ragweed_pollen,european_aqi&timezone=Europe%2FBerlin`,
  openMeteoForecast: (lat, lon, days) => `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Europe%2FBerlin&forecast_days=${days}`
};

const WEATHER_CODES = {
  0: 'Klar', 1: 'Teils bewölkt', 2: 'Bewölkt', 3: 'Bedeckt', 45: 'Nebel',
  48: 'Nebel mit Raureif', 51: 'Leicht Niesel', 53: 'Mäßiger Niesel', 55: 'Intensiver Niesel',
  61: 'Schwacher Regen', 63: 'Mäßiger Regen', 65: 'Starker Regen',
  71: 'Schwacher Schneefall', 73: 'Mäßiger Schneefall', 75: 'Starker Schneefall',
  80: 'Schwache Schauer', 81: 'Mäßige Schauer', 82: 'Intensive Schauer',
  85: 'Schwache Schnee-Schauer', 86: 'Intensive Schnee-Schauer',
  95: 'Gewitter', 96: 'Gewitter mit Hagel', 99: 'Gewitter mit Hagel (stark)'
};

const POLLEN_NAMES = {
  alder: 'Erle', birch: 'Birke', grass: 'Gräser', 
  mugwort: 'Beifuß', olive: 'Olive', ragweed: 'Ambrosia'
};

const POLLEN_LEVELS = {
  keine: 'Keine ✓',
  sehr_niedrig: 'Sehr niedrig ✓',
  niedrig: 'Niedrig ✓',
  mäßig: 'Mäßig ⚠',
  hoch: 'Hoch ⚠⚠',
  sehr_hoch: 'Sehr hoch ⚠⚠⚠',
  null: 'Keine Daten'
};

const AQI_LEVELS = {
  getLevel: (aqi) => aqi <= 15 ? 'Gut' : aqi <= 30 ? 'Zufriedenstellend' : aqi <= 55 ? 'Mäßig' : aqi <= 100 ? 'Schlecht' : 'Sehr schlecht'
};

// ============ STATE ============
const state = {
  currentForecastDays: 7,
  currentForecastLat: null,
  currentForecastLon: null,
  currentLocationName: 'Standort'
};

// ============ DOM UTILITIES ============
const el = id => document.getElementById(id);
const setButtonState = (btn, disabled, opacity = '1') => {
  btn.disabled = disabled;
  btn.style.opacity = opacity;
};

// ============ EVENT LISTENERS ============
el('searchBtn').addEventListener('click', onSearch);
el('geoBtn').addEventListener('click', useGeolocation);
el('weatherCard').addEventListener('click', () => showForecast(state.currentForecastLat, state.currentForecastLon));
el('forecastClose').addEventListener('click', closeForecast);
el('forecastLoadMore').addEventListener('click', loadMoreForecastDays);
el('resultsClose').addEventListener('click', closeResults);
window.addEventListener('keydown', e => { if(e.key === 'Escape') closeForecast(); });

// ============ USER INTERACTIONS ============
async function onSearch() {
  const q = el('placeInput').value.trim();
  if(!q) return;
  
  const btn = el('searchBtn');
  setButtonState(btn, true, '0.6');
  
  try {
    const results = await geocodeMultiple(q);
    if(!results || results.length === 0) {
      showError('Ort nicht gefunden');
      return;
    }
    
    // If only 1 result, load directly
    if(results.length === 1) {
      const loc = results[0];
      await loadForLocation(loc.lat, loc.lon, loc.display_name);
    } else {
      // Multiple results: show selection modal
      showResultsModal(results);
    }
  } finally {
    setButtonState(btn, false);
  }
}

async function useGeolocation() {
  const btn = el('geoBtn');
  setButtonState(btn, true, '0.6');
  
  try {
    if(!navigator.geolocation) {
      showError('Geolocation nicht verfügbar');
      return;
    }
    
    const pos = await new Promise((resolve, reject) => 
      navigator.geolocation.getCurrentPosition(resolve, reject)
    );
    
    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;
    const locationName = await reverseGeocode(lat, lon) || 'Aktueller Standort';
    
    await loadForLocation(lat, lon, locationName);
  } catch(e) {
    showError('Standort verweigert');
  } finally {
    setButtonState(btn, false);
  }
}


function showError(msg) {
  el('weatherContent').innerHTML = `<p class="muted">${msg}</p>`;
}

// ============ GEOCODING ============
async function geocodeMultiple(q) {
  try {
    const res = await fetch(APIS.geoapifySearch(q));
    if(!res.ok) return null;
    
    const data = await res.json();
    if(!data.features?.length) return null;
    
    // Return all results
    return data.features.map(feature => {
      const coords = feature.geometry.coordinates;
      const props = feature.properties;
      const display_name = props.formatted || `${props.city || props.name}, ${props.country}`;
      return {lat: coords[1], lon: coords[0], display_name};
    });
  } catch(e) {
    console.error('Geocode error:', e);
    return null;
  }
}

async function geocode(q) {
  const results = await geocodeMultiple(q);
  return results ? results[0] : null;
}

async function reverseGeocode(lat, lon) {
  try {
    const res = await fetch(APIS.geoapifyReverse(lat, lon));
    if(!res.ok) return null;
    
    const data = await res.json();
    if(!data.features?.length) return null;
    
    const props = data.features[0].properties;
    return props.name || props.city || props.county || props.state || null;
  } catch(e) {
    console.log('Reverse geocoding failed');
    return null;
  }
}

// ============ MAIN LOCATION LOADER ============
async function loadForLocation(lat, lon, label) {
  state.currentForecastLat = lat;
  state.currentForecastLon = lon;
  state.currentLocationName = label;
  
  el('locationTitle').textContent = label;
  el('weatherContent').innerHTML = `<p class="muted">Lade Wetter für ${label}…</p>`;
  el('allergyContent').innerHTML = `<p class="muted">Lade Polleninformationen…</p>`;

  try {
    const weather = await fetch(APIS.openMeteoWeather(lat, lon)).then(r => r.json());
    renderWeather(weather, label);
  } catch(e) {
    showError('Wetterdaten konnten nicht geladen werden.');
  }

  try {
    const pollen = await fetchAndParsePollen(lat, lon);
    renderAllergy(pollen);
  } catch(e) {
    el('allergyContent').innerHTML = `<p class="muted">Polleninformationen nicht verfügbar.</p>`;
  }
}

// ============ WEATHER (OPEN-METEO) ============
function degreeToCompass(degrees) {
  const directions = ['N', 'NNO', 'NO', 'ONO', 'O', 'OSO', 'SO', 'SSO', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}

// Generic card renderer for left/right layout
function renderCard(elementId, leftHTML, rightHTML, containerClass) {
  const rightContent = rightHTML ? `<div class="${containerClass}-right">${rightHTML}</div>` : '';
  el(elementId).innerHTML = `
    <div class="${containerClass}-container">
      <div class="${containerClass}-left">${leftHTML}</div>
      ${rightContent}
    </div>
  `;
}

function renderWeather(data, label) {
  const cur = data.current_weather;
  const code = cur.weathercode;
  const desc = WEATHER_CODES[code] || 'Unbekannt';
  const windDirection = degreeToCompass(cur.winddirection);
  
  const leftHTML = `
    <div class="weather-condition">${desc}</div>
    <div class="weather-wind">Wind ${Math.round(cur.windspeed)} km/h · ${windDirection} (${Math.round(cur.winddirection)}°)</div>
  `;
  
  const rightHTML = `<div class="weather-temp">${Math.round(cur.temperature)}°C</div>`;
  
  renderCard('weatherContent', leftHTML, rightHTML, 'weather');
}

// ============ POLLEN/ALLERGIES (OPEN-METEO) ============
async function fetchAndParsePollen(lat, lon) {
  const url = APIS.openMeteoPollen(lat, lon);
  const res = await fetch(url);
  
  if(!res.ok) {
    console.error(`Pollen API error: ${res.status} ${res.statusText}`);
    throw new Error(`pollen failed: ${res.status}`);
  }
  
  const data = await res.json();
  
  if(!data.hourly) return {level: null, types: ['Keine Daten verfügbar']};
  
  // Extract latest values for each pollen type
  const values = {
    alder: data.hourly.alder_pollen?.[data.hourly.alder_pollen.length - 1] || 0,
    birch: data.hourly.birch_pollen?.[data.hourly.birch_pollen.length - 1] || 0,
    grass: data.hourly.grass_pollen?.[data.hourly.grass_pollen.length - 1] || 0,
    mugwort: data.hourly.mugwort_pollen?.[data.hourly.mugwort_pollen.length - 1] || 0,
    ragweed: data.hourly.ragweed_pollen?.[data.hourly.ragweed_pollen.length - 1] || 0,
    olive: data.hourly.olive_pollen?.[data.hourly.olive_pollen.length - 1] || 0
  };
  
  // Find last non-null AQI value (since array often ends with nulls)
  let aqi = null;
  if(data.hourly.european_aqi && data.hourly.european_aqi.length > 0) {
    for(let i = data.hourly.european_aqi.length - 1; i >= 0; i--) {
      if(data.hourly.european_aqi[i] !== null && data.hourly.european_aqi[i] !== undefined) {
        aqi = data.hourly.european_aqi[i];
        break;
      }
    }
  }
  
  const sorted = Object.entries(values).sort(([,a], [,b]) => b - a);
  const domTypes = sorted
    .filter(([,v]) => v > 0)
    .slice(0, 3)
    .map(([k]) => POLLEN_NAMES[k] || k);
  
  const maxVal = sorted[0]?.[1] || 0;
  let level;
  if(maxVal === 0) level = 'keine';
  else if(maxVal <= 10) level = 'sehr_niedrig';
  else if(maxVal <= 30) level = 'niedrig';
  else if(maxVal <= 80) level = 'mäßig';
  else if(maxVal <= 150) level = 'hoch';
  else level = 'sehr_hoch';
  
  return {level, types: domTypes.length > 0 ? domTypes : ['Keine'], aqi};
}

function renderAllergy(pollen) {
  const levelText = POLLEN_LEVELS[pollen.level] || 'Unbekannt';
  const typesText = pollen.types?.join(', ') || 'N/A';
  
  const leftHTML = `
    <div class="allergy-level">Pollenbelastung: <strong>${levelText}</strong></div>
    <div class="allergy-types">Dominante Pollen: ${typesText}</div>
  `;
  
  let rightHTML = '';
  if(pollen.aqi !== null && pollen.aqi !== undefined) {
    const aqiLevel = AQI_LEVELS.getLevel(pollen.aqi);
    rightHTML = `
      <div class="allergy-aqi-label-top">Luftqualität</div>
      <div class="allergy-aqi-value">${pollen.aqi}</div>
      <div class="allergy-aqi-level">${aqiLevel}</div>
    `;
  }
  
  renderCard('allergyContent', leftHTML, rightHTML, 'allergy');
}

// ============ DATE DISPLAY ============
function updateDateDisplay() {
  const today = new Date();
  const dateStr = today.toLocaleDateString('de-DE', {weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'});
  el('locationDate').textContent = dateStr;
}

// ============ AUTO-LOAD ON PAGE INIT ============
updateDateDisplay();
if(navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(
    async pos => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      const locationName = await reverseGeocode(lat, lon) || 'Aktueller Standort';
      loadForLocation(lat, lon, locationName);
    },
    () => loadForLocation(CONFIG.DEFAULT_LAT, CONFIG.DEFAULT_LON, CONFIG.DEFAULT_LOCATION)
  );
} else {
  loadForLocation(CONFIG.DEFAULT_LAT, CONFIG.DEFAULT_LON, CONFIG.DEFAULT_LOCATION);
}

// ============ FORECAST MODAL ============
async function showForecast(lat, lon) {
  if(!lat || !lon) return;
  state.currentForecastDays = 7;
  
  el('forecastTitle').textContent = `Vorhersage für ${state.currentLocationName}`;
  el('forecastModal').style.display = 'flex';
  el('forecastGrid').innerHTML = '<p class="muted" style="grid-column:1/-1;text-align:center">Lade Vorhersage…</p>';
  
  await renderForecastDays(lat, lon, 7);
}

function closeForecast() {
  el('forecastModal').style.display = 'none';
}

// ============ RESULTS MODAL ============
function showResultsModal(results) {
  if(!results || results.length === 0) {
    showError('Keine Ergebnisse gefunden');
    return;
  }
  
  const html = results.map(r => `
    <div class="result-item" onclick="selectResult(${r.lat}, ${r.lon}, '${r.display_name.replace(/'/g, "\\'")}')">
      <div class="result-item-name">${r.display_name.split(',')[0].trim()}</div>
      <div class="result-item-detail">${r.display_name}</div>
    </div>
  `).join('');
  
  el('resultsList').innerHTML = html;
  el('resultsModal').style.display = 'flex';
}

function closeResults() {
  el('resultsModal').style.display = 'none';
}

async function selectResult(lat, lon, display_name) {
  closeResults();
  await loadForLocation(lat, lon, display_name);
}

async function loadMoreForecastDays() {
  const newDays = Math.min(state.currentForecastDays + 7, 16);
  if(newDays === state.currentForecastDays) return;
  
  state.currentForecastDays = newDays;
  el('forecastLoadMore').disabled = true;
  await renderForecastDays(state.currentForecastLat, state.currentForecastLon, newDays);
  el('forecastLoadMore').disabled = false;
  
  if(state.currentForecastDays >= 16) {
    el('forecastLoadMore').disabled = true;
    el('forecastLoadMore').textContent = 'Maximale Tage erreicht (16)';
  }
}

async function renderForecastDays(lat, lon, days) {
  try {
    const res = await fetch(APIS.openMeteoForecast(lat, lon, days));
    if(!res.ok) throw new Error('forecast failed');
    
    const data = await res.json();
    const html = data.daily.time.map((date, i) => {
      const code = data.daily.weather_code[i];
      const desc = WEATHER_CODES[code] || 'Unbekannt';
      const max = Math.round(data.daily.temperature_2m_max[i]);
      const min = Math.round(data.daily.temperature_2m_min[i]);
      
      const dateObj = new Date(date);
      const dayName = dateObj.toLocaleDateString('de-DE', {weekday: 'long'});
      const dayDate = dateObj.toLocaleDateString('de-DE', {month: 'numeric', day: 'numeric'});
      
      return `
        <div class="forecast-day">
          <div class="forecast-day-left">
            <div class="forecast-day-date">${dayName} · ${dayDate}</div>
            <div class="forecast-day-desc">${desc}</div>
          </div>
          <div class="forecast-day-right">
            <div class="forecast-day-temp">
              <div class="forecast-day-max">↑ ${max}°</div>
              <div class="forecast-day-min">↓ ${min}°</div>
            </div>
          </div>
        </div>
      `;
    }).join('');
    
    el('forecastGrid').innerHTML = html;
    
    if(days >= 16) {
      el('forecastLoadMore').disabled = true;
      el('forecastLoadMore').textContent = 'Maximale Tage erreicht (16)';
    } else {
      el('forecastLoadMore').disabled = false;
      el('forecastLoadMore').textContent = `Weitere Tage laden (+${Math.min(7, 16 - days)})`;
    }
  } catch(e) {
    el('forecastGrid').innerHTML = '<p class="muted" style="padding:20px;text-align:center">Vorhersage konnte nicht geladen werden</p>';
  }
}