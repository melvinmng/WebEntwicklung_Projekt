from flask import Flask
from flask_cors import CORS
from auth import auth_bp

app = Flask(__name__)
CORS(app)  # <--- Das hier erlaubt Cross-Origin-Requests

app.register_blueprint(auth_bp)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5002)
