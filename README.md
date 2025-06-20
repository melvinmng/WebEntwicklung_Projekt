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

Zunaechst muessen die Docker-Images gebaut werden:

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