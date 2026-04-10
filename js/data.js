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
  keine: 'Keine (0/5)',
  sehr_niedrig: 'Sehr niedrig (1/5)',
  niedrig: 'Niedrig (2/5)',
  mäßig: 'Mäßig (3/5)',
  hoch: 'Hoch (4/5)',
  sehr_hoch: 'Sehr hoch (5/5)',
  null: 'Keine Daten'
};

// Pollen level thresholds for value-to-category conversion
const POLLEN_THRESHOLDS = {
  sehr_niedrig: 10,
  niedrig: 30,
  mäßig: 80,
  hoch: 150
  // sehr_hoch: 150+
};

// Empty pollen values template (used for data processing)
const EMPTY_POLLEN_VALUES = {
  alder: 0,
  birch: 0,
  grass: 0,
  mugwort: 0,
  ragweed: 0,
  olive: 0
};

const MEDICATION_RECOMMENDATIONS = {
  keine: { text: 'Keine Medikamente nötig', icon: '✅', bgColor: '#c8e6c9' },
  sehr_niedrig: { text: 'Medikamente eventuell nötig', icon: '🤷', bgColor: '#f9ffc4' },
  niedrig: { text: 'Medikamente empfohlen', icon: '💊', bgColor: '#fff9c4' },
  mäßig: { text: 'Medikamente sehr empfohlen', icon: '💊💊', bgColor: '#ffe0b2' },
  hoch: { text: 'Medikamente dringend empfohlen', icon: '💊💊💊', bgColor: '#ffcdd2' },
  sehr_hoch: { text: 'Ohne Medikamente geht nicht!', icon: '🏥', bgColor: '#ef9a9a' }
};

// ============ UTILITY FUNCTIONS FOR POLLEN LEVELS ============
/**
 * Convert numeric pollen value to level category
 * Used by both DWD and Open-Meteo data sources
 */
function getPollenLevelFromValue(value) {
  if (value === 0) return 'keine';
  if (value <= POLLEN_THRESHOLDS.sehr_niedrig) return 'sehr_niedrig';
  if (value <= POLLEN_THRESHOLDS.niedrig) return 'niedrig';
  if (value <= POLLEN_THRESHOLDS.mäßig) return 'mäßig';
  if (value <= POLLEN_THRESHOLDS.hoch) return 'hoch';
  return 'sehr_hoch';
}

/**
 * Get pollen level text with optional checkmark for low levels
 * Used in forecast views
 */
function getPollenLevelText(value) {
  const level = getPollenLevelFromValue(value);
  if(value <= POLLEN_THRESHOLDS.niedrig) return POLLEN_LEVELS[level] + ' ✓';
  return POLLEN_LEVELS[level];
}

/**
 * Get medication recommendation for a pollen level
 */
function getMedicationRecommendation(level) {
  return MEDICATION_RECOMMENDATIONS[level] || MEDICATION_RECOMMENDATIONS['keine'];
}

// Maps pollen level key → integer 0-5 for bar width calculation
const POLLEN_LEVEL_NUMBERS = {
  keine: 0, sehr_niedrig: 1, niedrig: 2, mäßig: 3, hoch: 4, sehr_hoch: 5
};

// Bar gradient and label color per level number (1-5).
// Level 0 ('keine') is intentionally absent: renderAllergy() filters out values <= 0
// before reaching this lookup, so level 0 bars are never rendered.
const POLLEN_BAR_STYLES = {
  1: { gradient: '#4ade80',                                   color: '#4ade80' },
  2: { gradient: 'linear-gradient(90deg,#4ade80,#a3e635)',    color: '#a3e635' },
  3: { gradient: 'linear-gradient(90deg,#facc15,#f97316)',    color: '#facc15' },
  4: { gradient: 'linear-gradient(90deg,#f97316,#ef4444)',    color: '#ef4444' },
  5: { gradient: 'linear-gradient(90deg,#f97316,#ef4444)',    color: '#ef4444' }
};
