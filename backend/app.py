from flask import Flask, jsonify, session
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room
from config import Config
from database import db_execute, db_query_one
from datetime import datetime
from routes.auth import auth_bp
from routes.doctors import doctors_bp
from routes.patients import patients_bp
from routes.appointments import appointments_bp
from routes.prescriptions import prescriptions_bp
from routes.billing import billing_bp
from routes.notifications import notifications_bp
from routes.records import records_bp
from routes.messages import messages_bp
from routes.stats import stats_bp
from routes.schedules import schedules_bp
from routes.search import search_bp
from routes.contact import contact_bp

app = Flask(__name__)
app.config.from_object(Config)
app.secret_key = Config.SECRET_KEY

# Initialize SocketIO
# cors_allowed_origins="*" allows Expo/mobile devices on any IP to connect
import os
socketio = SocketIO(app, cors_allowed_origins="*", manage_session=True, async_mode="threading")

# CORS Configuration — robustly allows Expo Go, web browser, and device on local network
CORS(app, supports_credentials=True, resources={r"/*": {"origins": "*"}})

from flask import request

@app.before_request
def load_session_from_headers():
    user_id = request.headers.get('X-User-Id')
    role = request.headers.get('X-User-Role')
    if user_id:
        session['user_id'] = int(user_id)
    if role:
        session['role'] = role


# Helper for socket security
def check_socket_connection(u1_id, u2_id):
    return db_query_one("""
        SELECT a.id FROM appointments a
        JOIN patients p ON a.patient_id = p.id
        JOIN doctors d ON a.doctor_id = d.id
        WHERE (p.user_id = %s AND d.user_id = %s)
           OR (p.user_id = %s AND d.user_id = %s)
        LIMIT 1
    """, (u1_id, u2_id, u2_id, u1_id)) is not None

# Register Blueprints
app.register_blueprint(auth_bp, url_prefix='/api')
app.register_blueprint(doctors_bp, url_prefix='/api/doctors')
app.register_blueprint(patients_bp, url_prefix='/api/patients')
app.register_blueprint(appointments_bp, url_prefix='/api/appointments')
app.register_blueprint(prescriptions_bp, url_prefix='/api/prescriptions')
app.register_blueprint(billing_bp, url_prefix='/api/bills')
app.register_blueprint(notifications_bp, url_prefix='/api/notifications')
app.register_blueprint(records_bp, url_prefix='/api/records')
app.register_blueprint(messages_bp, url_prefix='/api/messages')
app.register_blueprint(stats_bp, url_prefix='/api/stats')
app.register_blueprint(schedules_bp, url_prefix='/api/schedules')
app.register_blueprint(search_bp, url_prefix='/api/search')
app.register_blueprint(contact_bp, url_prefix='/api/contact')

def create_or_update_chat_notification(sender_id, receiver_id, message_text):
    # Check if there's an unread "new_message" notification from this sender
    existing = db_query_one("""
        SELECT id FROM notifications 
        WHERE user_id = %s AND sender_id = %s AND type = 'new_message' AND is_read = FALSE
    """, (receiver_id, sender_id))
    
    if existing:
        db_execute("""
            UPDATE notifications 
            SET message = %s, created_at = CURRENT_TIMESTAMP 
            WHERE id = %s
        """, (message_text, existing['id']))
    else:
        db_execute("""
            INSERT INTO notifications (user_id, sender_id, link_id, title, message, type)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (receiver_id, sender_id, sender_id, "New Message", message_text, 'new_message'))

# Socket.IO Events
@socketio.on('connect')
def handle_connect():
    user_id = session.get('user_id')
    if user_id:
        join_room(f"user_{user_id}")
        print(f"Socket: User {user_id} joined room user_{user_id}")

@socketio.on('send_message')
def handle_send_message(data):
    sender_id = session.get('user_id')
    if not sender_id: return
    
    receiver_id = data.get('receiver_id')
    message_text = data.get('message')
    
    if not receiver_id or not message_text: return
    
    if check_socket_connection(sender_id, receiver_id):
        # Save message
        db_execute("""
            INSERT INTO messages (sender_id, receiver_id, message)
            VALUES (%s, %s, %s)
        """, (sender_id, receiver_id, message_text))
        
        # Create/Update notification
        create_or_update_chat_notification(sender_id, receiver_id, message_text)
        
        # Get new unread count
        unread_count = db_query_one("SELECT COUNT(*) as count FROM notifications WHERE user_id = %s AND is_read = FALSE", (receiver_id,))['count']

        # Emit message
        emit('receive_message', {
            'sender_id': sender_id,
            'message': message_text,
            'created_at': datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }, room=f"user_{receiver_id}")
        
        # Emit notification update
        emit('update_notifications', {
            'unread_count': unread_count,
            'new_notif': {
                'sender_id': sender_id,
                'message': message_text,
                'type': 'new_message'
            }
        }, room=f"user_{receiver_id}")
        
        # Also emit back to sender for confirmation
        emit('message_sent', {'status': 'success'}, room=f"user_{sender_id}")

@app.route('/')
def index():
    return jsonify({"status": "healthy", "message": "MediCare Plus API"}), 200

# Error Handlers
@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Resource not found"}), 404

@app.errorhandler(500)
def server_error(e):
    return jsonify({"error": "Internal server error"}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print("MediCare Plus Backend Starting...")
    print(f"Listening on http://0.0.0.0:{port} — accessible from LAN devices")
    # host='0.0.0.0' makes the server reachable from your phone/emulator on the same Wi-Fi
    socketio.run(app, debug=True, host='0.0.0.0', port=port)

