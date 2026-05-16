FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 python3-pip build-essential curl \
  && rm -rf /var/lib/apt/lists/*

COPY embedding-service/requirements.txt ./embedding-service/
RUN pip3 install --no-cache-dir -r embedding-service/requirements.txt

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV EMBEDDING_SERVICE_URL=http://127.0.0.1:8100
ENV START_EMBEDDING_SIDECAR=1
ENV EMBED_PORT=8100

EXPOSE 3000

CMD ["bash", "scripts/start-with-embedding.sh"]
