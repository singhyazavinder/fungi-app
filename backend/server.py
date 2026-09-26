import math
from typing import Dict, List

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from core_engine import REGIONS, SPECIES_PROFILES, calculate_score
from data_services import (
    aggregate_weather_data,
    get_soil_ph,
    get_terrain_data,
    get_weather_forecast,
)

import os
from dotenv import load_dotenv

# Load local .env if it exists
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))

app = FastAPI(title="Fungi Prediction API")

@app.middleware("http")
async def enforce_vault_lock(request, call_next):
    # Allow CORS preflight requests
    if request.method == "OPTIONS":
        return await call_next(request)
        
    # Check the secret password from environment variables
    secret_password = os.getenv("FUNGI_SECRET_PASSWORD")
    
    # If a password is set on the server, enforce it
    if secret_password:
        client_auth = request.headers.get("X-Fungi-Auth")
        if client_auth != secret_password:
            from fastapi.responses import JSONResponse
            return JSONResponse(status_code=401, content={"detail": "Secure Vault: Incorrect or missing password."})
            
    return await call_next(request)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class PredictionRequest(BaseModel):
    lat: float
    lon: float
    species_id: str


class RegionPredictionRequest(BaseModel):
    region_id: str
    species_id: str


@app.get("/species")
def get_species():
    """Return all supported species and their info."""
    return SPECIES_PROFILES


@app.post("/predict/point")
def predict_point(req: PredictionRequest):
    """Predict for a single point."""
    if req.species_id not in SPECIES_PROFILES:
        raise HTTPException(status_code=404, detail="Species not found")

    terrain = get_terrain_data(req.lat, req.lon)
    if terrain["elevation"] == 0.0:
        return {"score": 0.0, "message": "No terrain data for this point"}

    weather = get_weather_forecast(req.lat, req.lon, terrain["elevation"])
    weather_agg = aggregate_weather_data(weather)

    soil_ph = get_soil_ph(req.lat, req.lon)

    # 1. Fetch community buzz
    from data_services import get_community_buzz

    buzz_data = get_community_buzz()

    # 2. Check forest mask (mocking region_id as 'asiago' for the mask check or doing a generic search)
    # The current forest_manager expects a region_id. Since predict_point can be anywhere, we'll try to find the region.
    from data_services import is_in_forest

    in_forest = True
    found_region = ""
    for region_id, bounds in REGIONS.items():
        if (
            bounds["lat_min"] <= req.lat <= bounds["lat_max"]
            and bounds["lon_min"] <= req.lon <= bounds["lon_max"]
        ):
            in_forest = is_in_forest(req.lat, req.lon, region_id)
            found_region = region_id
            break

    # 3. Simulate score for the next 7 days
    future_scores = []
    base_score = 0
    base_tree_type = ""
    for day in range(8):
        simulated_weather_agg = aggregate_weather_data(weather, day_offset=day)
        sc, tr = calculate_score(
            req.species_id,
            simulated_weather_agg,
            terrain,
            soil_ph,
            community_buzz=buzz_data["buzz_score"],
            in_forest=in_forest,
            lat=req.lat,
            lon=req.lon,
            region=found_region,
        )
        future_scores.append(sc)
        if day == 0:
            base_score = sc
            base_tree_type = tr

    return {
        "lat": req.lat,
        "lon": req.lon,
        "species_id": req.species_id,
        "score": base_score,
        "tree_type": base_tree_type,
        "terrain": terrain,
        "soil_ph": soil_ph,
        "weather_summary": weather_agg,
        "forecast": {"future_scores": future_scores},
    }


@app.get("/regions")
def get_regions():
    """Return available regions."""
    return list(REGIONS.keys())


from data_services import get_community_buzz


@app.get("/predict/grid/{region_id}/{species_id}")
def predict_grid(region_id: str, species_id: str):
    """Generate a GeoJSON grid of predictions for a region."""
    if region_id not in REGIONS:
        raise HTTPException(status_code=404, detail="Region not found")
    if species_id not in SPECIES_PROFILES:
        raise HTTPException(status_code=404, detail="Species not found")

    bounds = REGIONS[region_id]
    center_lat = (bounds["lat_min"] + bounds["lat_max"]) / 2
    center_lon = (bounds["lon_min"] + bounds["lon_max"]) / 2

    # Fetch global community buzz once for the region
    from data_services import get_community_buzz

    buzz_data = get_community_buzz()

    # Fetch weather for the 4 corners of the bounding box to allow bilinear interpolation
    from data_services import get_regional_weather, interpolate_weather

    regional_weather = get_regional_weather(bounds)

    # Query soil ONCE for the region center (as soil pH doesn't vary as dynamically as weather)
    center_soil_ph = get_soil_ph(center_lat, center_lon)

    # Get terrain for the center to use for altitude-based temperature adjustment (lapse rate)
    center_terrain = get_terrain_data(center_lat, center_lon)

    grid_points = generate_grid(region_id, 600.0)
    features = []

    for lat, lon in grid_points:
        terrain = get_terrain_data(lat, lon)
        if terrain["elevation"] == 0.0:
            continue

        from data_services import is_in_forest

        in_forest = is_in_forest(lat, lon, region_id)

        # 1. Bilinear interpolation of weather for this exact lat/lon
        local_weather_base = interpolate_weather(lat, lon, regional_weather)

        # 2. Micro-climate adjustment: Temperature drops ~0.65C per 100m elevation gain
        elev_diff = terrain["elevation"] - center_terrain["elevation"]
        local_weather = local_weather_base.copy()
        local_weather["current_soil_temp_6cm"] -= (elev_diff / 100.0) * 0.65

        score, tree_type = calculate_score(
            species_id,
            local_weather,
            terrain,
            center_soil_ph,
            community_buzz=buzz_data["buzz_score"],
            in_forest=in_forest,
            lat=lat,
            lon=lon,
            region=region_id,
        )

        # Create a simple square polygon for the cell
        lat_step = 600.0 / 111320.0 / 2
        lon_step = 600.0 / (111320.0 * math.cos(math.radians(lat))) / 2

        polygon = [
            [lon - lon_step, lat - lat_step],
            [lon + lon_step, lat - lat_step],
            [lon + lon_step, lat + lat_step],
            [lon - lon_step, lat + lat_step],
            [lon - lon_step, lat - lat_step],
        ]

        if score > 0:
            features.append(
                {
                    "type": "Feature",
                    "geometry": {"type": "Polygon", "coordinates": [polygon]},
                    "properties": {
                        "score": score,
                        "elevation": terrain["elevation"],
                        "tree_type": tree_type,
                    },
                }
            )

    return {"type": "FeatureCollection", "features": features}


@app.get("/buzz")
def get_buzz():
    """Return community buzz and alerts."""
    try:
        return get_community_buzz()
    except Exception as e:
        return {
            "buzz": {
                "level": "Unknown",
                "color": "#9e9e9e",
                "message": "Error loading buzz",
            },
            "alerts": [],
        }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
import math

# Bounding boxes for the 3 target areas
# Asiago, Recoaro, Lavarone


def generate_grid(region_name: str, step_m: float = 250.0):
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


if __name__ == "__main__":
    # Test grid generation
    g = generate_grid("recoaro", 250)
    print(f"Generated {len(g)} points for Recoaro at 250m resolution.")
    print("Sample points:", g[:5])
