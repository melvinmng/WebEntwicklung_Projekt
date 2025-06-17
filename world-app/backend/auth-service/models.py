import requests
import os
from dotenv import load_dotenv

load_dotenv()

DB_SERVICE_URL = "http://db-service:5004"


def user_exists(username):
    res = requests.get(f"{DB_SERVICE_URL}/api/db-read/USER/{username}")
    return res.status_code == 200


def register_user(username, hashed_password):
    payload = {
        "USER": username,
        "PASSWORD": hashed_password,
        "USERLOC": [],
        "WISHLOC": [],
        "PROMPT": "",
    }
    res = requests.post(f"{DB_SERVICE_URL}/api/db-write", json=payload)
    return res.status_code == 201


def update_user(username: str, data: dict) -> bool:
    """Patch user entry via the DB service."""
    res = requests.patch(f"{DB_SERVICE_URL}/api/db-update/{username}", json=data)
    return res.status_code == 200


def get_password_hash(username):
    res = requests.get(f"{DB_SERVICE_URL}/api/db-read/USER/{username}")
    if res.status_code == 200:
        return res.json().get("PASSWORD")
    return None
