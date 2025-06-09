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

- **Frontend**: [http://localhost](http://localhost:4200)
- **API-Service**: [http://localhost:5000](http://localhost:5000)
- **Auth-Service**: [http://localhost:5002](http://localhost:5002)
- **Flight-Service**: [http://localhost:5003](http://localhost:5003)

> Stelle sicher, dass du im Projekt-Root arbeitest – dort, wo die `docker-compose.yml` liegt.
