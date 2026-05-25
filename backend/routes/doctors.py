from flask import Blueprint, request, jsonify, session
from database import db_query, db_query_one, db_execute
from config import get_db_connection
from werkzeug.security import generate_password_hash

doctors_bp = Blueprint('doctors', __name__)

@doctors_bp.route('', methods=['GET'])
def get_doctors():
    doctors = db_query(
        "SELECT id, name, specialization as specialty, fee, email FROM doctors ORDER BY name",
        fetch=True
    )
    return jsonify(doctors or [])

@doctors_bp.route('/<int:id>', methods=['GET'])
def get_doctor(id):
    doctor = db_query_one(
        "SELECT id, name, specialization as specialty, fee, email FROM doctors WHERE id = %s",
        (id,)
    )
    if not doctor:
        return jsonify({"error": "Doctor not found"}), 404
    return jsonify(doctor)

@doctors_bp.route('', methods=['POST'])
def add_doctor():
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
            hashed_password = generate_password_hash(data.get('password', 'doctor123'))
            cursor.execute(
                "INSERT INTO users (name, email, password, role) VALUES (%s, %s, %s, 'doctor')",
                (data['name'], data['email'], hashed_password)
            )
            u_id = cursor.lastrowid
            cursor.execute(
                "INSERT INTO doctors (user_id, name, email, specialization, fee) VALUES (%s, %s, %s, %s, %s)",
                (u_id, data['name'], data['email'], data['specialty'], data['fee'])
            )
            conn.commit()
        finally:
            cursor.close()
            conn.close()
        return jsonify({"status": "success", "message": "Doctor registered successfully"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@doctors_bp.route('/<int:id>', methods=['PUT'])
def update_doctor(id):
    if session.get('role') != 'admin':
        return jsonify({"error": "Admin access required"}), 403
    try:
        data = request.json
        db_execute(
            "UPDATE doctors SET name=%s, specialization=%s, fee=%s WHERE id=%s",
            (data['name'], data['specialty'], data['fee'], id)
        )
        # Also update users table name
        doc = db_query_one("SELECT user_id FROM doctors WHERE id = %s", (id,))
        if doc:
            db_execute("UPDATE users SET name=%s WHERE id=%s", (data['name'], doc['user_id']))
        return jsonify({"status": "success", "message": "Doctor updated"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@doctors_bp.route('/<int:id>', methods=['DELETE'])
def delete_doctor(id):
    if session.get('role') != 'admin':
        return jsonify({"error": "Admin access required"}), 403
    try:
        doc = db_query_one("SELECT user_id FROM doctors WHERE id = %s", (id,))
        if doc:
            db_execute("DELETE FROM users WHERE id = %s", (doc['user_id'],))
            return jsonify({"status": "success", "message": "Doctor deleted"})
        return jsonify({"error": "Doctor not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

