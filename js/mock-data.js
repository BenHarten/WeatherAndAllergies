// ============ MOCK DATA ============
// Enable/disable mock mode via: localStorage.setItem('useMockAPI', 'true')
// Or use URL param: ?mock=true

const MOCK_MODE = new URLSearchParams(window.location.search).get('mock') === 'true' || 
                  localStorage.getItem('useMockAPI') === 'true';

// Helper to generate forecast dates (7 days)
function generateForecastDates() {
  const dates = [];
  for(let i = 0; i < 7; i++) {
    dates.push(new Date(Date.now() + 86400000 * i).toISOString().split('T')[0]);
  }
  return dates;
}

// Helper to generate hourly times for 7 days
function generateHourlyTimes(days = 7) {
  const times = [];
  const now = new Date();
  for(let day = 0; day < days; day++) {
    for(let hour = 0; hour < 24; hour++) {
      const date = new Date(now);
      date.setDate(date.getDate() + day);
      date.setHours(hour, 0, 0, 0);
      times.push(date.toISOString());
    }
  }
  return times;
}

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
        time: generateHourlyTimes(7),
        alder_pollen: Array(48).fill(210).concat(Array(24).fill(35)).concat(Array(96).fill(35)),
        birch_pollen: Array(48).fill(280).concat(Array(24).fill(80)).concat(Array(96).fill(80)),
        grass_pollen: Array(48).fill(220).concat(Array(24).fill(60)).concat(Array(96).fill(60)),
        mugwort_pollen: Array(48).fill(100).concat(Array(24).fill(15)).concat(Array(96).fill(15)),
        ragweed_pollen: Array(48).fill(80).concat(Array(24).fill(8)).concat(Array(96).fill(8)),
        olive_pollen: Array(168).fill(0),
        european_aqi: Array(48).fill(135).concat(Array(24).fill(42)).concat(Array(96).fill(42))
      }
    },
    dwd: {
      content: [
        {
          region_id: 50,
          region_name: 'Brandenburg und Berlin',
          partregion_name: '',
          partregion_id: -1,
          Pollen: {
            Hasel: { today: '2', tomorrow: '1-2', dayafter_to: '1' },
            Erle: { today: '2-3', tomorrow: '2', dayafter_to: '1' },
            Birke: { today: '3', tomorrow: '2-3', dayafter_to: '2' },
            Esche: { today: '0', tomorrow: '0', dayafter_to: '0' },
            Graeser: { today: '1-2', tomorrow: '1', dayafter_to: '0' },
            Roggen: { today: '0', tomorrow: '0', dayafter_to: '0' },
            Beifuss: { today: '0', tomorrow: '0', dayafter_to: '0' },
            Ambrosia: { today: '0', tomorrow: '0', dayafter_to: '0' }
          }
        }
      ],
      sender: 'Deutscher Wetterdienst - Medizin-Meteorologie',
      last_update: new Date().toISOString(),
      next_update: new Date(Date.now() + 3600000).toISOString(),
      name: 'Pollenflug-Gefahrenindex für Deutschland'
    },
    geocode: { lat: 52.52, lon: 13.405, display_name: 'Berlin, Deutschland' },
    forecast: {
      daily: {
        time: generateForecastDates(),
        weather_code: [0, 1, 0, 1, 0, 1, 0],
        temperature_2m_max: [22, 21, 24, 20, 23, 22, 24],
        temperature_2m_min: [15, 14, 17, 13, 16, 15, 17],
        precipitation_probability_max: [10, 20, 5, 15, 5, 10, 0],
        wind_speed_10m_max: [15, 18, 12, 17, 12, 14, 10]
      }
    }
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
        time: generateHourlyTimes(7),
        alder_pollen: Array(168).fill(0),
        birch_pollen: Array(168).fill(0),
        grass_pollen: Array(168).fill(2),
        mugwort_pollen: Array(168).fill(0),
        ragweed_pollen: Array(168).fill(0),
        olive_pollen: Array(168).fill(0),
        european_aqi: Array(18).fill(null).concat([22, 24, 25, 24, 23, 22]).concat(Array(144).fill(23))
      }
    },
    dwd: {
      content: [
        {
          region_id: 50,
          region_name: 'Brandenburg und Berlin',
          partregion_name: '',
          partregion_id: -1,
          Pollen: {
            Hasel: { today: '0', tomorrow: '0', dayafter_to: '0' },
            Erle: { today: '0', tomorrow: '0', dayafter_to: '0' },
            Birke: { today: '0', tomorrow: '0', dayafter_to: '0' },
            Esche: { today: '0', tomorrow: '0', dayafter_to: '0' },
            Graeser: { today: '0', tomorrow: '0', dayafter_to: '0' },
            Roggen: { today: '0', tomorrow: '0', dayafter_to: '0' },
            Beifuss: { today: '0', tomorrow: '0', dayafter_to: '0' },
            Ambrosia: { today: '0', tomorrow: '0', dayafter_to: '0' }
          }
        }
      ],
      sender: 'Deutscher Wetterdienst - Medizin-Meteorologie',
      last_update: new Date().toISOString(),
      next_update: new Date(Date.now() + 3600000).toISOString(),
      name: 'Pollenflug-Gefahrenindex für Deutschland'
    },
    geocode: { lat: 52.52, lon: 13.405, display_name: 'Berlin, Deutschland' },
    forecast: {
      daily: {
        time: generateForecastDates(),
        weather_code: [61, 63, 63, 80, 81, 61, 61],
        temperature_2m_max: [6, 5, 4, 5, 7, 8, 9],
        temperature_2m_min: [2, 1, 0, 2, 3, 4, 5],
        precipitation_probability_max: [85, 95, 90, 80, 70, 85, 80],
        wind_speed_10m_max: [35, 40, 38, 32, 28, 36, 34]
      }
    }
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
        time: generateHourlyTimes(7),
        alder_pollen: Array(168).fill(30),
        birch_pollen: Array(168).fill(55),
        grass_pollen: Array(168).fill(40),
        mugwort_pollen: Array(168).fill(15),
        ragweed_pollen: Array(168).fill(8),
        olive_pollen: Array(168).fill(0),
        european_aqi: Array(18).fill(null).concat([65, 68, 70, 68, 65, 62]).concat(Array(144).fill(65))
      }
    },
    dwd: {
      content: [
        {
          region_id: 50,
          region_name: 'Brandenburg und Berlin',
          partregion_name: '',
          partregion_id: -1,
          Pollen: {
            Hasel: { today: '1', tomorrow: '0-1', dayafter_to: '0' },
            Erle: { today: '1', tomorrow: '1', dayafter_to: '0-1' },
            Birke: { today: '1-2', tomorrow: '1', dayafter_to: '0' },
            Esche: { today: '0', tomorrow: '0', dayafter_to: '0' },
            Graeser: { today: '1', tomorrow: '1', dayafter_to: '0' },
            Roggen: { today: '0', tomorrow: '0', dayafter_to: '0' },
            Beifuss: { today: '0', tomorrow: '0', dayafter_to: '0' },
            Ambrosia: { today: '0', tomorrow: '0', dayafter_to: '0' }
          }
        }
      ],
      sender: 'Deutscher Wetterdienst - Medizin-Meteorologie',
      last_update: new Date().toISOString(),
      next_update: new Date(Date.now() + 3600000).toISOString(),
      name: 'Pollenflug-Gefahrenindex für Deutschland'
    },
    geocode: { lat: 52.52, lon: 13.405, display_name: 'Berlin, Deutschland' },
    forecast: {
      daily: {
        time: generateForecastDates(),
        weather_code: [95, 80, 80, 61, 2, 1, 0],
        temperature_2m_max: [13, 11, 10, 12, 15, 18, 20],
        temperature_2m_min: [9, 8, 7, 8, 10, 12, 14],
        precipitation_probability_max: [100, 90, 85, 60, 40, 20, 10],
        wind_speed_10m_max: [55, 48, 45, 35, 25, 20, 15]
      }
    }
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
        time: generateHourlyTimes(7),
        alder_pollen: Array(168).fill(180),
        birch_pollen: Array(168).fill(250),
        grass_pollen: Array(168).fill(200),
        mugwort_pollen: Array(168).fill(120),
        ragweed_pollen: Array(168).fill(95),
        olive_pollen: Array(168).fill(60),
        european_aqi: Array(18).fill(null).concat([120, 125, 130, 128, 125, 122]).concat(Array(144).fill(125))
      }
    },
    dwd: {
      content: [
        {
          region_id: 50,
          region_name: 'Brandenburg und Berlin',
          partregion_name: '',
          partregion_id: -1,
          Pollen: {
            Hasel: { today: '3', tomorrow: '2-3', dayafter_to: '1-2' },
            Erle: { today: '3', tomorrow: '2-3', dayafter_to: '2' },
            Birke: { today: '3', tomorrow: '3', dayafter_to: '2-3' },
            Esche: { today: '1', tomorrow: '0-1', dayafter_to: '0' },
            Graeser: { today: '2-3', tomorrow: '2', dayafter_to: '1' },
            Roggen: { today: '1', tomorrow: '0-1', dayafter_to: '0' },
            Beifuss: { today: '0', tomorrow: '0', dayafter_to: '0' },
            Ambrosia: { today: '0', tomorrow: '0', dayafter_to: '0' }
          }
        }
      ],
      sender: 'Deutscher Wetterdienst - Medizin-Meteorologie',
      last_update: new Date().toISOString(),
      next_update: new Date(Date.now() + 3600000).toISOString(),
      name: 'Pollenflug-Gefahrenindex für Deutschland'
    },
    geocode: { lat: 52.52, lon: 13.405, display_name: 'Berlin, Deutschland' },
    forecast: {
      daily: {
        time: generateForecastDates(),
        weather_code: [2, 2, 1, 0, 2, 1, 0],
        temperature_2m_max: [25, 24, 23, 24, 26, 25, 27],
        temperature_2m_min: [19, 18, 17, 18, 20, 19, 21],
        precipitation_probability_max: [30, 35, 25, 10, 40, 20, 5],
        wind_speed_10m_max: [18, 20, 16, 12, 22, 15, 10]
      }
    }
  }
};

let CURRENT_MOCK_SCENARIO = 'spring_high_pollen';

// Helper to generate hourly data for 7 days
function generateMockHourlyData() {
  const now = new Date();
  const hourlyTime = [];
  const weatherCodes = [];
  const temperatures = [];
  const precipitationProbability = [];
  const windSpeeds = [];
  
  // Constants for hourly generation
  const HOURS_PER_DAY = 24;
  const DAYS_TO_GENERATE = 7;
  const SUNRISE_HOUR = 6;
  const SUNSET_HOUR = 18;
  const RAINY_DAY_1 = 3;
  const RAINY_DAY_2 = 4;
  const DAYTIME_WIND = 5;
  const NIGHTTIME_WIND = 15;
  const MAX_WIND_VARIATION = 5;
  const MAX_PRECIP_PROB = 90;
  const TEMP_AMPLITUDE = 5;
  const NIGHT_TEMP_OFFSET = -3;
  
  // Generate 7 days × 24 hours = 168 data points
  for(let day = 0; day < DAYS_TO_GENERATE; day++) {
    for(let hour = 0; hour < HOURS_PER_DAY; hour++) {
      const date = new Date(now);
      date.setDate(date.getDate() + day);
      date.setHours(hour, 0, 0, 0);
      
      hourlyTime.push(date.toISOString());
      
      // Vary weather by hour (sunrise/sunset effects)
      const isDay = hour >= SUNRISE_HOUR && hour <= SUNSET_HOUR;
      let code;
      if(day === RAINY_DAY_1) code = 61; // Rainy day
      else if(day === RAINY_DAY_2) code = 63;
      else code = isDay ? [0, 1, 2][Math.floor(Math.random() * 3)] : [3, 45][Math.floor(Math.random() * 2)];
      
      weatherCodes.push(code);
      
      // Temperature varies throughout day
      const baseTemp = [20, 19, 18, 12, 10, 15, 22][day];
      const tempVariation = isDay ? Math.sin((hour - SUNRISE_HOUR) / 12 * Math.PI) * TEMP_AMPLITUDE : NIGHT_TEMP_OFFSET;
      temperatures.push(Math.round(baseTemp + tempVariation));
      
      // Precipitation probability on rainy days
      precipitationProbability.push((day === RAINY_DAY_1 || day === RAINY_DAY_2) && isDay ? Math.round(Math.random() * MAX_PRECIP_PROB + 10) : Math.round(Math.random() * 20));
      
      // Wind speeds (higher at night)
      windSpeeds.push(Math.round(10 + (isDay ? DAYTIME_WIND : NIGHTTIME_WIND) + Math.random() * MAX_WIND_VARIATION));
    }
  }
  
  return {
    time: hourlyTime,
    weather_code: weatherCodes,
    temperature_2m: temperatures,
    precipitation_probability: precipitationProbability,
    wind_speed_10m: windSpeeds
  };
}

// Mock forecast data (7 days with hourly breakdown)
// Generate forecast data dynamically for each scenario
function getMockForecastForScenario(scenarioName) {
  const scenario = MOCK_SCENARIOS[scenarioName];
  if(!scenario) return null;
  
  return {
    daily: scenario.forecast.daily,
    hourly: generateMockHourlyData()
  };
}

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
