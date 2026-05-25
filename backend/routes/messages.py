from flask import Blueprint, request, jsonify, session
from database import db_query, db_execute, db_query_one

messages_bp = Blueprint('messages', __name__)

def check_connection(u1_id, u2_id):
    """Verify if two users are connected via an appointment relationship."""
    return db_query_one("""
        SELECT a.id FROM appointments a
        JOIN patients p ON a.patient_id = p.id
        JOIN doctors d ON a.doctor_id = d.id
        WHERE (p.user_id = %s AND d.user_id = %s)
           OR (p.user_id = %s AND d.user_id = %s)
        LIMIT 1
    """, (u1_id, u2_id, u2_id, u1_id)) is not None

@messages_bp.route('', methods=['GET'])
def get_messages():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401
    
    other_id = request.args.get('other_id')
    if not other_id:
        # Return list of conversations (including potential ones from appointments)
        conversations = db_query("""
            SELECT DISTINCT u.id, u.name, u.role,
                   (SELECT message FROM messages 
                    WHERE (sender_id = %s AND receiver_id = u.id) 
                       OR (sender_id = u.id AND receiver_id = %s)
                    ORDER BY created_at DESC LIMIT 1) as lastMessage,
                   (SELECT created_at FROM messages 
                    WHERE (sender_id = %s AND receiver_id = u.id) 
                       OR (sender_id = u.id AND receiver_id = %s)
                    ORDER BY created_at DESC LIMIT 1) as lastTime
            FROM users u
            WHERE u.id IN (
                -- Users already messaged
                SELECT sender_id FROM messages WHERE receiver_id = %s
                UNION
                SELECT receiver_id FROM messages WHERE sender_id = %s
                UNION
                -- Users connected via appointments
                SELECT p.user_id FROM appointments a JOIN patients p ON a.patient_id = p.id 
                WHERE a.doctor_id = (SELECT id FROM doctors WHERE user_id = %s)
                UNION
                SELECT d.user_id FROM appointments a JOIN doctors d ON a.doctor_id = d.id 
                WHERE a.patient_id = (SELECT id FROM patients WHERE user_id = %s)
            ) AND u.id != %s
            ORDER BY lastTime DESC
        """, (user_id, user_id, user_id, user_id, user_id, user_id, user_id, user_id, user_id), fetch=True)
        
        for c in (conversations or []):
            if c['lastTime']:
                c['lastTime'] = str(c['lastTime'])
        return jsonify(conversations or [])

    # SECURITY CHECK: Ensure they are allowed to chat
    if not check_connection(user_id, other_id):
        return jsonify({"error": "You can only chat with assigned doctors/patients."}), 403

    # Return chat history with specific user
    history = db_query("""
        SELECT m.*, u.name as senderName 
        FROM messages m JOIN users u ON m.sender_id = u.id
        WHERE (sender_id = %s AND receiver_id = %s) 
           OR (sender_id = %s AND receiver_id = %s)
        ORDER BY created_at ASC
    """, (user_id, other_id, other_id, user_id), fetch=True)
    
    for h in (history or []):
        h['created_at'] = str(h['created_at'])
        
    return jsonify(history or [])

@messages_bp.route('', methods=['POST'])
def send_message():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401
        
    try:
        data = request.json
        receiver_id = data.get('receiver_id')
        message = data.get('message')

        if not receiver_id or not message:
            return jsonify({"error": "Missing receiver or message"}), 400

        # SECURITY CHECK: Ensure they are allowed to chat
        if not check_connection(user_id, receiver_id):
            return jsonify({"error": "You can only chat with assigned doctors/patients."}), 403

        db_execute("""
            INSERT INTO messages (sender_id, receiver_id, message)
            VALUES (%s, %s, %s)
        """, (user_id, receiver_id, message))
        
        return jsonify({"status": "success", "message": "Message sent"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
