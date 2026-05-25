from flask import Blueprint, request, jsonify, session
from database import db_query, db_execute, db_query_one
from datetime import datetime

appointments_bp = Blueprint('appointments', __name__)

@appointments_bp.route('', methods=['GET'])
def get_appointments():
    user_id = session.get('user_id')
    role = session.get('role')
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401

    query = """
        SELECT a.id, a.patient_id, d.name as doctorName, d.specialization as specialty,
               p.name as patientName, a.appointment_date as date,
               a.appointment_time as time, a.visit_type as type, a.status, a.reason
        FROM appointments a
        JOIN doctors d ON a.doctor_id = d.id
        JOIN patients p ON a.patient_id = p.id
        WHERE 1=1
    """
    params = []
    if role == 'patient':
        query += " AND p.user_id = %s"
        params.append(user_id)
    elif role == 'doctor':
        query += " AND d.user_id = %s"
        params.append(user_id)

    # Filtering
    filter_date = request.args.get('date')
    if filter_date:
        query += " AND a.appointment_date = %s"
        params.append(filter_date)
    
    filter_patient = request.args.get('patient')
    if filter_patient:
        query += " AND p.name LIKE %s"
        params.append(f"%{filter_patient}%")

    query += " ORDER BY a.appointment_date DESC, a.appointment_time DESC"
    results = db_query(query, params, fetch=True)
    for r in (results or []):
        r['date'] = str(r['date'])
        r['time'] = str(r['time'])
    return jsonify(results or [])

@appointments_bp.route('', methods=['POST'])
def book_appointment():
    user_id = session.get('user_id')
    role = session.get('role')

    # Patients book their own; admin can book for anyone
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401
    if role not in ['patient', 'admin']:
        return jsonify({"error": "Only patients or admin can book appointments"}), 403

    try:
        data = request.json

        if role == 'patient':
            patient = db_query_one("SELECT id FROM patients WHERE user_id = %s", (user_id,))
            if not patient:
                return jsonify({"error": "Patient profile not found"}), 404
            patient_id = patient['id']
        else:
            # Admin provides patient_id directly
            patient_id = data.get('patient_id')
            if not patient_id:
                return jsonify({"error": "patient_id is required"}), 400

        # --- PRE-BOOKING VALIDATION (Optional - allow booking if no schedule set) ---
        doctor_id = data['doctor_id']
        selected_date = data['date'] # YYYY-MM-DD
        selected_time_str = data['time'] # HH:MM:SS or HH:MM

        # 1. Day Availability Check
        try:
            day_name = datetime.strptime(selected_date, '%Y-%m-%d').strftime('%A')
            
            schedule = db_query_one("""
                SELECT is_available, start_time, end_time 
                FROM doctor_schedules 
                WHERE doctor_id = %s AND day_of_week = %s
            """, (doctor_id, day_name))

            # Get all available days for the context message
            avail_rows = db_query("SELECT day_of_week FROM doctor_schedules WHERE doctor_id = %s AND is_available = 1", (doctor_id,), fetch=True)
            available_days = [r['day_of_week'] for r in (avail_rows or [])]

            # Only validate if schedule exists
            if schedule:
                if not schedule['is_available']:
                    return jsonify({
                        "status": False,
                        "message": f"Doctor is not available on selected day.\nAvailable days: {', '.join(available_days)}.",
                        "availableDays": available_days
                    }), 400

                # 2. Schedule Check (Missing times)
                if schedule['start_time'] and schedule['end_time']:
                    # 3. Time Range Validation
                    try:
                        # Normalize selected time to HH:MM
                        sel_time = datetime.strptime(selected_time_str[:5], '%H:%M').time()
                        
                        # Helper to parse schedule time (handling '9:00:00', '09:00:00', '0 days 09:00:00')
                        def parse_time(t_val):
                            t_str = str(t_val).split()[-1] # take last part (removes '0 days')
                            if len(t_str.split(':')[0]) == 1: t_str = '0' + t_str # '9:00:00' -> '09:00:00'
                            return datetime.strptime(t_str[:5], '%H:%M').time(), t_str[:5]

                        start_time, st_str = parse_time(schedule['start_time'])
                        end_time, et_str = parse_time(schedule['end_time'])

                        if sel_time < start_time or sel_time > end_time:
                            st_display = datetime.strptime(st_str, '%H:%M').strftime('%I:%M %p')
                            et_display = datetime.strptime(et_str, '%H:%M').strftime('%I:%M %p')
                            
                            return jsonify({
                                "status": False,
                                "message": f"Selected slot is unavailable.\nDoctor is available on {', '.join(available_days)}\nfrom {st_display} to {et_display}.",
                                "availableDays": available_days,
                                "startTime": st_str,
                                "endTime": et_str
                            }), 400
                    except Exception as te:
                        pass  # If parsing fails, we skip range check but allow booking
        except Exception as e:
            pass  # If date parsing fails, allow booking anyway

        # --- END VALIDATION ---

        db_execute("""
            INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, reason, visit_type)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (patient_id, data['doctor_id'], data['date'], data['time'],
              data.get('reason', ''), data.get('type', 'In-person')))

        return jsonify({"status": "success", "message": "Appointment booked successfully"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@appointments_bp.route('/<int:id>', methods=['PUT'])
def update_appointment(id):
    role = session.get('role')
    if role not in ['admin', 'doctor']:
        return jsonify({"error": "Unauthorized"}), 403
    try:
        data = request.json
        new_status = data.get('status')
        if new_status not in ['scheduled', 'confirmed', 'completed', 'cancelled']:
            return jsonify({"error": "Invalid status value"}), 400
        db_execute("UPDATE appointments SET status = %s WHERE id = %s", (new_status, id))
        return jsonify({"status": "success", "message": f"Appointment marked as {new_status}"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@appointments_bp.route('/<int:id>', methods=['DELETE'])
def delete_appointment(id):
    if session.get('role') != 'admin':
        return jsonify({"error": "Admin access required"}), 403
    try:
        db_execute("DELETE FROM appointments WHERE id = %s", (id,))
        return jsonify({"status": "success", "message": "Appointment deleted"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
