// ============ DATA & CONSTANTS ============
const WEATHER_CODES = {
  0: 'Klar', 1: 'Teils bewölkt', 2: 'Bewölkt', 3: 'Bedeckt', 45: 'Nebel',
  48: 'Nebel mit Raureif', 51: 'Leicht Niesel', 53: 'Mäßiger Niesel', 55: 'Intensiver Niesel',
  61: 'Schwacher Regen', 63: 'Mäßiger Regen', 65: 'Starker Regen',
  71: 'Schwacher Schneefall', 73: 'Mäßiger Schneefall', 75: 'Starker Schneefall', 77: 'Schneekörner',
  80: 'Schwache Schauer', 81: 'Mäßige Schauer', 82: 'Intensive Schauer',
  85: 'Schwache Schnee-Schauer', 86: 'Intensive Schnee-Schauer',
  95: 'Gewitter', 96: 'Gewitter mit Hagel', 99: 'Gewitter mit Hagel (stark)'
};

const WEATHER_ICONS = {
  0: '☀️', 1: '⛅', 2: '☁️', 3: '☁️', 45: '🌫️',
  48: '🌫️', 51: '🌧️', 53: '🌧️', 55: '🌧️',
  61: '🌧️', 63: '🌧️', 65: '⛈️',
  71: '❄️', 73: '❄️', 75: '❄️', 77: '❄️',
  80: '🌦️', 81: '🌦️', 82: '⛈️',
  85: '🌨️', 86: '🌨️',
  95: '⛈️', 96: '⛈️', 99: '⛈️'
};

const POLLEN_NAMES = {
  alder: 'Erle', birch: 'Birke', grass: 'Gräser', 
  mugwort: 'Beifuß', olive: 'Olive', ragweed: 'Ambrosia'
};

const POLLEN_LEVELS = {
  keine: 'Keine ✓',
  sehr_niedrig: 'Sehr niedrig ✓',
  niedrig: 'Niedrig ✓',
  mäßig: 'Mäßig ⚠',
  hoch: 'Hoch ⚠⚠',
  sehr_hoch: 'Sehr hoch ⚠⚠⚠',
  null: 'Keine Daten'
};

const AQI_LEVELS = {
  getLevel: (aqi) => aqi <= 15 ? 'Gut' : aqi <= 30 ? 'Zufriedenstellend' : aqi <= 55 ? 'Mäßig' : aqi <= 100 ? 'Schlecht' : 'Sehr schlecht'
};
