from flask import Blueprint, jsonify, session
from database import db_query

records_bp = Blueprint('records', __name__)

@records_bp.route('', methods=['GET'])
def get_records():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401

    try:
        # Prescriptions for the patient
        prescriptions = db_query("""
            SELECT pr.id, pr.medicine, pr.dosage, pr.date, d.name as doctorName
            FROM prescriptions pr
            JOIN doctors d ON pr.doctor_id = d.id
            JOIN patients p ON pr.patient_id = p.id
            WHERE p.user_id = %s
            ORDER BY pr.date DESC
        """, (user_id,), fetch=True)

        for p in (prescriptions or []):
            p['date'] = str(p['date'])

        # Actual medical records from the records table
        reports = db_query("""
            SELECT r.id, r.description, r.file_path, r.date
            FROM records r
            JOIN patients p ON r.patient_id = p.id
            WHERE p.user_id = %s
            ORDER BY r.date DESC
        """, (user_id,), fetch=True)

        for r in (reports or []):
            r['date'] = str(r['date'])

        return jsonify({
            "prescriptions": prescriptions or [],
            "reports": reports or []
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
