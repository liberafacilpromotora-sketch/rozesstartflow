FROM node:20-slim

WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copiar configs do projeto Nest
COPY backend/package*.json ./
COPY backend/nest-cli.json ./
COPY backend/tsconfig*.json ./

RUN npm install

# Copiar TODO o backend agora (importantíssimo)
COPY backend .

# Gerar prisma client
RUN npx prisma generate

# Build do Nest (gera /dist)
RUN npm run build

EXPOSE 3001

CMD ["node", "dist/main.js"]
