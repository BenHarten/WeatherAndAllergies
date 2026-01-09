// ============ POLLEN/ALLERGIES (OPEN-METEO) ============
async function fetchAndParsePollen(lat, lon) {
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
    
    let aqi = 0;
    
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
          
          // Get AQI for today
          if(data.hourly.european_aqi?.[i] !== null && data.hourly.european_aqi?.[i] !== undefined) {
            aqi = Math.max(aqi, data.hourly.european_aqi[i]);
          }
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
    
    return {level, types: domTypes.length > 0 ? domTypes : ['Keine'], aqi};
  } catch(e) {
    console.error('Pollen API error:', e);
    throw e;
  }
}

function getMedicationRecommendation(level) {
  return MEDICATION_RECOMMENDATIONS[level] || MEDICATION_RECOMMENDATIONS['keine'];
}

function renderAllergy(pollen) {
  const levelText = POLLEN_LEVELS[pollen.level] || 'Unbekannt';
  const typesText = pollen.types?.join(', ') || 'N/A';
  const meds = getMedicationRecommendation(pollen.level);
  
  const leftHTML = `
    <div class="allergy-level">Pollenbelastung:<br><strong>${levelText}</strong></div>
    <div class="allergy-types">Dominante Pollen:<br>${typesText}</div>
    <div class="medication-recommendation" style="margin-top:8px;padding:8px;background:#f0f0f0;border-radius:4px;font-size:12px;color:#555;">
      <strong>${meds.text}</strong>
    </div>
  `;
  
  let rightHTML = '';
  if(pollen.aqi !== null && pollen.aqi !== undefined) {
    const aqiLevel = AQI_LEVELS.getLevel(pollen.aqi);
    rightHTML = `
      <div class="allergy-aqi-label-top">Luftqualität</div>
      <div class="allergy-aqi-value">${pollen.aqi}</div>
      <div class="allergy-aqi-level">${aqiLevel}</div>
      <div style="font-size:20px;margin-top:8px;line-height:1;">${meds.icon}</div>
    `;
  } else {
    rightHTML = `<div style="font-size:28px;display:flex;align-items:center;justify-content:center;height:100%;line-height:1;">${meds.icon}</div>`;
  }
  
  renderCard('allergyContent', leftHTML, rightHTML, 'allergy');
}
