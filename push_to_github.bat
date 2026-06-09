@echo off
echo === Sirius — Push para GitHub ===
echo.

cd /d "%~dp0"

echo [1/5] Inicializando git...
git init
git branch -M main

echo [2/5] Configurando remote...
git remote add origin https://github.com/gadielrocha17-ops/sirius.git

echo [3/5] Adicionando arquivos...
git add .

echo [4/5] Fazendo commit...
git commit -m "feat: Sirius SaaS — codebase inicial completo

- Backend Fastify com rotas: webhook, tickets, messages, users, integrations, appointments, admin
- Frontend Next.js 14 App Router com 5 telas: Atendimento, Fila Bot, Agenda, Admin, Configuracoes
- Supabase schema com RLS multi-tenant (6 tabelas)
- Autenticacao via Supabase Auth + JWT
- Realtime via Supabase channels
- Criptografia AES-256-GCM para API keys"

echo [5/5] Fazendo push...
git push -u origin main

echo.
echo === Concluido! Acesse: https://github.com/gadielrocha17-ops/sirius ===
pause
