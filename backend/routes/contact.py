from flask import Blueprint, request, jsonify
from database import db_execute

contact_bp = Blueprint('contact', __name__)

@contact_bp.route('', methods=['POST'])
def submit_contact():
    try:
        data = request.json
        name = data.get('name')
        email = data.get('email')
        message = data.get('message')

        if not name or not email or not message:
            return jsonify({"error": "All fields are required"}), 400

        # Create notification for Admin (User ID 1)
        # We use title "New Contact Message" and include email in the message
        preview = message[:100] + ('...' if len(message) > 100 else '')
        notif_msg = f"From: {name} ({email})\n\n{preview}"
        
        db_execute("""
            INSERT INTO notifications (user_id, title, message, type)
            VALUES (%s, %s, %s, %s)
        """, (1, "New Contact Message", notif_msg, 'info'))

        return jsonify({"status": "success", "message": "Message sent to administrator"}), 200

    except Exception as e:
        print(f"Contact form error: {e}")
        return jsonify({"error": "Internal server error"}), 500
