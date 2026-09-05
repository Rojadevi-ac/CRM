from flask_socketio import SocketIO, emit, join_room, leave_room
from flask import request

# Initialize SocketIO instance
socketio = SocketIO(cors_allowed_origins="*", async_mode='threading')

# Track connected online users: {socket_id: {'user_id': id, 'full_name': name, 'email': email, 'role': role}}
connected_users = {}

def register_socket_events(app):
    socketio.init_app(app)

    @socketio.on('connect')
    def handle_connect():
        pass

    @socketio.on('authenticate')
    def handle_auth(data):
        user_id = data.get('user_id')
        full_name = data.get('full_name')
        email = data.get('email')
        role = data.get('role')
        
        if user_id:
            connected_users[request.sid] = {
                'user_id': user_id,
                'full_name': full_name,
                'email': email,
                'role': role
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

def broadcast_online_users():
    # Deduplicate unique online user list
    unique_users = {}
    for user_data in connected_users.values():
        unique_users[user_data['user_id']] = user_data
    socketio.emit('user_status_changed', list(unique_users.values()))

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
