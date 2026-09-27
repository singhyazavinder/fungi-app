import time
import os
import shutil
from typing import Any, Dict, List

import requests

_weather_cache = {}
from core_engine import REGIONS

# Perform an annual cleanup of static caches (Soil, Terrain, Forests)
def _annual_cache_cleanup():
    data_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
    if not os.path.exists(data_dir):
        return
    
    current_time = time.time()
    one_year_seconds = 365 * 24 * 60 * 60
    
    for root, dirs, files in os.walk(data_dir):
        for file in files:
            file_path = os.path.join(root, file)
            # If the file is older than 1 year, delete it so it gets refreshed
            if current_time - os.path.getmtime(file_path) > one_year_seconds:
                try:
                    os.remove(file_path)
                    print(f"Refreshed annual cache for: {file}")
                except Exception:
                    pass

# Run it once when the server starts
_annual_cache_cleanup()


def get_weather_forecast(lat: float, lon: float, elevation: float) -> Dict[str, Any]:
    """
    Fetch weather forecast and soil data from Open-Meteo for a given lat/lon and elevation.
    Uses the 16-day forecast which provides hourly data for 3 days and 3-hourly afterwards.
    Caches the results to prevent extreme latency on map taps.
    """
    # Round to 2 decimal places (approx 1.1km) for caching weather, as weather doesn't change drastically over 1km
    cache_key = f"{lat:.2f},{lon:.2f}"

    current_time = time.time()
    if cache_key in _weather_cache:
        cached_data, timestamp = _weather_cache[cache_key]
        if current_time - timestamp < 21600:  # Cache for 6 hours
            return cached_data

    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lon,
        "elevation": elevation,
        "hourly": [
            "temperature_2m",
            "relative_humidity_2m",
            "dew_point_2m",
            "precipitation",
            "soil_temperature_0cm",
            "soil_temperature_6cm",
            "soil_temperature_18cm",
            "soil_moisture_0_to_1cm",
            "soil_moisture_1_to_3cm",
            "soil_moisture_3_to_9cm",
            "soil_moisture_9_to_27cm",
            "wind_speed_10m",
            "cloud_cover",
            "snow_depth",
        ],
        "timezone": "Europe/Rome",
        "past_days": 14,  # Get last 14 days of history to see cumulative rain
        "forecast_days": 16,
    }

    max_retries = 3
    for attempt in range(max_retries):
        try:
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            _weather_cache[cache_key] = (data, current_time)
            return data
        except Exception as e:
            print(f"Weather API failed (attempt {attempt + 1}/{max_retries}): {e}")
            if attempt < max_retries - 1:
                time.sleep(1.5 ** attempt) # Exponential backoff
            else:
                # If API fails after all retries, return a safe empty dict structure
                return {"hourly": {}}


def aggregate_weather_data(
    weather_data: Dict[str, Any], day_offset: int = 0
) -> Dict[str, float]:
    """
    Aggregate hourly weather data into scoring features for the prediction model.
    day_offset allows simulating the weather for future days (0 = today, 1 = tomorrow, etc.)
    """
    hourly = weather_data.get("hourly", {})
    if not hourly:
        return {}

    def get_val_at_offset(key, default=0.0):
        vals = hourly.get(key, [])
        if not vals:
            return default
        # If day_offset is 0, grab the current day's value (approx now).
        # We assume 14 days of history + 16 days forecast = 30 days * 24 hours = 720 hours.
        # "Now" is at index 14 * 24 = 336.
        base_index = 14 * 24
        target_index = base_index + (day_offset * 24)
        if target_index >= len(vals):
            target_index = len(vals) - 1

        val = vals[target_index]
        return val if val is not None else default

    # Calculate rain in the 7 days prior to the target offset day
    rain_vals = hourly.get("precipitation", [])
    base_index = 14 * 24
    target_index = base_index + (day_offset * 24)
    start_index = max(0, target_index - (7 * 24))
    recent_rain = sum(v for v in rain_vals[start_index:target_index] if v is not None)

    return {
        "recent_rainfall_mm": recent_rain,
        "current_soil_temp_6cm": get_val_at_offset("soil_temperature_6cm", 15.0),
        "current_soil_moisture": get_val_at_offset("soil_moisture_3_to_9cm", 0.25),
        "current_humidity": get_val_at_offset("relative_humidity_2m", 60.0),
        "dew_point": get_val_at_offset("dew_point_2m", 10.0),
        "current_temp": get_val_at_offset("temperature_2m", 15.0),
    }


def get_regional_weather(bounds: dict) -> list:
    """
    Fetch weather for the 4 corners of a bounding box.
    Returns a list of dicts: [{'lat':..., 'lon':..., 'agg':...}, ...]
    """
    points = [
        (bounds["lat_min"], bounds["lon_min"]),  # BL
        (bounds["lat_min"], bounds["lon_max"]),  # BR
        (bounds["lat_max"], bounds["lon_min"]),  # TL
        (bounds["lat_max"], bounds["lon_max"]),  # TR
    ]

    # We could batch this, but for just 4 points per region, sequentially is fine and safe
    corners = []
    for lat, lon in points:
        # Pass a generic elevation (1000m) for the baseline, we adjust locally later
        try:
            data = get_weather_forecast(lat, lon, 1000.0)
            agg = aggregate_weather_data(data)
            corners.append({"lat": lat, "lon": lon, "agg": agg})
        except Exception as e:
            print(f"Weather fetch failed for {lat},{lon}: {e}")

    return corners


def interpolate_weather(lat: float, lon: float, corners: list) -> dict:
    """
    Bilinear interpolation of weather parameters for a specific lat/lon
    using the 4 corners of the bounding box.
    """
    if len(corners) < 4:
        # Fallback to the first available if not all 4 corners succeeded
        return corners[0]["agg"] if corners else {}

    # Sort corners: BL, BR, TL, TR
    bl = min(corners, key=lambda c: (c["lat"], c["lon"]))
    tr = max(corners, key=lambda c: (c["lat"], c["lon"]))

    br = next(c for c in corners if c["lat"] == bl["lat"] and c["lon"] == tr["lon"])
    tl = next(c for c in corners if c["lat"] == tr["lat"] and c["lon"] == bl["lon"])

    lat_min, lat_max = bl["lat"], tr["lat"]
    lon_min, lon_max = bl["lon"], tr["lon"]

    # Normalize coordinates to 0.0 - 1.0
    x = (lon - lon_min) / (lon_max - lon_min) if lon_max > lon_min else 0.5
    y = (lat - lat_min) / (lat_max - lat_min) if lat_max > lat_min else 0.5

    # Clamp just in case
    x = max(0.0, min(1.0, x))
    y = max(0.0, min(1.0, y))

    interpolated = {}
    for key in bl["agg"].keys():
        v_bl = bl["agg"][key]
        v_br = br["agg"][key]
        v_tl = tl["agg"][key]
        v_tr = tr["agg"][key]

        # Bilinear formula
        val = (
            v_bl * (1 - x) * (1 - y)
            + v_br * x * (1 - y)
            + v_tl * (1 - x) * y
            + v_tr * x * y
        )
        interpolated[key] = val

    return interpolated


if __name__ == "__main__":
    # Test Asiago center
    lat, lon, elev = 45.875, 11.510, 1000.0
    print(f"Fetching weather for Asiago ({lat}, {lon}) at {elev}m...")
    data = get_weather_forecast(lat, lon, elev)
    agg = aggregate_weather_data(data)
    print("Aggregated Features:")
    for k, v in agg.items():
        print(f"  {k}: {v}")
import json
import os
from typing import Any, Dict

import requests

SOIL_CACHE_FILE = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "data",
    "soil",
    "ph_cache.json",
)


def ensure_cache_dir():
    os.makedirs(os.path.dirname(SOIL_CACHE_FILE), exist_ok=True)
    if not os.path.exists(SOIL_CACHE_FILE):
        with open(SOIL_CACHE_FILE, "w") as f:
            json.dump({}, f)


def get_soil_ph(lat: float, lon: float) -> float:
    """
    Fetch soil pH (in water) from SoilGrids API for a given coordinate.
    Uses local caching since soil pH rarely changes.
    """
    ensure_cache_dir()

    # Cache key by rounding to 3 decimals (approx 110m) for high grid-level precision
    # SoilGrids has 250m native resolution, so 3 decimals preserves the native detail perfectly.
    cache_key = f"{lat:.3f},{lon:.3f}"

    with open(SOIL_CACHE_FILE, "r") as f:
        cache = json.load(f)

    if cache_key in cache:
        return cache[cache_key]

    # Query SoilGrids REST API
    url = f"https://rest.isric.org/soilgrids/v2.0/properties/query?lon={lon}&lat={lat}&property=phh2o&depth=0-5cm&value=mean"
    try:
        # 7 seconds gives the slow scientific server enough time to respond.
        # It's crucial it succeeds at least once so we can cache it forever.
        response = requests.get(url, headers={"Accept": "application/json"}, timeout=7)
        response.raise_for_status()
        data = response.json()

        # Extract mean pH at 0-5cm depth. Note: values are pH * 10
        layers = data.get("properties", {}).get("layers", [])
        ph_val = None
        for layer in layers:
            if layer.get("name") == "phh2o":
                depths = layer.get("depths", [])
                for d in depths:
                    if d.get("label") == "0-5cm":
                        ph_val = d.get("values", {}).get("mean")
                        break

        if ph_val is not None:
            # Convert back to standard pH scale
            ph = ph_val / 10.0

            # Save to cache
            cache[cache_key] = ph
            with open(SOIL_CACHE_FILE, "w") as f:
                json.dump(cache, f, indent=2)

            return ph

    except Exception as e:
        print(f"Error fetching soil data: {e}")

    # Fallback to neutral if API fails
    return 6.5


if __name__ == "__main__":
    # Test Recoaro
    lat, lon = 45.700, 11.220
    print(f"Soil pH at Recoaro ({lat}, {lon}): {get_soil_ph(lat, lon)}")
import math
import os
from typing import Dict

import numpy as np
import rasterio
from rasterio.windows import Window

DEM_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "dem"
)


def get_dem_file_for_coord(lat: float, lon: float) -> str:
    """Determine the SRTM tile name for a given lat/lon."""
    lat_prefix = "N" if lat >= 0 else "S"
    lon_prefix = "E" if lon >= 0 else "W"
    lat_val = int(math.floor(abs(lat)))
    lon_val = int(math.floor(abs(lon)))
    filename = f"{lat_prefix}{lat_val:02d}{lon_prefix}{lon_val:03d}.hgt"
    return os.path.join(DEM_DIR, filename)


_dataset_cache = {}


def get_terrain_data(lat: float, lon: float) -> Dict[str, float]:
    """
    Get elevation, slope, and aspect for a given coordinate.
    Reads a 3x3 window around the point to compute slope and aspect.
    """
    file_path = get_dem_file_for_coord(lat, lon)
    if not os.path.exists(file_path):
        return {"elevation": 0.0, "slope": 0.0, "aspect": 0.0}

    if file_path not in _dataset_cache:
        _dataset_cache[file_path] = rasterio.open(file_path)

    dataset = _dataset_cache[file_path]
    # Convert lat/lon to pixel coordinates
    row, col = dataset.index(lon, lat)

    # Read a 3x3 window around the target pixel for slope/aspect calc
    window = Window(col - 1, row - 1, 3, 3)
    try:
        elevations = dataset.read(1, window=window)
    except Exception:
        return {"elevation": 0.0, "slope": 0.0, "aspect": 0.0}

    if elevations.shape != (3, 3):
        # If on the edge, just get the point elevation
        window = Window(col, row, 1, 1)
        el = dataset.read(1, window=window)[0, 0]
        return {"elevation": float(el), "slope": 0.0, "aspect": 0.0}

    center_elevation = elevations[1, 1]

    # Calculate slope and aspect using Zevenbergen & Thorne method
    # Resolution of SRTM 1-arc-second is approx 30m
    cell_size = 30.0

    z = elevations
    dz_dx = ((z[0, 2] + 2 * z[1, 2] + z[2, 2]) - (z[0, 0] + 2 * z[1, 0] + z[2, 0])) / (
        8 * cell_size
    )
    dz_dy = ((z[2, 0] + 2 * z[2, 1] + z[2, 2]) - (z[0, 0] + 2 * z[0, 1] + z[0, 2])) / (
        8 * cell_size
    )

    slope_rad = math.sqrt(dz_dx**2 + dz_dy**2)
    slope_deg = math.degrees(math.atan(slope_rad))

    aspect_rad = math.atan2(dz_dy, -dz_dx)
    aspect_deg = math.degrees(aspect_rad)
    if aspect_deg < 0:
        aspect_deg += 360.0

    return {
        "elevation": float(center_elevation),
        "slope": float(slope_deg),
        "aspect": float(aspect_deg),
    }


if __name__ == "__main__":
    # Test Asiago coordinates
    lat, lon = 45.875, 11.510
    print(f"Terrain at Asiago ({lat}, {lon}):")
    print(get_terrain_data(lat, lon))
import math
import os
from io import BytesIO

import requests
from PIL import Image

DATA_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "corine"
)
if not os.path.exists(DATA_DIR):
    os.makedirs(DATA_DIR)

_region_images = {}

CORINE_COLORS = {
    (77, 255, 0): "Broadleaved",  # Code 311: Oak, Beech, Chestnut
    (0, 166, 0): "Coniferous",  # Code 312: Spruce, Pine, Fir
    (128, 255, 0): "Mixed",  # Code 313
}


def load_region_image(region: str):
    if region in _region_images:
        return _region_images[region]

    bounds = REGIONS[region]
    img_path = os.path.join(DATA_DIR, f"{region}_clc.png")

    if not os.path.exists(img_path):
        print(f"Downloading Copernicus Corine Land Cover for {region}...")
        bbox = f"{bounds['lon_min']},{bounds['lat_min']},{bounds['lon_max']},{bounds['lat_max']}"
        url = (
            "https://image.discomap.eea.europa.eu/arcgis/rest/services/Corine/CLC2018_WM/MapServer/export?"
            f"bbox={bbox}&bboxSR=4326&imageSR=4326&size=4000,4000&dpi=300&format=png&f=image"
        )
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        img = Image.open(BytesIO(response.content)).convert("RGB")
        img.save(img_path)
    else:
        img = Image.open(img_path).convert("RGB")

    _region_images[region] = {
        "image": img,
        "width": img.width,
        "height": img.height,
        "bounds": bounds,
    }
    return _region_images[region]


def get_tree_type(lat: float, lon: float, region: str) -> list:
    """
    Returns a list of tree categories found at the exact location according to Copernicus CLC.
    Returns empty list if not a forest according to CLC.
    """
    try:
        data = load_region_image(region)
    except Exception as e:
        print(f"Failed to load CLC for {region}: {e}")
        return []

    img = data["image"]
    bounds = data["bounds"]

    # Map lat/lon to pixel coordinates
    lat_range = bounds["lat_max"] - bounds["lat_min"]
    lon_range = bounds["lon_max"] - bounds["lon_min"]

    # Calculate X (longitude maps to width)
    x_pct = (lon - bounds["lon_min"]) / lon_range
    x = int(x_pct * (data["width"] - 1))

    # Calculate Y (latitude maps to height, inverted because Y=0 is top)
    y_pct = (bounds["lat_max"] - lat) / lat_range
    y = int(y_pct * (data["height"] - 1))

    if x < 0 or x >= data["width"] or y < 0 or y >= data["height"]:
        return []

    pixel = img.getpixel((x, y))

    # Check if pixel matches any known forest color
    # Use simple Euclidean distance for minor anti-aliasing artifacts
    best_match = None
    min_dist = 50  # Max tolerance

    for color, tree_type in CORINE_COLORS.items():
        dist = math.sqrt(sum((a - b) ** 2 for a, b in zip(pixel, color)))
        if dist < min_dist:
            min_dist = dist
            best_match = tree_type

    if best_match == "Broadleaved":
        return ["Oak", "Beech", "Chestnut", "Birch", "Elm", "Ash"]
    elif best_match == "Coniferous":
        return ["Spruce", "Scots Pine", "Pine", "Fir", "Conifer"]
    elif best_match == "Mixed":
        return [
            "Oak",
            "Beech",
            "Chestnut",
            "Birch",
            "Elm",
            "Ash",
            "Spruce",
            "Scots Pine",
            "Pine",
            "Fir",
            "Conifer",
        ]

    # Heuristic for Corine Artificial Surfaces (usually heavily red/purple)
    if pixel[0] > 180 and pixel[1] < 100 and pixel[2] < 150:
        return ["Artificial"]

    return []


import json
import os

import requests
from shapely.geometry import Point, Polygon
from shapely.strtree import STRtree

FOREST_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "forest"
)

# Global cache for the spatial index
_forest_trees = {}


def download_forest_data():
    """Download forest polygons for all regions using Overpass API."""
    if not os.path.exists(FOREST_DIR):
        os.makedirs(FOREST_DIR)

    for region_id, bounds in REGIONS.items():
        filepath = os.path.join(FOREST_DIR, f"{region_id}.json")
        if os.path.exists(filepath):
            print(f"Forest data for {region_id} already exists.")
            continue

        print(f"Downloading forest data for {region_id}...")

        # If the area is large (like Asiago), split into 4 quadrants
        lat_diff = bounds["lat_max"] - bounds["lat_min"]
        lon_diff = bounds["lon_max"] - bounds["lon_min"]

        sub_bounds = []
        if lat_diff > 0.1 or lon_diff > 0.15:
            mid_lat = bounds["lat_min"] + lat_diff / 2.0
            mid_lon = bounds["lon_min"] + lon_diff / 2.0
            sub_bounds = [
                (bounds["lat_min"], bounds["lon_min"], mid_lat, mid_lon),
                (mid_lat, bounds["lon_min"], bounds["lat_max"], mid_lon),
                (bounds["lat_min"], mid_lon, mid_lat, bounds["lon_max"]),
                (mid_lat, mid_lon, bounds["lat_max"], bounds["lon_max"]),
            ]
        else:
            sub_bounds = [
                (
                    bounds["lat_min"],
                    bounds["lon_min"],
                    bounds["lat_max"],
                    bounds["lon_max"],
                )
            ]

        polygons = []
        for i, (s_lat_min, s_lon_min, s_lat_max, s_lon_max) in enumerate(sub_bounds):
            print(f"  Fetching quadrant {i+1}/{len(sub_bounds)}...")
            query = f"""
            [out:json][timeout:90];
            (
              way["landuse"="forest"]({s_lat_min},{s_lon_min},{s_lat_max},{s_lon_max});
              way["natural"="wood"]({s_lat_min},{s_lon_min},{s_lat_max},{s_lon_max});
            );
            out geom;
            """

            try:
                import urllib.parse

                response = requests.post(
                    "https://overpass-api.de/api/interpreter",
                    data=query.strip(),
                    headers={"User-Agent": "FungiApp/1.0"},
                    timeout=120,
                )
                response.raise_for_status()
                data = response.json()

                for element in data.get("elements", []):
                    if element["type"] == "way" and "geometry" in element:
                        coords = [
                            (node["lon"], node["lat"]) for node in element["geometry"]
                        ]
                        if len(coords) >= 3:
                            # Close the polygon if not closed
                            if coords[0] != coords[-1]:
                                coords.append(coords[0])
                            if len(coords) >= 4:
                                polygons.append(coords)
            except Exception as e:
                print(f"  Failed quadrant: {e}")

        # Save all collected polygons
        if polygons:
            with open(filepath, "w") as f:
                json.dump(polygons, f)
            print(f"Saved {len(polygons)} forest polygons for {region_id}.")
        else:
            print(f"No polygons found for {region_id}.")


def load_forest_index(region_id: str):
    """Load polygons into an STRtree for fast spatial queries."""
    if region_id in _forest_trees:
        return

    filepath = os.path.join(FOREST_DIR, f"{region_id}.json")
    if not os.path.exists(filepath):
        _forest_trees[region_id] = None
        return

    try:
        with open(filepath, "r") as f:
            coords_list = json.load(f)

        polys = []
        for coords in coords_list:
            if len(coords) >= 4:
                polys.append(Polygon(coords))

        if polys:
            _forest_trees[region_id] = STRtree(polys)
        else:
            _forest_trees[region_id] = None
    except Exception as e:
        print(f"Error loading forest index for {region_id}: {e}")
        _forest_trees[region_id] = None


def is_in_forest(lat: float, lon: float, region_id: str) -> bool:
    """Check if a coordinate is inside a forest polygon."""
    if region_id not in _forest_trees:
        load_forest_index(region_id)

    tree = _forest_trees.get(region_id)
    if not tree:
        return True  # Fallback if no data

    pt = Point(lon, lat)

    # query returns integer indices in shapely 2.0
    indices = tree.query(pt)
    if len(indices) == 0:
        return False

    # verify exact intersection
    for idx in indices:
        if tree.geometries.take(idx).contains(pt):
            return True

    return False


if __name__ == "__main__":
    download_forest_data()
import time
import urllib.parse
from datetime import datetime, timedelta
from typing import Dict, List

import feedparser

# --- COMMUNITY BUZZ SYSTEM (Google News RSS Aggregator per Region) ---

REGION_SEARCH_TERMS = {
    "asiago": {
        "towns": ["Asiago", "Gallio", "Roana", "Rotzo", "Lusiana", "Conco", "Enego", "Foza"],
        "area_label": "Altopiano di Asiago",
    },
    "recoaro": {
        "towns": ["Recoaro", "Valdagno", "Schio", "Pasubio", "Piccole Dolomiti"],
        "area_label": "Recoaro Terme",
    },
    "lavarone": {
        "towns": ["Lavarone", "Folgaria", "Luserna", "Vezzena", "Caldonazzo", "Levico"],
        "area_label": "Altopiano di Lavarone",
    },
}

# Foraging-specific gate: article must contain at least one to be counted
FORAGING_GATE = [
    "raccolta", "raccolto", "trovati", "trovato", "cercatori",
    "bosco", "boschi", "sottobosco", "buttata", "buttate",
    "stagione", "micologico", "micologica", "porcini",
    "crescita", "crescono", "spuntano", "spuntati",
    "permesso", "multe", "controlli forestali",
    "avvelenamento", "intossicazione",
    "altopiano", "malga", "sentiero", "quota",
]

POSITIVE_KEYWORDS = [
    "trovati", "trovato", "abbondanti", "abbondanza",
    "buttata", "buttate", "boom", "primi porcini",
    "bella raccolta", "buona raccolta", "stagione favorevole",
    "condizioni ideali", "condizioni perfette",
    "piogge benefiche", "crescita", "crescono",
    "ottima", "eccellente", "spuntano", "spuntati",
]

NEGATIVE_KEYWORDS = [
    "siccità", "secco", "secca", "mancano", "niente funghi",
    "caldo eccessivo", "troppo caldo", "stagione difficile",
    "deludente", "scarsa", "scarsi",
    "avvelenamento", "intossicazione", "veleno",
    "multe", "divieto", "sequestro",
    "neve", "gelate", "gelo",
]


def _build_google_news_url(region_id: str) -> str:
    """Build a Google News RSS URL for a specific region's mushroom news."""
    terms = REGION_SEARCH_TERMS.get(region_id, {})
    towns = terms.get("towns", [])

    mushroom_part = "funghi OR porcini OR finferli OR chiodini OR morchelle OR spugnole"
    towns_part = " OR ".join(towns)

    query = f"({mushroom_part}) ({towns_part})"
    encoded = urllib.parse.quote(query)

    return f"https://news.google.com/rss/search?q={encoded}&hl=it&gl=IT&ceid=IT:it"


def _score_article_sentiment(title: str) -> int:
    """Returns +N for positive, -N for negative sentiment in a title."""
    title_lower = title.lower()
    pos = sum(1 for kw in POSITIVE_KEYWORDS if kw in title_lower)
    neg = sum(1 for kw in NEGATIVE_KEYWORDS if kw in title_lower)
    return pos - neg


def _fetch_region_news(region_id: str) -> List[Dict]:
    """Fetch and filter mushroom foraging news for a specific region."""
    url = _build_google_news_url(region_id)
    area_label = REGION_SEARCH_TERMS.get(region_id, {}).get("area_label", region_id.title())

    results = []
    try:
        parsed = feedparser.parse(url)
        cutoff = datetime.now() - timedelta(days=7)

        for entry in parsed.entries[:30]:
            title = entry.get("title", "")
            title_lower = title.lower()

            # FORAGING GATE: Must be about mushroom foraging, not recipes/festivals
            if not any(kw in title_lower for kw in FORAGING_GATE):
                continue

            # Parse publish date
            pub_date = ""
            if hasattr(entry, "published_parsed") and entry.published_parsed:
                try:
                    pub_dt = datetime(*entry.published_parsed[:6])
                    if pub_dt < cutoff:
                        continue  # Older than 7 days, skip
                    pub_date = pub_dt.strftime("%Y-%m-%d")
                except Exception:
                    pub_date = getattr(entry, "published", time.strftime("%Y-%m-%d"))
            else:
                pub_date = time.strftime("%Y-%m-%d")

            # Extract source name from Google News title format: "Title - Source"
            source = "Google News"
            if " - " in title:
                parts = title.rsplit(" - ", 1)
                if len(parts) == 2:
                    title = parts[0].strip()
                    source = parts[1].strip()

            sentiment = _score_article_sentiment(title)

            results.append({
                "source": source,
                "area": area_label,
                "region_id": region_id,
                "title": title,
                "link": entry.get("link", "#"),
                "date": pub_date,
                "type": "news",
                "sentiment": sentiment,
            })
    except Exception as e:
        print(f"Error fetching news for {region_id}: {e}")

    return results


def _calculate_region_buzz(articles: List[Dict]) -> Dict:
    """Calculate buzz level for a region based on its filtered articles."""
    if not articles:
        return {
            "buzz_score": 0.05,
            "level": "Calmo",
            "color": "#9e9e9e",
            "message": "Nessuna notizia rilevante trovata di recente.",
        }

    # Volume score: more articles = more buzz (capped at 0.5)
    volume_score = min(0.5, len(articles) * 0.05)

    # Sentiment score
    net_sentiment = sum(a.get("sentiment", 0) for a in articles)
    if net_sentiment > 0:
        sentiment_boost = min(0.45, net_sentiment * 0.08)
    else:
        sentiment_boost = max(-0.4, net_sentiment * 0.08)

    buzz_score = max(0.05, min(0.95, volume_score + sentiment_boost))

    if buzz_score > 0.7:
        return {
            "buzz_score": buzz_score,
            "level": "Alto Fermento",
            "color": "#e65100",
            "message": "Condizioni eccellenti riportate dalla community!",
        }
    elif buzz_score > 0.35:
        return {
            "buzz_score": buzz_score,
            "level": "Moderato",
            "color": "#f57c00",
            "message": "Alcune segnalazioni positive in corso.",
        }
    else:
        return {
            "buzz_score": buzz_score,
            "level": "Calmo",
            "color": "#9e9e9e",
            "message": "Poche notizie rilevanti trovate di recente.",
        }


_buzz_cache = {"data": None, "timestamp": 0}


def get_community_buzz() -> Dict:
    """Aggregates community intelligence per region using Google News RSS."""
    global _buzz_cache
    if time.time() - _buzz_cache["timestamp"] < 21600:  # Cache for 6 hours
        return _buzz_cache["data"]

    all_alerts = []
    regions_buzz = {}

    for region_id in REGION_SEARCH_TERMS:
        articles = _fetch_region_news(region_id)
        all_alerts.extend(articles)
        regions_buzz[region_id] = _calculate_region_buzz(articles)

    # Calculate a global average for backward compatibility
    if regions_buzz:
        avg_score = sum(r["buzz_score"] for r in regions_buzz.values()) / len(regions_buzz)
    else:
        avg_score = 0.05

    # Global buzz level
    if avg_score > 0.7:
        global_buzz = {"level": "Alto Fermento", "color": "#e65100", "message": "Condizioni eccellenti riportate dalla community!"}
    elif avg_score > 0.35:
        global_buzz = {"level": "Moderato", "color": "#f57c00", "message": "Alcune segnalazioni positive in corso."}
    else:
        global_buzz = {"level": "Calmo", "color": "#9e9e9e", "message": "Nessuna notizia rilevante trovata di recente."}

    result = {"buzz": global_buzz, "alerts": all_alerts, "buzz_score": avg_score, "regions": regions_buzz}
    _buzz_cache = {"data": result, "timestamp": time.time()}
    return result


if __name__ == "__main__":
    print(get_community_buzz())
