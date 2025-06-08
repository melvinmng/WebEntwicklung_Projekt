# Personalized Travel Recommendation System

### Initialisierung

1. Klone das GitHub-Repository
   ```bash
   https://github.com/melvinmng/WebEntwicklung_Projekt.git
   ```

2. Öffne ein Terminal (im Projektverzeichnis) und wechsle zum Ordner der App.
    ```bash
    cd world-app
    ```

3. Führe folgenden Befehl aus.
    ```bash
    npm install
    ```

4. Starte die Web-App (der build-Prozess kann etwas dauern).
    ```bash
    npm start
    ```

    oder

    ```bash
    ng serve
    ```

5. Öffne den Link aus dem Terminal im Browser.

### Backend starten
1. Abhängigkeiten installieren
   ```bash
   pip install -r requirements.txt
   ```
2. API-Key setzen (z.B. in der Shell)
   ```bash
   export RAPIDAPI_KEY=<DEIN_API_KEY>
   # optional, falls abweichend
   export RAPIDAPI_HOST=flight-data.p.rapidapi.com
   ```
3. Backend starten
   ```bash
   python flight_api/app.py
   ```
4. Beispielaufruf
   ```bash
   curl "http://localhost:5000/api/flights?origin=FRA&destination=JFK&date=2025-07-01"
   ```
