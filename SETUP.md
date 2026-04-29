# Startflow — Guia de Instalação

## Pré-requisitos

- Node.js 20+
- PostgreSQL 16 (ou via Docker)
- Redis 7 (ou via Docker)

---

## Opção 1 — Docker (recomendado)

```bash
# Na raiz do projeto
docker-compose up -d postgres redis

# Backend
cd backend
cp .env.example .env
npm install
npx prisma migrate dev --name init
npx prisma db seed
npm run start:dev

# Frontend (novo terminal)
cd frontend
npm install
npm run dev
```

Acesse: http://localhost:3000

---

## Opção 2 — Docker completo

```bash
docker-compose up --build
```

---

## Credenciais padrão (após seed)

| Email | Senha | Role |
|-------|-------|------|
| master@startflow.com | master123 | master |
| cliente@startflow.com | client123 | client |

---

## Configurar Webhook da Gupshup

1. Acesse o painel Gupshup → seu App → Integration → Webhooks
2. Configure a URL: `https://seu-dominio.com/webhook/gupshup`
3. Habilite os eventos: `enqueued`, `sent`, `delivered`, `read`, `failed` + System events

---

## Variáveis de ambiente

### Backend (.env)
```
DATABASE_URL=postgresql://user:password@localhost:5432/startflow
REDIS_URL=redis://localhost:6379
JWT_SECRET=sua-chave-secreta-aqui
JWT_EXPIRES_IN=8h
PORT=3001
FRONTEND_URL=http://localhost:3000
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## Endpoints principais

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | /auth/login | Login |
| POST | /leads/import | Upload CSV |
| GET | /leads | Listar leads |
| POST | /numbers | Cadastrar número |
| PATCH | /numbers/:id/toggle | Ativar/desativar |
| POST | /campaigns | Criar campanha |
| POST | /campaigns/:id/start | Iniciar disparo |
| POST | /campaigns/:id/pause | Pausar |
| GET | /campaigns/:id/dispatches | Status por lead |
| GET | /metrics/dashboard | Métricas |
| POST | /webhook/gupshup | Receber eventos Gupshup |

---

## Fluxo de uso

1. **Login** → master@startflow.com
2. **Números** → Cadastre números WhatsApp com App Name e API Key da Gupshup
3. **Leads** → Importe um CSV (detecção automática de colunas)
4. **Campanhas** → Crie uma campanha com Template ID e parâmetros com `{{variavel}}`
5. **Iniciar** → Clique em "Iniciar" — disparos são enfileirados com delay 3-5s
6. **Acompanhar** → Dashboard atualiza a cada 30s; detalhe da campanha a cada 15s
7. **Webhook** → Status real (entregue/lido/falhou) chega via webhook da Gupshup

---

## Arquitetura

```
Startflow
├── backend/          NestJS + Prisma + BullMQ
│   ├── auth/         JWT + RBAC (master/client)
│   ├── leads/        Import CSV + upsert
│   ├── numbers/      CRUD + rotação round-robin
│   ├── campaigns/    Gestão de campanhas
│   ├── dispatch/     Worker BullMQ + delay randomizado
│   ├── variables/    Motor {{variavel|filtro}}
│   ├── webhook/      Handler eventos Gupshup
│   └── metrics/      Agregações dashboard
└── frontend/         Next.js 14 App Router
    ├── /login        Autenticação
    ├── /dashboard    Métricas em tempo real
    ├── /leads        Upload CSV + tabela
    ├── /numbers      CRUD números WhatsApp
    └── /campaigns    Criação + acompanhamento
```
