// ============ POLLEN/ALLERGIES (OPEN-METEO) ============
async function fetchAndParsePollen(lat, lon) {
  const url = APIS.openMeteoPollen(lat, lon);
  
  try {
    const data = await getCachedFetch(url);
    if(!data.hourly) return {level: null, types: ['Keine Daten verfügbar']};

  
  // Extract latest values for each pollen type
  const values = {
    alder: data.hourly.alder_pollen?.[data.hourly.alder_pollen.length - 1] || 0,
    birch: data.hourly.birch_pollen?.[data.hourly.birch_pollen.length - 1] || 0,
    grass: data.hourly.grass_pollen?.[data.hourly.grass_pollen.length - 1] || 0,
    mugwort: data.hourly.mugwort_pollen?.[data.hourly.mugwort_pollen.length - 1] || 0,
    ragweed: data.hourly.ragweed_pollen?.[data.hourly.ragweed_pollen.length - 1] || 0,
    olive: data.hourly.olive_pollen?.[data.hourly.olive_pollen.length - 1] || 0
  };
  
  // Find last non-null AQI value (since array often ends with nulls)
  let aqi = null;
  if(data.hourly.european_aqi && data.hourly.european_aqi.length > 0) {
    for(let i = data.hourly.european_aqi.length - 1; i >= 0; i--) {
      if(data.hourly.european_aqi[i] !== null && data.hourly.european_aqi[i] !== undefined) {
        aqi = data.hourly.european_aqi[i];
        break;
      }
    }
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

function renderAllergy(pollen) {
  const levelText = POLLEN_LEVELS[pollen.level] || 'Unbekannt';
  const typesText = pollen.types?.join(', ') || 'N/A';
  
  const leftHTML = `
    <div class="allergy-level">Pollenbelastung: <strong>${levelText}</strong></div>
    <div class="allergy-types">Dominante Pollen: ${typesText}</div>
  `;
  
  let rightHTML = '';
  if(pollen.aqi !== null && pollen.aqi !== undefined) {
    const aqiLevel = AQI_LEVELS.getLevel(pollen.aqi);
    rightHTML = `
      <div class="allergy-aqi-label-top">Luftqualität</div>
      <div class="allergy-aqi-value">${pollen.aqi}</div>
      <div class="allergy-aqi-level">${aqiLevel}</div>
    `;
  }
  
  renderCard('allergyContent', leftHTML, rightHTML, 'allergy');
}
