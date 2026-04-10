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

// Build a map of German pollen name → { combined, dwd, openMeteo, inDwd, inOpenMeteo }
// Used by both the daily list and per-day detail renderers
function buildDayPollenValues(dwdAllPollen, openMeteoValues) {
  const result = {};

  Object.entries(DWD_POLLEN_NAMES).forEach(([key, germanName]) => {
    result[germanName] = result[germanName] || { combined: 0, dwd: 0, openMeteo: 0, inDwd: false, inOpenMeteo: false };
    result[germanName].inDwd = true;
    const value = dwdAllPollen?.[key] || 0;
    result[germanName].dwd = value;
    result[germanName].combined = Math.max(result[germanName].combined, value);
  });

  Object.entries(POLLEN_NAMES).forEach(([key, germanName]) => {
    result[germanName] = result[germanName] || { combined: 0, dwd: 0, openMeteo: 0, inDwd: false, inOpenMeteo: false };
    result[germanName].inOpenMeteo = true;
    const value = openMeteoValues?.[key] || 0;
    result[germanName].openMeteo = value;
    result[germanName].combined = Math.max(result[germanName].combined, value);
  });

  return result;
}

async function renderAllergyForecastDays() {
  try {
    if(!allergyForecastState.hourlyData) {
      el('forecastGrid').innerHTML = '<p class="muted" style="padding:20px;text-align:center">Pollenvorhersage nicht verfügbar</p>';
      return;
    }

    const dailyData = aggregateDailyPollen(allergyForecastState.hourlyData, allergyForecastState.currentDays);

    const html = dailyData.map(day => {
      const dateObj = new Date(day.date);
      const dayName = dateObj.toLocaleDateString('de-DE', {weekday: 'long'});
      const dayDate = dateObj.toLocaleDateString('de-DE', {month: 'numeric', day: 'numeric'});

      const pollenValues = buildDayPollenValues(day.sources?.dwd?.allPollen, day.sources?.openMeteo?.values);
      const active = Object.entries(pollenValues)
        .filter(([, v]) => v.combined > 0)
        .sort(([, a], [, b]) => b.combined - a.combined);

      let barsHTML;
      if (active.length === 0) {
        barsHTML = '<div class="pollen-none">Keine aktiven Pollen</div>';
      } else {
        const top3 = active.slice(0, 3);
        const overflow = active.slice(3);

        const rowsHTML = top3.map(([name, vals]) => {
          const levelKey = getPollenLevelFromValue(vals.combined);
          const levelNum = POLLEN_LEVEL_NUMBERS[levelKey];
          const style = POLLEN_BAR_STYLES[levelNum] || POLLEN_BAR_STYLES[1];
          const width = (levelNum / 5) * 100;
          return `
            <div class="pollen-bar-row">
              <div class="pollen-bar-name">${name}</div>
              <div class="pollen-bar-track">
                <div class="pollen-bar-fill" style="width:${width}%;background:${style.gradient};"></div>
              </div>
              <div class="pollen-bar-label" style="color:${style.color};">${levelNum}/5</div>
            </div>`;
        }).join('');

        const overflowHTML = overflow.length > 0
          ? `<div class="pollen-overflow">+ ${overflow.length} weitere (${overflow.map(([n]) => n).join(', ')})</div>`
          : '';

        barsHTML = `<div class="pollen-bars">${rowsHTML}</div>${overflowHTML}`;
      }

      return `
        <div class="allergy-forecast-item" onclick="showDayPollenDetail('${day.date}', '${dayName}', '${dayDate}')">
          <div class="allergy-forecast-date">${dayName} · ${dayDate}</div>
          ${barsHTML}
        </div>`;
    }).join('');

    el('forecastGrid').innerHTML = html;

    if(allergyForecastState.currentDays >= allergyForecastState.maxDays) {
      el('forecastLoadMore').disabled = true;
      el('forecastLoadMore').textContent = allergyForecastState.maxDays <= 3
        ? 'DWD: Maximal 3 Tage verfügbar'
        : 'Maximale Tage erreicht (16)';
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

  const pollenValues = buildDayPollenValues(data.sources.dwd?.allPollen, data.sources.openMeteo?.values);

  const sorted = Object.entries(pollenValues)
    .filter(([, v]) => v.combined > 0)
    .sort(([, a], [, b]) => b.combined - a.combined);

  if (sorted.length === 0) {
    el('forecastGrid').innerHTML = '<div class="pollen-none" style="padding:20px;text-align:center">Keine aktiven Pollen für diesen Tag</div>';
    const modalContent = el('forecastModal').querySelector('.forecast-modal-content');
    modalContent.scrollTop = 0;
    return;
  }

  const html = sorted.map(([germanName, vals]) => {
    const levelKey = getPollenLevelFromValue(vals.combined);
    const levelNum = POLLEN_LEVEL_NUMBERS[levelKey];
    const style = POLLEN_BAR_STYLES[levelNum] || POLLEN_BAR_STYLES[1];
    const width = (levelNum / 5) * 100;

    const noteParts = [];
    if (vals.inDwd) {
      const dwdLevelKey = getPollenLevelFromValue(vals.dwd);
      noteParts.push(`DWD: ${dwdLevelKey.replace('_', ' ')}`);
    }
    if (vals.inOpenMeteo) {
      const omLevelKey = getPollenLevelFromValue(vals.openMeteo);
      noteParts.push(`Open-Meteo: ${omLevelKey.replace('_', ' ')}`);
    }
    const sourceNote = noteParts.join(' · ');

    return `
      <div class="pollen-detail-item">
        <div class="pollen-bar-row">
          <div class="pollen-bar-name">${germanName}</div>
          <div class="pollen-bar-track">
            <div class="pollen-bar-fill" style="width:${width}%;background:${style.gradient};"></div>
          </div>
          <div class="pollen-bar-label" style="color:${style.color};">${levelNum}/5</div>
        </div>
        <div class="pollen-source-note">${sourceNote}</div>
      </div>`;
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

