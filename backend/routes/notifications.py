from flask import Blueprint, jsonify, session
from database import db_query, db_execute

notifications_bp = Blueprint('notifications', __name__)

@notifications_bp.route('', methods=['GET'])
def get_notifications():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401
    
    # Fetch notifications joined with sender info
    notifications = db_query("""
        SELECT n.id, n.title, n.message, n.type, n.is_read, n.created_at as time, 
               n.sender_id, n.link_id, u.name as senderName
        FROM notifications n
        LEFT JOIN users u ON n.sender_id = u.id
        WHERE n.user_id = %s 
        ORDER BY n.created_at DESC
    """, (user_id,), fetch=True)
    
    for n in notifications:
        n['time'] = str(n['time'])
        
    return jsonify(notifications)

@notifications_bp.route('/unread-count', methods=['GET'])
def get_unread_count():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({"unread_count": 0}), 200
    
    result = db_query("SELECT COUNT(*) as count FROM notifications WHERE user_id = %s AND is_read = FALSE", (user_id,), fetch=True)
    return jsonify({"unread_count": result[0]['count'] if result else 0})

@notifications_bp.route('/<int:notif_id>/read', methods=['PUT'])
def mark_read(notif_id):
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401
    
    db_execute("UPDATE notifications SET is_read = TRUE WHERE id = %s AND user_id = %s", (notif_id, user_id))
    return jsonify({"status": "success"})

@notifications_bp.route('/read-all', methods=['PUT'])
def mark_all_read():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401
    
    db_execute("UPDATE notifications SET is_read = TRUE WHERE user_id = %s", (user_id,))
    return jsonify({"status": "success", "message": "All notifications marked as read"})

@notifications_bp.route('/read-sender/<int:sender_id>', methods=['PUT'])
def mark_sender_read(sender_id):
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401
    
    db_execute("UPDATE notifications SET is_read = TRUE WHERE user_id = %s AND sender_id = %s", 
               (user_id, sender_id))
    return jsonify({"status": "success", "message": "Notifications from sender marked as read"})
