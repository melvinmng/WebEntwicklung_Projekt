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

Die einzelnen Container lassen sich auch in einem Kubernetes-Cluster starten. Alle benoetigten Ressourcen sind in `k8s/kubernetes.yaml` beschrieben.

Zunächst muessen die Docker-Images gebaut werden. Da die Kubernetes-Ressourcen
lokal gebaute Images verwenden, reicht ein einfaches `docker build` aus:

```bash
docker build -t api-service:latest world-app/backend/api-service
docker build -t auth-service:latest world-app/backend/auth-service
docker build -t flight-service:latest world-app/backend/flight-service
docker build -t db-service:latest world-app/backend/db-service
docker build -t frontend:latest world-app
```

Danach die Ressourcen anwenden:

```bash
kubectl apply -f k8s/kubernetes.yaml
```

Da im Manifest `imagePullPolicy: Never` gesetzt ist, muessen die Images im
gleichen Docker-Daemon gebaut werden, den dein Cluster verwendet (z. B. durch
`eval $(minikube docker-env)`).

Das Frontend ist anschliessend ueber `http://localhost:30080` erreichbar. Die Services koennen sich ueber ihre Namen (z.B. `db-service`) im Cluster gegenseitig ansprechen.

Gestoppt werden kann kubernetes mithilfe von

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