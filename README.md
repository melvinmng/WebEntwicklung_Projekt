# World App – Projekt starten & stoppen

## Projekt starten

```bash
docker compose up --build
```

## Projekt stoppen

```bash
docker compose down
```

## Zugriff auf die App

- **Frontend**: [http://localhost:4200](http://localhost:4200)
- **API-Service**: [http://localhost:5000](http://localhost:5000)
- **Auth-Service**: [http://localhost:5002](http://localhost:5002)
- **Flight-Service**: [http://localhost:5003](http://localhost:5003)

Der API-Service unterstützt optional den Parameter `username` bei
`/api/recommendations`. Ist für diesen Nutzer ein individueller Gemini-Prompt in
der Datenbank hinterlegt, wird er für die Generierung verwendet.

> Stelle sicher, dass du im Projekt-Root arbeitest – dort, wo die `docker-compose.yml` liegt.

## Kubernetes

Die einzelnen Container lassen sich auch in einem Kubernetes-Cluster starten. Alle benoetigten Ressourcen sind in `k8s/kubernetes.yaml` beschrieben. Das folgende Rezept fuehrt Schritt fuer Schritt durch den Start mit einem lokalen Cluster (z. B. Minikube).

0. ** Minikube installieren**
Für unser Beispiel nutzen wir Minikube, dies kann auf dem Mac mittels Homebrew installiert werden:
   ```bash
   brew install minikube
   ```
Bei der Installation auf anderen Betriebssystemen kann ChatGPT sicherlich helfen :).

1. **Cluster starten**
   ```bash
   minikube start
   ```

2. **Docker-Umgebung des Clusters aktivieren** – so landen die gebauten Images direkt im richtigen Docker-Daemon. Dies ist wichtig, da im Manifest `imagePullPolicy: Never` gesetzt ist.
   ```bash
   eval $(minikube docker-env)
   ```

3. **Container-Images bauen**
   ```bash
   docker build -t api-service:latest world-app/backend/api-service
   docker build -t auth-service:latest world-app/backend/auth-service
   docker build -t flight-service:latest world-app/backend/flight-service
   docker build -t db-service:latest world-app/backend/db-service
   docker build -t frontend:latest world-app
   ```

4. **Ressourcen im Cluster anlegen**
   ```bash
   kubectl apply -f k8s/kubernetes.yaml
   ```

5. **Pruefen, ob alle Pods laufen** (optional)
   ```bash
   kubectl get pods
   ```

6. **Frontend aufrufen** – im Browser `http://localhost:30080` oeffnen. Die Services koennen sich im Cluster gegenseitig ueber ihre Namen (z. B. `db-service`) ansprechen.

7. **Cluster aufraeumen**
   ```bash
   kubectl delete -f k8s/kubernetes.yaml
   ```

## Nutzung der Karte

Auf der Karte kannst du per **Linksklick** einen roten Marker für bereits besuchte Orte setzen. Ein **Rechtsklick** erzeugt einen violetten Marker für die Wunschliste. Ein Klick auf einen Marker entfernt ihn wieder.

Nach dem Generieren von Empfehlungen erscheinen weitere Marker:

- 🟡 **Safe** – bewährte Reiseziele
- 🔵 **Experimental** – etwas ausgefallenere Vorschläge
- 🟢 **Geheimtipp** – noch unbekannte Orte

Die **Legende** unten rechts blendet einzelne Markertypen ein oder aus. 
Links unten findest du zusätzliche Buttons, um alle Marker zu löschen, den letzten Marker wiederherzustellen oder zur Startansicht zurückzukehren.

## Benötigte API-Keys

Um alle Dienste starten zu können, müssen einige API-Schlüssel in `.env`‑Dateien abgelegt werden. Die Dateien liegen jeweils im Verzeichnis des entsprechenden Service (neben `app.py`). Falls sie noch nicht existieren, lege sie an.

1. **Gemini API Key**
   - Benötigt vom *API-Service* zur Generierung der Reisetipps.
   - Den Schlüssel erhältst du im [Google AI Studio](https://aistudio.google.com/app/apikey).
   - Datei: `world-app/backend/api-service/.env`
     ```
     GEMINI_API_KEY=DEIN_KEY
     ```

2. **Supabase API Key**
   - Erforderlich für den *DB-Service* und optional für den *Flight-Service*.
   - Den API Key findest du in deinem Supabase-Projekt unter `Project Settings → API`.
   - Datei für den DB-Service: `world-app/backend/db-service/.env`
     ```
     SUPABASE_API_KEY=DEIN_KEY
     ```
   - Optional kann der *Flight-Service* die gleiche Datei `world-app/backend/flight-service/.env` mit folgendem Inhalt nutzen (hier reicht aber auch der öffentliche Key im Code selbst):
     ```
     SUPABASE_API_KEY=DEIN_KEY
     ```