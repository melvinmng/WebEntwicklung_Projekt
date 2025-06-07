from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os
import google.generativeai as genai
import requests
# Load environment variables
load_dotenv()

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel('gemini-2.0-flash')

app = Flask(__name__)
CORS(app)

@app.route('/api/recommendations', methods=['GET'])
def recommendations():
    locations = request.args.get('locations', '')
    if not locations:
        return jsonify({"error": "No locations provided. Please add locations separated by commas."}), 400
    
    location_list = [loc.strip() for loc in locations.split(',') if loc.strip()]
    
    formatted_locations = '\n'.join(f"- {loc}" for loc in location_list)

    prompt = (
    "Ein Benutzer hat folgende Orte besucht und mochte diese sehr:\n\n"
    f"{formatted_locations}\n\n"
    "Empfehle ihm basierend darauf **drei weitere Städte**, die ihm gefallen könnten. "
    "Gib **nur** den Namen der Stadt und das zugehörige Land aus – ohne weitere Informationen oder Erklärungen. "
    "Strukturiere deine Antwort exakt wie folgt:\n\n"
    "1. Safe Guess: <Stadt>, <Land>\n"
    "2. Experimentell: <Stadt>, <Land>\n"
    "3. Geheimtipp: <Stadt>, <Land>"
    )

    response = model.generate_content(prompt)

    print("Gemini response:", response.text)

    return jsonify({"recommendations": response.text})


@app.route('/api/reverse-geocode', methods=['GET'])
def reverse_geocode():
    lat = request.args.get('lat')
    lon = request.args.get('lon')

    if not lat or not lon:
        return jsonify({"error": "Missing latitude or longitude"}), 400

    nominatim_url = (
        f"https://nominatim.openstreetmap.org/reverse"
        f"?format=json&lat={lat}&lon={lon}&zoom=10&addressdetails=1"
    )

    headers = {
        'User-Agent': 'YourAppName/1.0 (you@example.com)'  # wichtig laut Nominatim-Richtlinien
    }

    response = requests.get(nominatim_url, headers=headers)

    if response.status_code != 200:
        return jsonify({"error": "Failed to fetch location data"}), 500

    data = response.json()
    address = data.get('address', {})
    city = address.get('city') or address.get('town') or address.get('village') or 'Unbekannt'
    country = address.get('country') or 'Unbekannt'

    return jsonify({"city": city, "country": country})


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)