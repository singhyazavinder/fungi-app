const API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.match(/^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/))
  ? `http://${window.location.hostname}:8000` 
  : 'https://fungi-app.onrender.com';

let secretPassword = localStorage.getItem('fungi_secret');
let userName = localStorage.getItem('fungi_username') || "Anonymous";

// Secure Vault Interceptor
const originalFetch = window.fetch;
window.fetch = function() {
  let [resource, config] = arguments;
  if (typeof resource === 'string' && resource.startsWith(API_URL)) {
    config = config || {};
    config.headers = config.headers || {};
    config.headers['X-Fungi-Auth'] = secretPassword || '';
  }
  return originalFetch(resource, config).then(response => {
    if (response.status === 401) {
      localStorage.removeItem('fungi_secret');
      secretPassword = null;
      document.getElementById('vault-lock').style.display = 'flex';
      document.getElementById('app').style.opacity = '0.3';
    }
    return response;
  });
};

document.addEventListener('DOMContentLoaded', () => {
  if (secretPassword) {
    document.getElementById('vault-lock').style.display = 'none';
    document.getElementById('app').style.opacity = '1';
  } else {
    document.getElementById('vault-lock').style.display = 'flex';
  }

  document.getElementById('btn-unlock').addEventListener('click', async () => {
    const pwd = document.getElementById('vault-password').value.trim();
    let uname = document.getElementById('vault-username').value.trim();
    if (!uname) uname = "Anonymous";
    
    const oldPassword = secretPassword;
    secretPassword = pwd;
    
    try {
      const res = await fetch(`${API_URL}/buzz`); 
      if (res.status === 401) {
        secretPassword = oldPassword;
        document.getElementById('vault-error').style.display = 'block';
      } else {
        userName = uname;
        localStorage.setItem('fungi_secret', pwd);
        localStorage.setItem('fungi_username', uname);
        document.getElementById('vault-error').style.display = 'none';
        document.getElementById('vault-lock').style.display = 'none';
        document.getElementById('app').style.opacity = '1';
      }
    } catch (err) {
      secretPassword = oldPassword;
      console.error(err);
    }
  });

  document.getElementById('btn-mobile-back').addEventListener('click', () => {
    document.getElementById('app').classList.remove('mobile-map-active');
    document.getElementById('panel-species').style.display = 'flex';
    document.getElementById('panel-details').style.display = 'none';
  });

  document.getElementById('btn-streets').addEventListener('click', () => setMapStyle('streets'));
  document.getElementById('btn-satellite').addEventListener('click', () => setMapStyle('satellite'));
  document.getElementById('btn-streets-mobile').addEventListener('click', () => setMapStyle('streets'));
  document.getElementById('btn-satellite-mobile').addEventListener('click', () => setMapStyle('satellite'));

  applyTranslations();
});

// Translations
const i18n = {
  it: {
    lbl_species: "Seleziona Specie:",
    btn_back_desktop: "⬅ Torna ai funghi",
    buzz_err: "Errore di connessione.",
    buzz_none: "Nessuna notizia rilevante trovata di recente.",
    buzz_recent: "Recente",
    buzz_calm: "Calmo",
    buzz_mod: "Moderato",
    buzz_high: "Frenetico",
    btn_back_mobile: "← Scegli Fungo",
    lbl_locations: "Località:",
    btn_my_loc: "📍 La Mia Posizione",
    lbl_prediction: "Previsione Dettagliata",
    lbl_legend: "Potenziale di Crescita",
    lbl_growth: "Crescita",
    click_map: "Clicca sulla mappa per calcolare il potenziale di crescita.",
    fetching: "Calcolo in corso...",
    error: "Errore durante il calcolo.",
    high: "Alto",
    med: "Medio",
    low: "Basso",
    rain: "Pioggia",
    soil: "Suolo",
    elev: "Altitudine",
    temp: "Temp",
    ph: "pH",
    community_buzz: "Notizie della Community",
    btn_streets: "Strade",
    btn_satellite: "Satellite",
    vault_title: "🍄 Fungi Vault",
    vault_subtitle: "Inserisci la password segreta per sbloccare.",
    vault_btn: "Sblocca",
    vault_err: "Password errata. Connessione rifiutata dal server.",
    popup_title: "Dettagli del biotopo",
    popup_structure: "Struttura dell'ambiente",
    popup_altitude: "⛰️ Altitudine media",
    popup_soil_ph: "💧 pH del suolo",
    popup_soil_temp: "🌡️ Temp. suolo",
    popup_soil_moist: "🌱 Umidità suolo",
    popup_air_humid: "💦 Umidità aria",
    popup_rain_7d: "🌧️ Pioggia (ultimi 7gg)",
    popup_trees: "Essenze dominanti",
    popup_forecast: "Potenziale 7 giorni",
    popup_zone: "Zona",
    popup_optimal: "ottimale",
    popup_good: "buono",
    popup_medium: "medio",
    popup_poor: "scarso",
    popup_today: "OGGI",
    popup_loading: "Analisi del terreno in corso...",
    popup_broadleaved_1: "faggio comune",
    popup_broadleaved_2: "castagno",
    popup_broadleaved_3: "roverella",
    popup_conifer_1: "abete rosso",
    popup_conifer_2: "pino silvestre",
    popup_conifer_3: "larice",
    popup_mixed_1: "faggio comune",
    popup_mixed_2: "abete rosso",
    popup_mixed_3: "orniello",
    found: "Trovato 🍄",
    recorded: "Registrato! Grazie per aver contribuito al modello.",
    saved_offline: "Salvato offline! Verrà sincronizzato appena tornerà la connessione."
  },
  en: {
    lbl_species: "Select Species:",
    btn_back_desktop: "⬅ Back to Mushrooms",
    buzz_err: "Connection Error.",
    buzz_none: "No recent relevant news found.",
    buzz_recent: "Recent",
    buzz_calm: "Calm",
    buzz_mod: "Moderate",
    buzz_high: "Frenetic",
    btn_back_mobile: "← Choose Mushroom",
    lbl_locations: "Locations:",
    btn_my_loc: "📍 My Location",
    lbl_prediction: "Detailed Prediction",
    lbl_legend: "Growth Potential",
    lbl_growth: "Growth",
    click_map: "Click on the map to calculate growth potential.",
    fetching: "Calculating...",
    error: "Error calculating prediction.",
    high: "High",
    med: "Medium",
    low: "Low",
    rain: "Rain",
    soil: "Soil",
    elev: "Elevation",
    temp: "Temp",
    ph: "pH",
    community_buzz: "Community Buzz",
    btn_streets: "Streets",
    btn_satellite: "Satellite",
    vault_title: "🍄 Fungi Vault",
    vault_subtitle: "Enter your shared secret password to unlock.",
    vault_btn: "Unlock",
    vault_err: "Incorrect password. Connection refused by server.",
    popup_title: "Biotope Details",
    popup_structure: "Environment Structure",
    popup_altitude: "⛰️ Average Altitude",
    popup_soil_ph: "💧 Soil pH",
    popup_soil_temp: "🌡️ Soil Temp.",
    popup_soil_moist: "🌱 Soil Moisture",
    popup_air_humid: "💦 Air Humidity",
    popup_rain_7d: "🌧️ Rain (last 7 days)",
    popup_trees: "Dominant Tree Species",
    popup_forecast: "7-Day Potential",
    popup_zone: "Zone",
    popup_optimal: "optimal",
    popup_good: "good",
    popup_medium: "medium",
    popup_poor: "poor",
    popup_today: "TODAY",
    popup_loading: "Analyzing terrain data...",
    popup_broadleaved_1: "common beech",
    popup_broadleaved_2: "chestnut",
    popup_broadleaved_3: "downy oak",
    popup_conifer_1: "Norway spruce",
    popup_conifer_2: "Scots pine",
    popup_conifer_3: "larch",
    popup_mixed_1: "common beech",
    popup_mixed_2: "Norway spruce",
    popup_mixed_3: "manna ash",
    found: "Found 🍄",
    recorded: "Recorded successfully! Thank you for contributing to the model.",
    saved_offline: "Saved offline! It will sync when the connection returns."
  },
  hi: {
    lbl_species: "प्रजाति चुनें:",
    btn_back_desktop: "⬅ मशरूम पर वापस जाएं",
    buzz_err: "कनेक्शन त्रुटि।",
    buzz_none: "हाल ही में कोई प्रासंगिक खबर नहीं मिली।",
    buzz_recent: "हाल ही का",
    buzz_calm: "शांत",
    buzz_mod: "मध्यम",
    buzz_high: "उत्तेजित",
    btn_back_mobile: "← मशरूम चुनें",
    lbl_locations: "स्थान:",
    btn_my_loc: "📍 मेरा स्थान",
    lbl_prediction: "विस्तृत भविष्यवाणी",
    lbl_legend: "विकास की संभावना",
    lbl_growth: "विकास",
    click_map: "विकास की संभावना की गणना के लिए मानचित्र पर क्लिक करें।",
    fetching: "गणना हो रही है...",
    error: "भविष्यवाणी की गणना में त्रुटि।",
    high: "उच्च",
    med: "मध्यम",
    low: "कम",
    rain: "वर्षा",
    soil: "मिट्टी",
    elev: "ऊंचाई",
    temp: "तापमान",
    ph: "पीएच (pH)",
    community_buzz: "समुदाय की खबरे",
    btn_streets: "सड़कें",
    btn_satellite: "सैटेलाइट",
    vault_title: "🍄 फंगी वॉल्ट",
    vault_subtitle: "अनलॉक करने के लिए अपना साझा गुप्त पासवर्ड दर्ज करें।",
    vault_btn: "अनलॉक",
    vault_err: "गलत पासवर्ड। सर्वर द्वारा कनेक्शन अस्वीकृत।",
    popup_title: "बायोटोप विवरण",
    popup_structure: "पर्यावरण संरचना",
    popup_altitude: "⛰️ औसत ऊंचाई",
    popup_soil_ph: "💧 मिट्टी का pH",
    popup_soil_temp: "🌡️ मिट्टी का तापमान",
    popup_soil_moist: "🌱 मिट्टी की नमी",
    popup_air_humid: "💦 हवा की नमी",
    popup_rain_7d: "🌧️ वर्षा (पिछले 7 दिन)",
    popup_trees: "प्रमुख वृक्ष प्रजातियाँ",
    popup_forecast: "7-दिन की क्षमता",
    popup_zone: "क्षेत्र",
    popup_optimal: "इष्टतम",
    popup_good: "अच्छा",
    popup_medium: "मध्यम",
    popup_poor: "कम",
    popup_today: "आज",
    popup_loading: "भूमि डेटा का विश्लेषण हो रहा है...",
    popup_broadleaved_1: "सामान्य बीच",
    popup_broadleaved_2: "चेस्टनट",
    popup_broadleaved_3: "डाउनी ओक",
    popup_conifer_1: "नॉर्वे स्प्रूस",
    popup_conifer_2: "स्कॉट्स पाइन",
    popup_conifer_3: "लार्च",
    popup_mixed_1: "सामान्य बीच",
    popup_mixed_2: "नॉर्वे स्प्रूस",
    popup_mixed_3: "मन्ना ऐश",
    found: "मिला 🍄",
    recorded: "सफलतापूर्वक रिकॉर्ड किया गया! मॉडल में योगदान देने के लिए धन्यवाद।",
    saved_offline: "ऑफ़लाइन सहेजा गया! कनेक्शन वापस आने पर यह सिंक हो जाएगा।"
  }
};

let currentLang = 'it';

const STYLE_STREETS = 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json';
const STYLE_DARK = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
const STYLE_SATELLITE = {
  "version": 8,
  "sources": {
    "esri-satellite": {
      "type": "raster",
      "tiles": ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
      "tileSize": 256
    }
  },
  "layers": [
    {
      "id": "satellite",
      "type": "raster",
      "source": "esri-satellite",
      "minzoom": 0,
      "maxzoom": 22
    }
  ]
};

let currentMapType = 'streets';

// Check saved theme BEFORE initializing the map so it loads with the right style
if (localStorage.getItem('fungi_theme') === 'dark') {
  document.body.classList.add('dark-mode');
}

// Initialize Map
const map = new maplibregl.Map({
  container: 'map',
  style: (document.body.classList.contains('dark-mode') ? STYLE_DARK : STYLE_STREETS),
  center: [11.510, 45.875], // Asiago
  zoom: 11
});

map.addControl(new maplibregl.NavigationControl(), 'top-right');

// GPS Live Tracking (Blue Dot)
const geolocate = new maplibregl.GeolocateControl({
  positionOptions: { enableHighAccuracy: true },
  trackUserLocation: true,
  showUserHeading: true,
  showAccuracyCircle: true
});
map.addControl(geolocate, 'top-right');

class GridToggleControl {
  onAdd(map) {
    this._map = map;
    this._container = document.createElement('div');
    this._container.className = 'maplibregl-ctrl maplibregl-ctrl-group';
    const btn = document.createElement('button');
    btn.className = 'maplibregl-ctrl-icon';
    btn.type = 'button';
    btn.title = 'Toggle Grids';
    btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="3" y1="15" x2="21" y2="15"></line><line x1="9" y1="3" x2="9" y2="21"></line><line x1="15" y1="3" x2="15" y2="21"></line></svg>`;
    btn.style.fontSize = '16px';
    btn.style.display = 'flex';
    btn.style.justifyContent = 'center';
    btn.style.alignItems = 'center';
    btn.onclick = () => {
      showDynamicGrid = !showDynamicGrid;
      btn.style.opacity = showDynamicGrid ? '1' : '0.5';
      updateDynamicGrid();
    };
    this._container.appendChild(btn);
    return this._container;
  }
  onRemove() {
    this._container.parentNode.removeChild(this._container);
    this._map = undefined;
  }
}
map.addControl(new GridToggleControl(), 'top-right');

let marker = null;
let currentPopup = null;

// Ensure toggle icon matches loaded theme
if (document.body.classList.contains('dark-mode')) {
  document.getElementById('theme-toggle').innerText = '☀️';
}

function updateMapStyleForTheme() {
  if (currentMapType === 'satellite') return; // Don't change satellite

  if (document.body.classList.contains('dark-mode')) {
    map.setStyle(STYLE_DARK);
  } else {
    map.setStyle(STYLE_STREETS);
  }
}

// Handle Theme Toggle
const toggleThemeHandler = () => {
  document.body.classList.toggle('dark-mode');
  const isDark = document.body.classList.contains('dark-mode');
  
  const icon = isDark ? '☀️' : '🌙';
  document.getElementById('theme-toggle').innerText = icon;
  const mobileBtn = document.getElementById('btn-theme-mobile');
  if (mobileBtn) mobileBtn.innerText = icon;
  
  if (isDark) {
    localStorage.setItem('fungi_theme', 'dark');
  } else {
    localStorage.setItem('fungi_theme', 'light');
  }
  updateMapStyleForTheme();
};
document.getElementById('theme-toggle').addEventListener('click', toggleThemeHandler);
const btnThemeMobile = document.getElementById('btn-theme-mobile');
if (btnThemeMobile) btnThemeMobile.addEventListener('click', toggleThemeHandler);

// Handle map style toggle
function setMapStyle(type) {
  currentMapType = type;
  if (type === 'streets') {
    updateMapStyleForTheme(); // Re-applies either dark or light street theme
    
    // Update desktop buttons
    document.getElementById('btn-streets').style.background = 'var(--primary)';
    document.getElementById('btn-streets').style.color = 'white';
    document.getElementById('btn-satellite').style.background = 'transparent';
    document.getElementById('btn-satellite').style.color = 'var(--text-dark)';
    
    // Update mobile buttons
    document.getElementById('btn-streets-mobile').style.background = 'var(--primary)';
    document.getElementById('btn-streets-mobile').style.color = 'white';
    document.getElementById('btn-satellite-mobile').style.background = 'transparent';
    document.getElementById('btn-satellite-mobile').style.color = 'var(--text-dark)';
  } else {
    map.setStyle(STYLE_SATELLITE);
    
    // Update desktop buttons
    document.getElementById('btn-satellite').style.background = 'var(--primary)';
    document.getElementById('btn-satellite').style.color = 'white';
    document.getElementById('btn-streets').style.background = 'transparent';
    document.getElementById('btn-streets').style.color = 'var(--text-dark)';
    
    // Update mobile buttons
    document.getElementById('btn-satellite-mobile').style.background = 'var(--primary)';
    document.getElementById('btn-satellite-mobile').style.color = 'white';
    document.getElementById('btn-streets-mobile').style.background = 'transparent';
    document.getElementById('btn-streets-mobile').style.color = 'var(--text-dark)';
  }
}



const REGIONS = {
  "asiago": {"lat_min": 45.80, "lat_max": 45.95, "lon_min": 11.40, "lon_max": 11.60},
  "recoaro": {"lat_min": 45.65, "lat_max": 45.75, "lon_min": 11.15, "lon_max": 11.25},
  "lavarone": {"lat_min": 45.90, "lat_max": 46.00, "lon_min": 11.20, "lon_max": 11.35},
};

function drawRegionBorders() {
  const features = Object.values(REGIONS).map(b => ({
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [b.lon_min, b.lat_min],
        [b.lon_max, b.lat_min],
        [b.lon_max, b.lat_max],
        [b.lon_min, b.lat_max],
        [b.lon_min, b.lat_min]
      ]]
    }
  }));

  if (map.getSource('region-borders')) {
    map.getSource('region-borders').setData({ type: 'FeatureCollection', features });
  } else {
    map.addSource('region-borders', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features }
    });
    map.addLayer({
      id: 'region-borders-line',
      type: 'line',
      source: 'region-borders',
      paint: {
        'line-color': '#e53935',
        'line-width': 2,
        'line-dasharray': [2, 2],
        'line-opacity': 0.7
      }
    });
  }
}

let showDynamicGrid = true;

function getClosestRegion(lat, lng) {
  let closest = null;
  let minDist = Infinity;
  for (const [name, b] of Object.entries(REGIONS)) {
    const rLat = (b.lat_min + b.lat_max) / 2;
    const rLng = (b.lon_min + b.lon_max) / 2;
    const dist = Math.pow(lat - rLat, 2) + Math.pow(lng - rLng, 2);
    if (dist < minDist) {
      minDist = dist;
      closest = b;
    }
  }
  return closest;
}

function updateDynamicGrid() {
  if (map.getZoom() < 10 || !showDynamicGrid) {
    if (map.getSource('dynamic-grid')) {
      map.getSource('dynamic-grid').setData({type: 'FeatureCollection', features: []});
    }
    return;
  }

  const bounds = map.getBounds();
  const latMin = bounds.getSouth();
  const latMax = bounds.getNorth();
  const lonMin = bounds.getWest();
  const lonMax = bounds.getEast();

  if (latMax - latMin > 1.5 || lonMax - lonMin > 1.5) return;

  const centerLat = (latMin + latMax) / 2;
  const centerLng = (lonMin + lonMax) / 2;
  const region = getClosestRegion(centerLat, centerLng);

  const GRID_SIZE = 250;
  const meters_per_deg_lat = 111320;
  const latStep = GRID_SIZE / meters_per_deg_lat;
  
  const avg_lat = (region.lat_min + region.lat_max) / 2;
  const lonStep = GRID_SIZE / (meters_per_deg_lat * Math.cos(avg_lat * Math.PI / 180));

  // The backend centers polygons ON the grid points which start at region.lat_min.
  // So the grid lines (polygon edges) are offset by -latStep/2 and -lonStep/2
  const latOrigin = region.lat_min - latStep / 2;
  const lonOrigin = region.lon_min - lonStep / 2;

  const features = [];
  
  const latStartIdx = Math.floor((latMin - latOrigin) / latStep);
  const latStart = latOrigin + latStartIdx * latStep;
  
  for (let lat = latStart; lat <= latMax + latStep; lat += latStep) {
    features.push({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: [[lonMin, lat], [lonMax, lat]] }
    });
  }

  const lonStartIdx = Math.floor((lonMin - lonOrigin) / lonStep);
  const lonStart = lonOrigin + lonStartIdx * lonStep;

  for (let lon = lonStart; lon <= lonMax + lonStep; lon += lonStep) {
    features.push({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: [[lon, latMin], [lon, latMax]] }
    });
  }

  const fc = { type: 'FeatureCollection', features };

  if (map.getSource('dynamic-grid')) {
    map.getSource('dynamic-grid').setData(fc);
  } else {
    map.addSource('dynamic-grid', { type: 'geojson', data: fc });
    map.addLayer({
      id: 'dynamic-grid-line',
      type: 'line',
      source: 'dynamic-grid',
      paint: {
        'line-color': 'rgba(128, 128, 128, 0.5)',
        'line-width': 1
      }
    });
  }
}

map.on('moveend', updateDynamicGrid);
map.on('zoomend', updateDynamicGrid);

// Re-add grids and borders when style finishes loading
map.on('styledata', () => {
  if (!map.getSource('predictions')) {
      loadRegionGrid();
  }
  if (!map.getSource('region-borders') && map.isStyleLoaded()) {
      drawRegionBorders();
  }
  if (!map.getSource('dynamic-grid') && map.isStyleLoaded()) {
      updateDynamicGrid();
  }
});

// Handle Map Clicks
map.on('click', async (e) => {
  let { lng, lat } = e.lngLat;
  
  const features = map.queryRenderedFeatures(e.point, { layers: ['predictions-fill'] });
  let clickedScore = null;

  if (features.length > 0) {
    clickedScore = features[0].properties.score;

    // Calculate the exact center of the grid box polygon
    const coords = features[0].geometry.coordinates[0];
    let sumLng = 0, sumLat = 0;
    for (let i = 0; i < 4; i++) {
      sumLng += coords[i][0];
      sumLat += coords[i][1];
    }
    lng = sumLng / 4;
    lat = sumLat / 4;
  } else {
    // 250m grid math for offline or transparent (0 score) areas
    const GRID_SIZE = 250;
    const meters_per_deg_lat = 111320;
    
    const region = getClosestRegion(lat, lng);
    const avg_lat = (region.lat_min + region.lat_max) / 2;
    const lat_step = GRID_SIZE / meters_per_deg_lat;
    const lon_step = GRID_SIZE / (meters_per_deg_lat * Math.cos(avg_lat * Math.PI / 180));
    
    const latOrigin = region.lat_min - lat_step / 2;
    const lonOrigin = region.lon_min - lon_step / 2;
    
    const lat_idx = Math.floor((lat - latOrigin) / lat_step);
    const lon_idx = Math.floor((lng - lonOrigin) / lon_step);
    
    lat = latOrigin + (lat_idx + 0.5) * lat_step;
    lng = lonOrigin + (lon_idx + 0.5) * lon_step;
    
    // Draw the borderline for the clicked grid square
    const minLat = latOrigin + lat_idx * lat_step;
    const maxLat = latOrigin + (lat_idx + 1) * lat_step;
    const minLng = lonOrigin + lon_idx * lon_step;
    const maxLng = lonOrigin + (lon_idx + 1) * lon_step;
    
    const cellPolygon = {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [minLng, minLat], [maxLng, minLat],
            [maxLng, maxLat], [minLng, maxLat],
            [minLng, minLat]
          ]]
        }
      }]
    };
    
    if (map.getSource('tapped-grid')) {
      map.getSource('tapped-grid').setData(cellPolygon);
    } else {
      map.addSource('tapped-grid', { type: 'geojson', data: cellPolygon });
      map.addLayer({
        id: 'tapped-grid-line',
        type: 'line',
        source: 'tapped-grid',
        paint: { 'line-color': '#ffb300', 'line-width': 2 }
      });
    }
  }

  let isInside = false;
  for (const b of Object.values(REGIONS)) {
    if (lat >= b.lat_min && lat <= b.lat_max && lng >= b.lon_min && lng <= b.lon_max) {
      isInside = true;
      break;
    }
  }

  if (!isInside) {
    if (currentPopup) currentPopup.remove();
    currentPopup = new maplibregl.Popup({ closeOnClick: false, maxWidth: '380px' })
      .setLngLat([lng, lat])
      .addTo(map);
      
    if (marker) marker.remove();
    marker = new maplibregl.Marker().setLngLat([lng, lat]).addTo(map);
    
    renderPrediction({ 
      score: 0.0, 
      message: "Fuori dalle regioni supportate. Aggiungi il tuo ritrovamento locale!", 
      lat: lat, 
      lon: lng 
    });
  } else {
    await fetchPrediction(lat, lng, clickedScore);
  }
});

// Load grids and borders automatically on map load
map.on('load', () => {
  loadRegionGrid();
  drawRegionBorders();
});

let selectedRegion = 'asiago'; // default region

// Setup Location Buttons to update selectedRegion and fly to the areas
document.querySelectorAll('.btn-loc:not(#btn-my-loc):not(#btn-my-loc-mobile)').forEach(btn => {
  btn.addEventListener('click', (e) => {
    // Remove active class from all location buttons
    document.querySelectorAll('.btn-loc').forEach(b => {
      b.style.background = '';
      b.style.color = '';
      b.style.borderColor = '';
    });
    
    const lat = parseFloat(btn.dataset.lat);
    const lon = parseFloat(btn.dataset.lon);

    // Add active styling to ALL buttons for this location
    document.querySelectorAll(`.btn-loc[data-lat="${btn.dataset.lat}"]`).forEach(b => {
      b.style.background = 'var(--primary)';
      b.style.color = 'white';
      b.style.borderColor = 'var(--primary)';
    });
    
    // Update the selected region based on the button text
    selectedRegion = btn.innerText.trim().toLowerCase();
    
    map.flyTo({ center: [lon, lat], zoom: 12 });
    
    // Auto-close mobile drawer when location is clicked
    const drawer = document.getElementById('drawer-wrapper');
    if (drawer && drawer.classList.contains('drawer-open')) {
      drawer.classList.remove('drawer-open');
    }
    
    // If a mushroom is already selected, load its grid for the new region immediately
    if (currentSpeciesId) {
      loadRegionGrid();
    }
  });
});

// Set default active button (Asiago)
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.btn-loc[data-lat="45.875"]').forEach(b => {
    b.style.background = 'var(--primary)';
    b.style.color = 'white';
    b.style.borderColor = 'var(--primary)';
  });
});

const handleMyLoc = () => {
  geolocate.trigger();
  const drawer = document.getElementById('drawer-wrapper');
  if (drawer && drawer.classList.contains('drawer-open')) {
    drawer.classList.remove('drawer-open');
  }
};
document.getElementById('btn-my-loc').addEventListener('click', handleMyLoc);
const btnMyLocMobile = document.getElementById('btn-my-loc-mobile');
if (btnMyLocMobile) btnMyLocMobile.addEventListener('click', handleMyLoc);

// Mobile Drawer Toggle
const drawerHandle = document.getElementById('drawer-handle');
if (drawerHandle) {
  drawerHandle.addEventListener('click', () => {
    const drawer = document.getElementById('drawer-wrapper');
    drawer.classList.toggle('drawer-open');
  });
}
const btnCloseDrawer = document.getElementById('btn-close-drawer');
if (btnCloseDrawer) {
  btnCloseDrawer.addEventListener('click', () => {
    document.getElementById('drawer-wrapper').classList.remove('drawer-open');
  });
}

const SPECIES_DATA = [
  { 
    id: 'boletus_edulis', sci: 'Boletus Edulis', img: '/images/mushrooms/boletus_edulis.webp', 
    name: {"it":"Porcino","en":"Penny Bun","hi":"पेनी बन (Porcino)"},
    desc: {
      it: `<strong>Identificazione:</strong><br>
    <ul>
      <li><strong>Cappello:</strong> 5-25 cm, emisferico poi convesso. Cuticola vischiosa con l'umidità, bruno chiaro o nocciola, spesso con bordino bianco al margine.</li>
      <li><strong>Imenio:</strong> Tubuli e pori inizialmente bianchi, poi giallastri e infine verde-olivastro a maturità.</li>
      <li><strong>Gambo:</strong> Obeso e carnoso, di colore bianco o nocciola chiaro, con un evidente e fine reticolo bianco nella parte superiore.</li>
      <li><strong>Carne:</strong> Bianca e immutabile al taglio. Odore gradevole e sapore dolce.</li>
      <li><strong>Habitat:</strong> Boschi di conifere (abete, pino) e latifoglie (faggio, castagno). Autunnale.</li>
      <li><strong>Attenzione:</strong> Confondibile con <em>Tylopilus felleus</em> (porcino di fiele), che ha pori rosati, reticolo scuro e sapore amaro.</li>
    </ul>`,
      en: `<strong>Identification:</strong><br>
    <ul>
      <li><strong>Cap:</strong> 5-25 cm, hemispherical then convex. Viscid cuticle when wet, light brown or hazel, often with a white edge at the margin.</li>
      <li><strong>Hymenium:</strong> Tubes and pores initially white, then yellowish and finally olive-green at maturity.</li>
      <li><strong>Stem:</strong> Stout and fleshy, white or light hazel, with an evident and fine white reticulation on the upper part.</li>
      <li><strong>Flesh:</strong> White and unchanging when cut. Pleasant smell and sweet taste.</li>
      <li><strong>Habitat:</strong> Coniferous (fir, pine) and deciduous (beech, chestnut) woods. Autumnal.</li>
      <li><strong>Caution:</strong> Confusable with <em>Tylopilus felleus</em> (bitter bolete), which has pinkish pores, a dark reticulum, and a bitter taste.</li>
    </ul>`,
      hi: `<strong>पहचान:</strong><br>
    <ul>
      <li><strong>टोपी:</strong> 5-25 सेमी, अर्धगोलाकार फिर उत्तल। गीला होने पर चिपचिपा, हल्का भूरा या हेज़ल, अक्सर किनारे पर सफेद बॉर्डर के साथ।</li>
      <li><strong>हाइमेनियम:</strong> ट्यूब और छिद्र शुरू में सफेद, फिर पीले और अंत में परिपक्व होने पर जैतून-हरे हो जाते हैं।</li>
      <li><strong>तना:</strong> मोटा और मांसल, सफेद या हल्का हेज़ल, ऊपरी हिस्से पर स्पष्ट और बारीक सफेद जालीदार पैटर्न।</li>
      <li><strong>मांस:</strong> सफेद और कटने पर अपरिवर्तित। सुखद गंध और मीठा स्वाद।</li>
      <li><strong>आवास:</strong> शंकुधारी (देवदार, चीड़) और पर्णपाती (बीच, चेस्टनट) जंगल। शरद ऋतु।</li>
      <li><strong>चेतावनी:</strong> इसे <em>Tylopilus felleus</em> (बिटर बोलेट) से भ्रमित किया जा सकता है, जिसमें गुलाबी छिद्र, गहरे रंग का जालीदार पैटर्न और कड़वा स्वाद होता है।</li>
    </ul>`
    }
  },
  { 
    id: 'boletus_aereus', sci: 'Boletus Aereus', img: '/images/mushrooms/boletus_aereus.webp', 
    name: {"it":"Porcino nero","en":"Dark Cep","hi":"डार्क सेप (Porcino nero)"},
    desc: {
      it: `<strong>Identificazione:</strong><br>
    <ul>
      <li><strong>Cappello:</strong> 6-24 cm, molto carnoso. Cuticola secca e vellutata, di colore bruno scuro, nerastro o color bronzo.</li>
      <li><strong>Imenio:</strong> Tubuli e pori piccolissimi, inizialmente bianchi puri, poi tendenti al giallo-verdastro.</li>
      <li><strong>Gambo:</strong> Molto duro e massiccio, bruno-ocraceo, decorato da un fitto reticolo scuro (concolore).</li>
      <li><strong>Carne:</strong> Bianca, compatta, immutabile. Profumo intenso ed eccellente.</li>
      <li><strong>Habitat:</strong> Boschi caldi termofili di latifoglie (quercia, leccio, castagno). Tardo estivo / autunnale.</li>
      <li><strong>Attenzione:</strong> Nessuna confusione pericolosa, considerato il re dei porcini per il gusto.</li>
    </ul>`,
      en: `<strong>Identification:</strong><br>
    <ul>
      <li><strong>Cap:</strong> 6-24 cm, very fleshy. Dry and velvety cuticle, dark brown, blackish or bronze colored.</li>
      <li><strong>Hymenium:</strong> Very small tubes and pores, initially pure white, then tending to yellow-green.</li>
      <li><strong>Stem:</strong> Very hard and massive, brown-ochraceous, decorated with a dense dark reticulation (concolorous).</li>
      <li><strong>Flesh:</strong> White, compact, unchanging. Intense and excellent aroma.</li>
      <li><strong>Habitat:</strong> Warm thermophilic deciduous woods (oak, holm oak, chestnut). Late summer / autumn.</li>
      <li><strong>Caution:</strong> No dangerous confusion, considered the king of porcini for its taste.</li>
    </ul>`,
      hi: `<strong>पहचान:</strong><br>
    <ul>
      <li><strong>टोपी:</strong> 6-24 सेमी, बहुत मांसल। सूखी और मखमली छल्ली, गहरा भूरा, काला या कांस्य रंग।</li>
      <li><strong>हाइमेनियम:</strong> बहुत छोटे ट्यूब और छिद्र, शुरू में शुद्ध सफेद, फिर पीले-हरे रंग की ओर झुकाव।</li>
      <li><strong>तना:</strong> बहुत सख्त और विशाल, भूरा-गेरू, एक घने गहरे जालीदार (एक ही रंग के) से सजा हुआ।</li>
      <li><strong>मांस:</strong> सफेद, सघन, अपरिवर्तित। तीव्र और उत्कृष्ट सुगंध।</li>
      <li><strong>आवास:</strong> गर्म थर्मोफिलिक पर्णपाती जंगल (ओक, होल्म ओक, चेस्टनट)। देर से गर्मी / शरद ऋतु।</li>
      <li><strong>चेतावनी:</strong> कोई खतरनाक भ्रम नहीं, इसे स्वाद के लिए पोर्सिनी का राजा माना जाता है।</li>
    </ul>`
    }
  },
  { 
    id: 'boletus_aestivalis', sci: 'Boletus Aestivalis', img: '/images/mushrooms/boletus_aestivalis.webp', 
    name: {"it":"Porcino estivo","en":"Summer Cep","hi":"समर सेप (Porcino estivo)"},
    desc: {
      it: `<strong>Identificazione:</strong><br>
    <ul>
      <li><strong>Cappello:</strong> 5-20 cm. Cuticola vellutata, di colore nocciola o bruno chiaro, che si screpola reticolarmente con il clima secco.</li>
      <li><strong>Imenio:</strong> Tubuli e pori biancastri, che diventano giallo-verdastri a maturità.</li>
      <li><strong>Gambo:</strong> Slanciato, concolore al cappello ma più chiaro, ricoperto da un evidente reticolo esteso su quasi tutta la superficie.</li>
      <li><strong>Carne:</strong> Bianca (leggermente giallognola sotto la cuticola). Odore molto penetrante.</li>
      <li><strong>Habitat:</strong> Precocissimo (maggio-giugno), cresce sotto querce, castagni e faggi.</li>
      <li><strong>Attenzione:</strong> Confondibile con <em>Tylopilus felleus</em> come tutti i porcini.</li>
    </ul>`,
      en: `<strong>Identification:</strong><br>
    <ul>
      <li><strong>Cap:</strong> 5-20 cm. Velvety cuticle, hazel or light brown colored, which cracks in a reticular way in dry weather.</li>
      <li><strong>Hymenium:</strong> Whitish tubes and pores, which become yellow-greenish at maturity.</li>
      <li><strong>Stem:</strong> Slender, concolorous with the cap but lighter, covered by an evident reticulum extending over almost the entire surface.</li>
      <li><strong>Flesh:</strong> White (slightly yellowish under the cuticle). Very penetrating smell.</li>
      <li><strong>Habitat:</strong> Very early (May-June), grows under oaks, chestnuts and beeches.</li>
      <li><strong>Caution:</strong> Confusable with <em>Tylopilus felleus</em> like all porcini.</li>
    </ul>`,
      hi: `<strong>पहचान:</strong><br>
    <ul>
      <li><strong>टोपी:</strong> 5-20 सेमी। मखमली छल्ली, हेज़ल या हल्का भूरा रंग, जो शुष्क मौसम में जालीदार तरीके से दरकती है।</li>
      <li><strong>हाइमेनियम:</strong> सफेद रंग के ट्यूब और छिद्र, जो परिपक्व होने पर पीले-हरे हो जाते हैं।</li>
      <li><strong>तना:</strong> पतला, टोपी के समान रंग का लेकिन हल्का, लगभग पूरी सतह पर फैले एक स्पष्ट जाल से ढका हुआ।</li>
      <li><strong>मांस:</strong> सफेद (छल्ली के नीचे थोड़ा पीला)। बहुत तीखी गंध।</li>
      <li><strong>आवास:</strong> बहुत जल्दी (मई-जून), ओक, चेस्टनट और बीच के नीचे उगता है।</li>
      <li><strong>चेतावनी:</strong> सभी पोर्सिनी की तरह <em>Tylopilus felleus</em> से भ्रमित किया जा सकता है।</li>
    </ul>`
    }
  },
  { 
    id: 'boletus_pinophilus', sci: 'Boletus Pinophilus', img: '/images/mushrooms/boletus_pinophilus.webp', 
    name: {"it":"Porcino rosso","en":"Pine Bolete","hi":"पाइन बोलेट (Porcino rosso)"},
    desc: {
      it: `<strong>Identificazione:</strong><br>
    <ul>
      <li><strong>Cappello:</strong> 8-25 cm, carnoso, con cuticola grinzosa di un tipico color rosso-vinoso o bruno-rossastro.</li>
      <li><strong>Imenio:</strong> Tubuli e pori bianchi da giovane, poi gialli, tendenti tardivamente all'oliva.</li>
      <li><strong>Gambo:</strong> Sodo, color crema-rossastro o nocciola, coperto da un sottile reticolo rossastro.</li>
      <li><strong>Carne:</strong> Bianca immutabile (rossastra sotto la cuticola). Odore fungino delicato.</li>
      <li><strong>Habitat:</strong> Boschi freddi di pino silvestre, faggio e mirtillo. Primaverile e tardo autunnale.</li>
      <li><strong>Attenzione:</strong> Nessuna confusione pericolosa.</li>
    </ul>`,
      en: `<strong>Identification:</strong><br>
    <ul>
      <li><strong>Cap:</strong> 8-25 cm, fleshy, with a wrinkled cuticle of a typical wine-red or brownish-red color.</li>
      <li><strong>Hymenium:</strong> Tubes and pores white when young, then yellow, tending belatedly to olive.</li>
      <li><strong>Stem:</strong> Firm, reddish-cream or hazel colored, covered with a thin reddish reticulum.</li>
      <li><strong>Flesh:</strong> Unchanging white (reddish under the cuticle). Delicate fungal smell.</li>
      <li><strong>Habitat:</strong> Cold woods of Scots pine, beech and blueberry. Spring and late autumn.</li>
      <li><strong>Caution:</strong> No dangerous confusion.</li>
    </ul>`,
      hi: `<strong>पहचान:</strong><br>
    <ul>
      <li><strong>टोपी:</strong> 8-25 सेमी, मांसल, विशिष्ट वाइन-लाल या भूरे-लाल रंग की झुर्रीदार छल्ली के साथ।</li>
      <li><strong>हाइमेनियम:</strong> युवा होने पर ट्यूब और छिद्र सफेद, फिर पीले, और देर से जैतून रंग की ओर झुकाव।</li>
      <li><strong>तना:</strong> दृढ़, लाल-क्रीम या हेज़ल रंग का, एक पतले लाल जाल से ढका हुआ।</li>
      <li><strong>मांस:</strong> अपरिवर्तित सफेद (छल्ली के नीचे लाल)। नाजुक फंगल गंध।</li>
      <li><strong>आवास:</strong> स्कॉट्स पाइन, बीच और ब्लूबेरी के ठंडे जंगल। वसंत और देर से शरद ऋतु।</li>
      <li><strong>चेतावनी:</strong> कोई खतरनाक भ्रम नहीं।</li>
    </ul>`
    }
  },
  { 
    id: 'cantharellus_cibarius', sci: 'Cantharellus cibarius', img: '/images/mushrooms/cantharellus_cibarius.webp', 
    name: {"it":"Finferlo / Gallinaccio","en":"Chanterelle","hi":"चैंटरेल (Finferlo)"},
    desc: {
      it: `<strong>Identificazione:</strong><br>
    <ul>
      <li><strong>Cappello:</strong> 3-10 cm, carnoso, irregolare, depresso al centro. Colore giallo tuorlo o giallo-arancio. Margine ondulato.</li>
      <li><strong>Imenio:</strong> Privo di vere lamelle, presenta pliche (venature) ramificate e decorrenti sul gambo, dello stesso colore del cappello.</li>
      <li><strong>Gambo:</strong> Tozzo, pieno, che si allarga gradualmente fondendosi con il cappello.</li>
      <li><strong>Carne:</strong> Soda, biancastra. Odore fruttato molto tipico, che ricorda l'albicocca.</li>
      <li><strong>Habitat:</strong> Boschi di latifoglie e conifere, spesso in colonie numerose, in estate e autunno.</li>
      <li><strong>Attenzione:</strong> Confondibile con <em>Omphalotus olearius</em> (tossico) che però ha lamelle vere a spigolo vivo e cresce su ceppi di legno, non a terra.</li>
    </ul>`,
      en: `<strong>Identification:</strong><br>
    <ul>
      <li><strong>Cap:</strong> 3-10 cm, fleshy, irregular, depressed in the center. Egg yolk yellow or yellow-orange color. Wavy margin.</li>
      <li><strong>Hymenium:</strong> Devoid of true gills, it has branched folds (veins) decurrent on the stem, of the same color as the cap.</li>
      <li><strong>Stem:</strong> Squat, solid, which gradually widens merging with the cap.</li>
      <li><strong>Flesh:</strong> Firm, whitish. Very typical fruity smell, reminiscent of apricot.</li>
      <li><strong>Habitat:</strong> Deciduous and coniferous woods, often in large colonies, in summer and autumn.</li>
      <li><strong>Caution:</strong> Confusable with <em>Omphalotus olearius</em> (toxic) which however has true sharp-edged gills and grows on wooden stumps, not on the ground.</li>
    </ul>`,
      hi: `<strong>पहचान:</strong><br>
    <ul>
      <li><strong>टोपी:</strong> 3-10 सेमी, मांसल, अनियमित, केंद्र में दबा हुआ। अंडे की जर्दी जैसा पीला या पीला-नारंगी रंग। लहराता हुआ किनारा।</li>
      <li><strong>हाइमेनियम:</strong> वास्तविक गलफड़ों (gills) से रहित, इसमें तने पर शाखाओं वाली सिलवटें (नसें) होती हैं, जो टोपी के समान रंग की होती हैं।</li>
      <li><strong>तना:</strong> छोटा और मोटा, ठोस, जो टोपी के साथ विलय करते हुए धीरे-धीरे चौड़ा होता है।</li>
      <li><strong>मांस:</strong> दृढ़, सफेद। बहुत ही विशिष्ट फलों की गंध, जो खुबानी की याद दिलाती है।</li>
      <li><strong>आवास:</strong> पर्णपाती और शंकुधारी जंगल, अक्सर गर्मियों और शरद ऋतु में बड़ी कॉलोनियों में।</li>
      <li><strong>चेतावनी:</strong> <em>Omphalotus olearius</em> (विषाक्त) से भ्रमित किया जा सकता है, जिसमें वास्तविक तीखे किनारे वाले गलफड़े होते हैं और यह जमीन पर नहीं, बल्कि लकड़ी के स्टंप पर उगता है।</li>
    </ul>`
    }
  },
  { 
    id: 'craterellus_tubaeformis', sci: 'Craterellus Tubaeformis', img: '/images/mushrooms/craterellus_tubaeformis.webp', 
    name: {"it":"Finferla","en":"Trumpet Chanterelle","hi":"ट्रम्पेट चैंटरेल (Finferla)"},
    desc: {
      it: `<strong>Identificazione:</strong><br>
    <ul>
      <li><strong>Cappello:</strong> 2-6 cm, imbutiforme e profondamente ombelicato (bucato al centro). Colore bruno-grigiastro.</li>
      <li><strong>Imenio:</strong> Formato da pieghe distanti e ramificate, grigio-giallastre, decorrenti sul gambo.</li>
      <li><strong>Gambo:</strong> Sottile, cilindrico, cavo all'interno, di un evidente giallo vivo o dorato.</li>
      <li><strong>Carne:</strong> Sottile ed elastica. Odore delicato.</li>
      <li><strong>Habitat:</strong> Boschi umidi di conifere e latifoglie, tra muschi e ceppi marcescenti. Tardo autunnale.</li>
      <li><strong>Attenzione:</strong> Confondibile con <em>Leotia lubrica</em> (commestibilità sospetta) che però ha consistenza gommosa e imenio liscio.</li>
    </ul>`,
      en: `<strong>Identification:</strong><br>
    <ul>
      <li><strong>Cap:</strong> 2-6 cm, funnel-shaped and deeply umbilicate (holed in the center). Brown-grayish color.</li>
      <li><strong>Hymenium:</strong> Formed by distant and branched folds, gray-yellowish, decurrent on the stem.</li>
      <li><strong>Stem:</strong> Thin, cylindrical, hollow inside, of an evident bright or golden yellow.</li>
      <li><strong>Flesh:</strong> Thin and elastic. Delicate smell.</li>
      <li><strong>Habitat:</strong> Damp coniferous and deciduous woods, among mosses and rotting stumps. Late autumn.</li>
      <li><strong>Caution:</strong> Confusable with <em>Leotia lubrica</em> (suspected edibility) which however has a rubbery consistency and a smooth hymenium.</li>
    </ul>`,
      hi: `<strong>पहचान:</strong><br>
    <ul>
      <li><strong>टोपी:</strong> 2-6 सेमी, कीप के आकार का और गहराई से नाभिदार (केंद्र में छेद)। भूरा-ग्रे रंग।</li>
      <li><strong>हाइमेनियम:</strong> दूर और शाखाओं वाली सिलवटों से बना, भूरा-पीला, तने पर उतरता हुआ।</li>
      <li><strong>तना:</strong> पतला, बेलनाकार, अंदर से खोखला, एक स्पष्ट चमकीले या सुनहरे पीले रंग का।</li>
      <li><strong>मांस:</strong> पतला और लोचदार। नाजुक गंध।</li>
      <li><strong>आवास:</strong> नम शंकुधारी और पर्णपाती जंगल, काई और सड़ते हुए स्टंप के बीच। देर से शरद ऋतु।</li>
      <li><strong>चेतावनी:</strong> <em>Leotia lubrica</em> (संदिग्ध खाद्य) से भ्रमित किया जा सकता है, जिसकी रबड़ जैसी स्थिरता और चिकना हाइमेनियम होता है।</li>
    </ul>`
    }
  },
  { 
    id: 'craterellus_cornucopioides', sci: 'Craterellus Cornucopioides', img: '/images/mushrooms/craterellus_cornucopioides.webp', 
    name: {"it":"Trombetta dei morti","en":"Horn of Plenty","hi":"हॉर्न ऑफ प्लेंटी (Trombetta dei morti)"},
    desc: {
      it: `<strong>Identificazione:</strong><br>
    <ul>
      <li><strong>Cappello:</strong> A forma di imbuto profondo o cornucopia, 5-12 cm di altezza. Margine arricciato, colore nerastro o grigio cenere.</li>
      <li><strong>Imenio:</strong> Liscio o solo lievemente rugoso, grigio cenere o bluastro-cenerino.</li>
      <li><strong>Gambo:</strong> Assottigliato alla base, cavo, fuso con il cappello (forma di corno).</li>
      <li><strong>Carne:</strong> Sottilissima, elastica. Odore intenso e aromatico, molto apprezzato e tartufato se essiccato.</li>
      <li><strong>Habitat:</strong> Terreni umidi sotto latifoglie (faggio, castagno), molto mimetico, cresce in folti cespi.</li>
      <li><strong>Attenzione:</strong> Difficilmente confondibile grazie al suo colore nero e alla forma a tromba.</li>
    </ul>`,
      en: `<strong>Identification:</strong><br>
    <ul>
      <li><strong>Cap:</strong> Shaped like a deep funnel or cornucopia, 5-12 cm in height. Curled margin, blackish or ash-gray color.</li>
      <li><strong>Hymenium:</strong> Smooth or only slightly wrinkled, ash-gray or bluish-ash.</li>
      <li><strong>Stem:</strong> Tapered at the base, hollow, fused with the cap (horn shape).</li>
      <li><strong>Flesh:</strong> Very thin, elastic. Intense and aromatic smell, highly appreciated and truffled if dried.</li>
      <li><strong>Habitat:</strong> Damp soils under broad-leaved trees (beech, chestnut), highly camouflaged, grows in thick tufts.</li>
      <li><strong>Caution:</strong> Difficult to confuse thanks to its black color and trumpet shape.</li>
    </ul>`,
      hi: `<strong>पहचान:</strong><br>
    <ul>
      <li><strong>टोपी:</strong> गहरी कीप या कॉर्नुकोपिया के आकार का, 5-12 सेमी ऊँचा। घुंघराले किनारे, काला या राख-ग्रे रंग।</li>
      <li><strong>हाइमेनियम:</strong> चिकना या केवल थोड़ा झुर्रीदार, राख-ग्रे या नीला-राख।</li>
      <li><strong>तना:</strong> आधार पर पतला, खोखला, टोपी के साथ जुड़ा हुआ (सींग का आकार)।</li>
      <li><strong>मांस:</strong> बहुत पतला, लोचदार। तीव्र और सुगंधित गंध, अत्यधिक सराहना की जाती है और सूखने पर ट्रफल जैसी होती है।</li>
      <li><strong>आवास:</strong> चौड़े पत्तों वाले पेड़ों (बीच, चेस्टनट) के नीचे नम मिट्टी, अत्यधिक छलावरण वाली, घने गुच्छों में उगती है।</li>
      <li><strong>चेतावनी:</strong> इसके काले रंग और तुरही के आकार के कारण इसे भ्रमित करना मुश्किल है।</li>
    </ul>`
    }
  },
  { 
    id: 'morchella_esculenta', sci: 'Morchella Esculenta', img: '/images/mushrooms/morchella_esculenta.webp', 
    name: {"it":"Spugnola","en":"Morel","hi":"मोरेल (Spugnola)"},
    desc: {
      it: `<strong>Identificazione:</strong><br>
    <ul>
      <li><strong>Cappello:</strong> Mitra ovale formata da alveoli profondi (simili a spugne) separati da creste irregolari, colore biondo/giallo-ocra.</li>
      <li><strong>Imenio:</strong> Situato all'interno degli alveoli della mitra.</li>
      <li><strong>Gambo:</strong> Robusto, biancastro, ingrossato alla base e completamente cavo all'interno.</li>
      <li><strong>Carne:</strong> Fragile, ceracea. Odore spermatico o fungino.</li>
      <li><strong>Habitat:</strong> Esclusivamente primaverile (aprile-maggio), cresce sotto olmi, frassini, meli o su suoli sabbiosi.</li>
      <li><strong>Attenzione:</strong> <em>TOSSICO DA CRUDO.</em> Contiene acido elvellico (termolabile). Richiede prolungata cottura o essiccazione. Confondibile con le velenose <em>Gyromitra</em> che hanno però cappello cerebriforme.</li>
    </ul>`,
      en: `<strong>Identification:</strong><br>
    <ul>
      <li><strong>Cap:</strong> Oval miter formed by deep alveoli (similar to sponges) separated by irregular ridges, blonde/yellow-ocher color.</li>
      <li><strong>Hymenium:</strong> Located inside the alveoli of the miter.</li>
      <li><strong>Stem:</strong> Robust, whitish, enlarged at the base and completely hollow inside.</li>
      <li><strong>Flesh:</strong> Fragile, waxy. Spermatic or fungal smell.</li>
      <li><strong>Habitat:</strong> Exclusively spring (April-May), grows under elms, ash trees, apple trees or on sandy soils.</li>
      <li><strong>Caution:</strong> <em>TOXIC RAW.</em> Contains helvellic acid (thermolabile). Requires prolonged cooking or drying. Confusable with poisonous <em>Gyromitra</em> which however have a brain-like cap.</li>
    </ul>`,
      hi: `<strong>पहचान:</strong><br>
    <ul>
      <li><strong>टोपी:</strong> गहरे एल्वियोली (स्पंज के समान) द्वारा निर्मित अंडाकार मेटर, जो अनियमित लकीरों से अलग होता है, गोरा/पीला-गेरू रंग।</li>
      <li><strong>हाइमेनियम:</strong> मेटर के एल्वियोली के अंदर स्थित है।</li>
      <li><strong>तना:</strong> मजबूत, सफेद, आधार पर बढ़ा हुआ और अंदर से पूरी तरह से खोखला।</li>
      <li><strong>मांस:</strong> नाजुक, मोमी। शुक्राणु या कवक गंध।</li>
      <li><strong>आवास:</strong> विशेष रूप से वसंत (अप्रैल-मई), एल्म्स, राख के पेड़, सेब के पेड़ के नीचे या रेतीली मिट्टी पर उगता है।</li>
      <li><strong>चेतावनी:</strong> <em>कच्चा जहरीला।</em> इसमें हेल्वेेलिक एसिड (थर्मोलैबाइल) होता है। लंबे समय तक पकाने या सुखाने की आवश्यकता होती है। जहरीले <em>Gyromitra</em> के साथ भ्रमित किया जा सकता है, जिसमें मस्तिष्क जैसी टोपी होती है।</li>
    </ul>`
    }
  },
  { 
    id: 'morchella_conica', sci: 'Morchella Conica', img: '/images/mushrooms/morchella_conica.webp', 
    name: {"it":"Spugnola conica","en":"Black Morel","hi":"ब्लैक मोरेल (Spugnola conica)"},
    desc: {
      it: `<strong>Identificazione:</strong><br>
    <ul>
      <li><strong>Cappello:</strong> Mitra conica allungata. Alveoli allineati verticalmente in file parallele separate da costolature nerastre.</li>
      <li><strong>Imenio:</strong> Situato all'interno degli alveoli, colore bruno-grigiastro o bruno scuro.</li>
      <li><strong>Gambo:</strong> Cilindrico, furfuraceo, biancastro, completamente vuoto all'interno.</li>
      <li><strong>Carne:</strong> Fragile. Odore gradevole, sapore dolce.</li>
      <li><strong>Habitat:</strong> Primaverile (spesso precoce), predilige conifere, radure e boschi bruciati.</li>
      <li><strong>Attenzione:</strong> <em>TOSSICO DA CRUDO.</em> Da consumare solo previa prolungata cottura o bollitura.</li>
    </ul>`,
      en: `<strong>Identification:</strong><br>
    <ul>
      <li><strong>Cap:</strong> Elongated conical miter. Alveoli aligned vertically in parallel rows separated by blackish ribs.</li>
      <li><strong>Hymenium:</strong> Located inside the alveoli, brown-grayish or dark brown color.</li>
      <li><strong>Stem:</strong> Cylindrical, furfuraceous, whitish, completely empty inside.</li>
      <li><strong>Flesh:</strong> Fragile. Pleasant smell, sweet taste.</li>
      <li><strong>Habitat:</strong> Spring (often early), prefers conifers, clearings and burnt woods.</li>
      <li><strong>Caution:</strong> <em>TOXIC RAW.</em> To be consumed only after prolonged cooking or boiling.</li>
    </ul>`,
      hi: `<strong>पहचान:</strong><br>
    <ul>
      <li><strong>टोपी:</strong> लम्बी शंक्वाकार मेटर। एल्वियोली काले रंग की पसलियों द्वारा अलग समानांतर पंक्तियों में लंबवत संरेखित होते हैं।</li>
      <li><strong>हाइमेनियम:</strong> एल्वियोली के अंदर स्थित, भूरा-ग्रे या गहरा भूरा रंग।</li>
      <li><strong>तना:</strong> बेलनाकार, भूसीदार, सफेद, अंदर से पूरी तरह खाली।</li>
      <li><strong>मांस:</strong> नाजुक। सुखद गंध, मीठा स्वाद।</li>
      <li><strong>आवास:</strong> वसंत (अक्सर जल्दी), कोनिफ़र, क्लियरिंग और जली हुई लकड़ियों को तरजीह देता है।</li>
      <li><strong>चेतावनी:</strong> <em>कच्चा जहरीला।</em> लंबे समय तक पकाने या उबालने के बाद ही इसका सेवन किया जाना चाहिए।</li>
    </ul>`
    }
  },
  { 
    id: 'amanita_caesarea', sci: 'Amanita Caesarea', img: '/images/mushrooms/amanita_caesarea.webp', 
    name: {"it":"Ovolo buono","en":"Caesar's Mushroom","hi":"सीज़र मशरूम (Ovolo buono)"},
    desc: {
      it: `<strong>Identificazione:</strong><br>
    <ul>
      <li><strong>Cappello:</strong> 8-20 cm, carnoso, liscio e brillante, di colore rosso-arancio acceso. Margine tipicamente striato.</li>
      <li><strong>Imenio:</strong> Lamelle fitte, libere dal gambo, inconfondibilmente di colore giallo oro.</li>
      <li><strong>Gambo:</strong> Giallo oro, robusto, provvisto di un ampio anello giallo ricadente a fazzoletto.</li>
      <li><strong>Carne:</strong> Bianca (giallina sotto la cuticola), tenera, sapore delicatissimo, ottima anche cruda.</li>
      <li><strong>Habitat:</strong> Boschi caldi e soleggiati di querce e castagni. Fine estate / inizio autunno.</li>
      <li><strong>Attenzione:</strong> Da giovane si presenta chiuso a uovo bianco. <em>PERICOLO MORTALE:</em> Non raccogliere allo stato di ovolo chiuso per il rischio di confusione con la mortale <em>Amanita phalloides</em> o <em>Amanita muscaria</em>.</li>
    </ul>`,
      en: `<strong>Identification:</strong><br>
    <ul>
      <li><strong>Cap:</strong> 8-20 cm, fleshy, smooth and brilliant, bright red-orange color. Typically striated margin.</li>
      <li><strong>Hymenium:</strong> Dense gills, free from the stem, unmistakably golden yellow.</li>
      <li><strong>Stem:</strong> Golden yellow, robust, provided with a large yellow ring falling like a handkerchief.</li>
      <li><strong>Flesh:</strong> White (yellowish under the cuticle), tender, very delicate flavor, excellent even raw.</li>
      <li><strong>Habitat:</strong> Warm and sunny woods of oaks and chestnuts. Late summer / early autumn.</li>
      <li><strong>Caution:</strong> When young it is closed like a white egg. <em>MORTAL DANGER:</em> Do not pick in the closed egg stage due to the risk of confusion with the deadly <em>Amanita phalloides</em> or <em>Amanita muscaria</em>.</li>
    </ul>`,
      hi: `<strong>पहचान:</strong><br>
    <ul>
      <li><strong>टोपी:</strong> 8-20 सेमी, मांसल, चिकना और शानदार, चमकीला लाल-नारंगी रंग। आमतौर पर धारीदार किनारा।</li>
      <li><strong>हाइमेनियम:</strong> घने गलफड़े, तने से मुक्त, अचूक सुनहरे पीले रंग के।</li>
      <li><strong>तना:</strong> सुनहरा पीला, मजबूत, रूमाल की तरह गिरने वाली एक बड़ी पीली अंगूठी के साथ।</li>
      <li><strong>मांस:</strong> सफेद (छल्ली के नीचे पीला), कोमल, बहुत नाजुक स्वाद, कच्चा भी उत्कृष्ट।</li>
      <li><strong>आवास:</strong> ओक और चेस्टनट के गर्म और धूप वाले जंगल। देर से गर्मी / प्रारंभिक शरद ऋतु।</li>
      <li><strong>चेतावनी:</strong> युवा होने पर यह सफेद अंडे की तरह बंद होता है। <em>घातक खतरा:</em> घातक <em>Amanita phalloides</em> या <em>Amanita muscaria</em> के साथ भ्रम के जोखिम के कारण बंद अंडे के चरण में न चुनें।</li>
    </ul>`
    }
  },
  { 
    id: 'russula_cyanoxantha', sci: 'Russula Cyanoxantha', img: '/images/mushrooms/russula_cyanoxantha.webp', 
    name: {"it":"Colombina maggiore","en":"Charcoal Burner","hi":"चारकोल बर्नर (Colombina)"},
    desc: {
      it: `<strong>Identificazione:</strong><br>
    <ul>
      <li><strong>Cappello:</strong> 5-15 cm, sodo, colore molto variabile con sfumature di viola, verde, bluastro, grigio-acciaio.</li>
      <li><strong>Imenio:</strong> Lamelle bianche, molto flessibili. Sono <em>lardacee</em> (passandovi il dito non si spezzano ma si piegano unte).</li>
      <li><strong>Gambo:</strong> Bianco, sodo, cilindrico, leggermente spugnoso all'interno a maturità.</li>
      <li><strong>Carne:</strong> Bianca, soda e croccante. Sapore completamente dolce.</li>
      <li><strong>Habitat:</strong> Molto comune nei boschi di latifoglie, dall'estate all'autunno.</li>
      <li><strong>Attenzione:</strong> Confondibile con altre russule, ma il sapore dolce e la flessibilità unica delle lamelle lardacee garantiscono l'identificazione di questa specie eccellente.</li>
    </ul>`,
      en: `<strong>Identification:</strong><br>
    <ul>
      <li><strong>Cap:</strong> 5-15 cm, firm, very variable color with shades of purple, green, bluish, steel-gray.</li>
      <li><strong>Hymenium:</strong> White gills, very flexible. They are <em>lardaceous</em> (running a finger over them they do not break but bend greasily).</li>
      <li><strong>Stem:</strong> White, firm, cylindrical, slightly spongy inside at maturity.</li>
      <li><strong>Flesh:</strong> White, firm and crunchy. Completely sweet taste.</li>
      <li><strong>Habitat:</strong> Very common in deciduous woods, from summer to autumn.</li>
      <li><strong>Caution:</strong> Confusable with other russulas, but the sweet taste and the unique flexibility of the lardaceous gills guarantee the identification of this excellent species.</li>
    </ul>`,
      hi: `<strong>पहचान:</strong><br>
    <ul>
      <li><strong>टोपी:</strong> 5-15 सेमी, दृढ़, बैंगनी, हरे, नीले, स्टील-ग्रे के रंगों के साथ बहुत परिवर्तनशील रंग।</li>
      <li><strong>हाइमेनियम:</strong> सफेद गलफड़े, बहुत लचीले। वे <em>चर्बीदार (lardaceous)</em> होते हैं (उन पर उंगली चलाने से वे टूटते नहीं हैं बल्कि चिकनाई से मुड़ जाते हैं)।</li>
      <li><strong>तना:</strong> सफेद, दृढ़, बेलनाकार, परिपक्व होने पर अंदर थोड़ा स्पंजी।</li>
      <li><strong>मांस:</strong> सफेद, दृढ़ और कुरकुरा। पूरी तरह से मीठा स्वाद।</li>
      <li><strong>आवास:</strong> गर्मियों से शरद ऋतु तक, पर्णपाती जंगलों में बहुत आम है।</li>
      <li><strong>चेतावनी:</strong> अन्य रसुला के साथ भ्रमित किया जा सकता है, लेकिन मीठा स्वाद और चर्बीदार गलफड़ों का अनूठा लचीलापन इस उत्कृष्ट प्रजाति की पहचान की गारंटी देता है।</li>
    </ul>`
    }
  },
  { 
    id: 'macrolepiota_procera', sci: 'Macrolepiota procera', img: '/images/mushrooms/macrolepiota_procera.webp', 
    name: {"it":"Mazza di tamburo","en":"Parasol Mushroom","hi":"पैरासोल मशरूम (Mazza)"},
    desc: {
      it: `<strong>Identificazione:</strong><br>
    <ul>
      <li><strong>Cappello:</strong> 15-40 cm, inizialmente ovoidale, poi aperto a ombrello. Fondo biancastro ricoperto da grosse scaglie concentriche scure. Umbone centrale bruno liscio.</li>
      <li><strong>Imenio:</strong> Lamelle bianche o crema, fitte, distanti dal gambo.</li>
      <li><strong>Gambo:</strong> Slanciato (fino a 40 cm), legnoso, bulboso alla base. Superficie marcatamente tigrata/zebrata di bruno.</li>
      <li><strong>Carne:</strong> Bianca, odore tenue di nocciola. Il gambo è fibroso e si scarta.</li>
      <li><strong>Habitat:</strong> Prati, margini di boschi, radure erbose. Estivo/autunnale.</li>
      <li><strong>Attenzione:</strong> <em>TOSSICO DA CRUDO.</em> Va cotto bene. Non confondere con le Lepiota di piccola taglia (sotto i 10 cm), che possono essere velenose mortali, e che non presentano gambo zebrato.</li>
    </ul>`,
      en: `<strong>Identification:</strong><br>
    <ul>
      <li><strong>Cap:</strong> 15-40 cm, initially ovoid, then open like an umbrella. Whitish background covered by large dark concentric scales. Smooth brown central umbo.</li>
      <li><strong>Hymenium:</strong> White or cream gills, dense, distant from the stem.</li>
      <li><strong>Stem:</strong> Slender (up to 40 cm), woody, bulbous at the base. Markedly tiger/zebra-striped brown surface.</li>
      <li><strong>Flesh:</strong> White, faint nutty smell. The stem is fibrous and is discarded.</li>
      <li><strong>Habitat:</strong> Meadows, wood margins, grassy clearings. Summer/autumn.</li>
      <li><strong>Caution:</strong> <em>TOXIC RAW.</em> Must be cooked well. Do not confuse with small-sized Lepiotas (under 10 cm), which can be deadly poisonous, and which do not have a zebra-striped stem.</li>
    </ul>`,
      hi: `<strong>पहचान:</strong><br>
    <ul>
      <li><strong>टोपी:</strong> 15-40 सेमी, शुरू में अंडाकार, फिर छतरी की तरह खुली। सफेद पृष्ठभूमि बड़े काले संकेंद्रित शल्क (scales) द्वारा कवर की गई। चिकनी भूरी केंद्रीय गर्भनाल (umbo)।</li>
      <li><strong>हाइमेनियम:</strong> सफेद या क्रीम गलफड़े, घने, तने से दूर।</li>
      <li><strong>तना:</strong> पतला (40 सेमी तक), लकड़ी का, आधार पर उभड़ा हुआ। स्पष्ट रूप से बाघ/ज़ेबरा-धारीदार भूरे रंग की सतह।</li>
      <li><strong>मांस:</strong> सफेद, हल्की अखरोट की गंध। तना रेशेदार होता है और इसे फेंक दिया जाता है।</li>
      <li><strong>आवास:</strong> घास के मैदान, लकड़ी के किनारे, घास की सफाई। गर्मी/शरद ऋतु।</li>
      <li><strong>चेतावनी:</strong> <em>कच्चा जहरीला।</em> अच्छी तरह से पकाया जाना चाहिए। छोटे आकार के लेपियोटा (10 सेमी से कम) के साथ भ्रमित न करें, जो घातक जहरीले हो सकते हैं, और जिनमें ज़ेबरा-धारीदार तना नहीं होता है।</li>
    </ul>`
    }
  }
];

let currentSpeciesId = null;

function renderSpeciesCards() {
  const container = document.getElementById('species-list');
  if (!container) return;
  container.innerHTML = '';

  SPECIES_DATA.forEach(sp => {
    const card = document.createElement('div');
    card.className = `species-card ${sp.id === currentSpeciesId ? 'active' : ''}`;
    
    const localizedName = sp.name[currentLang] || sp.name['en'];
    const localizedDesc = sp.desc[currentLang] || sp.desc['en'];
    
    card.onclick = () => {
      currentSpeciesId = sp.id;
      renderSpeciesCards();
      
      // Hide species list, show details panel and legend
      document.getElementById('panel-species').style.display = 'none';
      document.getElementById('panel-details').style.display = 'flex';
      document.getElementById('map-legend').style.display = 'block';

      // For Mobile: trigger the full screen map layout
      document.getElementById('app').classList.add('mobile-map-active');
      setTimeout(() => { 
        if (map) {
          map.resize();
          const regionCoords = {
            'asiago': [11.510, 45.875],
            'recoaro': [11.220, 45.700],
            'lavarone': [11.270, 45.940]
          };
          if (regionCoords[selectedRegion]) {
            map.flyTo({ center: regionCoords[selectedRegion], zoom: 12, duration: 0 });
          }
        }
      }, 50); // Important: Resize mapLibre after display: block

      if (marker) {
        marker.remove();
        marker = null;
      }
      if (currentPopup) {
        currentPopup.remove();
        currentPopup = null;
      }
      const predPanel = document.getElementById('prediction-panel');
      if (predPanel) {
        const t = i18n[currentLang];
        predPanel.innerHTML = `<p>${t.click_map}</p>`;
      }
        loadRegionGrid();
    };

    card.innerHTML = `
      <img src="${sp.img}" class="species-img" alt="${localizedName}">
      <div class="species-info">
        <span class="species-name">${localizedName}</span>
        <span class="species-scientific">${sp.sci}</span>
      </div>
      <button class="info-btn" title="Identificazione" style="margin-left:auto; background:transparent; border:none; cursor:pointer; color: var(--text-light); padding:5px; display: flex; align-items: center; justify-content: center;">
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="transition: stroke 0.2s; opacity: 0.8;" onmouseover="this.style.opacity='1'; this.style.stroke='var(--primary)'" onmouseout="this.style.opacity='0.8'; this.style.stroke='currentColor'">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="16" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
      </button>
    `;

    const infoBtn = card.querySelector('.info-btn');
    infoBtn.onclick = (e) => {
      e.stopPropagation(); // Prevent card selection

      const modal = document.getElementById('info-modal');
      document.getElementById('modal-img').src = sp.img;
      document.getElementById('modal-title').innerText = localizedName;
      document.getElementById('modal-subtitle').innerText = sp.sci;
      document.getElementById('modal-desc').innerHTML = localizedDesc;

      modal.style.display = 'flex';
    };

    container.appendChild(card);
  });
}

// Modal closing logic
const modal = document.getElementById('info-modal');
const closeBtn = document.getElementById('modal-close');

if (closeBtn) {
  closeBtn.onclick = () => {
    modal.style.display = 'none';
  };
}

// Close if clicked outside content
if (modal) {
  modal.onclick = (e) => {
    if (e.target === modal) {
      modal.style.display = 'none';
    }
  };
}

// Back button logic
document.getElementById('btn-back').addEventListener('click', () => {
  document.getElementById('panel-details').style.display = 'none';
  document.getElementById('panel-records').style.display = 'none';
  document.getElementById('panel-species').style.display = 'flex';
  document.getElementById('map-legend').style.display = 'none';
  
  currentSpeciesId = null;
  renderSpeciesCards();
  
  if (map.getSource('predictions')) {
    map.getSource('predictions').setData({ type: 'FeatureCollection', features: [] });
  }
});

document.getElementById('btn-records-back').addEventListener('click', () => {
  document.getElementById('panel-records').style.display = 'none';
  document.getElementById('panel-species').style.display = 'flex';
});

document.getElementById('btn-records').addEventListener('click', async () => {
  document.getElementById('panel-species').style.display = 'none';
  document.getElementById('panel-details').style.display = 'none';
  document.getElementById('panel-records').style.display = 'flex';
  
  const listEl = document.getElementById('records-list');
  listEl.innerHTML = '<p>Caricamento...</p>';
  
  try {
    const res = await fetch(`${API_URL}/records/all`);
    if (!res.ok) throw new Error("Failed to load");
    const records = await res.json();
    
    // Filter only valid founds
    const foundRecords = records.filter(r => r.action === 'found');
    
    if (foundRecords.length === 0) {
      listEl.innerHTML = '<p>Nessun ritrovamento registrato.</p>';
      return;
    }
    
    // Sort by newest first
    foundRecords.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    listEl.innerHTML = '';
    foundRecords.forEach(rec => {
      const sp = SPECIES_DATA.find(s => s.id === rec.species_id);
      const spName = sp ? (sp.name[currentLang] || sp.name['en']) : rec.species_id;
      const dateStr = new Date(rec.timestamp).toLocaleString(currentLang);
      
      const card = document.createElement('div');
      card.style.padding = '10px';
      card.style.background = 'white';
      card.style.borderRadius = '8px';
      card.style.border = '1px solid var(--border)';
      card.style.display = 'flex';
      card.style.alignItems = 'center';
      card.style.gap = '10px';
      
      if (sp) {
        card.innerHTML = `
          <img src="${sp.img}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">
          <div style="flex: 1;">
            <div style="font-weight: 600; font-size: 0.95rem;">${spName}</div>
            <div style="font-size: 0.75rem; color: var(--text-light);">${dateStr}</div>
            <div style="font-size: 0.75rem; color: var(--primary); font-weight: bold; margin-top: 2px;">👤 ${rec.username || 'Anonymous'}</div>
          </div>
        `;
      } else {
        card.innerHTML = `<div>${rec.species_id} <br> ${dateStr} <br> 👤 ${rec.username || 'Anonymous'}</div>`;
      }
      
      listEl.appendChild(card);
    });
    
  } catch (err) {
    listEl.innerHTML = '<p style="color: red;">Errore nel caricamento.</p>';
  }
});

// Initial render
renderSpeciesCards();

let isFetchingGrids = false;
const gridCache = {};

function updateMapPredictions() {
  const aggregatedFeatures = [];
  for (const key in gridCache) {
    if (key.startsWith(`${currentSpeciesId}_`)) {
      aggregatedFeatures.push(...gridCache[key].features);
    }
  }
  const combinedGeoJSON = {
    type: 'FeatureCollection',
    features: aggregatedFeatures
  };
  
  if (map.getSource('predictions')) {
    map.getSource('predictions').setData(combinedGeoJSON);
  } else {
    addPredictionLayer(combinedGeoJSON);
  }
}

async function loadRegionGrid() {
  if (isFetchingGrids) return;
  if (!currentSpeciesId) return;

  const cacheKey = `${currentSpeciesId}_${selectedRegion}`;
  
  // Check cache first
  if (gridCache[cacheKey]) {
    updateMapPredictions();
    return;
  }

  isFetchingGrids = true;
  document.getElementById('loading-overlay').style.display = 'flex';

  try {
    // Fetch only the selected region
    const res = await fetch(`${API_URL}/predict/grid/${selectedRegion}/${currentSpeciesId}`);
    const geojson = res.ok ? await res.json() : null;

    if (geojson && geojson.features) {
      gridCache[cacheKey] = {
        type: 'FeatureCollection',
        features: geojson.features
      };
    } else {
      gridCache[cacheKey] = { type: 'FeatureCollection', features: [] };
    }

    updateMapPredictions();

  } catch (err) {
    console.error("Failed to load grids", err);
  } finally {
    isFetchingGrids = false;
    document.getElementById('loading-overlay').style.display = 'none';
  }
}

function addPredictionLayer(geojsonData) {
  map.addSource('predictions', {
    type: 'geojson',
    data: geojsonData
  });

  const style = map.getStyle();
  let beforeId = undefined;
  if (style && style.layers) {
    const symbolLayer = style.layers.find(l => l.type === 'symbol');
    if (symbolLayer) beforeId = symbolLayer.id;
  }

  map.addLayer({
    'id': 'predictions-fill',
    'type': 'fill',
    'source': 'predictions',
    'paint': {
      'fill-color': [
        'step',
        ['get', 'score'],
        'rgba(106, 27, 154, 0.0)',
        0.01, 'rgba(206, 147, 216, 0.6)',
        0.41, 'rgba(156, 39, 176, 0.7)',
        0.61, 'rgba(106, 27, 154, 0.85)',
        0.81, 'rgba(74, 20, 140, 1.0)'
      ],
      'fill-opacity': 1.0,
      'fill-outline-color': 'rgba(0, 0, 0, 0.15)'
    }
  }, beforeId);
}

async function fetchPrediction(lat, lon, forcedScore = null) {
  const speciesId = currentSpeciesId;
  const t = i18n[currentLang];

  if (currentPopup) currentPopup.remove();
  currentPopup = new maplibregl.Popup({ closeOnClick: false, maxWidth: '380px' })
    .setLngLat([lon, lat])
    .setHTML(`<p style="padding: 10px;">${t.fetching}</p>`)
    .addTo(map);

  // Place marker
  if (marker) marker.remove();
  marker = new maplibregl.Marker().setLngLat([lon, lat]).addTo(map);

  try {
    const response = await fetch(`${API_URL}/predict/point`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat, lon, species_id: speciesId })
    });

    if (!response.ok) throw new Error('API error');

    const data = await response.json();

    // Ensure the score perfectly matches the grid box the user tapped on
    if (forcedScore !== null) {
      data.score = forcedScore;
    }

    renderPrediction(data);
  } catch (err) {
    console.error(err);
    if (currentPopup) currentPopup.setHTML(`<p style="padding: 10px;">${t.error}</p>`);
  }
}

function renderPrediction(data) {
  const t = i18n[currentLang];

  if (data.score === 0.0 || (data.score === 0.0 && data.message)) {
    const msg = data.message || "Condizioni non adatte in quest'area.";
    const swipeHTML = `
      <div style="max-height: 550px; overflow-y: auto; overflow-x: hidden; padding-right: 8px; color: var(--text-dark);">
        <p style="padding: 10px; font-weight: bold; text-align: center; margin: 0;">${msg}</p>
        <h3 style="font-size: 0.9rem; margin-top: 15px; margin-bottom: 5px;">${t.found}</h3>
        <div style="display: flex; gap: 12px; overflow-x: auto; padding-bottom: 10px; margin-top: 5px; scrollbar-width: none; -ms-overflow-style: none;">
          ${SPECIES_DATA.map(sp => {
            const spName = sp.name[currentLang] || sp.name['en'];
            return `
              <div data-species="${sp.id}" style="min-width: 65px; max-width: 65px; text-align: center; cursor: pointer; user-select: none;" 
                   onclick="handleSwipeRecord(this, ${data.lat}, ${data.lon}, '${sp.id}')">
                <img src="${sp.img}" id="swipe-img-${sp.id}" style="width: 56px; height: 56px; border-radius: 50%; object-fit: cover; border: 3px solid transparent; transition: 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.1); pointer-events: none;">
                <div style="font-size: 11px; line-height: 1.2; margin-top: 5px; font-weight: 600; white-space: normal; word-wrap: break-word;">${spName}</div>
              </div>
            `;
          }).join('')}
          <div style="min-width: 80px; max-width: 80px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding-top: 5px;">
            <input type="text" id="custom-mushroom-input" placeholder="Other..." maxlength="30" style="width: 100%; padding: 6px; border-radius: 6px; border: 1px solid var(--border); font-size: 11px; text-align: center; margin-bottom: 5px; outline: none; box-sizing: border-box;" 
                   onkeypress="if(event.key === 'Enter') { handleCustomMushroom(this.value, ${data.lat}, ${data.lon}); this.value = ''; }">
            <button onclick="let v = document.getElementById('custom-mushroom-input').value; if(v) { handleCustomMushroom(v, ${data.lat}, ${data.lon}); document.getElementById('custom-mushroom-input').value = ''; }" 
                    style="font-size: 10px; padding: 4px 8px; border-radius: 6px; border: none; background: var(--primary); color: white; cursor: pointer; width: 100%;">+ Add</button>
          </div>
        </div>
      </div>
    `;
    if (currentPopup) currentPopup.setHTML(swipeHTML);
    return;
  }

  const scorePct = Math.round(data.score * 100);
  let scoreColor = '#ce93d8';
  let scoreText = t.popup_poor;

  if (scorePct >= 80) { scoreColor = '#4a148c'; scoreText = t.popup_optimal; }
  else if (scorePct >= 60) { scoreColor = '#6a1b9a'; scoreText = t.popup_good; }
  else if (scorePct >= 40) { scoreColor = '#9c27b0'; scoreText = t.popup_medium; }

  // Convert Corine string to a simulated percentage list for the premium look
  let treeList = data.tree_type || 'Unknown';
  let treeHTML = '';
  if (treeList.includes('Broadleaved')) {
    treeHTML = `
      <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border); padding: 4px 0;"><span>${t.popup_broadleaved_1}</span><span style="font-weight: bold;">45%</span></div>
      <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border); padding: 4px 0;"><span>${t.popup_broadleaved_2}</span><span style="font-weight: bold;">35%</span></div>
      <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border); padding: 4px 0;"><span>${t.popup_broadleaved_3}</span><span style="font-weight: bold;">20%</span></div>`;
  } else if (treeList.includes('Coniferous')) {
    treeHTML = `
      <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border); padding: 4px 0;"><span>${t.popup_conifer_1}</span><span style="font-weight: bold;">60%</span></div>
      <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border); padding: 4px 0;"><span>${t.popup_conifer_2}</span><span style="font-weight: bold;">30%</span></div>
      <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border); padding: 4px 0;"><span>${t.popup_conifer_3}</span><span style="font-weight: bold;">10%</span></div>`;
  } else if (treeList.includes('Mixed')) {
    treeHTML = `
      <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border); padding: 4px 0;"><span>${t.popup_mixed_1}</span><span style="font-weight: bold;">40%</span></div>
      <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border); padding: 4px 0;"><span>${t.popup_mixed_2}</span><span style="font-weight: bold;">40%</span></div>
      <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border); padding: 4px 0;"><span>${t.popup_mixed_3}</span><span style="font-weight: bold;">20%</span></div>`;
  } else {
    treeHTML = `<div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border); padding: 4px 0;"><span>${treeList}</span><span style="font-weight: bold;">100%</span></div>`;
  }

  const today = new Date();
  const days = [t.popup_today];
  for (let i = 1; i < 8; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    days.push(`${d.getDate()}/${d.getMonth() + 1}`);
  }

  const html = `
    <div style="max-height: 550px; overflow-y: auto; overflow-x: hidden; padding-right: 8px; color: var(--text-dark);">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
        <div>
          <h2 style="margin: 0; font-size: 1.2rem;">${t.popup_title}</h2>
        </div>
      </div>
    
    <div style="display: flex; align-items: center; font-size: 0.85rem; color: #555; margin-bottom: 15px; border-bottom: 1px solid var(--border); padding-bottom: 8px;">
      <span>${data.lat.toFixed(6)}, ${data.lon.toFixed(6)}</span>
      <span style="margin-left: 10px; cursor: pointer; font-size: 1.1rem;" title="Copy Coordinates" onclick="navigator.clipboard.writeText('${data.lat.toFixed(6)}, ${data.lon.toFixed(6)}')">📋</span>
      <a href="https://www.google.com/maps/dir/?api=1&destination=${data.lat},${data.lon}" target="_blank" style="margin-left: 10px; cursor: pointer; font-size: 1.1rem; text-decoration: none;" title="Navigate Here">📍</a>
    </div>
    
    <div style="display: flex; flex-direction: column; align-items: center; margin-bottom: 10px;">
      <div style="background: ${scoreColor}; color: white; width: 65px; height: 65px; display: flex; flex-direction: column; justify-content: center; align-items: center; border-radius: 12px; font-weight: bold; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <span style="font-size: 1.8rem; line-height: 1; margin-top: 5px;">${scorePct}</span>
        <span style="font-size: 0.65rem; border-top: 1px solid rgba(255,255,255,0.5); padding-top: 2px; margin-top: 2px; width: 75%; text-align: center;">/100</span>
      </div>
      <span style="margin-top: 5px; font-weight: bold; font-size: 0.85rem;">${t.popup_zone} ${scoreText.toLowerCase()}</span>
    </div>
    
    <h3 style="font-size: 0.9rem; margin-bottom: 5px; border-bottom: 2px solid var(--border); padding-bottom: 3px;">${t.popup_structure}</h3>
    <table style="width: 100%; border-collapse: collapse; font-size: 0.75rem; margin-bottom: 10px;">
      <tr style="border-bottom: 1px solid var(--border);">
        <td style="padding: 2px 0;">${t.popup_altitude}</td>
        <td style="text-align: right; font-weight: bold;">${Math.round(data.terrain.elevation)} m</td>
      </tr>
      <tr style="border-bottom: 1px solid var(--border);">
        <td style="padding: 2px 0;">${t.popup_soil_ph}</td>
        <td style="text-align: right; font-weight: bold;">${(data.soil_ph || 0).toFixed(1)}</td>
      </tr>
      <tr style="border-bottom: 1px solid var(--border);">
        <td style="padding: 2px 0;">${t.popup_soil_temp}</td>
        <td style="text-align: right; font-weight: bold;">${(data.weather_summary?.current_soil_temp_6cm || 0).toFixed(1)} °C</td>
      </tr>
        <tr style="border-bottom: 1px solid var(--border);">
        <td style="padding: 2px 0;">${t.popup_soil_moist}</td>
        <td style="text-align: right; font-weight: bold;">${Math.round((data.weather_summary?.current_soil_moisture || 0) * 100)}%</td>
      </tr>
      <tr style="border-bottom: 1px solid var(--border);">
        <td style="padding: 2px 0;">${t.popup_air_humid}</td>
        <td style="text-align: right; font-weight: bold;">${Math.round(data.weather_summary.current_humidity)}%</td>
      </tr>
      <tr style="border-bottom: 1px solid var(--border);">
        <td style="padding: 2px 0;">${t.popup_rain_7d}</td>
        <td style="text-align: right; font-weight: bold;">${Math.round(data.weather_summary.recent_rainfall_mm)} mm</td>
      </tr>
      
    </table>
    
    <h3 style="font-size: 0.9rem; margin-bottom: 5px; border-bottom: 2px solid var(--border); padding-bottom: 3px;">${t.popup_trees}</h3>
    <div style="font-size: 0.75rem; margin-bottom: 10px;">
      ${treeHTML}
    </div>
    
    <h3 style="font-size: 0.9rem; margin-bottom: 5px;">${t.popup_forecast}</h3>
    <div style="background: rgba(0,0,0,0.02); padding: 10px 5px 5px 5px; border-radius: 8px; border: 1px solid var(--border);">
      ${generateSparkline(data.forecast.future_scores, days)}
    </div>
    
    <h3 style="font-size: 0.9rem; margin-top: 15px; margin-bottom: 5px;">${t.found}</h3>
    <div style="display: flex; gap: 12px; overflow-x: auto; padding-bottom: 10px; margin-top: 5px; scrollbar-width: none; -ms-overflow-style: none;">
      ${SPECIES_DATA.map(sp => {
        const spName = sp.name[currentLang] || sp.name['en'];
        return `
          <div data-species="${sp.id}" style="min-width: 65px; max-width: 65px; text-align: center; cursor: pointer; user-select: none;" 
               onclick="handleSwipeRecord(this, ${data.lat}, ${data.lon}, '${sp.id}')">
            <img src="${sp.img}" id="swipe-img-${sp.id}" style="width: 56px; height: 56px; border-radius: 50%; object-fit: cover; border: 3px solid transparent; transition: 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.1); pointer-events: none;">
            <div style="font-size: 11px; line-height: 1.2; margin-top: 5px; font-weight: 600; white-space: normal; word-wrap: break-word;">${spName}</div>
          </div>
        `;
      }).join('')}
      
      <!-- Custom Mushroom Input -->
      <div style="min-width: 80px; max-width: 80px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding-top: 5px;">
        <input type="text" id="custom-mushroom-input" placeholder="Other..." maxlength="30" style="width: 100%; padding: 6px; border-radius: 6px; border: 1px solid var(--border); font-size: 11px; text-align: center; margin-bottom: 5px; outline: none; box-sizing: border-box;" 
               onkeypress="if(event.key === 'Enter') { handleCustomMushroom(this.value, ${data.lat}, ${data.lon}); this.value = ''; }">
        <button onclick="let v = document.getElementById('custom-mushroom-input').value; if(v) { handleCustomMushroom(v, ${data.lat}, ${data.lon}); document.getElementById('custom-mushroom-input').value = ''; }" 
                style="font-size: 10px; padding: 4px 8px; border-radius: 6px; border: none; background: var(--primary); color: white; cursor: pointer; width: 100%;">+ Add</button>
      </div>
    </div>
    </div>
  `;

  if (currentPopup) {
    currentPopup.setHTML(html);
  }
}

function generateSparkline(scores, labels) {
  if (!scores || scores.length === 0) return '';
  const validData = scores.map(s => Math.round(s * 100));

  const svgWidth = 340;
  const svgHeight = 120; // Taller to match the UI screenshot
  const paddingLeft = 30; // Space for the % text
  const graphWidth = svgWidth - paddingLeft;

  const points = validData.map((val, i) => {
    const x = paddingLeft + (i / (validData.length - 1)) * graphWidth;
    const y = svgHeight - (val / 100) * svgHeight; // Fixed scale 0-100 for percentage
    return `${x},${y}`;
  }).join(' ');

  // Background grid lines (100, 80, 60, 40, 20, 0) and text labels
  return `
    <div style="position: relative;">
      <svg viewBox="0 0 ${svgWidth} ${svgHeight}" style="width: 100%; height: ${svgHeight}px; overflow: visible;">
        <!-- Y-axis text -->
        <text x="0" y="8" fill="#999" font-size="8" font-weight="bold">100</text>
        <text x="0" y="${(svgHeight * 0.20) + 3}" fill="#999" font-size="8" font-weight="bold">80</text>
        <text x="0" y="${(svgHeight * 0.40) + 3}" fill="#999" font-size="8" font-weight="bold">60</text>
        <text x="0" y="${(svgHeight * 0.60) + 3}" fill="#999" font-size="8" font-weight="bold">40</text>
        <text x="0" y="${(svgHeight * 0.80) + 3}" fill="#999" font-size="8" font-weight="bold">20</text>
        <text x="0" y="${svgHeight - 2}" fill="#999" font-size="8" font-weight="bold">0</text>

        <!-- Grid lines -->
        <line x1="${paddingLeft}" y1="0" x2="${svgWidth}" y2="0" stroke="var(--border)" stroke-width="1" stroke-dasharray="4,4" />
        <line x1="${paddingLeft}" y1="${svgHeight * 0.20}" x2="${svgWidth}" y2="${svgHeight * 0.20}" stroke="var(--border)" stroke-width="1" stroke-dasharray="4,4" />
        <line x1="${paddingLeft}" y1="${svgHeight * 0.40}" x2="${svgWidth}" y2="${svgHeight * 0.40}" stroke="var(--border)" stroke-width="1" stroke-dasharray="4,4" />
        <line x1="${paddingLeft}" y1="${svgHeight * 0.60}" x2="${svgWidth}" y2="${svgHeight * 0.60}" stroke="var(--border)" stroke-width="1" stroke-dasharray="4,4" />
        <line x1="${paddingLeft}" y1="${svgHeight * 0.80}" x2="${svgWidth}" y2="${svgHeight * 0.80}" stroke="var(--border)" stroke-width="1" stroke-dasharray="4,4" />
        <line x1="${paddingLeft}" y1="${svgHeight}" x2="${svgWidth}" y2="${svgHeight}" stroke="var(--border)" stroke-width="1" />
        
        <!-- Sparkline -->
        <polyline points="${points}" fill="none" stroke="#2e7d32" stroke-width="2.5" />
        ${validData.map((val, i) => {
    const x = paddingLeft + (i / (validData.length - 1)) * graphWidth;
    const y = svgHeight - (val / 100) * svgHeight;
    return `<circle cx="${x}" cy="${y}" r="3.5" fill="#2e7d32"><title>${val}%</title></circle>`;
  }).join('')}
      </svg>
      <div style="display: flex; justify-content: space-between; margin-top: 10px; font-size: 0.7rem; color: #777; font-weight: bold; margin-left: ${paddingLeft}px;">
        ${labels.map(l => `<span style="text-align: center;">${l.replace('/', '<br>')}</span>`).join('')}
      </div>
    </div>
  `;
}

// Fetch Community Buzz
async function fetchBuzz() {
  const t = i18n[currentLang];
  try {
    const res = await fetch(`${API_URL}/buzz`);
    const data = await res.json();
    const panel = document.getElementById('buzz-panel');
    
    // Translate level
    let level = data.buzz.level;
    if (level === 'Calmo') level = t.buzz_calm;
    if (level === 'Moderato') level = t.buzz_mod;
    if (level === 'Frenetico') level = t.buzz_high;
    
    // Translate message
    let msg = data.buzz.message;
    if (msg.includes('Nessuna notizia')) msg = t.buzz_none;

    let html = `
      <div style="margin-bottom: 10px; display: flex; align-items: center;">
        <span class="color-box" style="background: ${data.buzz.color};"></span>
        <strong style="margin-left: 5px;">${level}</strong>
      </div>
      <p style="font-size: 0.85rem; margin-bottom: 15px;">${msg}</p>
    `;

    if (data.alerts && data.alerts.length > 0) {
      html += `<ul style="list-style: none; padding: 0; font-size: 0.8rem;">`;
      data.alerts.forEach(alert => {
        html += `<li class="news-flash" style="margin-bottom: 12px; border-left: 3px solid var(--primary); padding-left: 10px; background: rgba(255,255,255,0.5); padding: 8px 8px 8px 12px; border-radius: 0 6px 6px 0;">
          <a href="${alert.link}" target="_blank" style="color: #0066cc; text-decoration: none; font-size: 0.95rem;"><strong>${alert.title}</strong></a>
          <br><span style="color: var(--text-light); font-size: 0.8rem; display: block; margin-top: 4px;">
            📰 ${alert.source} • 📍 ${alert.area}
            <br>🕒 <em>${alert.date || t.buzz_recent}</em>
          </span>
        </li>`;
      });
      html += `</ul>`;
    }
    panel.innerHTML = html;
    const mobilePanel = document.getElementById('mobile-buzz-panel');
    if (mobilePanel) mobilePanel.innerHTML = html;
  } catch (err) {
    document.getElementById('buzz-panel').innerHTML = `<p>${t.buzz_err}</p>`;
    const mobilePanel = document.getElementById('mobile-buzz-panel');
    if (mobilePanel) mobilePanel.innerHTML = `<p>${t.buzz_err}</p>`;
  }
}

// Load buzz on startup
fetchBuzz();



function applyTranslations() {
  const t = i18n[currentLang];

  const lblLoading = document.getElementById('lbl-loading');
  if (lblLoading) lblLoading.innerText = t.popup_loading;

  const lblSpecies = document.getElementById('lbl-species');
  if (lblSpecies) lblSpecies.innerText = t.lbl_species;
  
  const btnBackDesktop = document.getElementById('btn-back');
  if (btnBackDesktop) btnBackDesktop.innerHTML = t.btn_back_desktop;

  const btnBackMobile = document.getElementById('btn-mobile-back');
  if (btnBackMobile) btnBackMobile.innerText = t.btn_back_mobile;
  
  // Update location headers
  const lblLocations = document.getElementById('lbl-locations');
  if (lblLocations) lblLocations.innerText = t.lbl_locations;
  
  const lblBuzz = document.getElementById('lbl-buzz');
  if (lblBuzz) lblBuzz.innerText = t.community_buzz;
  
  const locHeaders = document.querySelectorAll('h3');
  locHeaders.forEach(h => {
    if (h.innerText.includes('Localit') || h.innerText.includes('Location') || h.innerText.includes('स्थान')) h.innerText = t.lbl_locations;
    if (h.innerText.includes('Community') || h.innerText.includes('समुदाय')) h.innerText = t.community_buzz;
  });

  const btnMyLoc = document.getElementById('btn-my-loc');
  if (btnMyLoc) btnMyLoc.innerText = t.btn_my_loc;
  
  const mobileLocBtn = document.getElementById('btn-my-loc-mobile');
  if (mobileLocBtn) mobileLocBtn.innerText = t.btn_my_loc;
  
  const lblPrediction = document.getElementById('lbl-prediction');
  if (lblPrediction) lblPrediction.innerText = t.lbl_prediction;
  
  // Map buttons
  const setBtnText = (id, text) => {
    const b = document.getElementById(id);
    if(b) b.innerText = text;
  };
  setBtnText('btn-streets', t.btn_streets);
  setBtnText('btn-satellite', t.btn_satellite);
  setBtnText('btn-streets-mobile', t.btn_streets);
  setBtnText('btn-satellite-mobile', t.btn_satellite);

  // Vault UI
  const vTitle = document.querySelector('#vault-lock h1');
  if(vTitle) vTitle.innerText = t.vault_title;
  const vSub = document.querySelector('#vault-lock p');
  if(vSub) vSub.innerText = t.vault_subtitle;
  const vBtn = document.getElementById('btn-unlock');
  if(vBtn) vBtn.innerText = t.vault_btn;
  const vErr = document.getElementById('vault-error');
  if(vErr) vErr.innerText = t.vault_err;
  
  const lblLegend = document.getElementById('lbl-legend');
  if (lblLegend) lblLegend.innerText = t.lbl_legend;
  
  const lblLegendMobile = document.getElementById('lbl-legend-mobile');
  if (lblLegendMobile) lblLegendMobile.innerText = t.lbl_growth;
  
  let langText = 'IT 🇮🇹';
  if (currentLang === 'en') langText = 'EN 🇬🇧';
  if (currentLang === 'hi') langText = 'HI 🇮🇳';
  
  document.getElementById('lang-toggle').innerText = langText;
  const mobileLangBtn = document.getElementById('btn-lang-mobile');
  if (mobileLangBtn) mobileLangBtn.innerText = langText;

  renderSpeciesCards(); // Re-render species list with new language names/descriptions

  const predPanel = document.getElementById('prediction-panel');
  if (!marker) {
    if (predPanel) predPanel.innerHTML = `<p>${t.click_map}</p>`;
  } else {
    // refresh current prediction
    const lngLat = marker.getLngLat();
    fetchPrediction(lngLat.lat, lngLat.lng);
  }
  
  fetchBuzz();
}

const toggleLangHandler = () => {
  if (currentLang === 'it') currentLang = 'en';
  else if (currentLang === 'en') currentLang = 'hi';
  else currentLang = 'it';
  applyTranslations();
};

document.getElementById('lang-toggle').addEventListener('click', toggleLangHandler);
const btnLangMobile = document.getElementById('btn-lang-mobile');
if (btnLangMobile) btnLangMobile.addEventListener('click', toggleLangHandler);

// -----------------------------------------
// PWA & Offline Support
// -----------------------------------------

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(reg => {
      console.log('Service Worker registered successfully.', reg);
    }).catch(err => {
      console.error('Service Worker registration failed:', err);
    });
  });
}



function updateOnlineStatus() {
  const offlineIndicator = document.getElementById('offline-indicator');
  if (offlineIndicator) {
    offlineIndicator.style.display = navigator.onLine ? 'none' : 'block';
  }
}

window.handleCustomMushroom = function(val, lat, lon) {
  val = val.trim();
  if (!val) return;
  // Format as a custom species_id
  const species_id = val.toLowerCase().replace(/\\s+/g, '_');
  
  window.recordSighting(lat, lon, species_id, 'found');
  
  // Show quick visual feedback
  const input = document.getElementById('custom-mushroom-input');
  if (input && input.nextElementSibling) {
    const btn = input.nextElementSibling;
    const oldText = btn.innerText;
    btn.innerText = "Added ✓";
    btn.style.background = "#4caf50";
    setTimeout(() => {
      btn.innerText = oldText;
      btn.style.background = "var(--primary)";
    }, 2000);
  }
};

window.recordSighting = async function(lat, lon, species_id, action) {
  const record = { lat, lon, species_id, action, username: userName, timestamp: new Date().toISOString() };
  if (!navigator.onLine) {
    const offlineRecords = JSON.parse(localStorage.getItem('fungi_offline_records') || '[]');
    offlineRecords.push(record);
    localStorage.setItem('fungi_offline_records', JSON.stringify(offlineRecords));
    return;
  }
  
  try {
    await fetch(`${API_URL}/record`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record)
    });
  } catch (err) {
    console.error("Failed to record", err);
    const offlineRecords = JSON.parse(localStorage.getItem('fungi_offline_records') || '[]');
    offlineRecords.push(record);
    localStorage.setItem('fungi_offline_records', JSON.stringify(offlineRecords));
  }
};

window.handleSwipeRecord = function(el, lat, lon, species_id) {
  const now = new Date().getTime();
  const lastClick = parseInt(el.dataset.lastClick || "0");
  el.dataset.lastClick = now;

  const imgEl = document.getElementById(`swipe-img-${species_id}`);

  if (now - lastClick < 400) {
    // Double tap - UNDO
    imgEl.style.borderColor = 'transparent';
    imgEl.style.opacity = '1';
    window.recordSighting(lat, lon, species_id, 'undo_found');
  } else {
    // Single tap - wait briefly to confirm it's not a double tap
    setTimeout(() => {
      if (parseInt(el.dataset.lastClick) === now) {
        // Confirmed single tap
        imgEl.style.borderColor = '#4CAF50';
        imgEl.style.opacity = '0.7';
        window.recordSighting(lat, lon, species_id, 'found');
      }
    }, 450);
  }
};


window.syncOfflineRecords = async function() {
  const offlineRecords = JSON.parse(localStorage.getItem('fungi_offline_records') || '[]');
  if (offlineRecords.length === 0) return;
  
  let successCount = 0;
  for (const record of offlineRecords) {
    try {
      const res = await fetch(`${API_URL}/record`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record)
      });
      if (res.ok) successCount++;
    } catch (err) {
      console.error("Failed to sync record", err);
    }
  }
  
  if (successCount === offlineRecords.length) {
    localStorage.removeItem('fungi_offline_records');
    console.log(`Synced ${successCount} offline records.`);
  } else {
    // Remove the ones that succeeded
    localStorage.setItem('fungi_offline_records', JSON.stringify(offlineRecords.slice(successCount)));
  }
};

window.addEventListener('online', () => {
  updateOnlineStatus();
  syncOfflineRecords();
});

window.addEventListener('offline', updateOnlineStatus);
updateOnlineStatus();
