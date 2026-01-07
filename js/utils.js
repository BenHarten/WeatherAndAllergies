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
