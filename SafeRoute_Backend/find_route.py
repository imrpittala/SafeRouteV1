import httpx
import json

def test_route():
    url = "http://localhost:8002/route"
    # Try a few slightly different points
    points = [
        {"lon": 78.390823, "lat": 17.448502},
        {"lon": 78.390833, "lat": 17.448512},
        {"lon": 78.390843, "lat": 17.448522},
        {"lon": 78.390853, "lat": 17.448532},
        {"lon": 78.390863, "lat": 17.448542},
        {"lon": 78.390923, "lat": 17.448602},
    ]
    
    for i in range(len(points)):
        for j in range(i+1, len(points)):
            payload = {
                "locations": [
                    points[i],
                    points[j]
                ],
                "costing": "auto"
            }
            try:
                r = httpx.post(url, json=payload)
                if r.status_code == 200:
                    print("SUCCESS:", points[i], points[j])
                    print(json.dumps(r.json(), indent=2))
                    return
            except Exception as e:
                pass

if __name__ == "__main__":
    test_route()
