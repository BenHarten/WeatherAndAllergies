// ============ UTILITIES ============
const el = id => document.getElementById(id);

const setButtonState = (btn, disabled, opacity = '1') => {
  btn.disabled = disabled;
  btn.style.opacity = opacity;
};

function showError(msg) {
  el('weatherContent').innerHTML = `<p class="muted">${msg}</p>`;
}

function updateDateDisplay() {
  const today = new Date();
  const dateStr = today.toLocaleDateString('de-DE', {weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'});
  el('locationDate').textContent = dateStr;
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

// Date formatting helpers
function formatDayName(date) {
  return new Date(date).toLocaleDateString('de-DE', {weekday: 'long'});
}

function formatDayDate(date) {
  return new Date(date).toLocaleDateString('de-DE', {month: 'long', day: 'numeric'});
}

function formatDayShort(date) {
  return new Date(date).toLocaleDateString('de-DE', {month: 'numeric', day: 'numeric'});
}

// ============ HELPER FUNCTIONS FOR DATA PROCESSING ============

/**
 * Get date string (YYYY-MM-DD) for a given number of days offset from today
 * @param {number} daysOffset - Number of days to add (0 = today)
 * @returns {string} Date string in YYYY-MM-DD format
 */
function getDateString(daysOffset = 0) {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString().split('T')[0];
}

/**
 * Extract max pollen values for a specific day from hourly Open-Meteo data
 * @param {object} hourlyData - Open-Meteo hourly data object
 * @param {string} dateStr - Target date in YYYY-MM-DD format
 * @returns {object} Object with max values for each pollen type
 */
function extractOpenMeteoMaxValuesForDay(hourlyData, dateStr) {
  const values = { ...EMPTY_POLLEN_VALUES };
  
  if (!hourlyData?.hourly?.time) return values;
  
  const startOfDay = new Date(dateStr + 'T00:00:00Z');
  const endOfDay = new Date(dateStr + 'T23:59:59Z');
  
  hourlyData.hourly.time.forEach((timeStr, i) => {
    const time = new Date(timeStr);
    if (time >= startOfDay && time <= endOfDay) {
      if (hourlyData.hourly.alder_pollen?.[i]) values.alder = Math.max(values.alder, hourlyData.hourly.alder_pollen[i]);
      if (hourlyData.hourly.birch_pollen?.[i]) values.birch = Math.max(values.birch, hourlyData.hourly.birch_pollen[i]);
      if (hourlyData.hourly.grass_pollen?.[i]) values.grass = Math.max(values.grass, hourlyData.hourly.grass_pollen[i]);
      if (hourlyData.hourly.mugwort_pollen?.[i]) values.mugwort = Math.max(values.mugwort, hourlyData.hourly.mugwort_pollen[i]);
      if (hourlyData.hourly.ragweed_pollen?.[i]) values.ragweed = Math.max(values.ragweed, hourlyData.hourly.ragweed_pollen[i]);
      if (hourlyData.hourly.olive_pollen?.[i]) values.olive = Math.max(values.olive, hourlyData.hourly.olive_pollen[i]);
    }
  });
  
  return values;
}

/**
 * Get top pollen types from a pollen data object
 * @param {object} pollenData - Object with pollen types as keys and values
 * @param {object} namesMap - Map of pollen type keys to German names
 * @param {number} count - Number of top types to return (default: 2)
 * @param {number} minValue - Minimum value threshold (default: 0)
 * @returns {array} Array of top pollen type names
 */
function getTopPollenTypes(pollenData, namesMap, count = 2, minValue = 0) {
  return Object.entries(pollenData)
    .sort(([,a], [,b]) => b - a)
    .filter(([,v]) => v > minValue)
    .slice(0, count)
    .map(([k]) => namesMap[k] || k);
}

// Simple API response caching
const apiCache = {};

function getCachedFetch(url, ttl = CONFIG.CACHE_TTL) {
  const now = Date.now();
  const cached = apiCache[url];
  
  // Return cached data if still fresh
  if(cached && (now - cached.timestamp) < ttl) {
    return Promise.resolve(cached.data);
  }
  
  // Fetch fresh data and cache it
  return fetch(url)
    .then(response => {
      if(!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then(data => {
      apiCache[url] = { data, timestamp: now };
      return data;
    });
}
