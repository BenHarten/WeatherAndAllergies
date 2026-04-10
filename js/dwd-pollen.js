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

// Approximate centroids for all DWD pollen regions
// Used for nearest-region lookup when exact bounding box match fails
const DWD_REGION_CENTROIDS = [
  { region_id: 10,  partregion_id: -1,  lat: 54.0, lon: 10.0  }, // Schleswig-Holstein und Hamburg
  { region_id: 20,  partregion_id: -1,  lat: 53.8, lon: 12.5  }, // Mecklenburg-Vorpommern
  { region_id: 30,  partregion_id: -1,  lat: 52.6, lon:  9.5  }, // Niedersachsen und Bremen
  { region_id: 40,  partregion_id: 41,  lat: 51.8, lon:  7.5  }, // NRW Nord
  { region_id: 40,  partregion_id: 42,  lat: 51.0, lon:  7.2  }, // NRW Süd
  { region_id: 50,  partregion_id: -1,  lat: 52.5, lon: 13.4  }, // Brandenburg und Berlin
  { region_id: 60,  partregion_id: -1,  lat: 51.9, lon: 11.5  }, // Sachsen-Anhalt
  { region_id: 70,  partregion_id: -1,  lat: 51.0, lon: 11.0  }, // Thüringen
  { region_id: 80,  partregion_id: -1,  lat: 51.1, lon: 13.3  }, // Sachsen
  { region_id: 90,  partregion_id: -1,  lat: 49.8, lon: 11.0  }, // Bayern Nord
  { region_id: 90,  partregion_id: 91,  lat: 49.5, lon: 12.5  }, // Bayern Nordost
  { region_id: 100, partregion_id: -1,  lat: 48.1, lon: 11.5  }, // Bayern Süd
  { region_id: 100, partregion_id: 101, lat: 47.6, lon: 11.0  }, // Bayern Alpen
  { region_id: 110, partregion_id: 111, lat: 49.2, lon:  8.8  }, // Baden-Württemberg Nord
  { region_id: 110, partregion_id: 112, lat: 48.1, lon:  8.5  }, // Baden-Württemberg Süd
  { region_id: 120, partregion_id: -1,  lat: 48.8, lon: 11.5  }, // Bayern gesamt
  { region_id: 130, partregion_id: -1,  lat: 49.8, lon:  7.5  }, // Saarland und Rheinland-Pfalz
  { region_id: 140, partregion_id: -1,  lat: 50.6, lon:  9.0  }, // Hessen
];

// Convert DWD level (0, 0-1, 1, 1-2, 2, 2-3, 3) to numeric value
// Scale to match Open-Meteo's range for visual consistency
// DWD: 0-3 scale → Mapped to align with category thresholds (0, 10, 30, 80, 150)
function dwdLevelToNumber(level) {
  if (!level || level === '0') return 0;        // keine Belastung → keine (0/5)
  if (level === '0-1') return 8;                // keine bis geringe → sehr_niedrig (1/5)
  if (level === '1') return 20;                 // geringe Belastung → niedrig (2/5)
  if (level === '1-2') return 55;               // geringe bis mittlere → mäßig (3/5)
  if (level === '2') return 110;                // mittlere Belastung = mäßig (3/5)
  if (level === '2-3') return 180;              // mittlere bis hohe → hoch (4/5)
  if (level === '3') return 250;                // hohe Belastung → sehr_hoch (5/5)
  return 0;
}

// Find the closest DWD region to given coordinates using Euclidean distance
function findDWDRegion(lat, lon, data) {
  let bestRegion = null;
  let bestDist = Infinity;

  DWD_REGION_CENTROIDS.forEach(centroid => {
    const dist = Math.pow(lat - centroid.lat, 2) + Math.pow(lon - centroid.lon, 2);
    if (dist >= bestDist) return;

    const match = data.content.find(r =>
      r.region_id === centroid.region_id &&
      (centroid.partregion_id === -1 || r.partregion_id === centroid.partregion_id)
    );
    if (match) {
      bestDist = dist;
      bestRegion = match;
    }
  });

  return bestRegion || data.content[0];
}

// Fetch DWD pollen data
async function fetchDWDPollen(lat, lon) {
  // Use configured proxy server (Railway or local)
  const baseUrl = CONFIG.DWD_PROXY_URL || '';
  const url = `${baseUrl}/api/dwd-pollen`;
  
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
  const level = getPollenLevelFromValue(maxVal);
  
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
    level: getPollenLevelFromValue(todayMax),
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
    level: getPollenLevelFromValue(tomorrowMax),
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
      level: getPollenLevelFromValue(datMax),
      types: datSorted.filter(([, v]) => v > 0).slice(0, 2).map(([k]) => DWD_POLLEN_NAMES[k]),
      maxVal: datMax,
      allPollen: datData
    });
  }
  
  return forecast;
}
