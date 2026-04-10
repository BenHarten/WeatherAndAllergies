// ============ POLLEN/ALLERGIES (DUAL SOURCE) ============
async function fetchAndParsePollen(lat, lon) {
  const [dwdResult, openMeteoResult] = await Promise.allSettled([
    fetchAndParseDWDPollen(lat, lon),
    fetchOpenMeteoPollen(lat, lon)
  ]);

  const dwdData = dwdResult.status === 'fulfilled' && dwdResult.value?.level ? dwdResult.value : null;
  const openMeteoData = openMeteoResult.status === 'fulfilled' && openMeteoResult.value?.level ? openMeteoResult.value : null;

  if (!dwdData && !openMeteoData) {
    return { level: null, types: ['Keine Daten verfügbar'], sources: { dwd: null, openMeteo: null }, combinedValues: {} };
  }

  let combinedLevel = 'keine';
  let combinedMaxVal = 0;

  if (dwdData) {
    const dwdValues = Object.values(dwdData.allData.data.today);
    const dwdValue = Math.max(...dwdValues, 0);
    if (dwdValue > combinedMaxVal) { combinedMaxVal = dwdValue; combinedLevel = dwdData.level; }
  }

  if (openMeteoData) {
    const openMeteoValue = openMeteoData.maxVal ?? 0;
    if (openMeteoValue > combinedMaxVal) { combinedMaxVal = openMeteoValue; combinedLevel = openMeteoData.level; }
  }

  const allTypes = new Set();
  if (dwdData?.types) dwdData.types.forEach(t => allTypes.add(t));
  if (openMeteoData?.types) openMeteoData.types.forEach(t => allTypes.add(t));

  let finalTypes = Array.from(allTypes).filter(t => t !== 'Keine');
  if (finalTypes.length === 0) finalTypes = Array.from(allTypes);

  // Build combined values map: German name → max value from either source
  const combinedValues = {};
  if (dwdData?.allData?.data?.today) {
    Object.entries(dwdData.allData.data.today).forEach(([k, v]) => {
      const name = DWD_POLLEN_NAMES[k];
      if (name) combinedValues[name] = Math.max(combinedValues[name] || 0, v);
    });
  }
  if (openMeteoData?.values) {
    Object.entries(openMeteoData.values).forEach(([k, v]) => {
      const name = POLLEN_NAMES[k];
      if (name) combinedValues[name] = Math.max(combinedValues[name] || 0, v);
    });
  }

  console.log('✅ Dual source - DWD:', !!dwdData, 'Open-Meteo:', !!openMeteoData, 'Level:', combinedLevel);

  return {
    level: combinedLevel,
    types: finalTypes.slice(0, 5),
    sources: { dwd: dwdData, openMeteo: openMeteoData },
    combinedValues
  };
}

// Fetch Open-Meteo pollen data
async function fetchOpenMeteoPollen(lat, lon) {
  const url = APIS.openMeteoPollen(lat, lon);
  
  try {
    const data = await getCachedFetch(url);
    if(!data.hourly) return {level: null, types: ['Keine Daten verfügbar'], values: {}};

    // Get today's date range
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    
    // Find max pollen values for today
    const values = { ...EMPTY_POLLEN_VALUES };
    
    // Iterate through hourly data to find today's max values
    if(data.hourly && data.hourly.time) {
      data.hourly.time.forEach((timeStr, i) => {
        const time = new Date(timeStr);
        if(time >= startOfDay && time <= endOfDay) {
          // Update max pollen values for today
          if(data.hourly.alder_pollen?.[i]) values.alder = Math.max(values.alder, data.hourly.alder_pollen[i]);
          if(data.hourly.birch_pollen?.[i]) values.birch = Math.max(values.birch, data.hourly.birch_pollen[i]);
          if(data.hourly.grass_pollen?.[i]) values.grass = Math.max(values.grass, data.hourly.grass_pollen[i]);
          if(data.hourly.mugwort_pollen?.[i]) values.mugwort = Math.max(values.mugwort, data.hourly.mugwort_pollen[i]);
          if(data.hourly.ragweed_pollen?.[i]) values.ragweed = Math.max(values.ragweed, data.hourly.ragweed_pollen[i]);
          if(data.hourly.olive_pollen?.[i]) values.olive = Math.max(values.olive, data.hourly.olive_pollen[i]);
        }
      });
    }
    
    const domTypes = getTopPollenTypes(values, POLLEN_NAMES, 3, 0);
    const maxVal = Math.max(...Object.values(values)) || 0;
    const level = getPollenLevelFromValue(maxVal);
    
    return {level, types: domTypes.length > 0 ? domTypes : ['Keine'], maxVal, values};
  } catch(e) {
    console.error('Open-Meteo Pollen API error:', e);
    return null;
  }
}

function renderAllergy(pollen) {
  const meds = getMedicationRecommendation(pollen.level);

  // Sort active types by value descending
  const active = Object.entries(pollen.combinedValues || {})
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a);

  let barsHTML;
  if (active.length === 0) {
    barsHTML = '<div class="pollen-none">Keine aktiven Pollen</div>';
  } else {
    const top3 = active.slice(0, 3);
    const overflow = active.slice(3);

    const rowsHTML = top3.map(([name, value]) => {
      const levelKey = getPollenLevelFromValue(value);
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

  el('allergyContent').innerHTML = `
    ${barsHTML}
    <div class="pollen-med-badge" style="background:${meds.bgColor};">${meds.icon} ${meds.text}</div>
    <div class="card-hint">Tippen für Pollenvorhersage →</div>
  `;
}
