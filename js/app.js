// ============ STATE ============
const state = {
  currentForecastDays: 7,
  currentForecastLat: null,
  currentForecastLon: null,
  currentLocationName: 'Standort'
};

// ============ MAIN LOCATION LOADER ============
async function loadForLocation(lat, lon, label) {
  state.currentForecastLat = lat;
  state.currentForecastLon = lon;
  state.currentLocationName = label;
  
  el('locationTitle').textContent = label;
  el('weatherContent').innerHTML = `<p class="muted">Lade Wetter…</p>`;
  el('allergyContent').innerHTML = `<p class="muted">Lade Polleninformationen…</p>`;

  // Load weather and pollen in parallel instead of sequentially
  try {
    const [weather, pollen] = await Promise.all([
      getCachedFetch(APIS.openMeteoWeather(lat, lon)),
      fetchAndParsePollen(lat, lon)
    ]);
    
    renderWeather(weather, label);
    renderAllergy(pollen);
  } catch(e) {
    // Try loading them individually if parallel fails
    try {
      const weather = await getCachedFetch(APIS.openMeteoWeather(lat, lon));
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
}

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
  
  // Clear UI immediately to show loading state
  el('locationTitle').textContent = 'Standort wird bestimmt…';
  el('weatherContent').innerHTML = `<p class="muted">Lade Wetter…</p>`;
  el('allergyContent').innerHTML = `<p class="muted">Lade Polleninformationen…</p>`;
  
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

// ============ EVENT LISTENERS ============
el('searchBtn').addEventListener('click', onSearch);
el('geoBtn').addEventListener('click', useGeolocation);
el('weatherCard').addEventListener('click', () => showForecast(state.currentForecastLat, state.currentForecastLon));
el('allergyCard').addEventListener('click', () => showAllergyForecast(state.currentForecastLat, state.currentForecastLon));
el('forecastClose').addEventListener('click', closeForecast);
el('forecastBack').addEventListener('click', backToForecast);
el('forecastLoadMore').addEventListener('click', loadMoreForecastDays);
el('resultsClose').addEventListener('click', closeResults);

// Close modal when clicking outside content
el('forecastModal').addEventListener('click', e => {
  if(e.target === el('forecastModal')) closeForecast();
});
el('resultsModal').addEventListener('click', e => {
  if(e.target === el('resultsModal')) closeResults();
});

window.addEventListener('keydown', e => { if(e.key === 'Escape') closeForecast(); });

// ============ LOCATION CACHING ============
function getCachedLocation() {
  const cached = localStorage.getItem('lastLocation');
  return cached ? JSON.parse(cached) : null;
}

function setCachedLocation(lat, lon, name) {
  localStorage.setItem('lastLocation', JSON.stringify({ lat, lon, name }));
}

// ============ AUTO-LOAD ON PAGE INIT ============
updateDateDisplay();

// Try to load cached location first
const cachedLoc = getCachedLocation();
if(cachedLoc) {
  loadForLocation(cachedLoc.lat, cachedLoc.lon, cachedLoc.name);
} else if(navigator.geolocation) {
  // No cache - wait for geolocation (first visit)
  navigator.geolocation.getCurrentPosition(
    async pos => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      const locationName = await reverseGeocode(lat, lon) || 'Aktueller Standort';
      setCachedLocation(lat, lon, locationName);
      loadForLocation(lat, lon, locationName);
    },
    () => {
      loadForLocation(CONFIG.DEFAULT_LAT, CONFIG.DEFAULT_LON, CONFIG.DEFAULT_LOCATION);
      setCachedLocation(CONFIG.DEFAULT_LAT, CONFIG.DEFAULT_LON, CONFIG.DEFAULT_LOCATION);
    }
  );
} else {
  loadForLocation(CONFIG.DEFAULT_LAT, CONFIG.DEFAULT_LON, CONFIG.DEFAULT_LOCATION);
  setCachedLocation(CONFIG.DEFAULT_LAT, CONFIG.DEFAULT_LON, CONFIG.DEFAULT_LOCATION);
}

// Update location in background (for repeat visits)
if(navigator.geolocation && cachedLoc) {
  navigator.geolocation.getCurrentPosition(
    async pos => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      const locationName = await reverseGeocode(lat, lon) || 'Aktueller Standort';
      setCachedLocation(lat, lon, locationName);
      
      // Update UI if location changed
      if(lat !== cachedLoc.lat || lon !== cachedLoc.lon) {
        loadForLocation(lat, lon, locationName);
      } else if(locationName !== cachedLoc.name) {
        // Location same, but name might be different
        state.currentLocationName = locationName;
        el('locationTitle').textContent = locationName;
      }
    }
    // Silently fail - cached location is still valid
  );
}