// ============ MOCK API WRAPPER ============
// This module wraps API calls to use mock data when MOCK_MODE is enabled

const originalFetch = window.fetch;

// Override fetch to intercept API calls
if(MOCK_MODE) {
  window.fetch = function(url, options) {
    // Intercept Open-Meteo weather API
    if(url.includes('open-meteo.com') && url.includes('current_weather')) {
      const scenario = getCurrentMockScenario();
      return Promise.resolve(
        new Response(JSON.stringify(scenario.weather), { status: 200 })
      );
    }

    // Intercept Open-Meteo pollen/AQI API
    if(url.includes('open-meteo.com') && url.includes('air-quality')) {
      const scenario = getCurrentMockScenario();
      return Promise.resolve(
        new Response(JSON.stringify(scenario.pollen), { status: 200 })
      );
    }

    // Intercept Open-Meteo forecast API
    if(url.includes('open-meteo.com') && url.includes('forecast')) {
      const mockForecast = getMockForecastForScenario(CURRENT_MOCK_SCENARIO);
      return Promise.resolve(
        new Response(JSON.stringify(mockForecast), { status: 200 })
      );
    }

    // Intercept Geoapify search API
    if(url.includes('geoapify') && url.includes('search')) {
      const queryMatch = url.match(/text=([^&]+)/);
      const query = queryMatch ? decodeURIComponent(queryMatch[1]) : '';
      
      // Find matching location from predefined cities
      const locations = {
        'Berlin': getCurrentMockScenario().geocode,
        'Munich': { lat: 48.1351, lon: 11.5820, display_name: 'München, Deutschland' },
        'Hamburg': { lat: 53.5511, lon: 9.9937, display_name: 'Hamburg, Deutschland' }
      };
      
      let results = [];
      for(let [key, value] of Object.entries(locations)) {
        if(query.toLowerCase().includes(key.toLowerCase())) {
          results.push(value);
          break;
        }
      }
      
      if(results.length === 0) {
        results.push(getCurrentMockScenario().geocode);
      }

      const response = {
        features: results.map(r => ({
          geometry: { coordinates: [r.lon, r.lat] },
          properties: { formatted: r.display_name }
        }))
      };

      return Promise.resolve(
        new Response(JSON.stringify(response), { status: 200 })
      );
    }

    // Intercept Geoapify reverse geocoding API
    if(url.includes('geoapify') && url.includes('reverse')) {
      const latMatch = url.match(/lat=([^&]+)/);
      const lonMatch = url.match(/lon=([^&]+)/);
      const lat = latMatch ? parseFloat(latMatch[1]) : 52.52;
      const lon = lonMatch ? parseFloat(lonMatch[1]) : 13.405;

      const name = mockReverseGeocode(lat, lon);
      const response = {
        features: [
          {
            properties: {
              name: name,
              city: name,
              country: 'Deutschland'
            }
          }
        ]
      };

      return Promise.resolve(
        new Response(JSON.stringify(response), { status: 200 })
      );
    }

    // Intercept DWD Pollen API
    if(url === '/api/dwd-pollen') {
      const scenario = getCurrentMockScenario();
      return Promise.resolve(
        new Response(JSON.stringify(scenario.dwd), { status: 200 })
      );
    }

    // Fall back to original fetch for other URLs
    return originalFetch.apply(this, arguments);
  };

  console.log('🧪 Mock API mode enabled');
}
