FROM node:20-slim

WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copia os arquivos de config do backend
COPY backend/package*.json ./
COPY backend/nest-cli.json ./
COPY backend/tsconfig*.json ./

RUN npm install

# Copia prisma e gera client
COPY backend/prisma ./prisma
RUN npx prisma generate

# Copia o código fonte
COPY backend/src ./src

RUN npm run build

EXPOSE 3001

CMD ["node", "dist/main.js"]
