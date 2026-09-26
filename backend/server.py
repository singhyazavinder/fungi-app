import math
import os
from typing import Dict, List
from concurrent.futures import ThreadPoolExecutor

from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from core_engine import REGIONS, SPECIES_PROFILES, calculate_score, generate_grid
from data_services import (
    aggregate_weather_data,
    get_community_buzz,
    get_regional_weather,
    get_soil_ph,
    get_terrain_data,
    get_weather_forecast,
    interpolate_weather,
    is_in_forest,
)



# Load local .env if it exists
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))

app = FastAPI(title="Fungi Prediction API")

@app.middleware("http")
async def enforce_vault_lock(request, call_next):
    # Allow CORS preflight requests and the public ping endpoint
    if request.method == "OPTIONS" or request.url.path == "/ping":
        return await call_next(request)
        
    # Check the secret password from environment variables
    secret_password = os.getenv("FUNGI_SECRET_PASSWORD")
    
    # If a password is set on the server, enforce it
    if secret_password:
        client_auth = request.headers.get("X-Fungi-Auth")
        if client_auth != secret_password:
            return JSONResponse(
                status_code=401, 
                content={"detail": "Secure Vault: Incorrect or missing password."},
                headers={"Access-Control-Allow-Origin": "*"}
            )
            
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


@app.get("/ping")
def ping_server():
    """Lightweight endpoint to keep the server awake."""
    return {"status": "awake"}

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

    buzz_data = get_community_buzz()

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

    buzz_data = get_community_buzz()

    regional_weather = get_regional_weather(bounds)

    # Query soil ONCE for the region center (as soil pH doesn't vary as dynamically as weather)
    center_soil_ph = get_soil_ph(center_lat, center_lon)

    # Get terrain for the center to use for altitude-based temperature adjustment (lapse rate)
    center_terrain = get_terrain_data(center_lat, center_lon)

    grid_points = generate_grid(region_id, 250.0)
    features = []

    # Process each grid point — parallelized for speed
    def process_point(lat, lon):
        terrain = get_terrain_data(lat, lon)
        if terrain["elevation"] == 0.0:
            return None

        in_forest_flag = is_in_forest(lat, lon, region_id)

        local_weather_base = interpolate_weather(lat, lon, regional_weather)
        elev_diff = terrain["elevation"] - center_terrain["elevation"]
        local_weather = local_weather_base.copy()
        local_weather["current_soil_temp_6cm"] -= (elev_diff / 100.0) * 0.65

        score, tree_type = calculate_score(
            species_id,
            local_weather,
            terrain,
            center_soil_ph,
            community_buzz=buzz_data["buzz_score"],
            in_forest=in_forest_flag,
            lat=lat,
            lon=lon,
            region=region_id,
        )

        if score <= 0:
            return None

        lat_step = 250.0 / 111320.0 / 2
        lon_step = 250.0 / (111320.0 * math.cos(math.radians(lat))) / 2

        return {
            "type": "Feature",
            "geometry": {"type": "Polygon", "coordinates": [[
                [lon - lon_step, lat - lat_step],
                [lon + lon_step, lat - lat_step],
                [lon + lon_step, lat + lat_step],
                [lon - lon_step, lat + lat_step],
                [lon - lon_step, lat - lat_step],
            ]]},
            "properties": {
                "score": score,
                "elevation": terrain["elevation"],
                "tree_type": tree_type,
            },
        }

    with ThreadPoolExecutor(max_workers=8) as pool:
        results = pool.map(lambda p: process_point(p[0], p[1]), grid_points)
        features = [r for r in results if r is not None]

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
