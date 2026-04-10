// ============ WEATHER (OPEN-METEO) ============
function renderWeather(data, label) {
  const cur = data.current_weather;
  const code = cur.weathercode;
  const icon = WEATHER_ICONS[code] || '❓';
  const description = WEATHER_CODES[code] || '';

  const leftHTML = `
    <div class="weather-icon">${icon}</div>
  `;

  const rightHTML = `
    <div class="weather-temp">${Math.round(cur.temperature)}°C</div>
    <div class="weather-condition">${description}</div>
    <div class="weather-wind">💨 ${Math.round(cur.windspeed)} km/h</div>
  `;

  renderCard('weatherContent', leftHTML, rightHTML, 'weather');
  el('weatherContent').insertAdjacentHTML('beforeend', '<div class="card-hint">Tippen für Vorhersage →</div>');
}
