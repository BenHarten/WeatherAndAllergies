// ============ ALLERGY FORECAST ============
const allergyForecastState = {
  hourlyData: null,
  lat: null,
  lon: null,
  currentDays: 7,
  maxDays: 16
};

async function showAllergyForecast(lat, lon) {
  if(!lat || !lon) return;
  
  allergyForecastState.currentDays = 7;
  
  el('forecastTitle').textContent = `Pollenvorhersage für ${state.currentLocationName}`;
  el('forecastModal').style.display = 'flex';
  el('forecastGrid').innerHTML = '<p class="muted" style="grid-column:1/-1;text-align:center">Lade Pollenvorhersage…</p>';
  el('forecastBack').style.display = 'none';
  el('forecastFooter').style.display = 'flex';
  
  // Store type for loadMoreForecastDays
  forecastState.isAllergyView = true;
  
  await fetchAndStoreAllergyData(lat, lon);
  await renderAllergyForecastDays();
  
  const modalContent = el('forecastModal').querySelector('.forecast-modal-content');
  modalContent.scrollTop = 0;
}

async function fetchAndStoreAllergyData(lat, lon) {
  try {
    const url = APIS.openMeteoPollen(lat, lon);
    const data = await getCachedFetch(url);
    allergyForecastState.hourlyData = data;
    allergyForecastState.lat = lat;
    allergyForecastState.lon = lon;
    return data;
  } catch(e) {
    console.error('Failed to fetch allergy forecast data:', e);
    return null;
  }
}

function getPollenLevelText(value) {
  if(value === 0) return 'Keine ✓';
  else if(value <= 10) return 'Sehr niedrig ✓';
  else if(value <= 30) return 'Niedrig ✓';
  else if(value <= 80) return 'Mäßig ⚠';
  else if(value <= 150) return 'Hoch ⚠⚠';
  else return 'Sehr hoch ⚠⚠⚠';
}

function aggregateDailyPollen(hourlyData, days) {
  if(!hourlyData || !hourlyData.hourly || !hourlyData.hourly.time) {
    console.error('Invalid hourly data structure:', hourlyData);
    return [];
  }
  
  const now = new Date();
  const dailyData = [];
  
  for(let day = 0; day < days; day++) {
    const dateStr = new Date(now.getTime() + day * 86400000).toISOString().split('T')[0];
    const startOfDay = new Date(dateStr + 'T00:00:00Z');
    const endOfDay = new Date(dateStr + 'T23:59:59Z');
    
    // Find max AQI for this day
    let maxAqi = 0;
    if(hourlyData.hourly.european_aqi && Array.isArray(hourlyData.hourly.european_aqi)) {
      hourlyData.hourly.european_aqi.forEach((val, i) => {
        const timeStr = hourlyData.hourly.time?.[i];
        if(!timeStr) return;
        const time = new Date(timeStr);
        if(time >= startOfDay && time <= endOfDay && val !== null) {
          maxAqi = Math.max(maxAqi, val);
        }
      });
    }
    
    // Find max pollen values for this day
    const maxPollen = {
      alder: 0,
      birch: 0,
      grass: 0,
      mugwort: 0,
      ragweed: 0,
      olive: 0
    };
    
    Object.keys(maxPollen).forEach(pollen => {
      const key = pollen + '_pollen';
      if(hourlyData.hourly[key] && Array.isArray(hourlyData.hourly[key])) {
        hourlyData.hourly[key].forEach((val, i) => {
          const timeStr = hourlyData.hourly.time?.[i];
          if(!timeStr) return;
          const time = new Date(timeStr);
          if(time >= startOfDay && time <= endOfDay && val !== null) {
            maxPollen[pollen] = Math.max(maxPollen[pollen], val);
          }
        });
      }
    });
    
    // Find top pollen types
    const sorted = Object.entries(maxPollen).sort(([,a], [,b]) => b - a);
    const types = sorted
      .filter(([,v]) => v > 0)
      .slice(0, 2)
      .map(([k]) => POLLEN_NAMES[k] || k);
    
    // Find max pollen value for level
    const maxVal = sorted[0]?.[1] || 0;
    
    dailyData.push({
      date: dateStr,
      aqi: maxAqi,
      level: getPollenLevelText(maxVal),
      types: types.length > 0 ? types : ['Keine'],
      maxVal: maxVal
    });
  }
  
  return dailyData;
}

async function renderAllergyForecastDays() {
  try {
    if(!allergyForecastState.hourlyData) {
      el('forecastGrid').innerHTML = '<p class="muted" style="padding:20px;text-align:center">Pollenvorhersage nicht verfügbar</p>';
      return;
    }
    
    const dailyData = aggregateDailyPollen(allergyForecastState.hourlyData, allergyForecastState.currentDays);
    
    const html = dailyData.map((day, idx) => {
      const dateObj = new Date(day.date);
      const dayName = dateObj.toLocaleDateString('de-DE', {weekday: 'long'});
      const dayDate = dateObj.toLocaleDateString('de-DE', {month: 'numeric', day: 'numeric'});
      
      return `
        <div class="allergy-forecast-item">
          <div class="allergy-forecast-left">
            <div class="allergy-forecast-date">${dayName} · ${dayDate}</div>
            <div class="allergy-forecast-level">${day.level}</div>
            <div class="allergy-forecast-types">${day.types.join(', ')}</div>
          </div>
          <div class="allergy-forecast-right">
            <div class="allergy-forecast-aqi">${day.aqi}</div>
            <div class="allergy-forecast-aqi-label">Luftqualität</div>
          </div>
        </div>
      `;
    }).join('');
    
    el('forecastGrid').innerHTML = html;
    
    if(allergyForecastState.currentDays >= allergyForecastState.maxDays) {
      el('forecastLoadMore').disabled = true;
      el('forecastLoadMore').textContent = 'Maximale Tage erreicht (16)';
    } else {
      el('forecastLoadMore').disabled = false;
      el('forecastLoadMore').textContent = `Weitere Tage laden (+${Math.min(7, allergyForecastState.maxDays - allergyForecastState.currentDays)})`;
    }
  } catch(e) {
    console.error('Error rendering allergy forecast:', e);
    el('forecastGrid').innerHTML = '<p class="muted" style="padding:20px;text-align:center">Pollenvorhersage konnte nicht geladen werden</p>';
  }
}

async function loadMoreAllergyDays() {
  const newDays = Math.min(allergyForecastState.currentDays + 7, allergyForecastState.maxDays);
  if(newDays === allergyForecastState.currentDays) return;
  
  allergyForecastState.currentDays = newDays;
  el('forecastLoadMore').disabled = true;
  await renderAllergyForecastDays();
  el('forecastLoadMore').disabled = false;
}

