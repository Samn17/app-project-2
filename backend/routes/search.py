from flask import Blueprint, request, jsonify, session
from database import db_query

search_bp = Blueprint('search', __name__)

@search_bp.route('', methods=['GET'])
def global_search():
    user_id = session.get('user_id')
    role = session.get('role')
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401
    
    q = request.args.get('q', '').strip()
    if not q:
        return jsonify([])
        
    results = []
    
    # 1. Search Patients (Doctors and Admin can see this)
    if role in ['admin', 'doctor']:
        patients = db_query("""
            SELECT 'patient' as type, id, name as title, email as subtitle
            FROM patients WHERE name LIKE %s OR email LIKE %s
        """, (f"%{q}%", f"%{q}%"), fetch=True)
        results.extend(patients or [])
        
    # 2. Search Appointments
    appt_query = """
        SELECT 'appointment' as type, a.id, 
               CONCAT('Appt: ', p.name) as title, 
               CONCAT(a.appointment_date, ' at ', a.appointment_time) as subtitle
        FROM appointments a
        JOIN patients p ON a.patient_id = p.id
        JOIN doctors d ON a.doctor_id = d.id
        WHERE (p.name LIKE %s OR d.name LIKE %s OR a.reason LIKE %s)
    """
    params = [f"%{q}%", f"%{q}%", f"%{q}%"]
    if role == 'patient':
        appt_query += " AND p.user_id = %s"
        params.append(user_id)
    elif role == 'doctor':
        appt_query += " AND d.user_id = %s"
        params.append(user_id)
        
    appointments = db_query(appt_query, params, fetch=True)
    for a in (appointments or []):
        a['subtitle'] = str(a['subtitle'])
    results.extend(appointments or [])
    
    # 3. Search Prescriptions
    presc_query = """
        SELECT 'prescription' as type, pr.id, 
               pr.medicine as title, 
               CONCAT('For: ', p.name, ' on ', pr.date) as subtitle
        FROM prescriptions pr
        JOIN patients p ON pr.patient_id = p.id
        JOIN doctors d ON pr.doctor_id = d.id
        WHERE (pr.medicine LIKE %s OR p.name LIKE %s)
    """
    params = [f"%{q}%", f"%{q}%"]
    if role == 'patient':
        presc_query += " AND p.user_id = %s"
        params.append(user_id)
    elif role == 'doctor':
        presc_query += " AND d.user_id = %s"
        params.append(user_id)
        
    prescriptions = db_query(presc_query, params, fetch=True)
    for p in (prescriptions or []):
        p['subtitle'] = str(p['subtitle'])
    results.extend(prescriptions or [])
    
    return jsonify(results)
