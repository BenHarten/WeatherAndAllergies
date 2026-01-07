// ============ MOCK DATA ============
// Enable/disable mock mode via: localStorage.setItem('useMockAPI', 'true')
// Or use URL param: ?mock=true

const MOCK_MODE = new URLSearchParams(window.location.search).get('mock') === 'true' || 
                  localStorage.getItem('useMockAPI') === 'true';

// Mock scenarios - easily customizable for testing
const MOCK_SCENARIOS = {
  // Scenario 1: High pollen, clear weather (spring)
  spring_high_pollen: {
    weather: {
      current_weather: {
        weathercode: 0,
        temperature: 18,
        windspeed: 12,
        winddirection: 45
      }
    },
    pollen: {
      hourly: {
        alder_pollen: Array(24).fill(0, 0, 12).concat(Array(12).fill(45)),
        birch_pollen: Array(24).fill(0, 0, 12).concat(Array(12).fill(120)),
        grass_pollen: Array(24).fill(0, 0, 12).concat(Array(12).fill(85)),
        mugwort_pollen: Array(24).fill(0),
        ragweed_pollen: Array(24).fill(0),
        olive_pollen: Array(24).fill(0),
        european_aqi: Array(24).fill(null, 0, 18).concat([45, 48, 50, 52, 50, 48])
      }
    },
    geocode: { lat: 52.52, lon: 13.405, display_name: 'Berlin, Deutschland' }
  },

  // Scenario 2: Low pollen, rainy weather (winter)
  winter_low_pollen: {
    weather: {
      current_weather: {
        weathercode: 61,
        temperature: 5,
        windspeed: 25,
        winddirection: 270
      }
    },
    pollen: {
      hourly: {
        alder_pollen: Array(24).fill(0),
        birch_pollen: Array(24).fill(0),
        grass_pollen: Array(24).fill(2),
        mugwort_pollen: Array(24).fill(0),
        ragweed_pollen: Array(24).fill(0),
        olive_pollen: Array(24).fill(0),
        european_aqi: Array(24).fill(null, 0, 18).concat([22, 24, 25, 24, 23, 22])
      }
    },
    geocode: { lat: 52.52, lon: 13.405, display_name: 'Berlin, Deutschland' }
  },

  // Scenario 3: Moderate pollen, stormy
  stormy_moderate_pollen: {
    weather: {
      current_weather: {
        weathercode: 95,
        temperature: 12,
        windspeed: 45,
        winddirection: 180
      }
    },
    pollen: {
      hourly: {
        alder_pollen: Array(24).fill(30),
        birch_pollen: Array(24).fill(55),
        grass_pollen: Array(24).fill(40),
        mugwort_pollen: Array(24).fill(15),
        ragweed_pollen: Array(24).fill(8),
        olive_pollen: Array(24).fill(0),
        european_aqi: Array(24).fill(null, 0, 18).concat([65, 68, 70, 68, 65, 62])
      }
    },
    geocode: { lat: 52.52, lon: 13.405, display_name: 'Berlin, Deutschland' }
  },

  // Scenario 4: Very high pollen (worst case)
  extreme_pollen: {
    weather: {
      current_weather: {
        weathercode: 2,
        temperature: 22,
        windspeed: 8,
        winddirection: 90
      }
    },
    pollen: {
      hourly: {
        alder_pollen: Array(24).fill(180),
        birch_pollen: Array(24).fill(250),
        grass_pollen: Array(24).fill(200),
        mugwort_pollen: Array(24).fill(120),
        ragweed_pollen: Array(24).fill(95),
        olive_pollen: Array(24).fill(60),
        european_aqi: Array(24).fill(null, 0, 18).concat([120, 125, 130, 128, 125, 122])
      }
    },
    geocode: { lat: 52.52, lon: 13.405, display_name: 'Berlin, Deutschland' }
  }
};

let CURRENT_MOCK_SCENARIO = 'spring_high_pollen';

// Mock forecast data (7 days)
const MOCK_FORECAST = {
  daily: {
    time: [
      new Date().toISOString().split('T')[0],
      new Date(Date.now() + 86400000).toISOString().split('T')[0],
      new Date(Date.now() + 172800000).toISOString().split('T')[0],
      new Date(Date.now() + 259200000).toISOString().split('T')[0],
      new Date(Date.now() + 345600000).toISOString().split('T')[0],
      new Date(Date.now() + 432000000).toISOString().split('T')[0],
      new Date(Date.now() + 518400000).toISOString().split('T')[0]
    ],
    weather_code: [0, 1, 2, 61, 63, 2, 0],
    temperature_2m_max: [20, 19, 18, 12, 10, 15, 22],
    temperature_2m_min: [14, 13, 11, 8, 6, 9, 15]
  }
};

// Switch to a different mock scenario
function setMockScenario(scenarioName) {
  if(MOCK_SCENARIOS[scenarioName]) {
    CURRENT_MOCK_SCENARIO = scenarioName;
    console.log('Mock scenario changed to:', scenarioName);
  } else {
    console.warn('Unknown mock scenario:', scenarioName);
  }
}

// Get current mock data
function getCurrentMockScenario() {
  return MOCK_SCENARIOS[CURRENT_MOCK_SCENARIO];
}

// Mock API functions
async function mockGeocodeMultiple(q) {
  // Simulate various locations based on query
  const mockResults = {
    'Berlin': { lat: 52.52, lon: 13.405, display_name: 'Berlin, Deutschland' },
    'Munich': { lat: 48.1351, lon: 11.5820, display_name: 'München, Deutschland' },
    'Hamburg': { lat: 53.5511, lon: 9.9937, display_name: 'Hamburg, Deutschland' },
    'Paris': { lat: 48.8566, lon: 2.3522, display_name: 'Paris, Frankreich' },
    'Amsterdam': { lat: 52.3676, lon: 4.9041, display_name: 'Amsterdam, Niederlande' }
  };

  // Check if query matches any location
  for(let [key, value] of Object.entries(mockResults)) {
    if(q.toLowerCase().includes(key.toLowerCase())) {
      return [value];
    }
  }

  // Default mock results
  return [
    { lat: 52.52, lon: 13.405, display_name: 'Berlin, Deutschland' },
    { lat: 48.1351, lon: 11.5820, display_name: 'München, Deutschland' }
  ];
}

function mockReverseGeocode(lat, lon) {
  // Simple mapping based on coordinates
  const locations = {
    '52.52': 'Berlin',
    '48.13': 'München',
    '53.55': 'Hamburg',
    '48.85': 'Paris',
    '52.36': 'Amsterdam'
  };

  const key = Math.round(lat * 100) / 100;
  return locations[key] || 'Auenland, Mittelerde';
}
