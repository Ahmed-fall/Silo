import asyncio
import websockets

async def test():
    uri = "ws://127.0.0.1:8000/ws/alerts"
    try:
        async with websockets.connect(
            uri,
            ping_interval=None,
            open_timeout=10
        ) as ws:
            print("Connected successfully")
            await asyncio.sleep(3)
            print("Connection held for 3 seconds - WebSocket works")
    except Exception as e:
        print(f"Error: {e}")

asyncio.run(test())