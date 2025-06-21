from flask import Flask, request, jsonify
import subprocess
import os

app = Flask(__name__)

# Merke dir gestartete Prozesse
processes = {}


@app.route("/start", methods=["POST"])
def start_service():
    data = request.json
    path = data.get("path")
    name = data.get("name")
    if not path or not os.path.exists(path):
        return jsonify({"error": "Pfad ungültig"}), 400
    if name in processes:
        return jsonify({"error": "Service läuft bereits"}), 400
    proc = subprocess.Popen(["python3", path])
    processes[name] = proc
    return jsonify({"status": f"{name} gestartet", "pid": proc.pid})


@app.route("/stop", methods=["POST"])
def stop_service():
    data = request.json
    name = data.get("name")
    proc = processes.get(name)
    if not proc:
        return jsonify({"error": "Service läuft nicht"}), 400
    proc.terminate()
    del processes[name]
    return jsonify({"status": f"{name} gestoppt"})


@app.route("/status", methods=["GET"])
def status():
    return jsonify({name: proc.poll() is None for name, proc in processes.items()})


if __name__ == "__main__":
    app.run(port=5050)
