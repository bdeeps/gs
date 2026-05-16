FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 python3-pip python3-venv build-essential curl \
  && rm -rf /var/lib/apt/lists/*

# Debian Bookworm blocks system-wide pip (PEP 668); use a venv for embedding deps.
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY embedding-service/requirements.txt ./embedding-service/
RUN pip install --no-cache-dir -r embedding-service/requirements.txt

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
