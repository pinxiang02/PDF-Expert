FROM node:20-slim

# LibreOffice (headless) + common fonts so Office files convert with correct glyphs.
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
       libreoffice \
       fonts-liberation \
       fonts-dejavu \
       fonts-noto-cjk \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

# The host (Render/Railway/Fly) injects PORT; server.js reads process.env.PORT.
EXPOSE 5174

CMD ["node", "server.js"]
