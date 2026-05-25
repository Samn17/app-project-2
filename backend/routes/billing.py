from flask import Blueprint, request, jsonify, session
from database import db_query, db_execute, db_query_one
from datetime import date

billing_bp = Blueprint('billing', __name__)

@billing_bp.route('', methods=['GET'])
def get_bills():
    user_id = session.get('user_id')
    role = session.get('role')
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401

    query = """
        SELECT py.id, py.invoice_number, py.description, py.amount, py.status, py.date,
               p.name as patientName, p.id as patientId
        FROM payments py
        JOIN patients p ON py.patient_id = p.id
    """
    params = []
    if role == 'patient':
        query += " WHERE p.user_id = %s"
        params.append(user_id)

    query += " ORDER BY py.date DESC"
    results = db_query(query, params, fetch=True)
    for r in (results or []):
        r['date'] = str(r['date'])
    return jsonify(results or [])

@billing_bp.route('', methods=['POST'])
def generate_bill():
    if session.get('role') != 'admin':
        return jsonify({"error": "Admin access required"}), 403
    try:
        data = request.json
        patient_id = data.get('patient_id')
        description = data.get('description', 'Consultation Fee')
        amount = data.get('amount')

        if not patient_id or not amount:
            return jsonify({"error": "patient_id and amount are required"}), 400

        # Verify patient exists
        pat = db_query_one("SELECT id FROM patients WHERE id = %s", (patient_id,))
        if not pat:
            return jsonify({"error": "Patient not found"}), 404

        # Generate invoice number
        count_res = db_query_one("SELECT COUNT(*) + 1 as cnt FROM payments WHERE YEAR(date) = YEAR(CURDATE())")
        count = count_res['cnt'] if count_res else 1
        invoice_num = f"INV-{date.today().year}-{str(count).zfill(4)}"

        db_execute(
            "INSERT INTO payments (patient_id, invoice_number, description, amount, status, date) VALUES (%s, %s, %s, %s, 'unpaid', %s)",
            (patient_id, invoice_num, description, amount, date.today())
        )
        return jsonify({"status": "success", "message": "Bill generated successfully", "invoice_number": invoice_num}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@billing_bp.route('/pay', methods=['POST'])
def pay_bill():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401
    try:
        data = request.json
        bill_id = data.get('invoiceId')
        if not bill_id:
            return jsonify({"error": "invoiceId is required"}), 400
        db_execute("UPDATE payments SET status = 'paid' WHERE id = %s", (bill_id,))
        return jsonify({"status": "success", "message": "Payment successful"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@billing_bp.route('/<int:id>', methods=['DELETE'])
def delete_bill(id):
    if session.get('role') != 'admin':
        return jsonify({"error": "Admin access required"}), 403
    try:
        db_execute("DELETE FROM payments WHERE id = %s", (id,))
        return jsonify({"status": "success", "message": "Bill deleted"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
