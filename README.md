# World App

> Eine Webanwendung zur Visualisierung deiner Reisen und zur Entdeckung neuer Ziele mittels KI.

Dieses Projekt ermöglicht es, besuchte Orte und Wunschziele auf einer Weltkarte zu markieren und persönliche Reiseempfehlungen basierend auf diesen Daten zu erhalten.

## Inhaltsverzeichnis

- [Architektur & Services](#architektur--services)
- [Voraussetzungen](#voraussetzungen)
- [Einrichtung](#einrichtung)
- [Projekt starten & stoppen](#projekt-starten--stoppen)
  - [Docker Compose (Empfohlen)](#variante-1-docker-compose-empfohlen)
  - [Kubernetes](#variante-2-kubernetes)
- [Nutzung der App](#nutzung-der-app)

---

## Architektur & Services

Das Projekt besteht aus mehreren Microservices, die zusammen die Funktionalität der World App bereitstellen.

| Service        | Port      | URL (Lokal)                 | Beschreibung                                                                                              |
| :------------- | :-------- | :-------------------------- | :-------------------------------------------------------------------------------------------------------- |
| **Frontend**   | `4200`    | `http://localhost:4200`     | Angular-Anwendung, die das User Interface bereitstellt.                                                   |
| **API-Service**| `5001`    | `http://localhost:5001`     | Haupt-API, die KI-Empfehlungen über Gemini generiert.                                                     |
| **Auth-Service**| `5002`    | `http://localhost:5002`     | Verantwortlich für die Authentifizierung und Benutzerverwaltung.                                          |
| **Flight-Service**| `5003` | `http://localhost:5003`     | Stellt Flugdaten und Informationen bereit.                                                                |
| **DB-Service** | `5004`    | `http://localhost:5004`     | Verwaltet die Datenbankinteraktionen über eine Supabase-Anbindung.                                        |

---

## Voraussetzungen

Stelle sicher, dass die folgenden Werkzeuge auf deinem System installiert sind:

- **Node.js und npm**: Zur Installation der Frontend-Abhängigkeiten.
- **Docker und Docker Compose**: Zum einfachen Starten der gesamten Anwendung.
- **(Optional) Minikube und kubectl**: Falls du das Projekt mit Kubernetes ausführen möchtest.

---

## Einrichtung

### 1. API-Keys konfigurieren

Für den vollen Funktionsumfang sind API-Schlüssel für Google Gemini und Supabase erforderlich.

Lege für die folgenden Services jeweils eine `.env`-Datei im angegebenen Verzeichnis an:

1.  **Gemini API Key** (benötigt vom API-Service)
    -   Erstelle die Datei: `world-app/backend/api-service/.env`
    -   Inhalt:
        ```
        GEMINI_API_KEY=DEIN_GOOGLE_AI_STUDIO_KEY
        ```
    -   Den Schlüssel erhältst du im [Google AI Studio](https://aistudio.google.com/app/apikey).

2.  **Supabase API Key** (benötigt vom DB-Service)
    -   Erstelle die Datei: `world-app/backend/db-service/.env`
    -   Inhalt:
        ```
        SUPABASE_API_KEY=DEIN_SUPABASE_SERVICE_ROLE_KEY
        ```
    -   Den `service_role` Key findest du in deinem Supabase-Projekt unter `Project Settings → API`.

### 2. Node.js Abhängigkeiten installieren

Wechsle in das Frontend-Verzeichnis und installiere die `node_modules`.

```bash
cd world-app
npm install
```

---

## Projekt starten & stoppen

Du kannst das Projekt entweder mit Docker Compose oder Kubernetes starten.

### Variante 1: Docker Compose (Empfohlen)

Stelle sicher, dass du dich im **Projekt-Root-Verzeichnis** befindest (dort, wo die `docker-compose.yml` liegt), nicht im `world-app`-Ordner.

**Projekt starten:**
```bash
# Baut die Images und startet alle Container
docker compose up --build
```

**Projekt stoppen:**
```bash
# Stoppt und entfernt die Container
docker compose down
```

### Variante 2: Kubernetes

<details>
<summary>Anleitung für Kubernetes mit Minikube (zum Ausklappen klicken)</summary>

> **Hinweis:** Nutze entweder Docker Compose oder Kubernetes, da beide dieselben Ports verwenden, was zu Konflikten führen kann.

**1. Minikube starten**
```bash
minikube start
```

**2. Docker-Umgebung des Clusters aktivieren**
Damit die gebauten Images direkt im Cluster verfügbar sind:
```bash
eval $(minikube docker-env)
```

**3. Container-Images bauen**
Führe diese Befehle im **Projekt-Root** aus:
```bash
docker build -t api-service:latest world-app/backend/api-service
docker build -t auth-service:latest world-app/backend/auth-service
docker build -t flight-service:latest world-app/backend/flight-service
docker build -t db-service:latest world-app/backend/db-service
docker build -t frontend:latest world-app
```

**4. Ressourcen im Cluster anlegen**
```bash
kubectl apply -f k8s/kubernetes.yaml
```

**5. Zugriff auf die App via Port-Forwarding**
Öffne für jeden der folgenden Befehle ein **separates Terminalfenster**:
```bash
kubectl port-forward service/frontend 4200:80
kubectl port-forward service/api-service 5001:5001
kubectl port-forward service/auth-service 5002:5002
kubectl port-forward service/flight-service 5003:5003
kubectl port-forward service/db-service 5004:5004
```
Anschließend ist das Frontend unter **[http://localhost:4200](http://localhost:4200)** erreichbar.

**6. Cluster aufräumen**
```bash
# Ressourcen löschen
kubectl delete -f k8s/kubernetes.yaml

# Minikube stoppen
minikube stop

# Docker-Umgebung deaktivieren
eval $(minikube docker-env -u)
```
</details>

---

## Nutzung der App

### Kartennutzung

-   **Linksklick:** Setzt einen roten Marker (besuchter Ort).
-   **Rechtsklick:** Setzt einen violetten Marker (Wunschziel).
-   **Klick auf Marker:** Entfernt den Marker.

### KI-Empfehlungen

Nachdem du Marker gesetzt hast, kannst du über die AI-Toolbar Empfehlungen generieren lassen. Diese erscheinen als neue Marker auf der Karte:

-   🟡 **Safe:** Bewährte Reiseziele.
-   🔵 **Experimental:** Ausgefallenere Vorschläge.
-   🟢 **Geheimtipp:** Unbekannte Orte, die zu dir passen könnten.

Über die **Legende** (unten rechts) können einzelne Marker-Typen gefiltert werden.
Zusätzliche Buttons (unten links) ermöglichen das Löschen aller Marker, das Wiederherstellen des letzten gelöschten Markers und das Zurücksetzen der Kartenansicht.

