from fast_flights import FlightData, Passengers, Result, get_flights as fetch_flights


result: Result = fetch_flights(
    flight_data=[FlightData(date="2025-06-23", from_airport="FKB", to_airport="OPO")],
    trip="one-way",
    seat="economy",
    passengers=Passengers(
        adults=1,
        children=0,
    ),
    fetch_mode="local",
)

print(result)
