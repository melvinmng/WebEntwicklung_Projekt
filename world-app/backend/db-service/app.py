from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import requests
from dotenv import load_dotenv
from datetime import datetime, timedelta

import flask_monitoringdashboard as dashboard

app = Flask(__name__)
dashboard.bind(app)
dashboard.config.init_from(file="config.cfg")
CORS(app)


load_dotenv()

SUPABASE_URL = "https://htcbliihfzdqjczueixg.supabase.co"
SUPABASE_API_KEY = os.getenv("SUPABASE_API_KEY")
TABLE_NAME = "user-data"


def _parse_date(value: str) -> datetime:
    """Safely parse an ISO date string."""
    try:
        return datetime.fromisoformat(value)
    except Exception:
        return datetime.min


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

    # Anzahl der gespeicherten Orte und Wunschorte pro Nutzer
    user_location_counts = {e.get("USER"): len(e.get("USERLOC", [])) for e in entries}
    wish_location_counts = {e.get("USER"): len(e.get("WISHLOC", [])) for e in entries}

    return jsonify(
        {
            "total_users": total_users,
            "total_user_locations": total_user_locations,
            "total_wish_locations": total_wish_locations,
            "avg_user_locations": avg_user_locations,
            "most_active_user": most_active_user,
            "user_location_counts": user_location_counts,
            "wish_location_counts": wish_location_counts,
        }
    )


@app.route("/api/log-login/<username>", methods=["POST"])
def log_login(username):
    headers = {
        "apikey": SUPABASE_API_KEY,
        "Authorization": f"Bearer {SUPABASE_API_KEY}",
    }

    params = {"USER": f"eq.{username}", "select": "LOGINS"}
    res = requests.get(
        f"{SUPABASE_URL}/rest/v1/{TABLE_NAME}", headers=headers, params=params
    )
    if res.status_code != 200 or not res.json():
        return jsonify({"error": "Benutzer nicht gefunden"}), 404

    logins = res.json()[0].get("LOGINS", []) or []
    cutoff = datetime.utcnow() - timedelta(weeks=6)
    logins = [d for d in logins if _parse_date(d) >= cutoff]
    logins.append(datetime.utcnow().date().isoformat())

    patch_headers = {**headers, "Content-Type": "application/json"}
    patch = requests.patch(
        f"{SUPABASE_URL}/rest/v1/{TABLE_NAME}",
        headers=patch_headers,
        params={"USER": f"eq.{username}"},
        json={"LOGINS": logins},
    )

    if patch.status_code in [200, 204]:
        return jsonify({"message": "Login erfasst"}), 200
    return jsonify({"error": "Fehler beim Aktualisieren", "details": patch.text}), 400


@app.route("/api/login-stats", methods=["GET"])
def login_stats():
    headers = {
        "apikey": SUPABASE_API_KEY,
        "Authorization": f"Bearer {SUPABASE_API_KEY}",
    }

    res = requests.get(f"{SUPABASE_URL}/rest/v1/{TABLE_NAME}", headers=headers)
    if res.status_code != 200:
        return jsonify({"error": "Fehler beim Abrufen", "details": res.text}), 500

    entries = res.json()
    cutoff = datetime.utcnow() - timedelta(weeks=6)
    counts = {}
    for entry in entries:
        username = entry.get("USER")
        logins = entry.get("LOGINS", []) or []
        cleaned = []
        for d in logins:
            dt = _parse_date(d)
            if dt >= cutoff:
                cleaned.append(dt.date().isoformat())
                counts[dt.date().isoformat()] = counts.get(dt.date().isoformat(), 0) + 1
        if len(cleaned) != len(logins):
            patch_headers = {**headers, "Content-Type": "application/json"}
            requests.patch(
                f"{SUPABASE_URL}/rest/v1/{TABLE_NAME}",
                headers=patch_headers,
                params={"USER": f"eq.{username}"},
                json={"LOGINS": cleaned},
            )

    today = datetime.utcnow().date()
    dates = [(today - timedelta(days=i)).isoformat() for i in reversed(range(42))]
    series = [counts.get(d, 0) for d in dates]
    return jsonify({"dates": dates, "counts": series})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5004)
