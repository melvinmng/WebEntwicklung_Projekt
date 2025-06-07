# Personalized Travel Recommendation System


## Backend Setup (Flask + Gemini)

1. `.env` Datei im Verzeichnis `world-app/backend/` erstellen:
```
GEMINI_API_KEY=dein_gemini_api_key
```

2. Docker-Image bauen:
```bash
cd world-app/backend
docker build -t flask-gemini-backend .
```

3. Container starten:
```bash
docker run -p 5001:5000 flask-gemini-backend
```


## Frontend Setup (Angular)

1. Repository klonen
```bash
git clone https://github.com/melvinmng/WebEntwicklung_Projekt.git
cd WebEntwicklung_Projekt/world-app
```

2. Abhängigkeiten installieren
```bash
npm install
```

3. App starten
```bash
npm start
# oder
ng serve
```
4. Öffne den Link aus dem Terminal im Browser.



