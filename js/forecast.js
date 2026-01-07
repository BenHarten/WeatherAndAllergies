// ============ FORECAST & MODALS ============
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
