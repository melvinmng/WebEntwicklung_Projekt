from flask import Flask, request, jsonify
from flask_cors import CORS
from fast_flights import (
    FlightData,
    Passengers,
    Result,
    get_flights as fetch_flights,
    search_airport,
)

app = Flask(__name__)
CORS(app)


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


@app.route("/search-airport", methods=["GET"])
def airport():
    query = request.args.get("query", "")
    if not query:
        return jsonify({"error": "query parameter required"}), 400

    airports = search_airport(query)
    return jsonify({"airports": [a.value for a in airports]})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5003)
