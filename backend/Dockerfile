FROM node:20-slim
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY package*.json nest-cli.json tsconfig.json ./
RUN npm install
COPY prisma ./prisma
RUN npx prisma generate
COPY src ./src
RUN npm run build
EXPOSE 3001
CMD ["node", "dist/src/main.js"]
