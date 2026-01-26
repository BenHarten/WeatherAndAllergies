// ============ POLLEN/ALLERGIES (OPEN-METEO) ============
async function fetchAndParsePollen(lat, lon) {
  // Try DWD first (has more pollen types including hazelnut)
  try {
    const dwdResult = await fetchAndParseDWDPollen(lat, lon);
    if (dwdResult && dwdResult.level) {
      console.log('✅ Using DWD pollen data:', dwdResult);
      return dwdResult;
    } else {
      console.log('⚠️ DWD returned no data, trying Open-Meteo');
    }
  } catch(e) {
    console.warn('❌ DWD pollen fetch failed, falling back to Open-Meteo:', e);
  }
  
  // Fallback to Open-Meteo
  const url = APIS.openMeteoPollen(lat, lon);
  
  try {
    const data = await getCachedFetch(url);
    if(!data.hourly) return {level: null, types: ['Keine Daten verfügbar'], source: 'open-meteo'};

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
    let level;
    if(maxVal === 0) level = 'keine';
    else if(maxVal <= 10) level = 'sehr_niedrig';
    else if(maxVal <= 30) level = 'niedrig';
    else if(maxVal <= 80) level = 'mäßig';
    else if(maxVal <= 150) level = 'hoch';
    else level = 'sehr_hoch';
    
    console.log('✅ Using Open-Meteo pollen data (max:', maxVal, ', types:', domTypes, ')');
    return {level, types: domTypes.length > 0 ? domTypes : ['Keine'], source: 'open-meteo'};
  } catch(e) {
    console.error('Pollen API error:', e);
    throw e;
  }
}

function renderAllergy(pollen) {
  const levelText = POLLEN_LEVELS[pollen.level] || 'Unbekannt';
  const typesText = pollen.types?.join(', ') || 'N/A';
  const meds = getMedicationRecommendation(pollen.level);
  
  // Add source indicator and tracked types info
  let sourceText = '';
  if (pollen.source === 'dwd') {
    sourceText = `<div style="font-size:9px;color:var(--muted);margin-top:4px;">Quelle: DWD</div>`;
  } else {
    sourceText = `<div style="font-size:9px;color:var(--muted);margin-top:4px;">Quelle: Open-Meteo</div>`;
  }
  
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
