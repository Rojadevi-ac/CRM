from flask_socketio import SocketIO, emit, join_room, leave_room
from flask import request

# Initialize SocketIO instance
socketio = SocketIO(cors_allowed_origins="*", async_mode='threading', ping_timeout=60, ping_interval=25)

# Track connected online users: {socket_id: {'user_id': id, 'full_name': name, 'email': email, 'role': role, 'ip_address': ip}}
connected_users = {}

def get_client_ip():
    if request.headers.get('X-Forwarded-For'):
        return request.headers.get('X-Forwarded-For').split(',')[0].strip()
    return request.remote_addr or '127.0.0.1'

def get_online_users():
    """Return deduplicated list of online users."""
    unique_users = {}
    for user_data in connected_users.values():
        uid = user_data.get('user_id')
        if uid:
            unique_users[uid] = {
                'user_id': uid,
                'full_name': user_data.get('full_name'),
                'email': user_data.get('email'),
                'role': user_data.get('role'),
                'ip_address': user_data.get('ip_address'),
            }
    return list(unique_users.values())

def broadcast_online_users():
    """Broadcast unique online user list to all connected clients."""
    users_list = get_online_users()
    socketio.emit('user_status_changed', users_list)

def register_socket_events(app):
    socketio.init_app(app)

    @socketio.on('connect')
    def handle_connect():
        # Immediately send current online list to newly connected client
        emit('user_status_changed', get_online_users())

    @socketio.on('authenticate')
    def handle_auth(data):
        if not isinstance(data, dict):
            return
        user_id = data.get('user_id')
        full_name = data.get('full_name')
        email = data.get('email')
        role = data.get('role')
        client_ip = get_client_ip()
        
        if user_id:
            connected_users[request.sid] = {
                'user_id': user_id,
                'full_name': full_name,
                'email': email,
                'role': role,
                'ip_address': client_ip,
            }
            # Join personal room for targeted notifications
            join_room(f"user_{user_id}")
            # Broadcast updated online list
            broadcast_online_users()

    @socketio.on('disconnect')
    def handle_disconnect():
        if request.sid in connected_users:
            del connected_users[request.sid]
            broadcast_online_users()

def emit_event(event_name, data, room=None):
    """
    Helper to emit real-time events across clients or to specific user rooms.
    """
    try:
        if room:
            socketio.emit(event_name, data, room=room)
        else:
            socketio.emit(event_name, data)
    except Exception as e:
        print(f"Socket emit error ({event_name}): {e}")
