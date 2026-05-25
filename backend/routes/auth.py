from flask import Blueprint, request, jsonify, session
from database import db_query, db_query_one, db_execute
from werkzeug.security import generate_password_hash, check_password_hash

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    try:
        data = request.json
        # Check if user already exists
        exists = db_query_one("SELECT id FROM users WHERE email = %s", (data['email'],))
        if exists:
            return jsonify({"error": "Email already registered"}), 400

        # Use hashed password
        hashed_password = generate_password_hash(data['password'])

        # 1. Insert into Users table
        u_id = db_execute("INSERT INTO users (name, email, password, role) VALUES (%s, %s, %s, 'patient')", 
                          (f"{data['first_name']} {data['last_name']}", data['email'], hashed_password))
        
        # 2. Insert into Patients table
        db_execute("INSERT INTO patients (user_id, name, email, phone) VALUES (%s, %s, %s, %s)",
                   (u_id, f"{data['first_name']} {data['last_name']}", data['email'], data['phone']))

        return jsonify({"status": "success", "message": "Patient registered successfully"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.json
        print(f"Login attempt: Email={data.get('email')}, Role={data.get('role')}, Password={data.get('password')}")

        # Fetch user by email and role only
        user = db_query_one("SELECT * FROM users WHERE email = %s AND role = %s", 
                           (data['email'], data['role']))
        
        print(f"Database result: {user}")

        # Verify password (hashed)
        if not user or not check_password_hash(user['password'], data['password']):
            return jsonify({"error": "Invalid credentials"}), 401
        
        session['user_id'] = user['id']
        session['role'] = user['role']
        
        return jsonify({
            "status": "success",
            "user": {
                "id": user['id'],
                "name": user['name'],
                "email": user['email'],
                "role": user['role']
            }
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@auth_bp.route('/user', methods=['GET'])
def get_current_user():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401
    
    user = db_query_one("SELECT id, name, email, role FROM users WHERE id = %s", (user_id,))
    return jsonify(user)

@auth_bp.route('/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({"status": "success", "message": "Logged out"})

@auth_bp.route('/settings/profile', methods=['PUT'])
def update_profile():
    user_id = session.get('user_id')
    if not user_id: return jsonify({"error": "Unauthorized"}), 401
    
    try:
        data = request.json
        db_execute("UPDATE users SET name=%s, email=%s WHERE id=%s", 
                   (data['name'], data['email'], user_id))
        
        # Also update linked tables
        role = session.get('role')
        if role == 'doctor':
            db_execute("UPDATE doctors SET name=%s, email=%s WHERE user_id=%s", (data['name'], data['email'], user_id))
        elif role == 'patient':
            db_execute("UPDATE patients SET name=%s, email=%s WHERE user_id=%s", (data['name'], data['email'], user_id))
            
        return jsonify({"status": "success", "message": "Profile updated"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@auth_bp.route('/settings/password', methods=['PUT'])
def change_password():
    user_id = session.get('user_id')
    if not user_id: return jsonify({"error": "Unauthorized"}), 401
    
    try:
        data = request.json
        old_password = data.get('old_password')
        new_password = data.get('new_password')
        
        if not new_password:
            return jsonify({"error": "New password is required"}), 400
            
        # Verify the current password if it is supplied (e.g., from the mobile app)
        if old_password:
            user = db_query_one("SELECT password FROM users WHERE id = %s", (user_id,))
            if not user or not check_password_hash(user['password'], old_password):
                return jsonify({"error": "Incorrect current password"}), 400
            
        # Hash new password and update in database
        hashed_password = generate_password_hash(new_password)
        db_execute("UPDATE users SET password=%s WHERE id=%s", (hashed_password, user_id))
        return jsonify({"status": "success", "message": "Password changed successfully"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
