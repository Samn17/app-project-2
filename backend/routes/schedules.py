from flask import Blueprint, request, jsonify, session
from database import db_query, db_execute, db_query_one

schedules_bp = Blueprint('schedules', __name__)

@schedules_bp.route('', methods=['GET'])
def get_schedules():
    user_id = session.get('user_id')
    role = session.get('role')
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401

    try:
        if role == 'doctor':
            doctor = db_query_one("SELECT id FROM doctors WHERE user_id = %s", (user_id,))
            if not doctor:
                return jsonify({"error": "Doctor profile not found"}), 404
            doc_id = doctor['id']
        else:
            doc_id = request.args.get('doctor_id')
            if not doc_id:
                return jsonify({"error": "doctor_id is required"}), 400

        schedules = db_query("""
            SELECT id, day_of_week, start_time, end_time, is_available 
            FROM doctor_schedules WHERE doctor_id = %s
        """, (doc_id,), fetch=True)
        
        for s in (schedules or []):
            s['start_time'] = str(s['start_time'])
            s['end_time'] = str(s['end_time'])
            
        return jsonify(schedules or [])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@schedules_bp.route('', methods=['POST'])
def update_schedule():
    user_id = session.get('user_id')
    if session.get('role') != 'doctor':
        return jsonify({"error": "Doctor access required"}), 403
    
    try:
        data = request.json
        doctor = db_query_one("SELECT id FROM doctors WHERE user_id = %s", (user_id,))
        if not doctor:
            return jsonify({"error": "Doctor profile not found"}), 404
        doc_id = doctor['id']
        
        # Upsert: delete and re-insert for the given day
        db_execute("DELETE FROM doctor_schedules WHERE doctor_id = %s AND day_of_week = %s", 
                   (doc_id, data['day_of_week']))
        
        db_execute("""
            INSERT INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time, is_available)
            VALUES (%s, %s, %s, %s, %s)
        """, (doc_id, data['day_of_week'], data.get('start_time', '09:00:00'), 
              data.get('end_time', '17:00:00'), data.get('is_available', True)))
        
        return jsonify({"status": "success", "message": f"Schedule for {data['day_of_week']} updated"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
