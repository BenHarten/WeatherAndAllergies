// ============ DWD POLLEN API INTEGRATION ============
// Deutscher Wetterdienst (DWD) provides detailed pollen data for Germany
// Including: Hasel, Erle, Birke, Esche, Gräser, Roggen, Beifuß, Ambrosia

const DWD_POLLEN_NAMES = {
  'Hasel': 'Hasel',
  'Erle': 'Erle',
  'Birke': 'Birke',
  'Esche': 'Esche',
  'Graeser': 'Gräser',
  'Roggen': 'Roggen',
  'Beifuss': 'Beifuß',
  'Ambrosia': 'Ambrosia'
};

const DWD_REGIONS = {
  // Map coordinates to region IDs
  // Berlin region
  'berlin': { region_id: 50, region_name: 'Brandenburg und Berlin' },
  // Add more regions as needed
};

// Convert DWD level (0, 0-1, 1, 1-2, 2, 2-3, 3) to numeric value
function dwdLevelToNumber(level) {
  if (!level || level === '0') return 0;
  if (level === '0-1') return 5;
  if (level === '1') return 10;
  if (level === '1-2') return 20;
  if (level === '2') return 40;
  if (level === '2-3') return 60;
  if (level === '3') return 100;
  return 0;
}

// Get pollen level category from DWD numeric value
function getDWDPollenLevel(value) {
  return getPollenLevelFromValue(value);
}

// Find closest region for given coordinates
function findDWDRegion(lat, lon, data) {
  // For now, simple region matching
  // Berlin/Brandenburg region
  if (lat >= 51.5 && lat <= 53.5 && lon >= 12.0 && lon <= 14.5) {
    return data.content.find(r => r.region_id === 50);
  }
  
  // NRW
  if (lat >= 50.3 && lat <= 52.5 && lon >= 6.0 && lon <= 9.5) {
    return data.content.find(r => r.region_id === 40 && r.partregion_id === 41);
  }
  
  // Bavaria
  if (lat >= 47.2 && lat <= 50.5 && lon >= 9.0 && lon <= 13.8) {
    return data.content.find(r => r.region_id === 120);
  }
  
  // Baden-Württemberg (Stuttgart area)
  if (lat >= 47.5 && lat <= 49.8 && lon >= 7.5 && lon <= 10.5) {
    return data.content.find(r => r.region_id === 110 && r.partregion_id === 112);
  }
  
  // Hamburg/Schleswig-Holstein
  if (lat >= 53.4 && lat <= 55.1 && lon >= 8.5 && lon <= 11.5) {
    return data.content.find(r => r.region_id === 10);
  }
  
  // Default to first region if no match
  return data.content[0];
}

// Fetch DWD pollen data
async function fetchDWDPollen(lat, lon) {
  // Use local proxy server to avoid CORS issues
  const url = '/api/dwd-pollen';
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error('DWD Proxy returned status:', response.status);
      return null;
    }
    const data = await response.json();
    
    const region = findDWDRegion(lat, lon, data);
    if (!region || !region.Pollen) {
      return null;
    }
    
    // Convert DWD format to our format
    const pollenData = {
      today: {},
      tomorrow: {},
      dayAfterTomorrow: {}
    };
    
    Object.keys(DWD_POLLEN_NAMES).forEach(pollenType => {
      if (region.Pollen[pollenType]) {
        pollenData.today[pollenType] = dwdLevelToNumber(region.Pollen[pollenType].today);
        pollenData.tomorrow[pollenType] = dwdLevelToNumber(region.Pollen[pollenType].tomorrow);
        pollenData.dayAfterTomorrow[pollenType] = dwdLevelToNumber(region.Pollen[pollenType].dayafter_to);
      }
    });
    
    return {
      region: region.region_name,
      partregion: region.partregion_name,
      lastUpdate: data.last_update,
      nextUpdate: data.next_update,
      data: pollenData
    };
  } catch (e) {
    console.error('DWD Pollen API error:', e);
    return null;
  }
}

// Parse DWD pollen for today
async function fetchAndParseDWDPollen(lat, lon) {
  const dwdData = await fetchDWDPollen(lat, lon);
  
  if (!dwdData) {
    return { level: null, types: ['Keine Daten verfügbar'], source: 'dwd' };
  }
  
  const today = dwdData.data.today;
  
  // Find max value and dominant types
  const sorted = Object.entries(today).sort(([, a], [, b]) => b - a);
  const domTypes = sorted
    .filter(([, v]) => v > 0)
    .slice(0, 5)  // Show up to 5 types to include more variety
    .map(([k]) => DWD_POLLEN_NAMES[k] || k);
  
  const maxVal = sorted[0]?.[1] || 0;
  const level = getDWDPollenLevel(maxVal);
  
  return {
    level,
    types: domTypes.length > 0 ? domTypes : ['Keine'],
    source: 'dwd',
    region: dwdData.region,
    partregion: dwdData.partregion,
    lastUpdate: dwdData.lastUpdate,
    allData: dwdData
  };
}

// Get forecast for multiple days
async function getDWDPollenForecast(lat, lon, days = 3) {
  const dwdData = await fetchDWDPollen(lat, lon);
  
  if (!dwdData) {
    return [];
  }
  
  const forecast = [];
  const today = new Date();
  
  // Today
  const todayData = dwdData.data.today;
  const todaySorted = Object.entries(todayData).sort(([, a], [, b]) => b - a);
  const todayMax = todaySorted[0]?.[1] || 0;
  forecast.push({
    date: today.toISOString().split('T')[0],
    level: getDWDPollenLevel(todayMax),
    types: todaySorted.filter(([, v]) => v > 0).slice(0, 2).map(([k]) => DWD_POLLEN_NAMES[k]),
    maxVal: todayMax,
    allPollen: todayData
  });
  
  // Tomorrow
  const tomorrowData = dwdData.data.tomorrow;
  const tomorrowSorted = Object.entries(tomorrowData).sort(([, a], [, b]) => b - a);
  const tomorrowMax = tomorrowSorted[0]?.[1] || 0;
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  forecast.push({
    date: tomorrow.toISOString().split('T')[0],
    level: getDWDPollenLevel(tomorrowMax),
    types: tomorrowSorted.filter(([, v]) => v > 0).slice(0, 2).map(([k]) => DWD_POLLEN_NAMES[k]),
    maxVal: tomorrowMax,
    allPollen: tomorrowData
  });
  
  // Day after tomorrow
  if (days >= 3) {
    const datData = dwdData.data.dayAfterTomorrow;
    const datSorted = Object.entries(datData).sort(([, a], [, b]) => b - a);
    const datMax = datSorted[0]?.[1] || 0;
    const dat = new Date(today);
    dat.setDate(dat.getDate() + 2);
    forecast.push({
      date: dat.toISOString().split('T')[0],
      level: getDWDPollenLevel(datMax),
      types: datSorted.filter(([, v]) => v > 0).slice(0, 2).map(([k]) => DWD_POLLEN_NAMES[k]),
      maxVal: datMax,
      allPollen: datData
    });
  }
  
  return forecast;
}
