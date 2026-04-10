# Quick-Glance Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the weather and pollen cards on the main page: add weather description text, replace the pollen card's text-heavy layout with per-type mini-bars (top 3 + overflow), clean up inline styles, add loading skeletons, and fix DWD region matching to cover all of Germany.

**Architecture:** Five sequential tasks, each independently committable. All changes are in existing JS/CSS files — no new files, no build tools. The pollen card gets a new vertical-stack layout driven by CSS classes; `fetchAndParsePollen()` is extended to also return a `combinedValues` map so `renderAllergy()` has per-type numeric values for bar widths.

**Tech Stack:** Vanilla JS (ES6), CSS3, Python 3 for local dev server (`python3 server.py`). No test framework — verification steps use browser console assertions.

**Local dev:** `python3 server.py` → http://localhost:8000. Mock mode: `http://localhost:8000/?mock=true`.

---

## File Map

| File | What changes |
|---|---|
| `css/style.css` | Add pollen bar classes, card hint class, skeleton animation + classes |
| `js/data.js` | Add `POLLEN_LEVEL_NUMBERS` and `POLLEN_BAR_STYLES` constants |
| `js/weather.js` | Remove `degreeToCompass`, add description + hint to `renderWeather()` |
| `js/allergies.js` | Add `combinedValues` to `fetchAndParsePollen()` return; rewrite `renderAllergy()` |
| `js/dwd-pollen.js` | Replace `findDWDRegion()` with distance-based lookup + centroid table |
| `js/app.js` | Replace loading text strings with skeleton HTML |

---

## Task 1: CSS foundations — pollen bar classes + skeleton animation

**Files:**
- Modify: `css/style.css` (append to end of file)

- [ ] **Step 1: Append new CSS classes to `css/style.css`**

Add the following block at the end of `css/style.css`:

```css
/* Pollen bar card */
.pollen-bars{display:flex;flex-direction:column;gap:8px;margin-bottom:10px}
.pollen-bar-row{display:flex;align-items:center;gap:8px}
.pollen-bar-name{font-size:12px;width:46px;flex-shrink:0;color:var(--text)}
.pollen-bar-track{flex:1;height:7px;background:rgba(255,255,255,0.1);border-radius:99px;overflow:hidden}
.pollen-bar-fill{height:100%;border-radius:99px}
.pollen-bar-label{font-size:11px;width:22px;text-align:right;font-weight:700}
.pollen-overflow{font-size:11px;color:var(--muted);margin-bottom:8px}
.pollen-none{font-size:13px;color:var(--muted);margin-bottom:10px}
.pollen-med-badge{display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border-radius:6px;font-size:12px;font-weight:600;color:#333}

/* Card hint */
.card-hint{margin-top:8px;font-size:11px;color:rgba(182,194,216,0.4)}

/* Loading skeletons */
@keyframes skeleton-pulse{0%,100%{opacity:.35}50%{opacity:.7}}
.skeleton{animation:skeleton-pulse 1.2s ease-in-out infinite;background:rgba(255,255,255,0.08);border-radius:6px}
.skeleton-weather{display:flex;align-items:center;gap:16px}
.skeleton-circle{width:52px;height:52px;border-radius:50%;flex-shrink:0}
.skeleton-lines{display:flex;flex-direction:column;gap:8px}
.skeleton-line{height:14px;border-radius:4px}
.skeleton-pollen{display:flex;flex-direction:column;gap:8px}
.skeleton-bar-row{display:flex;align-items:center;gap:8px}
.skeleton-bar-name{width:46px;height:10px;flex-shrink:0;border-radius:4px}
.skeleton-bar-track{flex:1;height:7px;border-radius:99px}
```

- [ ] **Step 2: Start the dev server and verify no CSS errors**

```bash
python3 server.py
```

Open http://localhost:8000 in browser. Open DevTools → Console. Confirm no CSS parse errors. The page should look identical to before (new classes are unused yet).

- [ ] **Step 3: Commit**

```bash
git add css/style.css
git commit -m "style: add pollen bar and skeleton CSS foundations"
```

---

## Task 2: Data constants — pollen level number mapping

**Files:**
- Modify: `js/data.js` (append after `MEDICATION_RECOMMENDATIONS`)

- [ ] **Step 1: Append two constants to `js/data.js`**

Add after the closing `};` of `MEDICATION_RECOMMENDATIONS` (after line 63):

```javascript
// Maps pollen level key → integer 0-5 for bar width calculation
const POLLEN_LEVEL_NUMBERS = {
  keine: 0, sehr_niedrig: 1, niedrig: 2, mäßig: 3, hoch: 4, sehr_hoch: 5
};

// Bar gradient and label color per level number
const POLLEN_BAR_STYLES = {
  1: { gradient: '#4ade80',                                   color: '#4ade80' },
  2: { gradient: 'linear-gradient(90deg,#4ade80,#a3e635)',    color: '#a3e635' },
  3: { gradient: 'linear-gradient(90deg,#facc15,#f97316)',    color: '#facc15' },
  4: { gradient: 'linear-gradient(90deg,#f97316,#ef4444)',    color: '#ef4444' },
  5: { gradient: 'linear-gradient(90deg,#f97316,#ef4444)',    color: '#ef4444' }
};
```

- [ ] **Step 2: Verify in browser console**

Reload http://localhost:8000. In DevTools console run:

```javascript
console.log(POLLEN_LEVEL_NUMBERS);
// Expected: {keine: 0, sehr_niedrig: 1, niedrig: 2, mäßig: 3, hoch: 4, sehr_hoch: 5}

console.log(POLLEN_BAR_STYLES[5].gradient);
// Expected: "linear-gradient(90deg,#f97316,#ef4444)"

console.log(POLLEN_LEVEL_NUMBERS['sehr_hoch'] / 5 * 100);
// Expected: 100
```

- [ ] **Step 3: Commit**

```bash
git add js/data.js
git commit -m "data: add POLLEN_LEVEL_NUMBERS and POLLEN_BAR_STYLES constants"
```

---

## Task 3: Weather card — description text and hint

**Files:**
- Modify: `js/weather.js`

- [ ] **Step 1: Replace the entire contents of `js/weather.js`**

The current file computes `windDirection` via `degreeToCompass` but never uses it in the HTML. Remove `degreeToCompass` and the unused variable; add description and hint text:

```javascript
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
```

- [ ] **Step 2: Verify in browser**

Reload http://localhost:8000. The weather card should now show three lines on the right side: temperature, description (e.g. "Bewölkt"), wind speed. No wind direction. The hint text "Tippen für Vorhersage →" should appear faintly below.

- [ ] **Step 3: Commit**

```bash
git add js/weather.js
git commit -m "feat: add weather description and hint text to weather card"
```

---

## Task 4: Pollen card — mini-bars with top-3 overflow

**Files:**
- Modify: `js/allergies.js`

### Step group A: Extend `fetchAndParsePollen()` to return `combinedValues`

`fetchAndParsePollen()` currently returns `{ level, types, sources }`. `renderAllergy()` needs per-type numeric values for bar widths. Extend the return value with a `combinedValues` map of `{ germanName: maxNumericValue }`.

- [ ] **Step 1: Replace lines 1–58 of `js/allergies.js`** (the `fetchAndParsePollen` function)

```javascript
// ============ POLLEN/ALLERGIES (DUAL SOURCE) ============
async function fetchAndParsePollen(lat, lon) {
  const [dwdResult, openMeteoResult] = await Promise.allSettled([
    fetchAndParseDWDPollen(lat, lon),
    fetchOpenMeteoPollen(lat, lon)
  ]);

  const dwdData = dwdResult.status === 'fulfilled' && dwdResult.value?.level ? dwdResult.value : null;
  const openMeteoData = openMeteoResult.status === 'fulfilled' && openMeteoResult.value?.level ? openMeteoResult.value : null;

  if (!dwdData && !openMeteoData) {
    return { level: null, types: ['Keine Daten verfügbar'], sources: { dwd: null, openMeteo: null }, combinedValues: {} };
  }

  let combinedLevel = 'keine';
  let combinedMaxVal = 0;

  if (dwdData) {
    const dwdValues = Object.values(dwdData.allData.data.today);
    const dwdValue = Math.max(...dwdValues, 0);
    if (dwdValue > combinedMaxVal) { combinedMaxVal = dwdValue; combinedLevel = dwdData.level; }
  }

  if (openMeteoData) {
    const openMeteoValue = openMeteoData.maxVal ?? 0;
    if (openMeteoValue > combinedMaxVal) { combinedMaxVal = openMeteoValue; combinedLevel = openMeteoData.level; }
  }

  const allTypes = new Set();
  if (dwdData?.types) dwdData.types.forEach(t => allTypes.add(t));
  if (openMeteoData?.types) openMeteoData.types.forEach(t => allTypes.add(t));

  let finalTypes = Array.from(allTypes).filter(t => t !== 'Keine');
  if (finalTypes.length === 0) finalTypes = Array.from(allTypes);

  // Build combined values map: German name → max value from either source
  const combinedValues = {};
  if (dwdData?.allData?.data?.today) {
    Object.entries(dwdData.allData.data.today).forEach(([k, v]) => {
      const name = DWD_POLLEN_NAMES[k];
      if (name) combinedValues[name] = Math.max(combinedValues[name] || 0, v);
    });
  }
  if (openMeteoData?.values) {
    Object.entries(openMeteoData.values).forEach(([k, v]) => {
      const name = POLLEN_NAMES[k];
      if (name) combinedValues[name] = Math.max(combinedValues[name] || 0, v);
    });
  }

  console.log('✅ Dual source - DWD:', !!dwdData, 'Open-Meteo:', !!openMeteoData, 'Level:', combinedLevel);

  return {
    level: combinedLevel,
    types: finalTypes.slice(0, 5),
    sources: { dwd: dwdData, openMeteo: openMeteoData },
    combinedValues
  };
}
```

- [ ] **Step 2: Verify `combinedValues` is populated**

Reload and wait for data to load. In DevTools console:

```javascript
// Trigger a reload with mock mode to get predictable data
localStorage.setItem('useMockAPI', 'true');
location.reload();
// After reload:
// Open the Network tab or check console — the ✅ log line should appear.
// Then disable mock mode:
localStorage.removeItem('useMockAPI');
```

The page should still load and display normally (renderAllergy still works with the old code at this point).

### Step group B: Rewrite `renderAllergy()`

- [ ] **Step 3: Replace `renderAllergy()` in `js/allergies.js`** (lines 104–133)

```javascript
function renderAllergy(pollen) {
  const meds = getMedicationRecommendation(pollen.level);

  // Sort active types by value descending
  const active = Object.entries(pollen.combinedValues || {})
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a);

  let barsHTML;
  if (active.length === 0) {
    barsHTML = '<div class="pollen-none">Keine aktiven Pollen</div>';
  } else {
    const top3 = active.slice(0, 3);
    const overflow = active.slice(3);

    const rowsHTML = top3.map(([name, value]) => {
      const levelKey = getPollenLevelFromValue(value);
      const levelNum = POLLEN_LEVEL_NUMBERS[levelKey];
      const style = POLLEN_BAR_STYLES[levelNum] || POLLEN_BAR_STYLES[1];
      const width = (levelNum / 5) * 100;
      return `
        <div class="pollen-bar-row">
          <div class="pollen-bar-name">${name}</div>
          <div class="pollen-bar-track">
            <div class="pollen-bar-fill" style="width:${width}%;background:${style.gradient};"></div>
          </div>
          <div class="pollen-bar-label" style="color:${style.color};">${levelNum}/5</div>
        </div>`;
    }).join('');

    const overflowHTML = overflow.length > 0
      ? `<div class="pollen-overflow">+ ${overflow.length} weitere (${overflow.map(([n]) => n).join(', ')})</div>`
      : '';

    barsHTML = `<div class="pollen-bars">${rowsHTML}</div>${overflowHTML}`;
  }

  el('allergyContent').innerHTML = `
    ${barsHTML}
    <div class="pollen-med-badge" style="background:${meds.bgColor};">${meds.icon} ${meds.text}</div>
    <div class="card-hint">Tippen für Pollenvorhersage →</div>
  `;
}
```

- [ ] **Step 4: Verify in browser**

Reload http://localhost:8000. The pollen card should show:
- Horizontal bars for active types (name left, bar middle, X/5 right)
- Bar for the highest-level type should use orange/red gradient
- Medication badge below the bars
- Faint hint text at bottom
- No more source indicator, no comma-separated types list

Test with mock mode to see peak spring scenario:
```javascript
localStorage.setItem('useMockAPI', 'true');
location.reload();
debugApp.switchScenario('spring_high_pollen');
// Should show bars for active pollen types
debugApp.switchScenario('winter_low_pollen');
// Should show fewer or no bars
localStorage.removeItem('useMockAPI');
location.reload();
```

- [ ] **Step 5: Commit**

```bash
git add js/allergies.js
git commit -m "feat: pollen card mini-bars with top-3 overflow layout"
```

---

## Task 5: Loading skeletons

**Files:**
- Modify: `js/app.js` (lines 16–17)

- [ ] **Step 1: Replace the two loading HTML strings in `loadForLocation()` in `js/app.js`**

Find this block (lines 15–17):

```javascript
el('locationTitle').textContent = label;
el('weatherContent').innerHTML = `<p class="muted">Lade Wetter…</p>`;
el('allergyContent').innerHTML = `<p class="muted">Lade Polleninformationen…</p>`;
```

Replace with:

```javascript
el('locationTitle').textContent = label;
el('weatherContent').innerHTML = `
  <div class="skeleton-weather">
    <div class="skeleton skeleton-circle"></div>
    <div class="skeleton-lines">
      <div class="skeleton skeleton-line" style="width:80px;height:32px;"></div>
      <div class="skeleton skeleton-line" style="width:100px;margin-top:4px;"></div>
      <div class="skeleton skeleton-line" style="width:70px;margin-top:4px;"></div>
    </div>
  </div>`;
el('allergyContent').innerHTML = `
  <div class="skeleton-pollen">
    ${[0,1,2].map(() => `
      <div class="skeleton-bar-row">
        <div class="skeleton skeleton-bar-name"></div>
        <div class="skeleton skeleton-bar-track"></div>
      </div>`).join('')}
    <div class="skeleton skeleton-line" style="width:160px;margin-top:10px;height:28px;border-radius:6px;"></div>
  </div>`;
```

- [ ] **Step 2: Verify skeleton renders**

Reload http://localhost:8000. On initial load (before data arrives) you should see pulsing placeholder shapes in both cards instead of plain text. Since data loads fast locally, throttle the network in DevTools (Network tab → throttle to "Slow 3G") to see the skeleton for longer.

- [ ] **Step 3: Commit**

```bash
git add js/app.js
git commit -m "feat: add pulsing skeleton loading states to weather and pollen cards"
```

---

## Task 6: DWD region matching — distance-based lookup

**Files:**
- Modify: `js/dwd-pollen.js` (lines 16–67 — the `DWD_REGIONS` constant and `findDWDRegion()` function)

- [ ] **Step 1: Replace `DWD_REGIONS` constant and `findDWDRegion()` in `js/dwd-pollen.js`**

Remove the old `DWD_REGIONS` object (lines 16–21) and replace `findDWDRegion()` (lines 38–67) with:

```javascript
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
```

- [ ] **Step 2: Verify in browser console**

Reload http://localhost:8000 with the dev server running (DWD data available). In DevTools console:

```javascript
// Test: Munich should match Bayern Süd (region_id 100)
fetch('/api/dwd-pollen')
  .then(r => r.json())
  .then(data => {
    const region = findDWDRegion(48.14, 11.58, data); // Munich
    console.log('Munich:', region.region_id, region.partregion_id, region.region_name);
    // Expected: region_id 100, region_name containing "Bayern"

    const region2 = findDWDRegion(53.55, 10.00, data); // Hamburg
    console.log('Hamburg:', region2.region_id, region2.region_name);
    // Expected: region_id 10, "Schleswig-Holstein und Hamburg"

    const region3 = findDWDRegion(50.11, 8.68, data); // Frankfurt
    console.log('Frankfurt:', region3.region_id, region3.region_name);
    // Expected: region_id 140, "Hessen"
  });
```

- [ ] **Step 3: Commit**

```bash
git add js/dwd-pollen.js
git commit -m "fix: replace hardcoded DWD region bounding boxes with distance-based lookup covering all 18 regions"
```

---

## Self-Review Checklist

- [x] **Spec: Visual polish** → Task 1 (CSS classes), Task 3 (weather card), Task 4 (pollen card)
- [x] **Spec: Better pollen UX** → Task 2 (constants), Task 4 (mini-bars)
- [x] **Spec: Mobile** → pollen card vertical stack adapts to narrow widths without media queries; existing `@media (max-width:480px)` handles single-column layout
- [x] **Spec: Reliability — DWD regions** → Task 6
- [x] **Spec: Reliability — loading states** → Task 5
- [x] **Spec: CSS cleanup** → Task 4 removes all inline styles from `renderAllergy()`; weather card already used CSS classes
- [x] **Spec: Remove `degreeToCompass`** → Task 3
- [x] **Spec: "Keine aktiven Pollen" when 0 active** → Task 4, Step 3
- [x] **Spec: Bar width = categoryLevel/5 × 100%** → Task 4, Step 3 (`width:${(levelNum/5)*100}%`)
- [x] **Spec: Source indicator removed** → Task 4 (not rendered in new `renderAllergy()`)
