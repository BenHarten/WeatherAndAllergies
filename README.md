# Wetter & Allergien — GitHub Pages Website (Deutsch)

Eine moderne, statische Website zur Anzeige von aktuellen Wetterdaten und Polleninformationen. Gehostet auf **GitHub Pages** — völlig kostenlos und ohne Backend-Server.

## Features

- **Moderne UI**: Glassmorphismus-Design mit Dark Mode (responsive)
- **Wetter**: Aktuelle Daten via **Open-Meteo** (kostenlos, CORS-freundlich, kein API-Schlüssel nötig)
- **Pollen / Allergien**: Prognosen via **Open-Meteo** (kostenlos, CORS-freundlich, kein API-Schlüssel nötig)
- **Ortsuche**: Geocoding via OpenStreetMap / Nominatim
- **Standort**: Geolocation im Browser unterstützt
- **Alles in Deutsch**: Texte und Wetterbeschreibungen

## Setup

### 1. Repository klonen & pushen

```bash
git clone <dein-repo-url>
cd WeatherAndAllergies
git add .
git commit -m "Initial commit"
git push origin main
```

### 3. GitHub Pages aktivieren

1. Pushe deinen Code zu GitHub:
   ```bash
   git add .
   git commit -m "Add weather and allergy site"
   git push origin main
   ```

2. In deinem GitHub Repository gehe zu **Settings** → **Pages**

3. Stelle folgendes ein:
   - **Source**: `Deploy from a branch`
   - **Branch**: `main` 
   - **Folder**: `/ (root)`
   - Klicke **Save**

4. Nach ~1–2 Minuten sollte die Seite live sein unter:
   ```
   https://<username>.github.io/<repo-name>/
   ```
   (Beispiel: `https://max.github.io/WeatherAndAllergies/`)

## Lokales Testen

```bash
python3 -m http.server 8000
# Dann öffne http://localhost:8000 im Browser
```

## APIs im Detail

### Open-Meteo (Wetter)

- **URL**: https://api.open-meteo.com/v1/forecast
- **Pros**:
  - ✓ Kostenlos, unbegrenzt
  - ✓ Kein API-Schlüssel nötig
  - ✓ CORS aktiviert
  - ✓ Deutsche Städte vollständig unterstützt
- **Dokumentation**: https://open-meteo.com/en/docs

### Open-Meteo (Pollen / Allergien)

- **URL**: https://air-quality-api.open-meteo.com/v1/air-quality
- **Pros**:
  - ✓ Kostenlos, unbegrenzt
  - ✓ Kein API-Schlüssel nötig
  - ✓ CORS aktiviert
  - ✓ Pollen-Prognosen für 6 Allergen-Typen (Erle, Birke, Gräser, Beifuß, Olive, Ambrosia)
- **Dokumentation**: https://open-meteo.com/en/docs/air-quality-api

### Nominatim / OpenStreetMap (Geocoding)

- **Pros**: Kostenlos, CORS-freundlich, keine Auth nötig
- **Dokumentation**: https://nominatim.org/

## Struktur

```
.
├── index.html          # Haupt-HTML
├── css/
│   └── style.css       # Glassmorphismus-Design
├── js/
│   └── app.js          # Logik (API-Abfragen, DOM)
├── README.md           # Diese Datei
├── .gitignore          # Git-Ignore
└── LICENSE             # MIT (optional)
```

## Anpassungen & Erweiterungen

### Weitere Pollen-Typen hinzufügen
In `js/app.js` die `getPollenFallback()`-Funktion erweitern:

```javascript
types=['Ambrosia', 'Birke', 'Gräser', 'Roggen', ...];
```

### Sprache wechseln
Alle deutschen Texte sind in HTML und JS. Einfach durchsuchen und ersetzen.

### Farben anpassen
Alle CSS-Variablen sind oben in `css/style.css` definiert (z. B. `--accent`, `--bg1`).

## Troubleshooting

**Q: Ortsuche funktioniert nicht**
- A: Nominatim kann bei häufigen Abfragen limitiert sein. Versuche mit vollständiger Adresse/PLZ.

**Q: CORS-Fehler?**
- A: Open-Meteo hat CORS aktiviert. Falls ein Custom-Endpoint verwendet wird, ggfs. einen CORS-Proxy nutzen (nicht für Produktion empfohlen).

## Lizenz

Dieses Template ist Open Source (MIT). Verwende es frei für deine Projekte!

---

**Fragen?** Gerne in GitHub Issues fragen oder hier README erweitern.
