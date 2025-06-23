from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import requests
from dotenv import load_dotenv
from flask_cors import CORS

import flask_monitoringdashboard as dashboard

app = Flask(__name__)
dashboard.bind(app)
dashboard.config.init_from(file="config.cfg")
CORS(app)


load_dotenv()

SUPABASE_URL = "https://htcbliihfzdqjczueixg.supabase.co"
SUPABASE_API_KEY = os.getenv("SUPABASE_API_KEY")
TABLE_NAME = "user-data"


@app.route("/api/db-write", methods=["POST"])
def write_to_db():
    data = request.json
    if not data:
        return jsonify({"error": "Keine JSON-Daten im Request"}), 400

    headers = {
        "apikey": SUPABASE_API_KEY,
        "Authorization": f"Bearer {SUPABASE_API_KEY}",
        "Content-Type": "application/json",
    }

    try:
        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/{TABLE_NAME}", headers=headers, json=data
        )

        if response.status_code in [200, 201]:
            try:
                json_response = response.json()
            except ValueError:
                json_response = None

            return (
                jsonify({"message": "Eintrag erfolgreich", "data": json_response}),
                201,
            )

        else:
            return (
                jsonify({"error": "Fehler beim Schreiben", "details": response.text}),
                400,
            )

    except Exception as e:
        return jsonify({"error": "Interner Serverfehler", "details": str(e)}), 500


@app.route("/api/db-read/USER/<USER>", methods=["GET"])
def read_user_by_name(USER):
    headers = {
        "apikey": SUPABASE_API_KEY,
        "Authorization": f"Bearer {SUPABASE_API_KEY}",
    }

    params = {"USER": f"eq.{USER}", "select": "*"}

    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/{TABLE_NAME}", headers=headers, params=params
    )

    if response.status_code == 200:
        result = response.json()
        if result:
            return jsonify(result[0])
        else:
            return (
                jsonify({"error": "Kein Eintrag mit diesem Benutzernamen gefunden"}),
                404,
            )
    else:
        return jsonify({"error": "Fehler beim Lesen", "details": response.text}), 400


@app.route("/api/db-update/<username>", methods=["PATCH"])
def update_user_data(username):
    data = request.json  # z. B. {"USERLOC": [...]} oder {"WISHLOC": [...]}

    headers = {
        "apikey": SUPABASE_API_KEY,
        "Authorization": f"Bearer {SUPABASE_API_KEY}",
        "Content-Type": "application/json",
    }

    params = {"USER": f"eq.{username}"}

    response = requests.patch(
        f"{SUPABASE_URL}/rest/v1/{TABLE_NAME}",
        headers=headers,
        params=params,
        json=data,
    )

    if response.status_code in [200, 204]:
        return jsonify({"message": "Update erfolgreich"}), 200
    else:
        return (
            jsonify({"error": "Fehler beim Aktualisieren", "details": response.text}),
            400,
        )


@app.route("/api/stats", methods=["GET"])
def get_stats():
    """Aggregierte Kennzahlen aus der Benutzerdatenbank."""
    headers = {
        "apikey": SUPABASE_API_KEY,
        "Authorization": f"Bearer {SUPABASE_API_KEY}",
    }

    response = requests.get(f"{SUPABASE_URL}/rest/v1/{TABLE_NAME}", headers=headers)

    if response.status_code != 200:
        return (
            jsonify({"error": "Fehler beim Abrufen", "details": response.text}),
            500,
        )

    entries = response.json()

    total_users = len(entries)
    total_user_locations = sum(len(e.get("USERLOC", [])) for e in entries)
    total_wish_locations = sum(len(e.get("WISHLOC", [])) for e in entries)

    avg_user_locations = total_user_locations / total_users if total_users else 0

    # Der most active User ist in dieser Metrik derjenige, welcher die meisten Orte gespeichert hat,
    # haben zwei User dieselbe Anzahl an Einträgen, wird nur der zuerst Gefundene zurückgegeben
    most_active_user = None
    max_locations = -1
    for entry in entries:
        count = len(entry.get("USERLOC", []))
        if count > max_locations:
            most_active_user = entry.get("USER")
            max_locations = count

    return jsonify(
        {
            "total_users": total_users,
            "total_user_locations": total_user_locations,
            "total_wish_locations": total_wish_locations,
            "avg_user_locations": avg_user_locations,
            "most_active_user": most_active_user,
        }
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5004)
