// ============ POLLEN/ALLERGIES (DUAL SOURCE) ============
async function fetchAndParsePollen(lat, lon) {
  // Fetch both DWD and Open-Meteo in parallel
  const [dwdResult, openMeteoResult] = await Promise.allSettled([
    fetchAndParseDWDPollen(lat, lon),
    fetchOpenMeteoPollen(lat, lon)
  ]);
  
  const dwdData = dwdResult.status === 'fulfilled' && dwdResult.value?.level ? dwdResult.value : null;
  const openMeteoData = openMeteoResult.status === 'fulfilled' && openMeteoResult.value?.level ? openMeteoResult.value : null;
  
  // If neither source has data, return error
  if (!dwdData && !openMeteoData) {
    return {level: null, types: ['Keine Daten verfügbar'], sources: {dwd: null, openMeteo: null}};
  }
  
  // Determine overall level based on highest value from either source
  let combinedLevel = 'keine';
  let combinedMaxVal = 0;
  
  if (dwdData) {
    const dwdValue = getDWDMaxValue(dwdData);
    if (dwdValue > combinedMaxVal) {
      combinedMaxVal = dwdValue;
      combinedLevel = dwdData.level;
    }
  }
  
  if (openMeteoData) {
    const openMeteoValue = getOpenMeteoMaxValue(openMeteoData);
    if (openMeteoValue > combinedMaxVal) {
      combinedMaxVal = openMeteoValue;
      combinedLevel = openMeteoData.level;
    }
  }
  
  // Collect all unique dominant types from both sources
  const allTypes = new Set();
  if (dwdData?.types) dwdData.types.forEach(t => allTypes.add(t));
  if (openMeteoData?.types) openMeteoData.types.forEach(t => allTypes.add(t));
  
  // Filter out "Keine" if we have actual pollen types
  let finalTypes = Array.from(allTypes).filter(t => t !== 'Keine');
  if (finalTypes.length === 0) {
    finalTypes = Array.from(allTypes);  // Keep "Keine" if no actual types found
  }
  
  console.log('✅ Using dual source data - DWD:', !!dwdData, 'Open-Meteo:', !!openMeteoData, 'Combined level:', combinedLevel);
  
  return {
    level: combinedLevel,
    types: finalTypes.slice(0, 5),
    sources: {
      dwd: dwdData,
      openMeteo: openMeteoData
    }
  };
}

// Helper function to get max value from DWD data
function getDWDMaxValue(dwdData) {
  // DWD already stores numeric values in allData.data.today
  if (dwdData.allData?.data?.today) {
    const values = Object.values(dwdData.allData.data.today);
    return Math.max(...values, 0);
  }
  return 0;
}

// Helper function to get max value from Open-Meteo data
function getOpenMeteoMaxValue(openMeteoData) {
  if (openMeteoData.maxVal !== undefined) {
    return openMeteoData.maxVal;
  }
  return 0;
}

// Fetch Open-Meteo pollen data
async function fetchOpenMeteoPollen(lat, lon) {
  const url = APIS.openMeteoPollen(lat, lon);
  
  try {
    const data = await getCachedFetch(url);
    if(!data.hourly) return {level: null, types: ['Keine Daten verfügbar']};

    // Get today's date range
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    
    // Find max pollen values for today
    const values = {
      alder: 0,
      birch: 0,
      grass: 0,
      mugwort: 0,
      ragweed: 0,
      olive: 0
    };
    
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
    
    const sorted = Object.entries(values).sort(([,a], [,b]) => b - a);
    const domTypes = sorted
      .filter(([,v]) => v > 0)
      .slice(0, 3)
      .map(([k]) => POLLEN_NAMES[k] || k);
    
    const maxVal = sorted[0]?.[1] || 0;
    const level = getPollenLevelFromValue(maxVal);
    
    return {level, types: domTypes.length > 0 ? domTypes : ['Keine'], maxVal, values};
  } catch(e) {
    console.error('Open-Meteo Pollen API error:', e);
    return null;
  }
}

function renderAllergy(pollen) {
  const levelText = POLLEN_LEVELS[pollen.level] || 'Unbekannt';
  const typesText = pollen.types?.join(', ') || 'N/A';
  const meds = getMedicationRecommendation(pollen.level);
  
  // Build source indicator showing both sources
  let sourceText = '<div style="font-size:9px;color:var(--muted);margin-top:4px;">';
  const sources = [];
  if (pollen.sources?.dwd) sources.push('DWD');
  if (pollen.sources?.openMeteo) sources.push('Open-Meteo');
  sourceText += sources.length > 0 ? `Quellen: ${sources.join(' + ')}` : 'Keine Daten';
  sourceText += '</div>';
  
  const leftHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;text-align:center;gap:6px;max-width:50%px">
      <div style="font-size:28px;line-height:1;">${meds.icon}</div>
      <div style="font-size:10px;color:#333;font-weight:600;background-color:${meds.bgColor};padding:4px 8px;border-radius:4px;word-wrap:break-word;line-height:1.2;max-width:70%;">${meds.text}</div>
    </div>
  `;
  
  const rightHTML = `
    <div>
      <div class="allergy-level">Pollenbelastung:<br><strong>${levelText}</strong></div>
      <div class="allergy-types" style="margin-top:8px;">Dominante Pollen:<br>${typesText}</div>
      ${sourceText}
    </div>
  `;
  
  renderCard('allergyContent', leftHTML, rightHTML, 'allergy');
}
