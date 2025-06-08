import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import requests

app = Flask(__name__)
CORS(app)

API_URL = "https://flight-data.p.rapidapi.com/v2/prices/latest"
RAPIDAPI_KEY = os.environ.get("RAPIDAPI_KEY")
RAPIDAPI_HOST = os.environ.get("RAPIDAPI_HOST", "flight-data.p.rapidapi.com")

@app.route('/api/flights')
def get_flights():
    origin = request.args.get('origin')
    destination = request.args.get('destination')
    date = request.args.get('date')

    if not all([origin, destination, date]):
        return jsonify({'error': 'Missing parameters'}), 400

    if not RAPIDAPI_KEY:
        return jsonify({'error': 'API key not set'}), 500

    params = {
        'origin': origin,
        'destination': destination,
        'departure_at': date,
        'one_way': 'true',
        'page': 1
    }
    headers = {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': RAPIDAPI_HOST,
    }

    try:
        resp = requests.get(API_URL, headers=headers, params=params, timeout=10)
        resp.raise_for_status()
        payload = resp.json()
    except Exception as exc:
        return jsonify({'error': str(exc)}), 500

    flights = []
    for item in payload.get('data', []):
        flight_number = item.get('flight_number') or item.get('flight', {}).get('number')
        airline = item.get('airline') or item.get('airline_name') or item.get('airline', {}).get('name')
        departure_time = item.get('departure_at') or item.get('depart_date') or item.get('departure', {}).get('scheduled')
        price = item.get('price') or item.get('value')
        flights.append({
            'flight_number': flight_number,
            'airline': airline,
            'price': price,
            'departure_time': departure_time,
        })
    return jsonify(flights)


if __name__ == '__main__':
    app.run(debug=True)
