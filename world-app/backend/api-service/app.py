from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os
import google.generativeai as genai
import requests
import re

# Load environment variables
load_dotenv()

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-2.0-flash")

app = Flask(__name__)
CORS(app)


def get_user_prompt(username: str) -> str:
    """Fetch custom prompt for the user from the DB service."""
    try:
        res = requests.get(f"http://db-service:5004/api/db-read/USER/{username}")
        if res.status_code == 200:
            data = res.json()
            return data.get("PROMPT", "")
    except Exception:
        pass
    return ""


@app.route("/api/recommendations", methods=["GET"])
def recommendations():
    locations = request.args.get("locations", "")
    username = request.args.get("username")
    if not locations:
        return (
            jsonify(
                {
                    "error": "No locations provided. Please add locations separated by commas."
                }
            ),
            400,
        )

    location_list = [loc.strip() for loc in locations.split(",") if loc.strip()]
    formatted_locations = "\n".join(f"- {loc}" for loc in location_list)

    user_prompt = get_user_prompt(username) if username else ""
    base_prompt = (
        "Ein Benutzer hat folgende Orte besucht und mochte diese sehr:\n\n"
        f"{formatted_locations}\n\n"
        "Empfehle ihm basierend darauf **drei weitere Städte**, die ihm gefallen könnten. "
        "Gib **nur** den Namen der Stadt und das zugehörige Land aus – ohne weitere Informationen oder Erklärungen. "
        "Strukturiere deine Antwort exakt wie folgt:\n\n"
        "1. safe: <Stadt>, <Land>     → Eine sichere Empfehlung, stilistisch und kulturell ähnlich zu den bisherigen Reisezielen\n"
        "2. experimental: <Stadt>, <Land>     → Eine Stadt in einer Region, die der Benutzer bisher wenig oder gar nicht bereist hat – ein kultureller oder geographischer Tapetenwechsel\n"
        "3. hidden: <Stadt>, <Land>     → Ein echter Geheimtipp – weniger bekannt, aber lohnenswert, ein Ort abseits der Touristenpfade\n\n"
        "Gib die Ausgabe exakt in diesem Format aus:"
    )

    prompt = f"{base_prompt} \n \n Beachte dabei auch den User-spezifischen Prompt und passe deine Empfehlungen daran an: {user_prompt}"

    response = model.generate_content(prompt)

    print("Gemini response:", response.text)

    recommendation_text = response.text

    pattern = r"\d\.\s*(\w+):\s*(.*?),\s*(.*?)\n?"
    matches = re.findall(pattern, recommendation_text)

    results = []

    for typ, city, country in matches:
        print(f"Geocoding: {city}, {country}")
        geo_url = (
            f"https://nominatim.openstreetmap.org/search?"
            f"city={city}&country={country}&format=json&limit=1"
        )
        geo_response = requests.get(geo_url, headers={"User-Agent": "travel-app/1.0"})

        if geo_response.status_code == 200 and geo_response.json():
            location = geo_response.json()[0]
            lat = float(location["lat"])
            lon = float(location["lon"])
        else:
            lat = None
            lon = None

        results.append(
            {
                "type": typ.lower(),
                "city": city,
                "country": country,
                "lat": lat,
                "lon": lon,
            }
        )

    return jsonify(
        {"recommendations": results, "User": username, "user_prompt": user_prompt}
    )


@app.route("/api/reverse-geocode", methods=["GET"])
def reverse_geocode():
    lat = request.args.get("lat")
    lon = request.args.get("lon")

    if not lat or not lon:
        return jsonify({"error": "Missing latitude or longitude"}), 400

    nominatim_url = (
        f"https://nominatim.openstreetmap.org/reverse"
        f"?format=json&lat={lat}&lon={lon}&zoom=10&addressdetails=1"
    )

    headers = {
        "User-Agent": "YourAppName/1.0 (you@example.com)"  # wichtig laut Nominatim-Richtlinien
    }

    response = requests.get(nominatim_url, headers=headers)

    if response.status_code != 200:
        return jsonify({"error": "Failed to fetch location data"}), 500

    data = response.json()
    address = data.get("address", {})
    city = (
        address.get("city")
        or address.get("town")
        or address.get("village")
        or "Unbekannt"
    )
    country = address.get("country") or "Unbekannt"

    return jsonify({"city": city, "country": country})


@app.route("/api/search", methods=["GET"])
def search_location():
    query = request.args.get("query")
    if not query:
        return jsonify({"error": "No query provided"}), 400

    nominatim_url = (
        f"https://nominatim.openstreetmap.org/search" f"?q={query}&format=json&limit=1"
    )

    headers = {"User-Agent": "YourAppName/1.0 (your@email.com)"}

    response = requests.get(nominatim_url, headers=headers)
    if response.status_code != 200:
        return jsonify({"error": "Failed to fetch location"}), 500

    return jsonify(response.json())


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
