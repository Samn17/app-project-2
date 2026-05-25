from flask import Blueprint, jsonify, session
from database import db_query_one, db_query

stats_bp = Blueprint('stats', __name__)

@stats_bp.route('', methods=['GET'])
def get_stats():
    if session.get('role') != 'admin':
        return jsonify({"error": "Unauthorized"}), 403
    try:
        doctors_count    = (db_query_one("SELECT COUNT(*) as c FROM doctors") or {'c': 0})['c']
        patients_count   = (db_query_one("SELECT COUNT(*) as c FROM patients") or {'c': 0})['c']
        appt_count       = (db_query_one("SELECT COUNT(*) as c FROM appointments") or {'c': 0})['c']
        scheduled_count  = (db_query_one("SELECT COUNT(*) as c FROM appointments WHERE status='scheduled'") or {'c': 0})['c']
        completed_count  = (db_query_one("SELECT COUNT(*) as c FROM appointments WHERE status='completed'") or {'c': 0})['c']
        cancelled_count  = (db_query_one("SELECT COUNT(*) as c FROM appointments WHERE status='cancelled'") or {'c': 0})['c']
        total_revenue    = (db_query_one("SELECT COALESCE(SUM(amount),0) as s FROM payments WHERE status='paid'") or {'s': 0})['s']
        pending_bills    = (db_query_one("SELECT COUNT(*) as c FROM payments WHERE status='unpaid'") or {'c': 0})['c']

        # Recent appointments (last 5)
        recent = db_query("""
            SELECT a.id, p.name as patientName, d.name as doctorName,
                   a.appointment_date as date, a.status
            FROM appointments a
            JOIN patients p ON a.patient_id = p.id
            JOIN doctors d ON a.doctor_id = d.id
            ORDER BY a.appointment_date DESC LIMIT 5
        """, fetch=True)
        for r in (recent or []):
            r['date'] = str(r['date'])

        return jsonify({
            "doctorsCount":     doctors_count,
            "patientsCount":    patients_count,
            "appointmentsCount": appt_count,
            "scheduledCount":   scheduled_count,
            "completedCount":   completed_count,
            "cancelledCount":   cancelled_count,
            "totalRevenue":     float(total_revenue),
            "pendingBills":     pending_bills,
            "recentAppointments": recent or []
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@stats_bp.route('/doctor', methods=['GET'])
def get_doctor_stats():
    user_id = session.get('user_id')
    if session.get('role') != 'doctor':
        return jsonify({"error": "Doctor access required"}), 403
    
    try:
        doctor = db_query_one("SELECT id FROM doctors WHERE user_id = %s", (user_id,))
        if not doctor:
            return jsonify({"error": "Doctor profile not found"}), 404
        
        doc_id = doctor['id']
        
        total_patients = (db_query_one("""
            SELECT COUNT(DISTINCT patient_id) as c 
            FROM appointments WHERE doctor_id = %s
        """, (doc_id,)) or {'c': 0})['c']
        
        total_appointments = (db_query_one("""
            SELECT COUNT(*) as c FROM appointments WHERE doctor_id = %s
        """, (doc_id,)) or {'c': 0})['c']
        
        today_appointments = (db_query_one("""
            SELECT COUNT(*) as c FROM appointments 
            WHERE doctor_id = %s AND appointment_date = CURDATE()
        """, (doc_id,)) or {'c': 0})['c']
        
        recent_appointments = db_query("""
            SELECT a.id, p.name as patientName, a.appointment_time as time, a.status, a.reason
            FROM appointments a
            JOIN patients p ON a.patient_id = p.id
            WHERE a.doctor_id = %s AND a.appointment_date = CURDATE()
            ORDER BY a.appointment_time ASC
        """, (doc_id,), fetch=True)
        
        for r in (recent_appointments or []):
            r['time'] = str(r['time'])

        return jsonify({
            "totalPatients": total_patients,
            "totalAppointments": total_appointments,
            "todayAppointments": today_appointments,
            "schedule": recent_appointments or []
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
