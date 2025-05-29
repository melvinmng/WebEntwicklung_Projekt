from flask import Flask, jsonify

app = Flask(__name__)


@app.route("/user/<user_id>")
def get_user_profile(user_id):
    # Hier die Logik zur Abfrage der Benutzerdaten implementieren (z.B. aus einer Datenbank)
    user_data = {
        "id": user_id,
        "name": "Max Mustermann",
        "preferences": ["Beach", "Culture", "History"],
    }
    return jsonify(user_data)


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0")
