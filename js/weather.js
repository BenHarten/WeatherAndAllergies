// ============ WEATHER (OPEN-METEO) ============
function degreeToCompass(degrees) {
  const directions = ['N', 'NNO', 'NO', 'ONO', 'O', 'OSO', 'SO', 'SSO', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}

function renderWeather(data, label) {
  const cur = data.current_weather;
  const code = cur.weathercode;
  const icon = WEATHER_ICONS[code] || '❓';
  const windDirection = degreeToCompass(cur.winddirection);
  
  const leftHTML = `
    <div class="weather-icon">${icon}</div>
  `;
  
  const rightHTML = `
    <div class="weather-temp">${Math.round(cur.temperature)}°C</div>
    <div class="weather-wind">Wind ${Math.round(cur.windspeed)} km/h</div>
  `;
  
  renderCard('weatherContent', leftHTML, rightHTML, 'weather');
}
