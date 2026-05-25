from flask import Blueprint, request, jsonify, session
from database import db_query, db_query_one, db_execute
from config import get_db_connection
from werkzeug.security import generate_password_hash

patients_bp = Blueprint('patients', __name__)

@patients_bp.route('', methods=['GET'])
def get_patients():
    role = session.get('role')
    user_id = session.get('user_id')
    if role not in ['admin', 'doctor']:
        return jsonify({"error": "Unauthorized"}), 403

    query = "SELECT id, name, email, phone FROM patients WHERE 1=1"
    params = []
    
    search = request.args.get('search')
    if search:
        query += " AND name LIKE %s"
        params.append(f"%{search}%")
        
    if role == 'doctor':
        # Doctors see patients who have had appointments with them
        query += " AND id IN (SELECT DISTINCT patient_id FROM appointments WHERE doctor_id = (SELECT id FROM doctors WHERE user_id = %s))"
        params.append(user_id)

    query += " ORDER BY name"
    patients = db_query(query, params, fetch=True)
    return jsonify(patients or [])

@patients_bp.route('/<int:id>/history', methods=['GET'])
def get_patient_history(id):
    role = session.get('role')
    if role not in ['admin', 'doctor']:
        return jsonify({"error": "Unauthorized"}), 403
        
    try:
        # Get patient info
        patient = db_query_one("SELECT * FROM patients WHERE id = %s", (id,))
        if not patient:
            return jsonify({"error": "Patient not found"}), 404
            
        # Get appointments
        appointments = db_query("""
            SELECT a.*, d.name as doctorName 
            FROM appointments a JOIN doctors d ON a.doctor_id = d.id 
            WHERE a.patient_id = %s ORDER BY a.appointment_date DESC
        """, (id,), fetch=True)
        for a in (appointments or []):
            a['appointment_date'] = str(a['appointment_date'])
            a['appointment_time'] = str(a['appointment_time'])
            
        # Get prescriptions
        prescriptions = db_query("""
            SELECT pr.*, d.name as doctorName 
            FROM prescriptions pr JOIN doctors d ON pr.doctor_id = d.id 
            WHERE pr.patient_id = %s ORDER BY pr.date DESC
        """, (id,), fetch=True)
        for p in (prescriptions or []):
            p['date'] = str(p['date'])
            
        return jsonify({
            "patient": patient,
            "appointments": appointments or [],
            "prescriptions": prescriptions or []
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@patients_bp.route('', methods=['POST'])
def add_patient():
    if session.get('role') != 'admin':
        return jsonify({"error": "Admin access required"}), 403
    try:
        data = request.json
        # Check if email already exists
        exists = db_query_one("SELECT id FROM users WHERE email = %s", (data['email'],))
        if exists:
            return jsonify({"error": "Email already registered"}), 400

        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Database connection failed"}), 500
        cursor = conn.cursor()
        try:
            # Hash the password
            hashed_password = generate_password_hash(data.get('password', 'patient123'))
            cursor.execute(
                "INSERT INTO users (name, email, password, role) VALUES (%s, %s, %s, 'patient')",
                (data['name'], data['email'], hashed_password)
            )
            u_id = cursor.lastrowid
            cursor.execute(
                "INSERT INTO patients (user_id, name, email, phone) VALUES (%s, %s, %s, %s)",
                (u_id, data['name'], data['email'], data.get('phone', ''))
            )
            conn.commit()
        finally:
            cursor.close()
            conn.close()
        return jsonify({"status": "success", "message": "Patient added successfully"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@patients_bp.route('/<int:id>', methods=['PUT'])
def update_patient(id):
    if session.get('role') != 'admin':
        return jsonify({"error": "Admin access required"}), 403
    try:
        data = request.json
        db_execute(
            "UPDATE patients SET name=%s, email=%s, phone=%s WHERE id=%s",
            (data['name'], data['email'], data.get('phone', ''), id)
        )
        pat = db_query_one("SELECT user_id FROM patients WHERE id = %s", (id,))
        if pat:
            db_execute("UPDATE users SET name=%s, email=%s WHERE id=%s",
                       (data['name'], data['email'], pat['user_id']))
        return jsonify({"status": "success", "message": "Patient updated"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@patients_bp.route('/<int:id>', methods=['DELETE'])
def delete_patient(id):
    if session.get('role') != 'admin':
        return jsonify({"error": "Admin access required"}), 403
    try:
        pat = db_query_one("SELECT user_id FROM patients WHERE id = %s", (id,))
        if pat:
            db_execute("DELETE FROM users WHERE id = %s", (pat['user_id'],))
            return jsonify({"status": "success", "message": "Patient deleted"})
        return jsonify({"error": "Patient not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

