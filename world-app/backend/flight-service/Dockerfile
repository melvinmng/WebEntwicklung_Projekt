FROM python:3.11-slim

# System-Dependencies für Chromium/Playwright
RUN apt-get update && apt-get install -y \
    wget \
    curl \
    gnupg \
    libnss3 \
    libatk-bridge2.0-0 \
    libgtk-3-0 \
    libxss1 \
    libasound2 \
    libgbm-dev \
    libxshmfence1 \
    libatspi2.0-0 \
    libdrm2 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libxfixes3 \
    libxinerama1 \
    libpango-1.0-0 \
    libcups2 \
    libxkbcommon0 \
    fonts-liberation \
    libappindicator3-1 \
    xdg-utils \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

# Playwright-Browser (Chromium) installieren, um fast-flights lokal laufen zu lassen
RUN python -m playwright install chromium

COPY . .

EXPOSE 5003

CMD ["python", "app.py"]
