import json

connected_clients = {}
rooms = {}

async def websocket_handler(websocket):
    client_id = None  # We'll need a way to identify clients uniquely

    async def register(username):
        nonlocal client_id
        client_id = username  # For simplicity, using username as ID for now
        connected_clients[client_id] = websocket
        print(f"Client connected: {client_id}")
        await send_message(websocket, {"type": "connected", "username": client_id})

    async def unregister():
        if client_id in connected_clients:
            del connected_clients[client_id]
            print(f"Client disconnected: {client_id}")
            for room_id, clients in rooms.items():
                if websocket in clients:
                    clients.remove(websocket)
                    await broadcast_to_room(room_id, {"type": "user_left", "username": client_id})

    async def join_room(data):
        username = data.get('username')
        room_id = data.get('room_id')
        if username and room_id:
            if room_id not in rooms:
                rooms[room_id] = set()
            rooms[room_id].add(websocket)
            await send_message(websocket, {"type": "joined_room", "room_id": room_id})
            await broadcast_to_room(room_id, {"type": "user_joined", "username": username}, websocket)

    async def leave_room(data):
        username = data.get('username')
        room_id = data.get('room_id')
        if username and room_id and room_id in rooms and websocket in rooms[room_id]:
            rooms[room_id].remove(websocket)
            await send_message(websocket, {"type": "left_room", "room_id": room_id})
            await broadcast_to_room(room_id, {"type": "user_left", "username": username}, websocket)

    async def send_message(ws, message):
        try:
            await ws.send(json.dumps(message))
        except Exception as e:
            print(f"Error sending message: {e}")
            await unregister()

    async def broadcast_to_room(room_id, message, sender=None):
        if room_id in rooms:
            for client_ws in rooms[room_id]:
                if client_ws != sender:
                    await send_message(client_ws, message)

    try:
        async for message in websocket:
            try:
                data = json.loads(message)
                action = data.get('action')
                if action == 'register':
                    await register(data.get('username'))
                elif action == 'join_room':
                    await join_room(data)
                elif action == 'leave_room':
                    await leave_room(data)
                elif action == 'send_audio':
                    await broadcast_to_room(data.get('room_id'), {"type": "audio", "username": client_id, "audio_data": data.get('audio_data')}, websocket)
                elif action == 'send_text':
                    await broadcast_to_room(data.get('room_id'), {"type": "text_message", "username": client_id, "text": data.get('text')}, websocket)
                else:
                    print(f"Unknown action: {action}")
            except json.JSONDecodeError:
                print(f"Received non-JSON message: {message}")
    finally:
        await unregister()

# Vercel Edge Function entry point (needs to be named 'handler')
async def handler(request):
    if request.headers.get("Upgrade") == "websocket":
        ws = await WebSocket(request)
        await websocket_handler(ws)
        return Response(None, status=101, headers=ws.headers)
    else:
        return Response("Not a WebSocket request", status=400)

# Mock WebSocket and Response classes for local testing (optional)
class WebSocket:
    def __init__(self, request):
        self.request = request
        self.headers = {} # Add necessary headers

    async def __aiter__(self):
        # For local testing, you'd need to simulate incoming messages
        yield '{"action": "register", "username": "testuser"}'
        # ... more simulated messages

    async def send(self, message):
        print(f"Sending: {message}")

class Response:
    def __init__(self, body, status, headers):
        self.body = body
        self.status = status
        self.headers = headers

