from flask import Blueprint, request, jsonify
from utils import hash_password, verify_password
from models import user_exists, register_user, get_password_hash

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.json
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"error": "Benutzername und Passwort erforderlich"}), 400

    if user_exists(username):
        return jsonify({"error": "Benutzer existiert bereits"}), 409

    success = register_user(username, hash_password(password))
    if success:
        return jsonify({"message": "Registrierung erfolgreich"}), 201
    else:
        return jsonify({"error": "Fehler bei der Registrierung"}), 500

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.json
    username = data.get("username")
    password = data.get("password")

    stored_hash = get_password_hash(username)
    if not stored_hash or not verify_password(password, stored_hash):
        return jsonify({"error": "Ungültige Anmeldedaten"}), 401

    return jsonify({"message": "Login erfolgreich"}), 200