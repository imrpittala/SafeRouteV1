import asyncio
import json
from src.db.database import async_session_maker
from src.services.routing_service import get_safe_route

async def run_test():
    async with async_session_maker() as db:
        # Madhapur bounding box test (Using very close coordinates to guarantee connected graph components)
        origin = (78.3910, 17.4470)
        destination = (78.3930, 17.4490)
        
        print("Executing get_safe_route (PostGIS -> Valhalla)...")
        import httpx
        try:
            result = await get_safe_route(db, origin, destination, "auto")
            print("\n=== VALHALLA RESPONSE PAYLOAD ===")
            print(json.dumps(result, indent=2))
        except httpx.HTTPStatusError as e:
            print("\n=== VALHALLA 400 BAD REQUEST ERROR ===")
            print(e.response.text)
            print("\n=== VALHALLA REQUEST PAYLOAD INJECTED BY BACKEND ===")
            print(e.request.content.decode('utf-8'))

if __name__ == "__main__":
    asyncio.run(run_test())
