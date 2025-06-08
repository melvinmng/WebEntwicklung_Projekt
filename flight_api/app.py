import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import requests

app = Flask(__name__)
CORS(app)

API_URL = "http://api.aviationstack.com/v1/flights"
API_KEY = os.environ.get("AVIATIONSTACK_API_KEY")

@app.route('/api/flights')
def get_flights():
    origin = request.args.get('origin')
    destination = request.args.get('destination')
    date = request.args.get('date')

    if not all([origin, destination, date]):
        return jsonify({'error': 'Missing parameters'}), 400

    if not API_KEY:
        return jsonify({'error': 'API key not set'}), 500

    params = {
        'access_key': API_KEY,
        'dep_iata': origin,
        'arr_iata': destination,
        'flight_date': date,
    }

    try:
        resp = requests.get(API_URL, params=params, timeout=10)
        resp.raise_for_status()
        payload = resp.json()
    except Exception as exc:
        return jsonify({'error': str(exc)}), 500

    flights = []
    for item in payload.get('data', []):
        flight_number = item.get('flight', {}).get('number')
        airline = item.get('airline', {}).get('name')
        departure_time = item.get('departure', {}).get('scheduled')
        price = item.get('price')
        flights.append({
            'flight_number': flight_number,
            'airline': airline,
            'price': price,
            'departure_time': departure_time,
        })
    return jsonify(flights)


if __name__ == '__main__':
    app.run(debug=True)
