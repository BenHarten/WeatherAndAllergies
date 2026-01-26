// ============ ALLERGY FORECAST ============
const allergyForecastState = {
  hourlyData: null,
  lat: null,
  lon: null,
  currentDays: 7,
  maxDays: 16,
  apiSource: null,  // 'dwd' or 'open-meteo'
  detailView: false,
  selectedDayData: null
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
    // Try DWD first for better coverage (has hazelnut, ash, rye)
    try {
      const dwdForecast = await getDWDPollenForecast(lat, lon, 3);
      if (dwdForecast && dwdForecast.length > 0) {
        console.log('Using DWD pollen forecast');
        allergyForecastState.hourlyData = { isDWD: true, forecast: dwdForecast };
        allergyForecastState.lat = lat;
        allergyForecastState.lon = lon;
        allergyForecastState.apiSource = 'dwd';
        allergyForecastState.maxDays = 3;  // DWD only provides 3 days
        allergyForecastState.currentDays = 3;  // Show all available days
        return allergyForecastState.hourlyData;
      }
    } catch(e) {
      console.warn('DWD forecast failed, trying Open-Meteo:', e);
    }
    
    // Fallback to Open-Meteo
    const url = APIS.openMeteoPollen(lat, lon);
    const data = await getCachedFetch(url);
    allergyForecastState.hourlyData = data;
    allergyForecastState.lat = lat;
    allergyForecastState.lon = lon;
    allergyForecastState.apiSource = 'open-meteo';
    allergyForecastState.maxDays = 16;  // Open-Meteo provides up to 16 days
    allergyForecastState.currentDays = 7;  // Start with 7 days
    return data;
  } catch(e) {
    console.error('Failed to fetch allergy forecast data:', e);
    return null;
  }
}

function aggregateDailyPollen(hourlyData, days) {
  // Handle DWD data format
  if (hourlyData?.isDWD && hourlyData?.forecast) {
    return hourlyData.forecast.slice(0, days).map(day => ({
      date: day.date,
      level: POLLEN_LEVELS[day.level] || day.level,
      types: day.types.length > 0 ? day.types : ['Keine'],
      maxVal: day.maxVal
    }));
  }
  
  // Handle Open-Meteo data format
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
      
      // Get level key from the level text (e.g., "Keine ✓" -> "keine")
      let levelKey = 'keine';
      if(day.maxVal === 0) levelKey = 'keine';
      else if(day.maxVal <= 10) levelKey = 'sehr_niedrig';
      else if(day.maxVal <= 30) levelKey = 'niedrig';
      else if(day.maxVal <= 80) levelKey = 'mäßig';
      else if(day.maxVal <= 150) levelKey = 'hoch';
      else levelKey = 'sehr_hoch';
      
      const meds = getMedicationRecommendation(levelKey);
      
      return `
        <div class="allergy-forecast-item" style="display:flex;cursor:pointer;" onclick="showDayPollenDetail('${day.date}', '${dayName}', '${dayDate}')">
          <div class="allergy-forecast-left" style="display:flex;flex-direction:column;align-items:center;gap:4px;padding-right:12px;max-width:50%;">
            <div class="allergy-forecast-date" style="width:100%;text-align:center;">${dayName} · ${dayDate}</div>
            <div style="font-size:9px;color:#333;font-weight:600;text-align:center;background-color:${meds.bgColor};padding:3px 6px;border-radius:3px;word-wrap:break-word;line-height:1.2;max-width:70%;">${meds.text}</div>
          </div>
          <div class="allergy-forecast-right" style="flex:1;padding-left:12px;">
            <div class="allergy-forecast-level">${day.level}</div>
            <div class="allergy-forecast-types">${day.types.join(', ')}</div>
          </div>
        </div>
      `;
    }).join('');
    
    el('forecastGrid').innerHTML = html;
    
    // Update footer based on API source and available days
    if (allergyForecastState.apiSource === 'dwd') {
      // DWD only has 3 days max
      el('forecastLoadMore').disabled = true;
      el('forecastLoadMore').textContent = 'DWD: Maximal 3 Tage verfügbar';
    } else if(allergyForecastState.currentDays >= allergyForecastState.maxDays) {
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

// ============ DETAILED DAILY POLLEN VIEW ============
function showDayPollenDetail(dateStr, dayName, dayDate) {
  if(!allergyForecastState.hourlyData) return;
  
  // Handle DWD data
  if (allergyForecastState.hourlyData.isDWD) {
    const dayData = allergyForecastState.hourlyData.forecast.find(d => d.date === dateStr);
    if (!dayData || !dayData.allPollen) return;
    
    allergyForecastState.detailView = true;
    allergyForecastState.selectedDayData = {
      dateStr,
      dayName,
      dayDate,
      pollenData: dayData.allPollen,
      isDWD: true
    };
    
    renderDayPollenDetail();
    return;
  }
  
  // Handle Open-Meteo data
  const startOfDay = new Date(dateStr + 'T00:00:00Z');
  const endOfDay = new Date(dateStr + 'T23:59:59Z');
  
  // Get all pollen values for this day
  const pollenData = {
    alder: 0,
    birch: 0,
    grass: 0,
    mugwort: 0,
    olive: 0,
    ragweed: 0
  };
  
  Object.keys(pollenData).forEach(pollen => {
    const key = pollen + '_pollen';
    if(allergyForecastState.hourlyData.hourly[key]) {
      allergyForecastState.hourlyData.hourly[key].forEach((val, i) => {
        const timeStr = allergyForecastState.hourlyData.hourly.time?.[i];
        if(!timeStr) return;
        const time = new Date(timeStr);
        if(time >= startOfDay && time <= endOfDay && val !== null) {
          pollenData[pollen] = Math.max(pollenData[pollen], val);
        }
      });
    }
  });
  
  allergyForecastState.detailView = true;
  allergyForecastState.selectedDayData = { 
    dateStr, 
    dayName, 
    dayDate, 
    pollenData,
    isDWD: false  // Mark as Open-Meteo data
  };
  
  renderDayPollenDetail();
}

function renderDayPollenDetail() {
  const data = allergyForecastState.selectedDayData;
  if(!data) return;
  
  el('forecastTitle').textContent = `Pollendetails · ${data.dayName} ${data.dayDate}`;
  el('forecastBack').style.display = 'flex';
  el('forecastFooter').style.display = 'none';
  
  // Determine which pollen names to use
  const pollenNames = data.isDWD ? DWD_POLLEN_NAMES : POLLEN_NAMES;
  
  // Get all pollen types to display (use all available types from API)
  const allPollenTypes = data.isDWD 
    ? Object.keys(DWD_POLLEN_NAMES)  // All 8 DWD types
    : Object.keys(POLLEN_NAMES);     // All 6 Open-Meteo types
  
  // Build complete data object with all types (fill in missing ones with 0)
  const completeData = {};
  allPollenTypes.forEach(type => {
    completeData[type] = data.pollenData[type] || 0;
  });
  
  // Sort pollen by value (show all types, even 0)
  const sorted = Object.entries(completeData)
    .map(([type, value]) => ({
      type,
      name: pollenNames[type] || type,
      value,
      levelText: getPollenLevelText(value)
    }))
    .sort((a, b) => b.value - a.value);
  
  const html = sorted.map(item => {
    // Determine level key for coloring
    let levelKey = 'keine';
    if(item.value === 0) levelKey = 'keine';
    else if(item.value <= 10) levelKey = 'sehr_niedrig';
    else if(item.value <= 30) levelKey = 'niedrig';
    else if(item.value <= 80) levelKey = 'mäßig';
    else if(item.value <= 150) levelKey = 'hoch';
    else levelKey = 'sehr_hoch';
    
    const meds = getMedicationRecommendation(levelKey);
    const barWidth = item.value > 0 ? Math.min((item.value / 200) * 100, 100) : 0;
    
    return `
      <div class="pollen-detail-item" style="padding:16px;border-bottom:1px solid rgba(180,198,216,0.2);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <div style="font-weight:600;font-size:16px;">${item.name}</div>
          <div style="font-size:12px;color:${meds.bgColor};background:${meds.bgColor};color:#333;padding:4px 8px;border-radius:4px;font-weight:600;">${item.levelText}</div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <div style="flex:1;height:12px;background:rgba(180,198,216,0.15);border-radius:6px;overflow:hidden;">
            <div style="height:100%;background:${meds.bgColor};width:${barWidth}%;transition:width 0.3s;"></div>
          </div>
          <div style="font-size:12px;color:var(--muted);min-width:60px;text-align:right;">${item.value.toFixed(1)} gr/m³</div>
        </div>
      </div>
    `;
  }).join('');
  
  el('forecastGrid').innerHTML = html;
  
  const modalContent = el('forecastModal').querySelector('.forecast-modal-content');
  modalContent.scrollTop = 0;
}

function goBackFromDetail() {
  allergyForecastState.detailView = false;
  allergyForecastState.selectedDayData = null;
  
  el('forecastTitle').textContent = `Pollenvorhersage für ${state.currentLocationName}`;
  el('forecastBack').style.display = 'none';
  el('forecastFooter').style.display = 'flex';
  
  renderAllergyForecastDays();
}

