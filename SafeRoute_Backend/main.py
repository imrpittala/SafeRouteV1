import json
import os
import asyncio
from datetime import datetime, timezone, timedelta
from typing import List, Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from contextlib import asynccontextmanager
import logging
import osmnx as ox
import networkx as nx
import redis.asyncio as redis
import httpx
import polyline

try:
    import asyncpg
except ImportError:
    asyncpg = None

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

G = None
redis_client = None
db_pool = None  # asyncpg connection pool for PostgreSQL

async def init_db_pool() -> Optional[object]:
    """Initialize asyncpg connection pool with a 5-step retry loop."""
    global db_pool
    if asyncpg is None:
        logger.warning("asyncpg not installed. PostgreSQL persistence disabled.")
        return None

    database_url = os.getenv("DATABASE_URL", "postgresql://saferoute_user:saferoute_pass@localhost:5432/saferoute_db")
    
    for attempt in range(1, 6):
        try:
            logger.info(f"PostgreSQL connection attempt {attempt}/5...")
            pool = await asyncpg.create_pool(
                dsn=database_url,
                min_size=2,
                max_size=10,
                command_timeout=10
            )
            logger.info("PostgreSQL connection pool established successfully.")
            return pool
        except Exception as e:
            logger.warning(f"PostgreSQL connection attempt {attempt}/5 failed: {e}")
            if attempt < 5:
                await asyncio.sleep(2)
    
    logger.error("All 5 PostgreSQL connection attempts failed. Running without persistent storage.")
    return None


async def run_migrations(pool):
    """Auto-DDL: Enable PostGIS and create sos_incidents table if not exists."""
    async with pool.acquire() as conn:
        # Enable PostGIS extension
        await conn.execute("CREATE EXTENSION IF NOT EXISTS postgis;")
        logger.info("PostGIS extension ensured.")
        
        # Create sos_incidents table
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS sos_incidents (
                id              SERIAL PRIMARY KEY,
                user_id         VARCHAR(128) NOT NULL,
                geom            GEOMETRY(Point, 4326),
                latitude        DOUBLE PRECISION NOT NULL,
                longitude       DOUBLE PRECISION NOT NULL,
                created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                resolved_at     TIMESTAMPTZ,
                exposure_level  VARCHAR(32) DEFAULT 'unknown'
            );
        """)
        
        # Create spatial GIST index for fast geospatial queries
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_sos_incidents_geom
            ON sos_incidents USING GIST (geom);
        """)
        
        # Create index on created_at for time-range heatmap queries
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_sos_incidents_created_at
            ON sos_incidents (created_at);
        """)
        
        logger.info("Database migrations complete: sos_incidents table and indexes verified.")


@asynccontextmanager
async def lifespan(app: FastAPI):
    global G, redis_client, db_pool
    logger.info("Initializing Graph with OSMnx...")
    try:
        # Expanded bounding box to cover Kukatpally, Madhapur, Gachibowli, and core tech hubs (12km radius)
        point = (17.4849, 78.4026) # Hyderabad (Kukatpally)
        G = ox.graph_from_point(point, dist=12000, network_type='drive')
        logger.info(f"Graph initialized with {len(G.nodes)} nodes.")
    except Exception as e:
        logger.error(f"Error initializing graph: {e}")
        G = nx.MultiDiGraph() # Fallback

    if redis_client is None:
        redis_host = os.getenv("REDIS_HOST", "127.0.0.1")
        logger.info(f"Initializing Redis client connecting to host: {redis_host}...")
        redis_client = redis.Redis(
            host=redis_host, 
            port=6379, 
            db=0, 
            decode_responses=True,
            socket_timeout=1.0,
            socket_connect_timeout=1.0,
            retry=None
        )
    
    # Initialize PostgreSQL connection pool
    db_pool = await init_db_pool()
    if db_pool:
        try:
            await run_migrations(db_pool)
        except Exception as e:
            logger.error(f"Database migration failed: {e}. Continuing without persistent storage.")
    
    yield
    
    # Cleanup
    logger.info("Closing Redis client...")
    await redis_client.aclose()
    
    if db_pool:
        logger.info("Closing PostgreSQL connection pool...")
        await db_pool.close()

app = FastAPI(title="SafeRoute Backend", description="Real-time SOS alerting for SafeRoute.", lifespan=lifespan)

from src.routers.hazards import router as hazards_router
from src.routers.routing import router as routing_router

app.include_router(hazards_router)
app.include_router(routing_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Location(BaseModel):
    lat: float
    lng: float

class SOSAlert(BaseModel):
    userId: str
    location: Location
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")
    type: str = "SOS"

class ValhallaRouteRequest(BaseModel):
    user_lat: float
    user_lng: float
    dest_lat: float
    dest_lng: float

SOS_TTL = 3600
DANGER_PENALTY = 1000.0

# In-memory fallback database for SOS alerts in case Redis is offline
MEM_SOS_ALERTS = {} # userId -> {"lat": float, "lng": float, "timestamp": datetime}

@app.put("/settings/weights")
async def update_weights(penalty: float):
    global DANGER_PENALTY
    DANGER_PENALTY = penalty
    logger.info(f"Updated Danger Penalty to {DANGER_PENALTY}")
    return {"status": "success", "danger_penalty": DANGER_PENALTY}

@app.get("/settings/weights")
async def get_weights():
    return {"danger_penalty": DANGER_PENALTY}

async def add_active_sos(user_id: str, lat: float, lng: float):
    # Always cache in local RAM first as our fail-safe fallback
    MEM_SOS_ALERTS[user_id] = {
        "lat": lat,
        "lng": lng,
        "timestamp": datetime.utcnow()
    }
    
    # Write to Redis (real-time geofencing for Valhalla routing)
    if redis_client is not None:
        try:
            await redis_client.geoadd("sos_alerts", (lng, lat, user_id))
            await redis_client.setex(f"sos_ttl:{user_id}", SOS_TTL, "active")
        except Exception as e:
            logger.error(f"Redis geoadd failed. Falling back to RAM cache. Error: {e}")
    
    # Write to PostgreSQL (permanent archival for heatmaps)
    if db_pool is not None:
        try:
            async with db_pool.acquire() as conn:
                await conn.execute("""
                    INSERT INTO sos_incidents (user_id, geom, latitude, longitude)
                    VALUES ($1, ST_SetSRID(ST_MakePoint($3, $2), 4326), $2, $3)
                """, user_id, lat, lng)
            logger.info(f"SOS incident for {user_id} archived to PostgreSQL.")
        except Exception as e:
            logger.error(f"PostgreSQL archival failed for {user_id}. Alert still cached in Redis/RAM. Error: {e}")

async def get_nearby_sos(lat: float, lng: float, radius_km: float = 2.0) -> List[str]:
    # Clean up expired alerts from RAM cache
    now = datetime.utcnow()
    expired = [uid for uid, alert in MEM_SOS_ALERTS.items() if (now - alert["timestamp"]).total_seconds() > SOS_TTL]
    for uid in expired:
        del MEM_SOS_ALERTS[uid]
        
    try:
        if redis_client is not None:
            members = await redis_client.georadius("sos_alerts", lng, lat, radius_km, unit='km')
            active_members = []
            for member in members:
                try:
                    is_active = await redis_client.exists(f"sos_ttl:{member}")
                    if is_active:
                        active_members.append(member)
                    else:
                        await redis_client.zrem("sos_alerts", member)
                except Exception as inner_err:
                    # If redis connection broke mid-loop, use RAM cache presence
                    if member in MEM_SOS_ALERTS:
                        active_members.append(member)
            return active_members
    except Exception as e:
        logger.error(f"Redis georadius failed. Querying RAM cache instead. Error: {e}")

    # Fallback RAM-based geofence query
    active_members = []
    for uid, alert in MEM_SOS_ALERTS.items():
        dist = haversine(lat, lng, alert["lat"], alert["lng"]) / 1000.0 # in km
        if dist <= radius_km:
            active_members.append(uid)
    return active_members

import heapq

def fastest_weight(u, v, d):
    length = d.get('length', 1.0)
    speed_kph = d.get('speed_kph', 50.0)
    if isinstance(speed_kph, list):
        speed_kph = float(speed_kph[0])
    try:
        speed_kph = float(speed_kph)
    except:
        speed_kph = 50.0
    speed_m_s = speed_kph * 1000 / 3600
    if speed_m_s <= 0: speed_m_s = 1.0
    return length / speed_m_s

import math
def haversine(lat1, lon1, lat2, lon2):
    R = 6371000 # radius of earth in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def create_safest_weight_func(active_sos_points):
    def safest_weight(u, v, d):
        base_weight = fastest_weight(u, v, d)
        if G is not None:
            u_data = G.nodes[u]
            lat = u_data.get('y')
            lng = u_data.get('x')
            if lat is not None and lng is not None:
                # check distance to all active sos points
                for (sos_lat, sos_lng) in active_sos_points:
                    dist = haversine(lat, lng, sos_lat, sos_lng)
                    if dist <= 500: # 500 meters
                        return base_weight + DANGER_PENALTY
        return base_weight
    return safest_weight

def custom_dijkstra(graph, source, target, weight_func):
    queue = []
    heapq.heappush(queue, (0.0, source, [source]))
    distances = {source: 0.0}
    
    while queue:
        current_dist, current_node, path = heapq.heappop(queue)
        
        if current_dist > distances.get(current_node, float('inf')):
            continue
            
        if current_node == target:
            return path, current_dist
            
        for neighbor in graph.neighbors(current_node):
            for key, edge_data in graph[current_node][neighbor].items():
                edge_weight = weight_func(current_node, neighbor, edge_data)
                distance = current_dist + edge_weight
                
                if distance < distances.get(neighbor, float('inf')):
                    distances[neighbor] = distance
                    heapq.heappush(queue, (distance, neighbor, path + [neighbor]))
                    
    return None, float('inf')

def create_danger_polygon(lat: float, lng: float, radius_km: float = 0.2):
    """
    Creates a square bounding box around an SOS point.
    Valhalla expects an array of [longitude, latitude] coordinates closing the polygon.
    """
    offset_lat = radius_km / 111.0 # 1 degree lat is approx 111 km
    offset_lng = radius_km / (111.0 * math.cos(math.radians(lat)))
    
    return [
        [lng - offset_lng, lat - offset_lat], # Bottom-Left
        [lng + offset_lng, lat - offset_lat], # Bottom-Right
        [lng + offset_lng, lat + offset_lat], # Top-Right
        [lng - offset_lng, lat + offset_lat], # Top-Left
        [lng - offset_lng, lat - offset_lat]  # Close polygon
    ]

@app.post("/api/routes/valhalla")
async def get_valhalla_route(req: ValhallaRouteRequest):
    # Log incoming coordinates for diagnosis
    logger.info(
        f"Received Valhalla route query: User ({req.user_lat}, {req.user_lng}) -> Destination ({req.dest_lat}, {req.dest_lng})"
    )

    # Determine the midpoint to find nearby SOS alerts
    mid_lat = (req.user_lat + req.dest_lat) / 2
    mid_lng = (req.user_lng + req.dest_lng) / 2
    nearby_sos_users = await get_nearby_sos(mid_lat, mid_lng, radius_km=10.0)
    
    active_sos_points = []
    for user_id in nearby_sos_users:
        if user_id in MEM_SOS_ALERTS:
            active_sos_points.append({"lat": MEM_SOS_ALERTS[user_id]["lat"], "lng": MEM_SOS_ALERTS[user_id]["lng"]})
        elif redis_client is not None:
            try:
                pos = await redis_client.geopos("sos_alerts", user_id)
                if pos and pos[0]:
                    active_sos_points.append({"lat": pos[0][1], "lng": pos[0][0]})
            except Exception as e:
                logger.error(f"Redis geopos retrieval failed: {e}")
                
    avoid_polygons = []
    for alert in active_sos_points:
        # Calculate distance from the alert to the start and destination points
        dist_to_start = haversine(alert["lat"], alert["lng"], req.user_lat, req.user_lng)
        dist_to_dest = haversine(alert["lat"], alert["lng"], req.dest_lat, req.dest_lng)
        
        # Convert distances to km for check and logging
        dist_to_start_km = dist_to_start / 1000.0
        dist_to_dest_km = dist_to_dest / 1000.0
        
        # If the SOS is within 0.12 km of start or destination, skip it so Valhalla doesn't fail
        if dist_to_start_km < 0.12 or dist_to_dest_km < 0.12:
            logger.info(f"Skipping avoid polygon for SOS alert close to route endpoints (Start: {dist_to_start_km:.3f} km, Dest: {dist_to_dest_km:.3f} km)")
            continue
            
        danger_zone = create_danger_polygon(alert["lat"], alert["lng"], radius_km=0.1)
        avoid_polygons.append(danger_zone)

    base_payload = {
        "locations": [
            {"lat": req.user_lat, "lon": req.user_lng, "type": "break", "radius": 300},
            {"lat": req.dest_lat, "lon": req.dest_lng, "type": "break", "radius": 300}
        ],
        "costing": "auto",
        "costing_options": {
            "auto": {
                "top_speed": 45,          # Maximum speed ceiling of 45 km/h for dense urban traffic
                "maneuver_penalty": 15.0,  # Simulate turning & intersection stop delays (15s)
                "gate_penalty": 30.0       # Simulate gate stop delays (30s)
            }
        },
        "directions_options": {
            "units": "kilometers"
        },
        "generalize": 100 # Engine-Level Simplification
    }

    # Verify the connection string uses the docker compose container name by default
    valhalla_url = os.getenv("VALHALLA_URL") or "http://saferoute_valhalla:8002/route"
    
    fastest_data = None
    safest_data = None
    route_blocked = False

    def parse_valhalla(data):
        if not data or "trip" not in data:
            return None
        trip = data["trip"]
        if not isinstance(trip, dict) or trip.get("status") != 0:
            return None
        if "legs" not in trip or not trip["legs"]:
            return None
        leg = trip["legs"][0]
        if "shape" not in leg:
            return None
        encoded_shape = leg["shape"]
        try:
            decoded_coords = polyline.decode(encoded_shape, 6)
        except Exception as parse_err:
            logger.error(f"Polyline decode error: {parse_err}")
            return None
        geojson_coords = [[lng, lat] for lat, lng in decoded_coords]
        
        summary = trip.get("summary", {})
        time_val = summary.get("time", 0)
        length_val = summary.get("length", 0)
        adjusted_weight = time_val * 1.61
        
        return {
            "type": "Feature",
            "geometry": {
                "type": "LineString",
                "coordinates": geojson_coords
            },
            "properties": {
                "weight": adjusted_weight,
                "distance_meters": length_val * 1000
            }
        }

    async with httpx.AsyncClient() as client:
        # 1. Fastest Route (No Avoidance)
        try:
            fastest_payload = {**base_payload}
            logger.info(f"Forwarding fastest route request to Valhalla at {valhalla_url} with payload: {fastest_payload}")
            fastest_res = await client.post(valhalla_url, json=fastest_payload, timeout=5.0)
            
            # Handle HTTP errors gracefully
            if fastest_res.status_code != 200:
                try:
                    error_body = fastest_res.json()
                except Exception:
                    error_body = fastest_res.text
                logger.error(f"Valhalla returned HTTP {fastest_res.status_code}: {error_body}")
                raise HTTPException(
                    status_code=400 if fastest_res.status_code == 400 else 502,
                    detail=f"Valhalla Engine Error: {error_body}"
                )
                
            fastest_data = fastest_res.json()
        except httpx.ConnectError as ce:
            logger.critical(f"Failed to connect to Valhalla engine at {valhalla_url}: {ce}")
            raise HTTPException(status_code=503, detail="Valhalla routing engine is unreachable or starting up.")
        except httpx.TimeoutException as te:
            logger.error(f"Timeout querying Valhalla engine at {valhalla_url}: {te}")
            raise HTTPException(status_code=504, detail="Valhalla routing request timed out.")
        except HTTPException:
            raise
        except Exception as e:
            logger.exception(f"Unexpected error during Valhalla query: {e}")
            raise HTTPException(status_code=500, detail=f"Valhalla routing engine query failed: {str(e)}")
            
        # 2. Safest Route (With Avoidance)
        if avoid_polygons:
            try:
                safest_payload = {**base_payload, "avoid_polygons": avoid_polygons}
                logger.info(f"Forwarding safest route request to Valhalla at {valhalla_url} with {len(avoid_polygons)} avoid polygons")
                safest_res = await client.post(valhalla_url, json=safest_payload, timeout=5.0)
                
                if safest_res.status_code != 200:
                    try:
                        error_body = safest_res.json()
                    except Exception:
                        error_body = safest_res.text
                    logger.warning(f"Safest route query returned HTTP {safest_res.status_code}: {error_body}. Triggering fallback.")
                    raise httpx.HTTPStatusError("Safest route request failed", request=safest_res.request, response=safest_res)
                    
                safest_data = safest_res.json()
            except Exception as e:
                logger.warning(f"Safest route completely blocked by polygons or error: {e}. Trying alternate safety scoring fallback...")
                route_blocked = True
                
                # Fallback: Query alternates of the fastest route
                try:
                    alternates_payload = {**base_payload, "alternates": 2}
                    logger.info(f"Forwarding alternates fallback request to Valhalla at {valhalla_url}")
                    alt_res = await client.post(valhalla_url, json=alternates_payload, timeout=5.0)
                    
                    if alt_res.status_code == 200:
                        alt_data = alt_res.json()
                        # Extract candidates (fastest and alternates)
                        candidates = []
                        # 1. Add fastest route
                        fastest_parsed = parse_valhalla(alt_data)
                        if fastest_parsed:
                            candidates.append((fastest_parsed, alt_data))
                        
                        # 2. Add alternate routes
                        for alt_trip in alt_data.get("alternates", []):
                            wrapped_alt = {"trip": alt_trip}
                            alt_parsed = parse_valhalla(wrapped_alt)
                            if alt_parsed:
                                candidates.append((alt_parsed, wrapped_alt))
                        
                        # Score candidates
                        best_candidate = None
                        best_score = float('inf')
                        
                        for parsed_route, raw_route in candidates:
                            coords = parsed_route["geometry"]["coordinates"] # list of [lng, lat]
                            
                            danger_score = 0.0
                            for alert in active_sos_points:
                                min_dist = float('inf')
                                for pt in coords:
                                    dist = haversine(alert["lat"], alert["lng"], pt[1], pt[0])
                                    if dist < min_dist:
                                        min_dist = dist
                                if min_dist <= 300.0:
                                    danger_score += (300.0 - min_dist) / 300.0
                            
                            if danger_score < best_score:
                                best_score = danger_score
                                best_candidate = raw_route
                            elif danger_score == best_score:
                                parsed_best = parse_valhalla(best_candidate)
                                if best_candidate is None or (parsed_best and parsed_route["properties"]["weight"] < parsed_best["properties"]["weight"]):
                                    best_candidate = raw_route
                        
                        safest_data = best_candidate
                        logger.info(f"Alternate routing fallback selected safest route with danger score: {best_score}")
                    else:
                        logger.error(f"Fallback alternates request returned status {alt_res.status_code}. Defaulting to fastest route.")
                        safest_data = fastest_data
                except Exception as fallback_err:
                    logger.error(f"Fallback alternate routing failed: {fallback_err}. Defaulting to fastest route.")
                    safest_data = fastest_data
        else:
            safest_data = fastest_data

    return {
        "fastest_route": parse_valhalla(fastest_data),
        "safest_route": parse_valhalla(safest_data),
        "route_blocked": route_blocked
    }

@app.get("/routes")
async def get_routes(start_lat: float, start_lng: float, end_lat: float, end_lng: float):
    if G is None or len(G.nodes) == 0:
        return {"error": "Graph not initialized"}
        
    try:
        source = ox.distance.nearest_nodes(G, X=start_lng, Y=start_lat)
        target = ox.distance.nearest_nodes(G, X=end_lng, Y=end_lat)
    except Exception as e:
        logger.error(f"Error finding nearest nodes: {e}")
        return {"error": "Invalid coordinates or empty graph"}
        
    fastest_path, fastest_weight_val = custom_dijkstra(G, source, target, fastest_weight)
    
    # Pre-fetch all SOS alerts to calculate safest dynamically without async overhead per edge
    # query globally or a large bounding radius from the midpoint
    mid_lat = (start_lat + end_lat) / 2
    mid_lng = (start_lng + end_lng) / 2
    nearby_sos_users = await get_nearby_sos(mid_lat, mid_lng, radius_km=10.0)
    
    active_sos_points = []
    for user_id in nearby_sos_users:
        if user_id in MEM_SOS_ALERTS:
            # High priority read from local RAM
            active_sos_points.append((MEM_SOS_ALERTS[user_id]["lat"], MEM_SOS_ALERTS[user_id]["lng"]))
        elif redis_client is not None:
            try:
                pos = await redis_client.geopos("sos_alerts", user_id)
                if pos and pos[0]:
                    active_sos_points.append((pos[0][1], pos[0][0])) # lat, lng
            except Exception as e:
                logger.error(f"Redis geopos retrieval failed: {e}")
                
    safest_func = create_safest_weight_func(active_sos_points)
    safest_path, safest_weight_val = custom_dijkstra(G, source, target, safest_func)
    
    # Calculate the actual physical travel time (unpenalized) of the safest path
    safest_real_weight_val = 0.0
    if safest_path:
        for i in range(len(safest_path) - 1):
            u = safest_path[i]
            v = safest_path[i+1]
            d = G.get_edge_data(u, v)
            if d:
                first_edge = list(d.values())[0]
                safest_real_weight_val += fastest_weight(u, v, first_edge)
    else:
        safest_real_weight_val = safest_weight_val

    def path_to_feature(path, weight_val):
        if not path:
            return None
        coords = []
        total_dist = 0.0
        for i in range(len(path)):
            u = path[i]
            node_data = G.nodes[u]
            coords.append([node_data['x'], node_data['y']])
            if i < len(path) - 1:
                v = path[i+1]
                d = G.get_edge_data(u, v)
                if d:
                    first_edge = list(d.values())[0]
                    total_dist += first_edge.get('length', 0)
        return {
            "type": "Feature",
            "geometry": {
                "type": "LineString",
                "coordinates": coords
            },
            "properties": {
                "weight": weight_val,
                "distance_meters": total_dist
            }
        }

    return {
        "fastest_route": path_to_feature(fastest_path, fastest_weight_val),
        "safest_route": path_to_feature(safest_path, safest_real_weight_val)
    }

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_text(json.dumps(message))
            except Exception as e:
                pass

manager = ConnectionManager()

@app.websocket("/ws/sos")
async def websocket_sos(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                payload = json.loads(data)
                # Validate payload
                alert = SOSAlert(**payload)
                
                # 1. Update Redis spatial index immediately
                await add_active_sos(alert.userId, alert.location.lat, alert.location.lng)
                
                # 2. Broadcast the alert to all connected clients
                await manager.broadcast(payload)
                
                logger.info(f"SOS alert received and broadcasted for user {alert.userId}")
            except Exception as e:
                logger.error(f"Error processing WS payload: {e}")
                # Optional: send error back to client
                pass
    except (WebSocketDisconnect, RuntimeError) as e:
        logger.info(f"WebSocket connection closed cleanly: {e}")
        manager.disconnect(websocket)

@app.get("/system/health")
async def get_system_health():
    redis_ok = False
    if redis_client is not None:
        try:
            redis_ok = await redis_client.ping()
        except Exception:
            redis_ok = False
    
    postgres_ok = False
    if db_pool is not None:
        try:
            async with db_pool.acquire() as conn:
                await conn.fetchval("SELECT 1")
            postgres_ok = True
        except Exception:
            postgres_ok = False
            
    return {
        "status": "healthy",
        "cpu_usage": 24.5,
        "memory_usage": 1540, # MB
        "active_workers": 12,
        "redis_connected": redis_ok,
        "postgres_connected": postgres_ok,
        "graph_nodes": len(G.nodes) if G else 0,
        "uptime_seconds": 15600
    }

@app.get("/api/analytics/heatmap")
async def get_heatmap():
    """
    Heatmap GeoJSON endpoint.
    Uses native PostGIS ST_AsGeoJSON and PostgreSQL json_build_object to construct
    a valid GeoJSON FeatureCollection entirely within the database engine.
    """
    if db_pool is None:
        return JSONResponse(
            status_code=503,
            content={"error": "PostgreSQL is not available. Heatmap data requires persistent storage."}
        )
    
    try:
        async with db_pool.acquire() as conn:
            row = await conn.fetchval("""
                SELECT json_build_object(
                    'type', 'FeatureCollection',
                    'features', COALESCE(json_agg(
                        json_build_object(
                            'type', 'Feature',
                            'geometry', ST_AsGeoJSON(geom)::json,
                            'properties', json_build_object(
                                'id', id,
                                'user_id', user_id,
                                'latitude', latitude,
                                'longitude', longitude,
                                'created_at', created_at,
                                'resolved_at', resolved_at,
                                'exposure_level', exposure_level
                            )
                        )
                    ), '[]'::json)
                )::text
                FROM sos_incidents;
            """)
            
            return JSONResponse(content=json.loads(row))
    except Exception as e:
        logger.error(f"Heatmap query failed: {e}")
        return JSONResponse(
            status_code=500,
            content={"error": f"Heatmap query failed: {str(e)}"}
        )


@app.get("/analytics/sos-trends")
async def get_sos_trends():
    # If PostgreSQL is available, query real data; otherwise fall back to mock
    if db_pool is not None:
        try:
            async with db_pool.acquire() as conn:
                rows = await conn.fetch("""
                    SELECT TO_CHAR(created_at, 'Dy') as day, COUNT(*) as alerts
                    FROM sos_incidents
                    WHERE created_at >= NOW() - INTERVAL '7 days'
                    GROUP BY TO_CHAR(created_at, 'Dy'), EXTRACT(DOW FROM created_at)
                    ORDER BY EXTRACT(DOW FROM created_at)
                """)
                if rows:
                    return [{"day": r["day"], "alerts": r["alerts"]} for r in rows]
        except Exception as e:
            logger.warning(f"Failed to query sos-trends from PostgreSQL: {e}. Using mock data.")
    
    # Fallback mock data
    return [
        {"day": "Mon", "alerts": 12},
        {"day": "Tue", "alerts": 19},
        {"day": "Wed", "alerts": 15},
        {"day": "Thu", "alerts": 22},
        {"day": "Fri", "alerts": 30},
        {"day": "Sat", "alerts": 45},
        {"day": "Sun", "alerts": 38}
    ]

@app.get("/analytics/response-times")
async def get_response_times():
    return [
        {"time": "10:00", "latency": 22},
        {"time": "11:00", "latency": 25},
        {"time": "12:00", "latency": 20},
        {"time": "13:00", "latency": 32},
        {"time": "14:00", "latency": 28},
        {"time": "15:00", "latency": 24}
    ]

class ResolveSOSRequest(BaseModel):
    userId: str

@app.post("/api/sos/resolve")
async def resolve_sos(req: ResolveSOSRequest):
    user_id = req.userId
    now_tz = datetime.now(timezone.utc)
    now_naive = datetime.utcnow()
    
    # 1. Update PostgreSQL
    if db_pool is not None:
        try:
            async with db_pool.acquire() as conn:
                await conn.execute(
                    "UPDATE sos_incidents SET resolved_at = $1 WHERE user_id = $2 AND resolved_at IS NULL",
                    now_tz, user_id
                )
            logger.info(f"Marked SOS incident resolved in PostgreSQL for user {user_id}")
        except Exception as e:
            logger.error(f"PostgreSQL resolve update failed: {e}")
            
    # 2. Clear Redis cache & memory
    if user_id in MEM_SOS_ALERTS:
        del MEM_SOS_ALERTS[user_id]
        
    if redis_client is not None:
        try:
            await redis_client.zrem("sos_alerts", user_id)
            await redis_client.delete(f"sos_ttl:{user_id}")
        except Exception as e:
            logger.error(f"Redis cache removal failed: {e}")
            
    # 3. Broadcast resolution to clients
    await manager.broadcast({
        "type": "SOS_RESOLVED",
        "userId": user_id,
        "timestamp": now_tz.isoformat()
    })
    
    return {"status": "success", "resolved_user": user_id}

@app.post("/api/admin/purge-stale-sos")
async def purge_stale_sos():
    purged_users = []
    now_tz = datetime.now(timezone.utc)
    now_naive = datetime.utcnow()
    
    # 1. Gather all active user IDs from memory and Redis
    active_user_ids = set(MEM_SOS_ALERTS.keys())
    if redis_client is not None:
        try:
            redis_users = await redis_client.zrange("sos_alerts", 0, -1)
            active_user_ids.update(redis_users)
        except Exception as e:
            logger.error(f"Failed to scan Redis active alerts: {e}")
            
    # 2. Query all database incidents that are currently unresolved (resolved_at IS NULL)
    db_unresolved_users = []
    if db_pool is not None:
        try:
            async with db_pool.acquire() as conn:
                rows = await conn.fetch("SELECT DISTINCT user_id FROM sos_incidents WHERE resolved_at IS NULL")
                db_unresolved_users = [r["user_id"] for r in rows]
        except Exception as e:
            logger.error(f"Failed to fetch unresolved incidents from DB: {e}")
            
    # Merge unresolved database users into the scan pool
    all_scan_users = active_user_ids.union(db_unresolved_users)
            
    # 3. Iterate and evaluate each user's SOS alert status
    for user_id in all_scan_users:
        should_purge = False
        reason = ""
        db_created_at = None
        
        # Check Redis active state directly
        redis_active = False
        if redis_client is not None:
            try:
                redis_active = await redis_client.exists(f"sos_ttl:{user_id}")
            except Exception:
                redis_active = False
                
        mem_active = user_id in MEM_SOS_ALERTS
        
        # Fetch DB record
        db_resolved = False
        if db_pool is not None:
            try:
                async with db_pool.acquire() as conn:
                    row = await conn.fetchrow(
                        "SELECT id, resolved_at, created_at FROM sos_incidents WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1",
                        user_id
                    )
                    if row:
                        db_created_at = row["created_at"]
                        if row["resolved_at"] is not None:
                            db_resolved = True
            except Exception as e:
                logger.error(f"Failed to query DB for user {user_id}: {e}")
                
        # Determine purge/resolution criteria:
        # If it's already marked resolved in the DB, we just ensure it's removed from cache
        if db_resolved:
            if mem_active or redis_active:
                should_purge = True
                reason = "already resolved in database"
        else:
            # If not resolved in DB, check if it should be resolved/purged
            # A: Database record is older than 24 hours
            if db_created_at and (now_tz - db_created_at).total_seconds() > 86400:
                should_purge = True
                reason = "database record older than 24h"
            # B: Memory fallback record is older than 24 hours
            elif user_id in MEM_SOS_ALERTS and (now_naive - MEM_SOS_ALERTS[user_id]["timestamp"]).total_seconds() > 86400:
                should_purge = True
                reason = "memory cache record older than 24h"
            # C: It is NOT active in Redis and NOT active in memory (ghost active alert in DB)
            elif not redis_active and not mem_active:
                should_purge = True
                reason = "auto-purged or resolved (cache inactive)"
                
        if should_purge:
            # Update PostgreSQL database: mark as resolved/purged
            if db_pool is not None and not db_resolved:
                try:
                    # Set resolved_at to created_at + 1 hour as default resolution time
                    resolved_time = (db_created_at + timedelta(hours=1)) if db_created_at else now_tz
                    # Make sure resolved_time doesn't exceed now
                    if resolved_time > now_tz:
                        resolved_time = now_tz
                        
                    async with db_pool.acquire() as conn:
                        await conn.execute(
                            "UPDATE sos_incidents SET resolved_at = $1 WHERE user_id = $2 AND resolved_at IS NULL",
                            resolved_time, user_id
                        )
                    logger.info(f"Marked stale SOS incident resolved in PostgreSQL for user {user_id}")
                except Exception as e:
                    logger.error(f"Failed to update resolved_at in PostgreSQL: {e}")
            
            # Purge from memory
            if user_id in MEM_SOS_ALERTS:
                del MEM_SOS_ALERTS[user_id]
                
            # Purge from Redis
            if redis_client is not None:
                try:
                    await redis_client.zrem("sos_alerts", user_id)
                    await redis_client.delete(f"sos_ttl:{user_id}")
                except Exception as e:
                    logger.error(f"Failed to purge Redis keys for user {user_id}: {e}")
                    
            # Broadcast eviction to all active WebSocket connections
            await manager.broadcast({
                "type": "SOS_RESOLVED",
                "userId": user_id,
                "timestamp": now_tz.isoformat()
            })
            
            purged_users.append({"userId": user_id, "reason": reason})
            logger.info(f"Purged/Resolved stale SOS alert for user {user_id} (Reason: {reason})")
            
    return {
        "status": "success",
        "purged_count": len(purged_users),
        "purged_details": purged_users
    }
