// ============ KONFIGURATION ============
// Alle APIs sind kostenlos und benötigen keinen API-Schlüssel
let isLoading = false; // Debounce flag
let currentForecastDays = 7; // Track how many days are currently loaded
let currentForecastLat = null; // Store current forecast location
let currentForecastLon = null;

// ============ EVENT LISTENER ============
const el = id => document.getElementById(id);
el('searchBtn').addEventListener('click', onSearch);
el('geoBtn').addEventListener('click', useGeolocation);
el('weatherCard').addEventListener('click', () => showForecast(currentForecastLat, currentForecastLon));
el('forecastClose').addEventListener('click', closeForecast);
el('forecastLoadMore').addEventListener('click', loadMoreForecastDays);
window.addEventListener('keydown', e => { if(e.key === 'Escape') closeForecast(); });

// ============ SEARCH & GEO ============
async function onSearch(){
  if(isLoading) return; // Prevent duplicate requests
  const q = el('placeInput').value.trim();
  if(!q) return;
  
  isLoading = true;
  el('searchBtn').disabled = true;
  el('searchBtn').style.opacity = '0.6';
  
  const loc = await geocode(q);
  if(!loc) {
    showError('Ort nicht gefunden');
    isLoading = false;
    el('searchBtn').disabled = false;
    el('searchBtn').style.opacity = '1';
    return;
  }
  
  await loadForLocation(loc.lat, loc.lon, loc.display_name);
  
  isLoading = false;
  el('searchBtn').disabled = false;
  el('searchBtn').style.opacity = '1';
}

async function useGeolocation(){
  if(isLoading) return;
  await requestAndLoadLocation();
}

async function requestAndLoadLocation(){
  if(isLoading) return; // Prevent duplicate requests
  isLoading = true;
  el('geoBtn').disabled = true;
  el('geoBtn').style.opacity = '0.6';
  
  if(!navigator.geolocation) {
    showError('Geolocation nicht verfügbar');
    isLoading = false;
    el('geoBtn').disabled = false;
    el('geoBtn').style.opacity = '1';
    return;
  }
  
  navigator.geolocation.getCurrentPosition(async pos=>{
    await loadForLocation(pos.coords.latitude, pos.coords.longitude, 'Ihr Standort');
    isLoading = false;
    el('geoBtn').disabled = false;
    el('geoBtn').style.opacity = '1';
  }, (err)=>{
    showError('Standort verweigert');
    isLoading = false;
    el('geoBtn').disabled = false;
    el('geoBtn').style.opacity = '1';
  });
}

function showError(msg){
  el('weatherContent').innerHTML = `<p class="muted">${msg}</p>`;
}

// ============ GEOCODING ============
async function geocode(q){
  try{
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&addressdetails=1&limit=1`;
    const res = await fetch(url,{headers:{'User-Agent':'WeatherAndAllergies-App/1.0 (location-search)'}});
    if(res.status === 401 || res.status === 429) return null; // Rate limited or unauthorized
    const j = await res.json();
    if(!j || !j[0]) return null;
    return {lat: parseFloat(j[0].lat), lon: parseFloat(j[0].lon), display_name: j[0].display_name};
  }catch(e){return null}
}

// ============ MAIN LOADER ============
async function loadForLocation(lat, lon, label){
  // Store for forecast modal
  currentForecastLat = lat;
  currentForecastLon = lon;
  
  el('weatherContent').innerHTML = `<p class="muted">Lade Wetter für ${label}…</p>`;
  el('allergyContent').innerHTML = `<p class="muted">Lade Polleninformationen…</p>`;

  // Wetter: Open-Meteo (kostenlos, CORS-freundlich, kein Key nötig)
  try{
    const weather = await fetchOpenMeteo(lat, lon);
    renderWeather(weather, label);
  }catch(e){
    showError('Wetterdaten konnten nicht geladen werden.');
  }

  // Allergien/Pollen: Open-Meteo (kostenlos, kein Key nötig)
  try{
    const pollen = await fetchOpenMeteoPollen(lat, lon);
    renderAllergy(pollen);
  }catch(e){
    el('allergyContent').innerHTML = `<p class="muted">Polleninformationen nicht verfügbar.</p>`;
  }
}

// ============ WETTER (OPEN-METEO) ============
async function fetchOpenMeteo(lat, lon){
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=Europe%2FBerlin`;
  const res = await fetch(url);
  if(!res.ok) throw new Error('open-meteo failed');
  return res.json();
}

function renderWeather(data, label){
  const cur = data.current_weather;
  const code = cur.weather_code;
  const desc = getWeatherDescription(code);
  const html = `
    <div class="weather-row">
      <div>
        <div class="temp">${Math.round(cur.temperature)}°C</div>
        <div class="meta">${label} · ${desc}</div>
        <div class="meta">Wind ${Math.round(cur.windspeed)} km/h · Richtung ${Math.round(cur.winddirection)}°</div>
      </div>
    </div>
  `;
  el('weatherContent').innerHTML = html;
}

function getWeatherDescription(code){
  const map = {
    0: 'Klar', 1: 'Teils bewölkt', 2: 'Bewölkt', 3: 'Bedeckt', 45: 'Nebel',
    48: 'Nebel mit Raureif', 51: 'Leicht Niesel', 53: 'Mäßiger Niesel', 55: 'Intensiver Niesel',
    61: 'Schwacher Regen', 63: 'Mäßiger Regen', 65: 'Starker Regen',
    71: 'Schwacher Schneefall', 73: 'Mäßiger Schneefall', 75: 'Starker Schneefall',
    80: 'Schwache Schauer', 81: 'Mäßige Schauer', 82: 'Intensive Schauer',
    85: 'Schwache Schnee-Schauer', 86: 'Intensive Schnee-Schauer',
    95: 'Gewitter', 96: 'Gewitter mit Hagel', 99: 'Gewitter mit Hagel (stark)'
  };
  return map[code] || 'Unbekannt';
}

// ============ ALLERGIEN/POLLEN (OPEN-METEO) ============
async function fetchOpenMeteoPollen(lat, lon){
  const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&pollen=alder,birch,grass,mugwort,olive,ragweed`;
  const res = await fetch(url);
  if(!res.ok) throw new Error('open-meteo pollen failed');
  const data = await res.json();
  return parseOpenMeteoPollen(data);
}

function parseOpenMeteoPollen(data){
  // Hole aktuelle Pollenwerte
  if(!data.hourly) return getPollenFallback();
  
  const latest = data.hourly.pollen;
  const values = {
    alder: latest.alder?.[latest.alder.length - 1] || 0,
    birch: latest.birch?.[latest.birch.length - 1] || 0,
    grass: latest.grass?.[latest.grass.length - 1] || 0,
    mugwort: latest.mugwort?.[latest.mugwort.length - 1] || 0,
    ragweed: latest.ragweed?.[latest.ragweed.length - 1] || 0,
    olive: latest.olive?.[latest.olive.length - 1] || 0
  };
  
  // Finde dominante Pollen
  const sorted = Object.entries(values).sort(([,a], [,b]) => b - a);
  const domTypes = sorted.filter(([,v]) => v > 0).slice(0,3).map(([k]) => {
    const map = {alder:'Erle', birch:'Birke', grass:'Gräser', mugwort:'Beifuß', olive:'Olive', ragweed:'Ambrosia'};
    return map[k] || k;
  });
  
  const maxVal = sorted[0]?.[1] || 0;
  let level = 'niedrig';
  if(maxVal > 50) level = 'hoch';
  else if(maxVal > 10) level = 'mittel';
  
  return {level, types: domTypes.length > 0 ? domTypes : ['Keine Daten']};
}

function getPollenFallback(lat = 52){
  const month = new Date().getMonth() + 1;
  let level = 'niedrig', types = ['Ambrosia'];
  
  // Grobe Heuristik für Deutschland (Breitengrad ~48-55)
  if(month===1 || month===2) {level='niedrig'; types=['Hasel', 'Erle'];}
  else if(month===3) {level='mittel'; types=['Hasel', 'Erle', 'Birke'];}
  else if(month===4 || month===5) {level='hoch'; types=['Birke', 'Gräser', 'Fichten'];}
  else if(month===6 || month===7) {level='mittel'; types=['Gräser', 'Getreide', 'Linden'];}
  else if(month===8 || month===9) {level='mittel'; types=['Gräser', 'Nessel', 'Ambrosia', 'Beifuß'];}
  else if(month===10) {level='niedrig'; types=['Ambrosia', 'Nessel', 'Beifuß'];}
  else {level='niedrig'; types=['Ambrosia', 'Moos', 'Beifuß'];}
  
  return {level, types};
}

function renderAllergy(pollen){
  const mapLevel = {niedrig:'Niedrig ✓', mittel:'Mäßig ⚠', hoch:'Hoch ⚠⚠'};
  const levelText = mapLevel[pollen.level] || 'Unbekannt';
  const typesText = pollen.types ? pollen.types.join(', ') : 'N/A';
  
  el('allergyContent').innerHTML = `
    <div>
      <div class="meta">Pollenbelastung: <strong>${levelText}</strong></div>
      <div class="muted">Dominante Pollen: ${typesText}</div>
      <p class="muted" style="font-size:0.85em; margin-top:8px;">Daten von Open-Meteo Air Quality API</p>
    </div>
  `;
}

// ============ AUTO-LOAD ON PAGE LOAD ============
// Versuche, den Standort automatisch beim Laden zu ermitteln
if(navigator.geolocation){
  navigator.geolocation.getCurrentPosition(
    pos => {
      loadForLocation(pos.coords.latitude, pos.coords.longitude, 'Aktueller Standort');
    },
    () => {
      // Fallback: wenn Geolocation verweigert, zeige Demo-Ort
      loadForLocation(52.52, 13.405, 'Berlin (Demo)');
    }
  );
} else {
  // Fallback: wenn Geolocation nicht verfügbar
  loadForLocation(52.52, 13.405, 'Berlin (Demo)');
}

// ============ FORECAST FUNCTIONS ============
async function showForecast(lat, lon){
  if(!lat || !lon) return;
  currentForecastDays = 7;
  currentForecastLat = lat;
  currentForecastLon = lon;
  
  el('forecastModal').style.display = 'flex';
  el('forecastGrid').innerHTML = '<p class="muted" style="grid-column:1/-1;text-align:center">Lade Vorhersage…</p>';
  
  await renderForecastDays(lat, lon, 7);
}

function closeForecast(){
  el('forecastModal').style.display = 'none';
}

async function loadMoreForecastDays(){
  const newDays = Math.min(currentForecastDays + 7, 16); // API max is 16 days
  if(newDays === currentForecastDays) return; // Already at max
  
  currentForecastDays = newDays;
  el('forecastLoadMore').disabled = true;
  await renderForecastDays(currentForecastLat, currentForecastLon, newDays);
  el('forecastLoadMore').disabled = false;
  
  if(currentForecastDays >= 16){
    el('forecastLoadMore').disabled = true;
    el('forecastLoadMore').textContent = 'Maximale Tage erreicht (16)';
  }
}

async function renderForecastDays(lat, lon, days){
  try{
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Europe%2FBerlin&forecast_days=${days}`;
    const res = await fetch(url);
    if(!res.ok) throw new Error('forecast failed');
    const data = await res.json();
    
    const html = data.daily.time.map((date, i) => {
      const code = data.daily.weather_code[i];
      const desc = getWeatherDescription(code);
      const max = Math.round(data.daily.temperature_2m_max[i]);
      const min = Math.round(data.daily.temperature_2m_min[i]);
      const dateObj = new Date(date);
      const dayName = dateObj.toLocaleDateString('de-DE', {weekday:'long'});
      const dayDate = dateObj.toLocaleDateString('de-DE', {month:'numeric', day:'numeric'});
      
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
    
    // Update load more button
    if(days >= 16){
      el('forecastLoadMore').disabled = true;
      el('forecastLoadMore').textContent = 'Maximale Tage erreicht (16)';
    } else {
      el('forecastLoadMore').disabled = false;
      el('forecastLoadMore').textContent = `Weitere Tage laden (+${Math.min(7, 16 - days)})`;
    }
  }catch(e){
    el('forecastGrid').innerHTML = '<p class="muted" style="padding:20px;text-align:center">Vorhersage konnte nicht geladen werden</p>';
  }
}
