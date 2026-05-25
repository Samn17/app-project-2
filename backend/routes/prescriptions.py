from flask import Blueprint, request, jsonify, session
from database import db_query, db_execute, db_query_one
from datetime import date

prescriptions_bp = Blueprint('prescriptions', __name__)

@prescriptions_bp.route('', methods=['GET'])
def get_prescriptions():
    user_id = session.get('user_id')
    role = session.get('role')
    
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401
    
    query = """
        SELECT pr.id, pr.medicine, pr.dosage, pr.date, 
               d.name as doctorName, p.name as patientName
        FROM prescriptions pr
        INNER JOIN doctors d ON pr.doctor_id = d.id
        INNER JOIN patients p ON pr.patient_id = p.id
    """
    params = []
    
    if role == 'patient':
        query += " WHERE p.user_id = %s"
        params.append(user_id)
    elif role == 'doctor':
        # Find the doctor profile ID for this user
        doctor_profile = db_query_one("SELECT id FROM doctors WHERE user_id = %s", (user_id,))
        if doctor_profile:
            query += " WHERE pr.doctor_id = %s"
            params.append(doctor_profile['id'])
        else:
            return jsonify([]) # No profile, no prescriptions
    
    query += " ORDER BY pr.date DESC"
        
    results = db_query(query, params, fetch=True)
    if not results:
        results = []
        
    for r in results:
        if r.get('date'):
            r['date'] = str(r['date'])
        
    return jsonify(results)

@prescriptions_bp.route('', methods=['POST'])
def add_prescription():
    user_id = session.get('user_id')
    if not user_id or session.get('role') != 'doctor':
        return jsonify({"error": "Only doctors can add prescriptions"}), 403
    
    try:
        data = request.json
        doctor = db_query_one("SELECT id FROM doctors WHERE user_id = %s", (user_id,))
        
        if not doctor:
            return jsonify({"error": "Doctor profile not found"}), 404
        
        db_execute("""
            INSERT INTO prescriptions (patient_id, doctor_id, medicine, dosage, date)
            VALUES (%s, %s, %s, %s, %s)
        """, (data['patient_id'], doctor['id'], data['medicine'], data['dosage'], date.today()))
        
        return jsonify({"status": "success", "message": "Prescription added successfully"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500
