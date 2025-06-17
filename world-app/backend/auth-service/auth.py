from flask import Blueprint, request, jsonify
from utils import hash_password, verify_password
from models import (
    user_exists,
    register_user,
    get_password_hash,
    update_user,
)

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


@auth_bp.route("/change-password", methods=["PATCH"])
def change_password():
    data = request.json
    username = data.get("username")
    new_password = data.get("new_password")

    if not username or not new_password:
        return jsonify({"error": "username und new_password erforderlich"}), 400

    if not user_exists(username):
        return jsonify({"error": "Benutzer nicht gefunden"}), 404

    success = update_user(username, {"PASSWORD": hash_password(new_password)})
    if success:
        return jsonify({"message": "Passwort aktualisiert"}), 200
    return jsonify({"error": "Fehler beim Aktualisieren"}), 500


@auth_bp.route("/change-username", methods=["PATCH"])
def change_username():
    data = request.json
    username = data.get("username")
    new_username = data.get("new_username")

    if not username or not new_username:
        return jsonify({"error": "username und new_username erforderlich"}), 400

    if not user_exists(username):
        return jsonify({"error": "Benutzer nicht gefunden"}), 404

    if user_exists(new_username):
        return jsonify({"error": "Neuer Benutzername bereits vergeben"}), 409

    success = update_user(username, {"USER": new_username})
    if success:
        return jsonify({"message": "Benutzername aktualisiert"}), 200
    return jsonify({"error": "Fehler beim Aktualisieren"}), 500


@auth_bp.route("/set-prompt", methods=["PATCH"])
def set_prompt():
    data = request.json
    username = data.get("username")
    prompt = data.get("prompt", "")

    if not username:
        return jsonify({"error": "username erforderlich"}), 400

    if not user_exists(username):
        return jsonify({"error": "Benutzer nicht gefunden"}), 404

    success = update_user(username, {"PROMPT": prompt})
    if success:
        return jsonify({"message": "Prompt gespeichert"}), 200
    return jsonify({"error": "Fehler beim Aktualisieren"}), 500
