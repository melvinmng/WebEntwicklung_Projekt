from flask import Flask, request, jsonify
from flask_cors import CORS
from fast_flights import FlightData, Passengers, Result, get_flights

app = Flask(__name__)
CORS(app)


@app.route("/flights", methods=["GET"])
def get_flights():
    result: Result = get_flights(
        flight_data=[
            FlightData(date="2025-01-01", from_airport="TPE", to_airport="MYJ")
        ],
        trip="one-way",
        seat="economy",
        passengers=Passengers(
            adults=2, children=1, infants_in_seat=0, infants_on_lap=0
        ),
        fetch_mode="fallback",
    )
    return jsonify(result)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5003)
