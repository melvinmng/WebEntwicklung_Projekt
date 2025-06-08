from flask import Blueprint, request, jsonify
from utils import hash_password, verify_password
from models import users

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    print("📥 POST /register wurde aufgerufen")
    data = request.json
    print(f"🔍 Daten empfangen: {data}")
    data = request.json
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'error': 'Benutzername und Passwort erforderlich'}), 400

    if username in users:
        return jsonify({'error': 'Benutzer existiert bereits'}), 409

    users[username] = hash_password(password)
    return jsonify({'message': 'Registrierung erfolgreich'}), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')

    stored_hash = users.get(username)
    if not stored_hash or not verify_password(password, stored_hash):
        return jsonify({'error': 'Ungültige Anmeldedaten'}), 401

    return jsonify({'message': 'Login erfolgreich'}), 200


@auth_bp.route('/status', methods=['GET'])
def status():
    return jsonify({'status': 'Auth-Service läuft'}), 200

@auth_bp.route('/users', methods=['GET'])
def get_users():
    return jsonify({'registered_users': list(users.keys())}), 200