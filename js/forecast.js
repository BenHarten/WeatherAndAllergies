// ============ FORECAST & MODALS ============

// Helper: Get weather icon and description from code
function getWeatherInfo(code) {
  return {
    icon: WEATHER_ICONS[code] || '❓',
    description: WEATHER_CODES[code] || 'Unbekannt'
  };
}

async function showForecast(lat, lon) {
  if(!lat || !lon) return;
  state.currentForecastDays = 7;
  
  el('forecastTitle').textContent = `Vorhersage für ${state.currentLocationName}`;
  el('forecastModal').style.display = 'flex';
  el('forecastGrid').innerHTML = '<p class="muted" style="grid-column:1/-1;text-align:center">Lade Vorhersage…</p>';
  
  // Fetch and store the data for hourly forecasts
  await fetchAndStoreForecastData(lat, lon, 7);
  await renderForecastDays(lat, lon, 7);
  
  // Reset scroll to top on the modal content container
  const modalContent = el('forecastModal').querySelector('.forecast-modal-content');
  modalContent.scrollTop = 0;
}

function closeForecast() {
  el('forecastModal').style.display = 'none';
  
  // Reset forecast state to initial daily view
  forecastState.isViewingHourly = false;
  forecastState.hourlyDate = null;
  forecastState.isAllergyView = false;
  
  // Reset UI elements to initial state
  el('forecastBack').style.display = 'none';
  el('forecastFooter').style.display = 'flex';
  el('forecastTitle').textContent = `Vorhersage für ${state.currentLocationName}`;
  
  // Scroll modal content to top
  const modalContent = el('forecastModal').querySelector('.forecast-modal-content');
  modalContent.scrollTop = 0;
}

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
  // Check if we're viewing allergy forecast
  if(forecastState.isAllergyView) {
    await loadMoreAllergyDays();
    return;
  }
  
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
    const data = await getCachedFetch(APIS.openMeteoForecast(lat, lon, days));
    const html = data.daily.time.map((date, i) => {
      const code = data.daily.weather_code[i];
      const {icon, description: desc} = getWeatherInfo(code);
      
      const max = Math.round(data.daily.temperature_2m_max[i]);
      const min = Math.round(data.daily.temperature_2m_min[i]);
      const precipProb = data.daily.precipitation_probability_max?.[i] || 0;
      const windSpeed = Math.round(data.daily.wind_speed_10m_max?.[i] || 0);
      
      const dayName = formatDayName(date);
      const dayDate = formatDayShort(date);
      
      return `
        <div class="forecast-day" onclick="showHourlyForecast('${date}')">
          <div class="forecast-day-left">
            <div class="forecast-day-date">${dayName} · ${dayDate}</div>
            <div class="forecast-day-icon">${icon}</div>
          </div>
          <div class="forecast-day-temp">
            <div class="forecast-day-max">↑ ${max}°</div>
            <div class="forecast-day-min">↓ ${min}°</div>
          </div>
          <div class="forecast-day-right">
            <div class="forecast-day-meta">💧 ${precipProb}%</div>
            <div class="forecast-day-meta">💨 ${windSpeed} km/h</div>
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

// Forecast view state
const forecastState = {
  data: null,
  isViewingHourly: false,
  hourlyDate: null,
  isAllergyView: false
};

async function fetchAndStoreForecastData(lat, lon, days) {
  try {
    const data = await getCachedFetch(APIS.openMeteoForecast(lat, lon, days));
    forecastState.data = data;
    return data;
  } catch(e) {
    console.error('Failed to fetch forecast data:', e);
    return null;
  }
}

async function showHourlyForecast(dateStr) {
  if(!forecastState.data) return;
  
  forecastState.isViewingHourly = true;
  forecastState.hourlyDate = dateStr;
  
  const data = forecastState.data;
  const dayName = formatDayName(dateStr);
  const dayDate = formatDayDate(dateStr);
  
  // Show back button and update title
  el('forecastBack').style.display = 'flex';
  el('forecastTitle').textContent = `${dayName}, ${dayDate}`;
  el('forecastFooter').style.display = 'none';
  
  // Find hourly data for this date
  const startOfDay = new Date(dateStr + 'T00:00:00Z');
  const endOfDay = new Date(dateStr + 'T23:59:59Z');
  const now = new Date();
  const currentHour = now.getHours();
  const isToday = dateStr === now.toISOString().split('T')[0];
  
  const hourlyHtml = data.hourly.time.map((time, i) => {
    const hourDate = new Date(time);
    
    // Only include hours for this day
    if(hourDate < startOfDay || hourDate > endOfDay) return null;
    
    const hour = hourDate.getHours();
    const code = data.hourly.weather_code[i];
    const {icon, description: desc} = getWeatherInfo(code);
    const temp = Math.round(data.hourly.temperature_2m[i]);
    const precipProb = data.hourly.precipitation_probability[i] || 0;
    const wind = Math.round(data.hourly.wind_speed_10m[i]);
    const isCurrentHour = isToday && hour === currentHour;
    
    return `
      <div class="hourly-item${isCurrentHour ? ' hourly-current' : ''}">
        <div class="hourly-left">
          <div class="hourly-time">${hour.toString().padStart(2, '0')}:00</div>
          <div class="hourly-icon">${icon}</div>
        </div>
        <div class="hourly-temp">${temp}°</div>
        <div class="hourly-right">
          <div class="hourly-meta">💧 ${precipProb}%</div>
          <div class="hourly-meta">💨 ${wind} km/h</div>
        </div>
      </div>
    `;
  }).filter(h => h !== null).join('');
  
  el('forecastGrid').innerHTML = hourlyHtml;
  
  // Scroll to current hour if viewing today's forecast
  if(isToday) {
    setTimeout(() => {
      const currentHourEl = el('forecastGrid').querySelector('.hourly-current');
      if(currentHourEl) {
        currentHourEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 0);
  }
}

function backToForecast() {
  forecastState.isViewingHourly = false;
  forecastState.hourlyDate = null;
  
  // Hide back button
  el('forecastBack').style.display = 'none';
  el('forecastFooter').style.display = 'flex';
  el('forecastTitle').textContent = `Vorhersage für ${state.currentLocationName}`;
  
  // Re-render the daily forecast
  renderForecastDays(state.currentForecastLat, state.currentForecastLon, state.currentForecastDays);
}
