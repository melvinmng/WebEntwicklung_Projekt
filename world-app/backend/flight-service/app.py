from flask import Flask, request, jsonify
from flask_cors import CORS
from fast_flights import (
    FlightData,
    Passengers,
    Result,
    get_flights as fetch_flights,
    search_airport,  # not working correctly, using DB instead
)
import os
import csv
import requests
from math import radians, sin, cos, sqrt, atan2

import flask_monitoringdashboard as dashboard

app = Flask(__name__)
dashboard.bind(app)
dashboard.config.init_from(file="config.cfg")
CORS(app)


# ----------------------- Airport Helpers -----------------------
AIRPORTS_DATA = None


def load_airports():
    """Load airport data from the CSV file once."""
    global AIRPORTS_DATA
    if AIRPORTS_DATA is not None:
        return AIRPORTS_DATA

    AIRPORTS_DATA = []
    csv_path = os.path.join(os.path.dirname(__file__), "../../../airports.csv")
    try:
        with open(csv_path, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                code = row.get("iata_code")
                if not code:
                    continue
                try:
                    lat = float(row.get("latitude_deg", "0"))
                    lon = float(row.get("longitude_deg", "0"))
                except ValueError:
                    continue
                AIRPORTS_DATA.append(
                    {
                        "code": code,
                        "name": row.get("name", ""),
                        "lat": lat,
                        "lon": lon,
                    }
                )
    except FileNotFoundError:
        AIRPORTS_DATA = []
    return AIRPORTS_DATA


def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great circle distance in kilometers."""
    r = 6371.0
    phi1, phi2 = radians(lat1), radians(lat2)
    dphi = radians(lat2 - lat1)
    dlambda = radians(lon2 - lon1)
    a = sin(dphi / 2) ** 2 + cos(phi1) * cos(phi2) * sin(dlambda / 2) ** 2
    return 2 * r * atan2(sqrt(a), sqrt(1 - a))


@app.route("/flight-search", methods=["GET"])
def flights():
    date = str(request.args.get("date"))
    origin = str(request.args.get("from_airport")).upper()
    destination = str(request.args.get("to_airport")).upper()

    if not date or not origin or not destination:
        return jsonify({"error": "date, from_airport and to_airport are required"}), 400

    trip = request.args.get("trip", "one-way")
    seat = request.args.get("seat", "economy")
    adults = int(request.args.get("adults", 1))
    children = int(request.args.get("children", 0))
    fetch_mode = request.args.get("fetch_mode", "local")

    try:
        result: Result = fetch_flights(
            flight_data=[
                FlightData(date=date, from_airport=origin, to_airport=destination)
            ],
            trip=trip,
            seat=seat,
            passengers=Passengers(
                adults=adults,
                children=children,
            ),
            fetch_mode=fetch_mode,
        )
        # Sort flights by price ascending before returning
        try:
            flights_sorted = sorted(
                result.flights, key=lambda f: float(getattr(f, "price", 0))
            )
            result = result.__class__(**{**result.__dict__, "flights": flights_sorted})
        except Exception:
            pass
        return jsonify(result)
    except RuntimeError as e:
        return jsonify({"error": str(e)}), 404


SUPABASE_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0Y2JsaWloZnpkcWpjenVlaXhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3MTg5ODMsImV4cCI6MjA2NTI5NDk4M30.R7VSTu5KcVVdvR4ZqMMJVPtTxmN-85g3hgHRwWGZZvw"
SUPABASE_URL = "https://htcbliihfzdqjczueixg.supabase.co"
TABLE_NAME = "airports"


@app.route("/airport-code", methods=["GET"])
def get_airport_code():
    # Namen aus den Request-Parametern holen (z. B. ?name=Frankfurt)
    name = request.args.get("name")
    if not name:
        return jsonify({"error": 'Bitte Parameter "name" angeben!'}), 400

    # Supabase REST-API Query bauen
    url = f"{SUPABASE_URL}/rest/v1/{TABLE_NAME}?select=iata_code&name=ilike.*{name}*"
    headers = {
        "apikey": SUPABASE_API_KEY,
    }

    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        return (
            jsonify(
                {"error": "Fehler beim Supabase-Request!", "details": response.text}
            ),
            500,
        )

    data = response.json()
    if not data:
        return jsonify({"error": "Kein Flughafen gefunden!"}), 404

    iata_codes = [entry["iata_code"] for entry in data if entry["iata_code"] != ""]
    return jsonify({"iata_codes": iata_codes})


@app.route("/airport-details", methods=["GET"])
def get_airport_details():
    code = request.args.get("code")
    name = request.args.get("name")
    if not code and not name:
        return jsonify({"error": "code or name required"}), 400

    headers = {"apikey": SUPABASE_API_KEY}
    if code:
        query = f"{SUPABASE_URL}/rest/v1/{TABLE_NAME}?select=name,iata_code,latitude_deg,longitude_deg&iata_code=eq.{code.upper()}"
    else:
        query = f"{SUPABASE_URL}/rest/v1/{TABLE_NAME}?select=name,iata_code,latitude_deg,longitude_deg&name=ilike.*{name}*"

    response = requests.get(query, headers=headers)
    if response.status_code != 200:
        return jsonify({"error": "Fehler beim Supabase-Request!", "details": response.text}), 500

    data = response.json()
    if not data:
        return jsonify({"error": "Kein Flughafen gefunden!"}), 404

    entry = data[0]
    return jsonify({
        "name": entry.get("name"),
        "iata_code": entry.get("iata_code"),
        "latitude_deg": entry.get("latitude_deg"),
        "longitude_deg": entry.get("longitude_deg"),
    })


@app.route("/nearest-airports", methods=["GET"])
def nearest_airports():
    """Return the nearest airports for given coordinates."""
    try:
        lat = float(request.args.get("lat"))
        lon = float(request.args.get("lon"))
    except (TypeError, ValueError):
        return jsonify({"error": "lat and lon required"}), 400

    n = int(request.args.get("n", 3))
    airports = load_airports()
    results = []
    for a in airports:
        dist = haversine(lat, lon, a["lat"], a["lon"])
        results.append({"code": a["code"], "name": a["name"], "distance_km": dist})

    results.sort(key=lambda x: x["distance_km"])
    return jsonify({"airports": results[:n]})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5003)
