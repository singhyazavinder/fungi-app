import time
from backend.data_services import get_terrain_data, is_in_forest
from backend.server import generate_grid

start = time.time()
points = generate_grid("asiago", 250.0)
print(f"Generated {len(points)} points in {time.time() - start:.2f}s")

start = time.time()
for lat, lon in points[:100]:
    get_terrain_data(lat, lon)
    is_in_forest(lat, lon, "asiago")
print(f"100 points took {time.time() - start:.2f}s")
print(f"Estimated time for {len(points)} points: {(time.time() - start) * (len(points)/100):.2f}s")
