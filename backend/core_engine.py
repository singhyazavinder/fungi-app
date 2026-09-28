import math
from datetime import datetime
SPECIES_PROFILES = {
    "boletus_edulis": {
        "name_it": "Porcino",
        "name_en": "Penny Bun Cep",
        "season_months": [7, 8, 9, 10, 11],
        "ideal_elevation_m": [600, 2000],
        "ideal_ph": [4.0, 6.0],  # Prefers acidic soil
        "ideal_aspect_deg": 45,  # North-East (Cetto Bruno notes they prefer cooler, moist slopes)
        "ideal_soil_temp_c": [
            8.0,
            16.0,
        ],  # Requires a "cold shock" to fruit, grows late into autumn
        "ideal_rainfall_mm": [30.0, 80.0],  # Needs heavy rain 10-15 days prior
        "eco_type": "facultative",
        "primary_trees": ["Spruce", "Beech", "Fir"],
        "secondary_trees": ["Oak", "Chestnut", "Scots Pine", "Pine", "Conifer"],
    },
    "boletus_aestivalis": {
        "name_it": "Porcino estivo",
        "name_en": "Summer Cep",
        "season_months": [5, 6, 7, 8, 9],
        "ideal_elevation_m": [200, 1200],
        "ideal_ph": [5.0, 7.0],
        "ideal_aspect_deg": 135,  # South-East
        "ideal_soil_temp_c": [15.0, 24.0],  # Thermophilic, early summer bloomer
        "ideal_rainfall_mm": [20.0, 50.0],
        "eco_type": "facultative",
        "primary_trees": ["Oak", "Beech", "Chestnut"],
        "secondary_trees": ["Birch", "Elm"],
    },
    "boletus_aereus": {
        "name_it": "Porcino nero",
        "name_en": "Bronze Bolete",
        "season_months": [7, 8, 9, 10],
        "ideal_elevation_m": [100, 1000],
        "ideal_ph": [5.0, 7.0],
        "ideal_aspect_deg": 180,  # South (Very Thermophilic, Mediterranean)
        "ideal_soil_temp_c": [18.0, 26.0],
        "ideal_rainfall_mm": [20.0, 45.0],
        "eco_type": "obligate",
        "primary_trees": ["Oak", "Chestnut", "Beech"],
        "secondary_trees": [],
    },
    "boletus_pinophilus": {
        "name_it": "Porcino rosso",
        "name_en": "Pine Bolete",
        "season_months": [4, 5, 9, 10, 11],
        "ideal_elevation_m": [800, 2000],
        "ideal_ph": [4.0, 5.5],
        "ideal_aspect_deg": 0,  # North (Extremely cold tolerant)
        "ideal_soil_temp_c": [6.0, 14.0],  # Can fruit near freezing
        "ideal_rainfall_mm": [30.0, 60.0],
        "eco_type": "obligate",
        "primary_trees": ["Scots Pine", "Pine", "Spruce", "Fir", "Conifer"],
        "secondary_trees": ["Beech"],
    },
    "cantharellus_cibarius": {
        "name_it": "Finferlo",
        "name_en": "Chanterelle",
        "season_months": [6, 7, 8, 9, 10, 11],
        "ideal_elevation_m": [100, 1600],
        "ideal_ph": [4.5, 6.5],
        "ideal_aspect_deg": 90,
        "ideal_soil_temp_c": [12.0, 20.0],
        "ideal_rainfall_mm": [25.0, 60.0],
        "eco_type": "facultative",
        "primary_trees": ["Beech", "Oak", "Birch", "Chestnut"],
        "secondary_trees": ["Spruce", "Pine", "Scots Pine", "Fir", "Conifer"],
    },
    "craterellus_tubaeformis": {
        "name_it": "Finferla",
        "name_en": "Winter Chanterelle",
        "season_months": [9, 10, 11, 12],
        "ideal_elevation_m": [500, 1600],
        "ideal_ph": [4.0, 5.5],  # Highly acidic, mossy soil
        "ideal_aspect_deg": 315,  # North-West (Moist, Shady)
        "ideal_soil_temp_c": [4.0, 12.0],  # Winter mushroom
        "ideal_rainfall_mm": [40.0, 80.0],
        "eco_type": "obligate",
        "primary_trees": ["Spruce", "Pine", "Scots Pine", "Fir", "Conifer"],
        "secondary_trees": [],
    },
    "morchella_esculenta": {
        "name_it": "Spugnola comune",
        "name_en": "Common Morel",
        "season_months": [3, 4, 5],
        "ideal_elevation_m": [100, 1200],
        "ideal_ph": [7.0, 8.5],  # Calcareous/Limestone soils
        "ideal_aspect_deg": 180,  # South (Spring warmth)
        "ideal_soil_temp_c": [8.0, 15.0],
        "ideal_rainfall_mm": [15.0, 35.0],
        "eco_type": "facultative",
        "primary_trees": ["Elm", "Ash"],
        "secondary_trees": ["Oak", "Beech", "Birch"],  # Often saprotrophic in orchards
    },
    "morchella_conica": {
        "name_it": "Spugnola conica",
        "name_en": "Black Morel",
        "season_months": [3, 4, 5],
        "ideal_elevation_m": [400, 1600],
        "ideal_ph": [6.5, 8.0],
        "ideal_aspect_deg": 180,
        "ideal_soil_temp_c": [6.0, 14.0],
        "ideal_rainfall_mm": [15.0, 40.0],
        "eco_type": "facultative",
        "primary_trees": ["Spruce", "Pine", "Scots Pine", "Fir", "Conifer"],
        "secondary_trees": ["Ash", "Elm"],
    },
    "amanita_caesarea": {
        "name_it": "Ovolo buono",
        "name_en": "Caesar's Mushroom",
        "season_months": [7, 8, 9, 10],
        "ideal_elevation_m": [100, 900],  # Strictly low altitude
        "ideal_ph": [5.5, 7.0],
        "ideal_aspect_deg": 180,  # Strictly South, fully exposed to sun
        "ideal_soil_temp_c": [20.0, 28.0],  # Most thermophilic mushroom in Europe
        "ideal_rainfall_mm": [20.0, 40.0],
        "eco_type": "obligate",
        "primary_trees": ["Chestnut", "Oak"],
        "secondary_trees": [],
    },
    "russula_cyanoxantha": {
        "name_it": "Colombina maggiore",
        "name_en": "Charcoal Burner",
        "season_months": [6, 7, 8, 9, 10, 11],
        "ideal_elevation_m": [200, 1400],
        "ideal_ph": [4.5, 6.5],
        "ideal_aspect_deg": 45,
        "ideal_soil_temp_c": [12.0, 20.0],
        "ideal_rainfall_mm": [25.0, 50.0],
        "eco_type": "obligate",
        "primary_trees": ["Beech", "Oak", "Chestnut", "Birch"],
        "secondary_trees": ["Spruce", "Pine"],
    },
    "craterellus_cornucopioides": {
        "name_it": "Trombetta dei morti",
        "name_en": "Horn of Plenty",
        "season_months": [9, 10, 11, 12],
        "ideal_elevation_m": [200, 1200],
        "ideal_ph": [5.0, 7.0],
        "ideal_aspect_deg": 0,  # North (Requires heavy shade)
        "ideal_soil_temp_c": [8.0, 15.0],
        "ideal_rainfall_mm": [30.0, 60.0],
        "eco_type": "obligate",
        "primary_trees": ["Beech", "Oak", "Chestnut"],
        "secondary_trees": [],
    },
    "macrolepiota_procera": {
        "name_it": "Mazza di tamburo",
        "name_en": "Parasol Mushroom",
        "season_months": [7, 8, 9, 10, 11],
        "ideal_elevation_m": [100, 1500],
        "ideal_ph": [5.5, 7.5],
        "ideal_aspect_deg": 180,  # South (Loves open sunny meadows)
        # Geoff Dann & Cetto Bruno note this is a saprotroph that heavily fruits in late autumn
        # Deep mycelium makes it resistant to dry surface conditions
        "ideal_soil_temp_c": [6.0, 20.0],
        "ideal_rainfall_mm": [10.0, 40.0],
        "eco_type": "saprotrophic",
        "primary_trees": [],
        "secondary_trees": [],
    },
}

WEIGHTS = {
    "boletus_edulis": {
        "rain": 0.22,
        "soiltemp": 0.13,
        "soilmoist": 0.12,
        "elev": 0.10,
        "humid": 0.08,
        "aspect": 0.05,
        "forest": 0.08,
        "season": 0.04,
        "ph": 0.08,
        "community": 0.10,
    },
    "boletus_aestivalis": {
        "rain": 0.20,
        "soiltemp": 0.13,
        "soilmoist": 0.12,
        "elev": 0.10,
        "humid": 0.08,
        "aspect": 0.05,
        "forest": 0.10,
        "season": 0.04,
        "ph": 0.08,
        "community": 0.10,
    },
    "boletus_aereus": {
        "rain": 0.20,
        "soiltemp": 0.13,
        "soilmoist": 0.12,
        "elev": 0.10,
        "humid": 0.08,
        "aspect": 0.05,
        "forest": 0.10,
        "season": 0.04,
        "ph": 0.08,
        "community": 0.10,
    },
    "boletus_pinophilus": {
        "rain": 0.22,
        "soiltemp": 0.13,
        "soilmoist": 0.12,
        "elev": 0.10,
        "humid": 0.08,
        "aspect": 0.05,
        "forest": 0.08,
        "season": 0.04,
        "ph": 0.08,
        "community": 0.10,
    },
    "cantharellus_cibarius": {
        "rain": 0.18,
        "soiltemp": 0.13,
        "soilmoist": 0.12,
        "elev": 0.08,
        "humid": 0.12,
        "aspect": 0.05,
        "forest": 0.12,
        "season": 0.04,
        "ph": 0.07,
        "community": 0.09,
    },
    "craterellus_tubaeformis": {
        "rain": 0.18,
        "soiltemp": 0.13,
        "soilmoist": 0.13,
        "elev": 0.08,
        "humid": 0.10,
        "aspect": 0.06,
        "forest": 0.12,
        "season": 0.04,
        "ph": 0.07,
        "community": 0.09,
    },
    "morchella_esculenta": {
        "rain": 0.18,
        "soiltemp": 0.13,
        "soilmoist": 0.08,
        "elev": 0.07,
        "humid": 0.08,
        "aspect": 0.08,
        "forest": 0.08,
        "season": 0.14,
        "ph": 0.09,
        "community": 0.07,
    },
    "morchella_conica": {
        "rain": 0.18,
        "soiltemp": 0.13,
        "soilmoist": 0.08,
        "elev": 0.08,
        "humid": 0.08,
        "aspect": 0.07,
        "forest": 0.10,
        "season": 0.12,
        "ph": 0.09,
        "community": 0.07,
    },
    "amanita_caesarea": {
        "rain": 0.18,
        "soiltemp": 0.14,
        "soilmoist": 0.10,
        "elev": 0.12,
        "humid": 0.08,
        "aspect": 0.06,
        "forest": 0.10,
        "season": 0.06,
        "ph": 0.08,
        "community": 0.08,
    },
    "russula_cyanoxantha": {
        "rain": 0.18,
        "soiltemp": 0.13,
        "soilmoist": 0.13,
        "elev": 0.08,
        "humid": 0.10,
        "aspect": 0.05,
        "forest": 0.13,
        "season": 0.04,
        "ph": 0.08,
        "community": 0.08,
    },
    "craterellus_cornucopioides": {
        "rain": 0.18,
        "soiltemp": 0.13,
        "soilmoist": 0.13,
        "elev": 0.08,
        "humid": 0.10,
        "aspect": 0.06,
        "forest": 0.12,
        "season": 0.04,
        "ph": 0.08,
        "community": 0.08,
    },
    "macrolepiota_procera": {
        "rain": 0.15,
        "soiltemp": 0.15,
        "soilmoist": 0.10,
        "elev": 0.10,
        "humid": 0.10,
        "aspect": 0.08,
        "forest": 0.12,
        "season": 0.06,
        "ph": 0.06,
        "community": 0.08,
    },
}

# Species-specific environmental sensitivity profiles for advanced modifiers
# wind_window_h: hours of wind history to average
# wind_threshold_kmh: above this average, humidity score is penalized
# surface_drought_multiplier: score multiplier when top soil is critically dry (lower = more sensitive)
# snow_veto: whether snow cover blocks fruiting
# snow_max_m: max snow depth (meters) the species can tolerate
ENVIRONMENTAL_SENSITIVITY = {
    "boletus_edulis": {
        "wind_window_h": 24, "wind_threshold_kmh": 20.0,
        "surface_drought_multiplier": 0.4,
        "snow_veto": True, "snow_max_m": 0.0,
    },
    "boletus_aestivalis": {
        "wind_window_h": 12, "wind_threshold_kmh": 15.0,
        "surface_drought_multiplier": 0.5,
        "snow_veto": True, "snow_max_m": 0.0,
    },
    "boletus_aereus": {
        "wind_window_h": 12, "wind_threshold_kmh": 12.0,
        "surface_drought_multiplier": 0.6,
        "snow_veto": True, "snow_max_m": 0.0,
    },
    "boletus_pinophilus": {
        "wind_window_h": 48, "wind_threshold_kmh": 25.0,
        "surface_drought_multiplier": 0.5,
        "snow_veto": True, "snow_max_m": 0.0,
    },
    "cantharellus_cibarius": {
        "wind_window_h": 24, "wind_threshold_kmh": 12.0,
        "surface_drought_multiplier": 0.3,
        "snow_veto": True, "snow_max_m": 0.0,
    },
    "craterellus_tubaeformis": {
        "wind_window_h": 36, "wind_threshold_kmh": 15.0,
        "surface_drought_multiplier": 0.3,
        "snow_veto": True, "snow_max_m": 0.05,  # Can fruit through thin snow (<5cm)
    },
    "morchella_esculenta": {
        "wind_window_h": 12, "wind_threshold_kmh": 10.0,
        "surface_drought_multiplier": 0.6,
        "snow_veto": False, "snow_max_m": 0.0,  # Snow melt is a positive trigger
    },
    "morchella_conica": {
        "wind_window_h": 12, "wind_threshold_kmh": 10.0,
        "surface_drought_multiplier": 0.6,
        "snow_veto": False, "snow_max_m": 0.0,
    },
    "amanita_caesarea": {
        "wind_window_h": 6, "wind_threshold_kmh": 8.0,
        "surface_drought_multiplier": 0.7,  # Deep "egg" emerges forcefully
        "snow_veto": True, "snow_max_m": 0.0,
    },
    "russula_cyanoxantha": {
        "wind_window_h": 24, "wind_threshold_kmh": 15.0,
        "surface_drought_multiplier": 0.4,
        "snow_veto": True, "snow_max_m": 0.0,
    },
    "craterellus_cornucopioides": {
        "wind_window_h": 36, "wind_threshold_kmh": 15.0,
        "surface_drought_multiplier": 0.4,
        "snow_veto": True, "snow_max_m": 0.0,
    },
    "macrolepiota_procera": {
        "wind_window_h": 6, "wind_threshold_kmh": 25.0,
        "surface_drought_multiplier": 0.8,  # Deep saprotrophic mycelium, meadow-adapted
        "snow_veto": True, "snow_max_m": 0.0,
    },
}

# pH tolerance: distance (pH units) from ideal range where score drops to zero
# Strict (1.5): obligate species on chemically specific soil (pine-acid, limestone-alkaline)
# Moderate (2.0): mycorrhizal species with some flexibility
# Flexible (3.0): saprotrophic species tolerating diverse soils
PH_LETHAL_DIST = {
    "boletus_edulis": 2.0,
    "boletus_aestivalis": 2.0,
    "boletus_aereus": 2.0,
    "boletus_pinophilus": 1.5,
    "cantharellus_cibarius": 2.0,
    "craterellus_tubaeformis": 1.5,
    "morchella_esculenta": 1.5,
    "morchella_conica": 1.5,
    "amanita_caesarea": 2.0,
    "russula_cyanoxantha": 2.0,
    "craterellus_cornucopioides": 2.0,
    "macrolepiota_procera": 3.0,
}


def calculate_score(
    species_id: str,
    weather_agg: dict,
    terrain: dict,
    soil_ph: float,
    community_buzz: float = 0.5,
    in_forest: bool = True,
    lat: float = 0.0,
    lon: float = 0.0,
    region: str = "",
) -> tuple:
    """
    Calculate the growth probability score (0.0 to 1.0) for a given species using the classic heuristic model with Copernicus satellite tree data.
    """
    if species_id not in SPECIES_PROFILES:
        return 0.0

    profile = SPECIES_PROFILES[species_id]
    weights = WEIGHTS[species_id]

    # 1. Season Window Score
    current_month = datetime.now().month
    s_season = 1.0 if current_month in profile["season_months"] else 0.1

    # 2. Elevation Score (Granular gaussian-like falloff)
    min_elev, max_elev = profile["ideal_elevation_m"]
    optimal_elev = (min_elev + max_elev) / 2.0
    elev = terrain.get("elevation", 0)

    if min_elev <= elev <= max_elev:
        # 1.0 at optimal, drops to 0.85 at the edges of the ideal range
        dist_from_optimal = abs(elev - optimal_elev)
        range_half = (max_elev - min_elev) / 2.0
        s_elev = 1.0 - 0.15 * (dist_from_optimal / max(1.0, range_half))
    else:
        # Drops sharply outside the ideal range
        dist = min(abs(elev - min_elev), abs(elev - max_elev))
        s_elev = max(0.0, 0.85 - (dist / 300.0))

    # 3. Soil pH Score
    min_ph, max_ph = profile["ideal_ph"]
    if soil_ph is None:
        s_ph = 1.0
    elif min_ph <= soil_ph <= max_ph:
        s_ph = 1.0
    else:
        dist = min(abs(soil_ph - min_ph), abs(soil_ph - max_ph))
        s_ph = max(0.0, 1.0 - (dist / 2.0))

    # 4. Weather scores (Biologically specific models)
    rain = weather_agg.get("recent_rainfall_mm", 0)
    min_rain, max_rain = profile.get("ideal_rainfall_mm", [20.0, 50.0])
    if min_rain <= rain <= max_rain:
        s_rain = 1.0
    else:
        # Sharp falloff for rain (Mushrooms need water!)
        dist = min(abs(rain - min_rain), abs(rain - max_rain))
        s_rain = max(0.0, 1.0 - (dist / 15.0))  # Drops to 0 if 15mm outside ideal range

    # Soil Temp
    stemp = weather_agg.get("current_soil_temp_6cm", 15)
    min_temp, max_temp = profile.get("ideal_soil_temp_c", [10.0, 18.0])
    if min_temp <= stemp <= max_temp:
        s_soiltemp = 1.0
    else:
        # Sharp falloff for temperature
        dist = min(abs(stemp - min_temp), abs(stemp - max_temp))
        s_soiltemp = max(0.0, 1.0 - (dist / 4.0))  # Drops to 0 if 4 degrees off ideal

    # Soil Moisture: 0.2 to 0.4 m3/m3 is good
    smoist = weather_agg.get("current_soil_moisture", 0.25)
    s_soilmoist = (
        1.0 if 0.2 <= smoist <= 0.4 else max(0.0, 1.0 - abs(smoist - 0.3) / 0.2)
    )

    # Humidity: >70% is good
    humid = weather_agg.get("current_humidity", 60)
    s_humid = min(1.0, humid / 85.0)

    # Aspect (slope direction) and Slope
    # Mushrooms typically prefer North/North-East (0-90 degrees) for moisture retention

    aspect = terrain.get("aspect", 0)
    slope = terrain.get("slope", 0)

    # Calculate how close the aspect is to the ideal aspect for this specific species
    # 1.0 if exactly ideal, down to 0.6 if exactly opposite (180 degrees away)
    ideal_aspect = profile.get("ideal_aspect_deg", 45)
    aspect_diff = abs((aspect - ideal_aspect + 180) % 360 - 180)
    base_aspect_score = 1.0 - 0.4 * (aspect_diff / 180.0)

    # Only apply aspect variance if there is a slope. Flat terrain has no meaningful aspect.
    slope_weight = min(1.0, slope / 20.0)
    s_aspect = (base_aspect_score * slope_weight) + (0.8 * (1.0 - slope_weight))

    # --- ADVANCED ENVIRONMENTAL MODIFIERS (Pre-Score) ---
    env = ENVIRONMENTAL_SENSITIVITY.get(species_id, {})

    # Wind Desiccation: strong wind strips humidity from forest floor boundary layer
    wind_window = env.get("wind_window_h", 24)
    avg_wind = weather_agg.get(f"avg_wind_{wind_window}h", 0.0)
    wind_threshold = env.get("wind_threshold_kmh", 15.0)
    if avg_wind > wind_threshold:
        wind_excess = (avg_wind - wind_threshold) / wind_threshold
        s_humid *= max(0.3, 1.0 - wind_excess)

    # Cloud Cover: modifies rain effectiveness (clouds trap moisture in soil longer)
    # 0% cloud → rain score reduced by 40%, 100% cloud → rain score unchanged
    avg_cloud = weather_agg.get("avg_cloud_72h", 50.0)
    cloud_factor = 0.6 + 0.4 * (avg_cloud / 100.0)
    s_rain *= cloud_factor

    # Calculate pure biological score first (without community)
    bio_score = (
        weights["rain"] * s_rain
        + weights["soiltemp"] * s_soiltemp
        + weights["soilmoist"] * s_soilmoist
        + weights["elev"] * s_elev
        + weights["humid"] * s_humid
        + weights["aspect"] * s_aspect
        + weights["season"] * s_season
        + weights["ph"] * s_ph
    )

    # Calculate the total weight of just the biological factors
    bio_weight = 1.0 - weights.get("community", 0.0) - weights.get("forest", 0.0)
    normalized_bio = bio_score / bio_weight

    # --- COPERNICUS CORINE LAND COVER (CLC) FILTER ---
    # Retrieve the absolute truth of tree types at this exact pixel from Copernicus satellite data


    eco_type = profile.get("eco_type", "facultative")
    primary_trees = profile.get("primary_trees", [])
    secondary_trees = profile.get("secondary_trees", [])

    local_trees = []
    if region and lat and lon:
        import data_services
        local_trees = data_services.get_tree_type(lat, lon, region)

        has_primary = any(tree in local_trees for tree in primary_trees)
        has_secondary = any(tree in local_trees for tree in secondary_trees)

        tree_multiplier = 1.0

        if "Artificial" in local_trees:
            # Nothing grows on asphalt or residential concrete
            tree_multiplier = 0.0

        elif eco_type == "saprotrophic":
            # Saprotrophs can grow anywhere with grass/soil (meadows, edges).
            # We don't crush them if there are no trees. But we can slightly boost if trees are present (edge of woods).
            tree_multiplier = 1.0

        elif eco_type == "obligate":
            # Obligate must have a primary tree.
            if not local_trees:
                tree_multiplier = 0.0  # No trees = no obligate mycorrhizal
            elif has_primary:
                tree_multiplier = 1.0
            else:
                tree_multiplier = 0.0  # Wrong tree type

        elif eco_type == "facultative":
            # Adaptable, prefers primary, tolerates secondary, tolerates random trees poorly
            if not local_trees:
                tree_multiplier = 0.0
            elif has_primary:
                tree_multiplier = 1.0
            elif has_secondary:
                tree_multiplier = 0.75
            else:
                tree_multiplier = 0.25  # Still possible, but unlikely

        normalized_bio = normalized_bio * tree_multiplier
        bio_score = normalized_bio * bio_weight
    # -------------------------------

    # FAKE NEWS FILTER (Anti-Troll Mechanism)
    # Foragers often post fake reports or old photos to throw people off.
    # If the biological reality (weather, terrain) is terrible (< 30%), the buzz is biologically impossible.
    if normalized_bio < 0.30:
        trusted_buzz = 0.0  # Treat as fake news, zero out the buzz
    else:
        trusted_buzz = community_buzz

    # Combine trusted buzz with biology
    base_score = bio_score + (weights["community"] * trusted_buzz)

    # Re-normalize since we removed the 'forest' additive weight
    base_score = base_score / (1.0 - weights.get("forest", 0.0))

    # We now rely entirely on Copernicus for the forest mask (it's 10,000x more precise)
    # The OSM forest mask is ignored.
    forest_multiplier = 1.0

    total_score = base_score * forest_multiplier

    # --- POST-SCORE ENVIRONMENTAL VETOES ---
    # Frost Veto: surface temp below 2°C in last 24h destroys fruiting bodies
    min_surface_temp = weather_agg.get("min_surface_temp_24h", 15.0)
    if min_surface_temp < 2.0:
        total_score *= 0.1

    # Surface Drought Penalty: dry top soil aborts pin formation (species-specific severity)
    m_0_1 = weather_agg.get("surface_moisture_0_1cm", 0.15)
    m_1_3 = weather_agg.get("surface_moisture_1_3cm", 0.20)
    if m_0_1 < 0.10 and m_1_3 < 0.15:
        total_score *= env.get("surface_drought_multiplier", 0.6)

    # Snow Veto: physical barrier prevents fruiting (except Finferla through thin snow)
    snow_depth = weather_agg.get("snow_depth_m", 0.0)
    snow_max = env.get("snow_max_m", 0.0)
    if env.get("snow_veto", True) and snow_depth > snow_max:
        total_score = 0.0

    # pH Toxicity Penalty: soil chemistry is an absolute biological limit
    # pH is logarithmic — each unit = 10x H+ concentration difference
    # Quadratic decay: score drops to 0 at ph_lethal_dist units outside ideal range
    if soil_ph is not None:
        min_ph, max_ph = profile["ideal_ph"]
        if soil_ph < min_ph or soil_ph > max_ph:
            ph_dist = min(abs(soil_ph - min_ph), abs(soil_ph - max_ph))
            ph_lethal = PH_LETHAL_DIST.get(species_id, 2.0)
            ph_penalty = max(0.0, 1.0 - (ph_dist / ph_lethal) ** 2)
            total_score *= ph_penalty

    final_score = min(1.0, max(0.0, total_score))

    tree_type_str = ", ".join(local_trees) if local_trees else "Unknown"

    return final_score, tree_type_str


REGIONS = {
    "asiago": {"lat_min": 45.80, "lat_max": 45.95, "lon_min": 11.40, "lon_max": 11.60},
    "recoaro": {"lat_min": 45.65, "lat_max": 45.75, "lon_min": 11.15, "lon_max": 11.25},
    "lavarone": {
        "lat_min": 45.90,
        "lat_max": 46.00,
        "lon_min": 11.20,
        "lon_max": 11.35,
    },
}


def generate_grid(region_name: str, step_m: float = 250.0):
    import data_services
    """
    Generate a grid of lat/lon points for a given region.
    step_m is the distance between points in meters.
    """
    if region_name not in REGIONS:
        return []

    bounds = REGIONS[region_name]

    # 1 degree of latitude is ~111,320 meters
    lat_step = step_m / 111320.0

    # 1 degree of longitude is ~111,320 * cos(lat) meters
    avg_lat = (bounds["lat_min"] + bounds["lat_max"]) / 2.0
    lon_step = step_m / (111320.0 * math.cos(math.radians(avg_lat)))

    grid = []
    lat = bounds["lat_min"]
    while lat <= bounds["lat_max"]:
        lon = bounds["lon_min"]
        while lon <= bounds["lon_max"]:
            grid.append((round(lat, 5), round(lon, 5)))
            lon += lon_step
        lat += lat_step

    return grid
