// ============ ALLERGY FORECAST ============
const allergyForecastState = {
  hourlyData: null,
  lat: null,
  lon: null,
  currentDays: 7,
  maxDays: 16,
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
    // Fetch both sources in parallel
    const [dwdResult, openMeteoResult] = await Promise.allSettled([
      getDWDPollenForecast(lat, lon, 3),
      (async () => {
        const url = APIS.openMeteoPollen(lat, lon);
        return await getCachedFetch(url);
      })()
    ]);
    
    const dwdForecast = dwdResult.status === 'fulfilled' && dwdResult.value?.length > 0 ? dwdResult.value : null;
    const openMeteoData = openMeteoResult.status === 'fulfilled' && openMeteoResult.value ? openMeteoResult.value : null;
    
    // Store both sources
    allergyForecastState.hourlyData = {
      dwd: dwdForecast,
      openMeteo: openMeteoData
    };
    allergyForecastState.lat = lat;
    allergyForecastState.lon = lon;
    
    // Determine max days based on available sources
    if (openMeteoData) {
      allergyForecastState.maxDays = 16;  // Open-Meteo provides up to 16 days
      allergyForecastState.currentDays = 7;
    } else if (dwdForecast) {
      allergyForecastState.maxDays = 3;   // DWD only provides 3 days
      allergyForecastState.currentDays = 3;
    }
    
    console.log('Fetched dual source data - DWD:', !!dwdForecast, 'Open-Meteo:', !!openMeteoData);
    return allergyForecastState.hourlyData;
  } catch(e) {
    console.error('Failed to fetch allergy forecast data:', e);
    return null;
  }
}

function aggregateDailyPollen(hourlyData, days) {
  // Handle dual source data
  if (hourlyData?.dwd || hourlyData?.openMeteo) {
    const dwdForecast = hourlyData.dwd;
    const openMeteoData = hourlyData.openMeteo;
    
    const dailyData = [];
    
    // Process each day up to the max days available
    for (let day = 0; day < days; day++) {
      const dateStr = getDateString(day);
      
      // Get DWD data for this day
      let dwdDayData = null;
      if (dwdForecast && day < dwdForecast.length) {
        dwdDayData = dwdForecast[day];
      }
      
      // Get Open-Meteo data for this day
      let openMeteoDayData = null;
      if (openMeteoData?.hourly?.time) {
        const values = extractOpenMeteoMaxValuesForDay(openMeteoData, dateStr);
        const maxVal = Math.max(...Object.values(values)) || 0;
        const domTypes = getTopPollenTypes(values, POLLEN_NAMES, 3, 0);
        const level = getPollenLevelFromValue(maxVal);
        
        openMeteoDayData = { level, types: domTypes, maxVal, values };
      }
      
      // Determine combined level based on max from both sources
      let combinedLevel = 'keine';
      let combinedMaxVal = 0;
      const combinedTypes = new Set();
      
      if (dwdDayData) {
        if (dwdDayData.maxVal > combinedMaxVal) {
          combinedMaxVal = dwdDayData.maxVal;
          combinedLevel = dwdDayData.level;
        }
        dwdDayData.types.forEach(t => combinedTypes.add(t));
      }
      
      if (openMeteoDayData) {
        if (openMeteoDayData.maxVal > combinedMaxVal) {
          combinedMaxVal = openMeteoDayData.maxVal;
          combinedLevel = openMeteoDayData.level;
        }
        openMeteoDayData.types.forEach(t => combinedTypes.add(t));
      }
      
      dailyData.push({
        date: dateStr,
        level: POLLEN_LEVELS[combinedLevel] || combinedLevel,
        types: Array.from(combinedTypes).slice(0, 5),
        maxVal: combinedMaxVal,
        sources: {
          dwd: dwdDayData,
          openMeteo: openMeteoDayData
        }
      });
    }
    
    return dailyData;
  }
  
  // Handle legacy DWD data format
  if (hourlyData?.isDWD && hourlyData?.forecast) {
    return hourlyData.forecast.slice(0, days).map(day => ({
      date: day.date,
      level: POLLEN_LEVELS[day.level] || day.level,
      types: day.types.length > 0 ? day.types : ['Keine'],
      maxVal: day.maxVal
    }));
  }
  
  return [];
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
      
      // Get level key from the level text
      const levelKey = getPollenLevelFromValue(day.maxVal);
      
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
  
  // Find the day's data from the aggregated dailyData
  const dailyData = aggregateDailyPollen(allergyForecastState.hourlyData, allergyForecastState.currentDays);
  const dayData = dailyData.find(d => d.date === dateStr);
  
  if (!dayData || !dayData.sources) return;
  
  allergyForecastState.detailView = true;
  allergyForecastState.selectedDayData = {
    dateStr,
    dayName,
    dayDate,
    sources: dayData.sources  // Contains both DWD and Open-Meteo data
  };
  
  renderDayPollenDetail();
}

function renderDayPollenDetail() {
  const data = allergyForecastState.selectedDayData;
  if(!data || !data.sources) return;
  
  el('forecastTitle').textContent = `Pollendetails · ${data.dayName} ${data.dayDate}`;
  el('forecastBack').style.display = 'flex';
  el('forecastFooter').style.display = 'none';
  
  const dwdData = data.sources.dwd;
  const openMeteoData = data.sources.openMeteo;
  
  // Collect all pollen types from both sources
  const allPollenTypes = new Set();
  
  if (dwdData?.allPollen) {
    Object.keys(dwdData.allPollen).forEach(type => allPollenTypes.add({ type, source: 'dwd' }));
  }
  
  if (openMeteoData?.values) {
    Object.keys(openMeteoData.values).forEach(type => allPollenTypes.add({ type, source: 'openMeteo' }));
  }
  
  // Build unified list with data from both sources
  const pollenList = [];
  
  // DWD pollen types
  if (dwdData?.allPollen) {
    Object.keys(DWD_POLLEN_NAMES).forEach(type => {
      const value = dwdData.allPollen[type] || 0;
      const existing = pollenList.find(p => p.germanName === DWD_POLLEN_NAMES[type]);
      if (!existing) {
        pollenList.push({
          germanName: DWD_POLLEN_NAMES[type],
          dwd: { value, level: getPollenLevelText(value) }
        });
      }
    });
  }
  
  // Open-Meteo pollen types
  if (openMeteoData?.values) {
    Object.keys(POLLEN_NAMES).forEach(type => {
      const value = openMeteoData.values[type] || 0;
      const germanName = POLLEN_NAMES[type];
      const existing = pollenList.find(p => p.germanName === germanName);
      if (existing) {
        existing.openMeteo = { value, level: getPollenLevelText(value) };
      } else {
        pollenList.push({
          germanName,
          openMeteo: { value, level: getPollenLevelText(value) }
        });
      }
    });
  }
  
  // Sort by combined max value
  pollenList.sort((a, b) => {
    const aMax = Math.max(a.dwd?.value || 0, a.openMeteo?.value || 0);
    const bMax = Math.max(b.dwd?.value || 0, b.openMeteo?.value || 0);
    return bMax - aMax;
  });
  
  // Render without bar charts - just show the values from each source
  const html = pollenList.map(item => {
    const maxValue = Math.max(item.dwd?.value || 0, item.openMeteo?.value || 0);
    const levelKey = getPollenLevelFromValue(maxValue);
    
    const meds = getMedicationRecommendation(levelKey);
    
    return `
      <div class="pollen-detail-item" style="padding:16px;border-bottom:1px solid rgba(180,198,216,0.2);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <div style="font-weight:600;font-size:16px;">${item.germanName}</div>
          <div style="font-size:12px;color:${meds.bgColor};background:${meds.bgColor};color:#333;padding:4px 8px;border-radius:4px;font-weight:600;">${getPollenLevelText(maxValue)}</div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:8px;">
          ${item.dwd ? `
            <div style="padding:8px;background:rgba(180,198,216,0.1);border-radius:6px;">
              <div style="font-size:10px;color:var(--muted);margin-bottom:4px;">DWD</div>
              <div style="font-size:14px;font-weight:600;">${item.dwd.value.toFixed(0)}</div>
              <div style="font-size:10px;color:var(--muted);margin-top:2px;">${item.dwd.level}</div>
            </div>
          ` : '<div style="padding:8px;background:rgba(180,198,216,0.05);border-radius:6px;color:var(--muted);font-size:12px;">N/A</div>'}
          ${item.openMeteo ? `
            <div style="padding:8px;background:rgba(180,198,216,0.1);border-radius:6px;">
              <div style="font-size:10px;color:var(--muted);margin-bottom:4px;">Open-Meteo</div>
              <div style="font-size:14px;font-weight:600;">${item.openMeteo.value.toFixed(1)} gr/m³</div>
              <div style="font-size:10px;color:var(--muted);margin-top:2px;">${item.openMeteo.level}</div>
            </div>
          ` : '<div style="padding:8px;background:rgba(180,198,216,0.05);border-radius:6px;color:var(--muted);font-size:12px;">N/A</div>'}
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

