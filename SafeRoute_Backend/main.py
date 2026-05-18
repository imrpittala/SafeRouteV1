import json
from datetime import datetime
from typing import List

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from contextlib import asynccontextmanager
import logging
import osmnx as ox
import networkx as nx
import redis.asyncio as redis

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

G = None
redis_client = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global G, redis_client
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
        logger.info("Initializing Redis client...")
        redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
    
    yield
    
    logger.info("Closing Redis client...")
    await redis_client.aclose()

app = FastAPI(title="SafeRoute Backend", description="Real-time SOS alerting for SafeRoute.", lifespan=lifespan)

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
    
    if redis_client is None:
        return
    try:
        await redis_client.geoadd("sos_alerts", (lng, lat, user_id))
        await redis_client.setex(f"sos_ttl:{user_id}", SOS_TTL, "active")
    except Exception as e:
        logger.error(f"Redis geoadd failed. Falling back to RAM cache. Error: {e}")

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
    # Mock data for demonstration, in a real scenario this would query OS or Prometheus
    return {
        "status": "healthy",
        "cpu_usage": 24.5,
        "memory_usage": 1540, # MB
        "active_workers": 12,
        "redis_connected": redis_client is not None,
        "graph_nodes": len(G.nodes) if G else 0,
        "uptime_seconds": 15600
    }

@app.get("/analytics/sos-trends")
async def get_sos_trends():
    # Mock data for historical trends
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
