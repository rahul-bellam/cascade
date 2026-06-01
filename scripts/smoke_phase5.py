import asyncio
import websockets
import json

async def smoke_test():
    uri = "ws://localhost:8096/arena/queue"
    
    print("--- Starting Arena MVP Smoke Test ---")
    
    # Connect two players
    async with websockets.connect(uri + "?user_id=p1") as ws1, \
               websockets.connect(uri + "?user_id=p2") as ws2:
        
        print("Connected Player 1 and Player 2")
        
        # We need to collect messages concurrently because they might arrive out of order
        # Specifically, p1 might get "waiting_for_match" first, then "match_found".
        # P2 should just get "match_found".
        
        while True:
            res1 = await ws1.recv()
            data1 = json.loads(res1)
            print("P1 rx:", data1)
            if data1["type"] == "match_found":
                break
                
        while True:
            res2 = await ws2.recv()
            data2 = json.loads(res2)
            print("P2 rx:", data2)
            if data2["type"] == "match_found":
                break
                
        print("Both players matched successfully.")
        
        await ws1.send(json.dumps({"type": "code_update", "code": "foo"}))
        res_p2 = await ws2.recv()
        print("P2 prog msg:", res_p2)
        
        print("ARENA SMOKE: PASS ✅")

if __name__ == "__main__":
    asyncio.run(smoke_test())
