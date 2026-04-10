# Quick-Glance Overhaul Design

**Date:** 2026-04-10  
**Scope:** Visual polish, pollen UX, mobile experience, reliability  
**Out of scope:** Additional weather fields (UV, feels-like, humidity), drill-down modal redesign, new API sources

---

## Goal

Improve the daily-use quick-glance experience: the two main cards (weather + pollen) that load on page open. The forecast and pollen detail modals are not in scope.

---

## Phase 1 — Card Redesigns

### Weather Card (`js/weather.js`, `css/style.css`)

**Current:** Large emoji icon on left, temperature + wind speed on right. No description text. Wind direction is computed (`degreeToCompass`) but never rendered.

**Changes:**
- Add weather description text below the temperature (e.g. "Teils bewölkt"), sourced from `WEATHER_CODES[code]`
- Keep wind speed; drop wind direction (not shown)
- Add a subtle "Tippen für Vorhersage →" hint at card bottom (small, muted)
- Layout: icon + temp stays left-aligned; description and wind stack below the temperature

No API changes required — `current_weather` already returns `weathercode`.

`degreeToCompass()` in `weather.js` becomes dead code once wind direction is no longer rendered — remove it.

---

### Pollen Card (`js/allergies.js`, `css/style.css`)

**Current:** Left column has a medication emoji + badge (small inline-styled box). Right column has level text + dominant types as a comma list + a 9px source indicator. Heavy use of inline styles throughout.

**Changes:**

**Layout:** Vertical stack replacing the left/right split:
1. Per-type mini-bars (top section)
2. Overflow hint (if needed)
3. Medication badge (bottom)

**Pollen bars:**
- Show top 3 active types (value > 0), sorted descending by value
- If more than 3 types are active, show a muted "+ N weitere (Type, Type)" line below the bars
- If 0 types active, show "Keine aktiven Pollen" in muted text instead of bars
- Each row: `[type name 46px] [bar flex:1] [X/5 label 22px]`
- Bar fill = `(categoryLevel / 5) * 100%` where `categoryLevel` is the 1–5 integer from `getPollenLevelFromValue()`, not the raw numeric value (0–250). 5/5 fills the bar completely.
- Bar color by level:
  - 1/5: solid `#4ade80` (green)
  - 2/5: gradient `#4ade80 → #a3e635` (green-lime)
  - 3/5: gradient `#facc15 → #f97316` (yellow-orange)
  - 4/5: gradient `#f97316 → #ef4444` (orange-red)
  - 5/5: gradient `#f97316 → #ef4444` (orange-red, full width)
- Level label color matches bar end color
- Bar height: 7px, border-radius: 99px

**Medication badge:** Retains current `MEDICATION_RECOMMENDATIONS` data (icon + text + bgColor). Displayed as an inline pill at the bottom of the card.

**Source indicator:** Removed from card. Source info (DWD / Open-Meteo) is already visible in the detail modal.

**Hint text:** "Tippen für Pollenvorhersage →" at card bottom, same style as weather card hint.

**CSS cleanup:** All inline styles in `renderAllergy()` (and the allergy forecast render functions) extracted to named classes in `style.css`. No new classes needed for the weather card — it already uses CSS classes.

---

## Phase 2 — Reliability

### DWD Region Matching (`js/dwd-pollen.js`)

**Current:** `findDWDRegion()` uses 5 hardcoded lat/lon bounding boxes (Berlin, NRW, Bavaria, Baden-Württemberg, Hamburg). Falls back to `data.content[0]` for any unmatched location, silently returning wrong region data.

**Change:** Replace bounding-box matching with distance-based nearest-region lookup:
- Each DWD region entry in `data.content` includes a `region_id` and `partregion_id`. The DWD dataset does not include centroid coordinates, so maintain a small static lookup table of approximate centroids for all 18 DWD regions/subregions (lat/lon per region_id).
- `findDWDRegion(lat, lon, data)` iterates all entries in `data.content`, computes Euclidean distance from the user's coordinates to each region centroid, and returns the closest match.
- Euclidean distance in lat/lon degrees is sufficient (no need for haversine at this scale).

DWD region centroid table (to be added as a constant in `dwd-pollen.js`):

| region_id | partregion_id | Name | Approx. lat | Approx. lon |
|---|---|---|---|---|
| 10 | -1 | Schleswig-Holstein und Hamburg | 54.0 | 10.0 |
| 20 | -1 | Mecklenburg-Vorpommern | 53.8 | 12.5 |
| 30 | -1 | Niedersachsen und Bremen | 52.6 | 9.5 |
| 40 | 41 | Nordrhein-Westfalen Nord | 51.8 | 7.5 |
| 40 | 42 | Nordrhein-Westfalen Süd | 51.0 | 7.2 |
| 50 | -1 | Brandenburg und Berlin | 52.5 | 13.4 |
| 60 | -1 | Sachsen-Anhalt | 51.9 | 11.5 |
| 70 | -1 | Thüringen | 51.0 | 11.0 |
| 80 | -1 | Sachsen | 51.1 | 13.3 |
| 90 | -1 | Bayern Nord | 49.8 | 11.0 |
| 90 | 91 | Bayern Nordost | 49.5 | 12.5 |
| 100 | -1 | Bayern Süd | 48.1 | 11.5 |
| 100 | 101 | Bayern Alpen | 47.6 | 11.0 |
| 110 | 111 | Baden-Württemberg Nord | 49.2 | 8.8 |
| 110 | 112 | Baden-Württemberg Süd | 48.1 | 8.5 |
| 120 | -1 | Bayern gesamt (fallback) | 48.8 | 11.5 |
| 130 | -1 | Saarland und Rheinland-Pfalz | 49.8 | 7.5 |
| 140 | -1 | Hessen | 50.6 | 9.0 |

Centroids are approximate — accuracy within ~50km is sufficient for pollen regions.

---

### Loading States (`index.html`, `css/style.css`)

**Current:** `renderWeather` and `renderAllergy` immediately replace card content with `<p class="muted">Lade …</p>` plain text.

**Change:** Replace the loading text with a pulsing skeleton that matches the card's expected layout:
- Weather card skeleton: one large circle (icon placeholder) + two text-bar placeholders
- Pollen card skeleton: three bar-row placeholders + one badge placeholder
- CSS animation: `@keyframes skeleton-pulse` — opacity cycling between 0.4 and 0.8 at 1.2s ease-in-out
- Skeleton elements use the existing `--card` background color tinted slightly

Loading state is set in `loadForLocation()` before the parallel fetches, same as today — just replace the HTML string.

---

## Implementation Order

1. CSS cleanup (extract inline styles) — foundation for everything else; low risk
2. Weather card description text — one-line change to `renderWeather()`
3. Pollen card mini-bars — replace `renderAllergy()` body and add CSS classes
4. Loading skeletons — add CSS + update loading HTML strings
5. DWD region matching — replace `findDWDRegion()` with distance-based lookup

Each step is independently shippable.

---

## Mobile

The pollen card's current left/right split with fixed-width inline styles causes cramping on narrow screens. The new vertical-stack layout (bars + badge) adapts naturally to any card width with no additional media queries. The existing `@media (max-width:480px)` breakpoint already stacks cards to a single column — the redesigned cards will render correctly within that constraint.
