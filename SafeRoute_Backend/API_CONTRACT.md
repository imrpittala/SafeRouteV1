# API Contract for SafeRoute

## 1. REST Endpoint: `GET /routes`

Fetches the "Fastest" and "Safest" routes between a starting point and a destination.

**Query Parameters:**
- `start_lat` (float): Latitude of the starting point.
- `start_lng` (float): Longitude of the starting point.
- `end_lat` (float): Latitude of the destination.
- `end_lng` (float): Longitude of the destination.

**Response Schema:**
A JSON object containing two GeoJSON Features representing the fastest and safest paths.

```json
{
  "fastest_route": {
    "type": "Feature",
    "geometry": {
      "type": "LineString",
      "coordinates": [
        [78.4744, 17.3753], 
        [78.4750, 17.3760]
      ]
    },
    "properties": {
      "weight": 12.5,
      "distance_meters": 1200.5
    }
  },
  "safest_route": {
    "type": "Feature",
    "geometry": {
      "type": "LineString",
      "coordinates": [
        [78.4744, 17.3753], 
        [78.4760, 17.3755]
      ]
    },
    "properties": {
      "weight": 14.2,
      "distance_meters": 1350.2
    }
  }
}
```
*Note: GeoJSON coordinates are ALWAYS in `[longitude, latitude]` format.*

## 2. WebSocket Endpoint: `/ws/sos`

Used for real-time bidirectional broadcasting of SOS alerts.

**Client Payload (Sending an SOS):**
```json
{
  "userId": "user_12345",
  "location": {
    "lat": 17.3753,
    "lng": 78.4744
  },
  "timestamp": "2024-02-28T12:00:00Z",
  "type": "SOS"
}
```

**Server Broadcast Payload (Receiving an SOS):**
Matches the client payload structure.
