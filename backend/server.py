import math
import os
from typing import Dict, List
from concurrent.futures import ThreadPoolExecutor

from fastapi import FastAPI, HTTPException, BackgroundTasks, Response
import requests
import base64
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

import datetime
from core_engine import REGIONS, SPECIES_PROFILES, calculate_score, generate_grid

class RecordRequest(BaseModel):
    lat: float
    lon: float
    species_id: str
    action: str
    username: str = "Anonymous"
    timestamp: str = None

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

_base_grids = {}

app = FastAPI(title="Fungi Prediction API")
app.add_middleware(GZipMiddleware, minimum_size=1000)

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

@app.on_event("startup")
def sync_from_github():
    """Fetch the latest records from GitHub on startup since Render disk is ephemeral."""
    import os
    import requests
    import base64

    github_token = os.environ.get("GITHUB_TOKEN")
    github_repo = os.environ.get("GITHUB_REPO")
    if not github_token or not github_repo:
        print("Skipping GitHub startup sync: missing credentials")
        return

    url = f"https://api.github.com/repos/{github_repo}/contents/data/user_records.jsonl"
    headers = {
        "Authorization": f"token {github_token}",
        "Accept": "application/vnd.github.v3+json"
    }

    try:
        res = requests.get(url, headers=headers)
        if res.status_code == 200:
            data = res.json()
            content = base64.b64decode(data["content"]).decode('utf-8')
            
            os.makedirs("data", exist_ok=True)
            with open("data/user_records.jsonl", "w") as f:
                f.write(content)
            print("Successfully restored user_records.jsonl from GitHub on startup.")
    except Exception as e:
        print(f"Failed to restore records from GitHub: {e}")

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

    buzz_data = get_community_buzz()

    in_forest = True
    found_region = ""
    bounds = None
    for region_id, b in REGIONS.items():
        if (
            b["lat_min"] <= req.lat <= b["lat_max"]
            and b["lon_min"] <= req.lon <= b["lon_max"]
        ):
            in_forest = is_in_forest(req.lat, req.lon, region_id)
            found_region = region_id
            bounds = b
            break

    if bounds:
        center_lat = (bounds["lat_min"] + bounds["lat_max"]) / 2
        center_lon = (bounds["lon_min"] + bounds["lon_max"]) / 2
        
        soil_ph = get_soil_ph(center_lat, center_lon)
        
        future_scores = []
        base_score = 0
        base_tree_type = ""
        
        weather = get_weather_forecast(req.lat, req.lon, terrain["elevation"])
        weather_agg = aggregate_weather_data(weather)
        
        for day in range(8):
            simulated_weather_agg = aggregate_weather_data(weather, day_offset=day)
            sc, tr = calculate_score(
                req.species_id,
                simulated_weather_agg,
                terrain,
                soil_ph,
                community_buzz=buzz_data.get("regions", {}).get(found_region, {}).get("buzz_score", 0.1),
                in_forest=in_forest,
                lat=req.lat,
                lon=req.lon,
                region=found_region,
            )
            future_scores.append(sc)
            if day == 0:
                base_score = sc
                base_tree_type = tr
    else:
        # Do not predict outside supported regions
        return {"score": 0.0, "message": "Fuori dalle regioni supportate."}

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


def sync_to_github():
    import os
    github_token = os.environ.get("GITHUB_TOKEN")
    github_repo = os.environ.get("GITHUB_REPO")
    if not github_token or not github_repo:
        print("Skipping GitHub sync: GITHUB_TOKEN or GITHUB_REPO not set.")
        return

    records_file = "data/user_records.jsonl"
    if not os.path.exists(records_file):
        return

    with open(records_file, "r") as f:
        content = f.read()

    b64_content = base64.b64encode(content.encode('utf-8')).decode('utf-8')
    url = f"https://api.github.com/repos/{github_repo}/contents/data/user_records.jsonl"
    headers = {
        "Authorization": f"token {github_token}",
        "Accept": "application/vnd.github.v3+json"
    }

    # Get file SHA if it exists
    sha = None
    res = requests.get(url, headers=headers)
    if res.status_code == 200:
        sha = res.json().get("sha")

    payload = {
        "message": "Auto-sync user records",
        "content": b64_content
    }
    if sha:
        payload["sha"] = sha

    put_res = requests.put(url, headers=headers, json=payload)
    if put_res.status_code in [200, 201]:
        print("Successfully synced to GitHub.")
    else:
        print(f"Failed to sync to GitHub: {put_res.status_code} {put_res.text}")

@app.post("/record")
def record_sighting(req: RecordRequest, background_tasks: BackgroundTasks):
    """Record a user sighting or collection, or undo it."""
    import json
    import os
    
    os.makedirs("data", exist_ok=True)
    records_file = "data/user_records.jsonl"
    
    if req.action == "delete":
        if os.path.exists(records_file):
            lines = []
            with open(records_file, "r") as f:
                lines = f.readlines()
            
            target_index = -1
            for i in range(len(lines) - 1, -1, -1):
                try:
                    record = json.loads(lines[i])
                    if (record.get("timestamp") == req.timestamp):
                        target_index = i
                        break
                except:
                    pass
            
            if target_index != -1:
                del lines[target_index]
                with open(records_file, "w") as f:
                    f.writelines(lines)
        
        background_tasks.add_task(sync_to_github)
        return {"status": "success", "message": "Record deleted"}
        
    elif req.action == "undo_found":
        if os.path.exists(records_file):
            lines = []
            with open(records_file, "r") as f:
                lines = f.readlines()
            
            # Find the most recent "found" for this specific lat, lon, species, day, and user
            today_str = datetime.datetime.now().isoformat()[:10] # YYYY-MM-DD (Italy time via TZ env var)
            target_index = -1
            
            # Search backwards to remove the most recent match
            for i in range(len(lines) - 1, -1, -1):
                try:
                    record = json.loads(lines[i])
                    if (record.get("action") == "found" and
                        record.get("lat") == req.lat and
                        record.get("lon") == req.lon and
                        record.get("species_id") == req.species_id and
                        record.get("username", "Anonymous") == req.username and
                        record.get("timestamp", "").startswith(today_str)):
                        target_index = i
                        break
                except:
                    pass
            
            if target_index != -1:
                del lines[target_index]
                with open(records_file, "w") as f:
                    f.writelines(lines)
        
        background_tasks.add_task(sync_to_github)
        return {"status": "success", "message": "Record undone"}
    else:
        with open(records_file, "a") as f:
            f.write(json.dumps({
                "timestamp": datetime.datetime.now().isoformat(),
                "lat": req.lat,
                "lon": req.lon,
                "species_id": req.species_id,
                "action": req.action,
                "username": req.username
            }) + "\n")
            
        background_tasks.add_task(sync_to_github)
        return {"status": "success"}

@app.get("/records/all")
def get_all_records():
    import json
    import os
    records = []
    if os.path.exists("data/user_records.jsonl"):
        with open("data/user_records.jsonl", "r") as f:
            for line in f:
                if line.strip():
                    try:
                        records.append(json.loads(line))
                    except:
                        pass
    return records

@app.get("/regions")
def get_regions():
    """Return available regions."""
    return list(REGIONS.keys())





@app.get("/predict/grid/{region_id}/{species_id}")
def predict_grid(region_id: str, species_id: str, response: Response):
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
    if not regional_weather or not regional_weather[0].get("agg"):
        raise HTTPException(status_code=503, detail="Weather API rate limited or unavailable.")

    # Query soil ONCE for the region center (as soil pH doesn't vary as dynamically as weather)
    center_soil_ph = get_soil_ph(center_lat, center_lon)

    # Get terrain for the center to use for altitude-based temperature adjustment (lapse rate)
    center_terrain = get_terrain_data(center_lat, center_lon)

    grid_points = generate_grid(region_id, 250.0)
    # Lazily precompute and cache the static terrain grid for the region
    if region_id not in _base_grids:
        print(f"Precomputing static terrain for {region_id} (this only happens once)...")
        _base_grids[region_id] = []
        
        # Process sequentially to prevent GDAL memory leaks
        for lat, lon in grid_points:
            terrain = get_terrain_data(lat, lon)
            if terrain["elevation"] == 0.0:
                continue
                
            in_forest_flag = is_in_forest(lat, lon, region_id)
            
            # Pre-calculate the geometry for this cell since it's also static
            lat_step = 250.0 / 111320.0 / 2
            lon_step = 250.0 / (111320.0 * math.cos(math.radians(lat))) / 2
            geometry = {
                "type": "Polygon", 
                "coordinates": [[
                    [lon - lon_step, lat - lat_step],
                    [lon + lon_step, lat - lat_step],
                    [lon + lon_step, lat + lat_step],
                    [lon - lon_step, lat + lat_step],
                    [lon - lon_step, lat - lat_step],
                ]]
            }
            
            _base_grids[region_id].append({
                "lat": lat,
                "lon": lon,
                "terrain": terrain,
                "in_forest_flag": in_forest_flag,
                "geometry": geometry
            })
            
    base_grid = _base_grids[region_id]
    features = []

    # Process each precomputed point rapidly
    for point in base_grid:
        lat = point["lat"]
        lon = point["lon"]
        terrain = point["terrain"]
        in_forest_flag = point["in_forest_flag"]

        local_weather_base = interpolate_weather(lat, lon, regional_weather)
        elev_diff = terrain["elevation"] - center_terrain["elevation"]
        local_weather = local_weather_base.copy()
        local_weather["current_soil_temp_6cm"] -= (elev_diff / 100.0) * 0.65

        score, tree_type = calculate_score(
            species_id,
            local_weather,
            terrain,
            center_soil_ph,
            community_buzz=buzz_data.get("regions", {}).get(region_id, {}).get("buzz_score", 0.1),
            in_forest=in_forest_flag,
            lat=lat,
            lon=lon,
            region=region_id,
        )

        if score > 0:
            features.append({
                "type": "Feature",
                "geometry": point["geometry"],
                "properties": {
                    "score": score,
                    "elevation": terrain["elevation"],
                    "tree_type": tree_type,
                },
            })

    # Cache this heavy response in the browser for 6 hours
    response.headers["Cache-Control"] = "public, max-age=21600"
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
