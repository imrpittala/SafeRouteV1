import asyncio
import fakeredis.aioredis

async def main():
    r = fakeredis.aioredis.FakeRedis(decode_responses=True)
    try:
        await r.geoadd('test', mapping={'member': (1.0, 2.0)})
        print('mapping success')
    except Exception as e:
        print('mapping failed:', e)
        
    try:
        await r.geoadd('test', 1.0, 2.0, 'member2')
        print('positional success')
    except Exception as e:
        print('positional failed:', e)
        
    try:
        await r.geoadd('test', (1.0, 2.0, 'member3'))
        print('tuple positional success')
    except Exception as e:
        print('tuple positional failed:', e)

asyncio.run(main())
