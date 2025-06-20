from flask import Flask, request, jsonify
from flask_cors import CORS
from fast_flights import (
    FlightData,
    Passengers,
    Result,
    get_flights as fetch_flights,
    search_airport,  # not working correctly, using DB instead
)
from dotenv import load_dotenv
import os
import requests

app = Flask(__name__)
CORS(app, origins=["http://localhost:4200"])

load_dotenv()


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


SUPABASE_API_KEY = (
    os.getenv("SUPABASE_API_KEY")
    or "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0Y2JsaWloZnpkcWpjenVlaXhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3MTg5ODMsImV4cCI6MjA2NTI5NDk4M30.R7VSTu5KcVVdvR4ZqMMJVPtTxmN-85g3hgHRwWGZZvw"
)  # The second API Key is publicly available and automatically gives you "anon"-rights, which is possible as we are able to create policies in supabase itself. You will only have reading access to the db using this key.
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


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5003)
