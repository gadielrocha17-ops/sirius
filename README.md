# Sirius — Plataforma SaaS de Atendimento com IA

> Conecte agentes de IA (N8N + Evolution API) a um painel centralizado para atendentes humanos.

---

## Estrutura do projeto

```
sirius/
├── backend/          — API Fastify (Node.js)
├── frontend/         — Interface Next.js 14
└── supabase/
    └── migrations/   — SQL para o banco de dados
```

---

## Pré-requisitos

- Node.js 18+
- Conta no [Supabase](https://supabase.com) (gratuita)
- Conta no [Vercel](https://vercel.com) (deploy do frontend)
- Conta no [Railway](https://railway.app) (deploy do backend)

---

## Setup local — passo a passo

### 1. Supabase

1. Crie um projeto em https://supabase.com
2. Vá em **SQL Editor** e execute o conteúdo de `supabase/migrations/001_initial.sql`
3. Anote:
   - **Project URL** (ex: `https://xxxxx.supabase.co`)
   - **anon key** (Settings → API → Project API keys)
   - **service_role key** (mesma tela, aba "Secret")

### 2. Backend

```bash
cd backend
cp .env.example .env
# Preencha o .env com suas chaves
npm install
npm run dev        # Inicia em http://localhost:3001
```

**Variáveis obrigatórias no `.env`:**

| Variável | Descrição |
|---|---|
| `SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_SERVICE_KEY` | Service role key (secret) |
| `ENCRYPTION_KEY` | 64 chars hex — gere com: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `RESEND_API_KEY` | Chave da [Resend](https://resend.com) para e-mails |
| `PORT` | Porta do servidor (padrão: 3001) |

### 3. Frontend

```bash
cd frontend
cp .env.local.example .env.local
# Preencha o .env.local
npm install
npm run dev        # Inicia em http://localhost:3000
```

**Variáveis no `.env.local`:**

| Variável | Descrição |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key pública |
| `NEXT_PUBLIC_API_URL` | URL do backend (local: `http://localhost:3001`) |

### 4. Criar primeiro usuário admin

No SQL Editor do Supabase:

```sql
-- 1. Crie o tenant
INSERT INTO tenants (name, slug, plan)
VALUES ('Minha Empresa', 'minha-empresa', 'starter')
RETURNING id;

-- 2. Use o Supabase Auth dashboard para criar o usuário
-- Authentication → Users → Add user

-- 3. Crie o perfil (substitua os UUIDs)
INSERT INTO users (tenant_id, supabase_auth_id, name, email, role, can_see_bot_queue)
VALUES (
  '<tenant_id do passo 1>',
  '<auth_id do usuário criado>',
  'Admin',
  'admin@suaempresa.com',
  'admin',
  true
);
```

---

## Deploy

### Backend → Railway

1. Crie novo projeto no Railway → "Deploy from GitHub"
2. Adicione as variáveis de ambiente do `.env` no painel do Railway
3. Railway detecta automaticamente o `package.json` e usa `npm start`

### Frontend → Vercel

```bash
cd frontend
npx vercel
# Siga o wizard e configure as variáveis de ambiente
```

Ou conecte o repositório GitHub diretamente no dashboard da Vercel.

---

## Configuração do N8N

No painel da plataforma (Configurações → WhatsApp / N8N):

1. **URL do webhook:** `https://SEU-BACKEND.railway.app/webhook/n8n`
2. **Token:** qualquer string segura (ex: UUID)

O N8N deve enviar POSTs para essa URL com os seguintes eventos:

| Event | Descrição |
|---|---|
| `customer_message` | Nova mensagem do cliente |
| `message` | Mensagem do bot |
| `escalate` | Bot escalou para humano |
| `close` | Conversa encerrada |
| `satisfaction` | Nota de satisfação recebida |

Exemplo de payload:
```json
{
  "event": "customer_message",
  "tenant_id": "uuid-do-tenant",
  "session_id": "id-da-sessao-n8n",
  "contact_phone": "+5511999990000",
  "contact_name": "João Silva",
  "channel": "whatsapp",
  "content": "Quero agendar uma consulta"
}
```

---

## Roadmap — Fases

| Fase | Escopo | Semanas |
|---|---|---|
| **1 — MVP** | Webhook, tickets, mensagens, atendimento, fila do bot, realtime | 1–4 |
| **2 — Admin** | Dashboard admin, usuários, histórico, configurações completas | 5–7 |
| **3 — Agenda** | Calendário, Google Agenda OAuth2, webhooks de saída, onboarding | 8–10 |

---

## Tecnologias

| Camada | Stack |
|---|---|
| Frontend | Next.js 14 (App Router) + Tailwind CSS |
| Backend | Node.js + Fastify |
| Banco | Supabase (PostgreSQL + Auth + Realtime) |
| Deploy | Vercel (frontend) + Railway (backend) |
| IA | N8N + Evolution API (externos) |
| E-mail | Resend |
| Criptografia | AES-256-GCM (API keys) |
