-- ══════════════════════════════════════════════════════════════════════════════
-- SIRIUS — Migration inicial
-- Executar no SQL Editor do Supabase ou via supabase db push
-- ══════════════════════════════════════════════════════════════════════════════

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────────────────────────────────────
-- TENANTS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenants (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  VARCHAR(255) NOT NULL,
  slug                  VARCHAR(100) UNIQUE NOT NULL,
  plan                  VARCHAR(20) DEFAULT 'free' CHECK (plan IN ('free','starter','pro')),
  whatsapp_number       VARCHAR(20),
  n8n_webhook_url       TEXT,
  n8n_webhook_token     TEXT,
  timezone              VARCHAR(50) DEFAULT 'America/Sao_Paulo',
  business_hours        JSONB DEFAULT '{"start":"08:00","end":"18:00","days":[1,2,3,4,5]}',
  welcome_message       TEXT DEFAULT 'Olá! 👋 Sou o assistente virtual. Como posso ajudar?',
  out_of_hours_message  TEXT DEFAULT 'Olá! Estamos fora do horário de atendimento. Retornaremos em breve.',
  active                BOOLEAN DEFAULT true,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- USERS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID REFERENCES tenants(id) ON DELETE CASCADE,
  supabase_auth_id  UUID UNIQUE,
  name              VARCHAR(255) NOT NULL,
  email             VARCHAR(255) UNIQUE NOT NULL,
  role              VARCHAR(20) DEFAULT 'agent' CHECK (role IN ('admin','supervisor','agent')),
  can_see_bot_queue BOOLEAN DEFAULT false,
  avatar_color      VARCHAR(7) DEFAULT '#5B4FF5',
  active            BOOLEAN DEFAULT true,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_auth ON users(supabase_auth_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- TICKETS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tickets (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID REFERENCES tenants(id) ON DELETE CASCADE,
  contact_phone     VARCHAR(20) NOT NULL,
  contact_name      VARCHAR(255),
  channel           VARCHAR(20) DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp','instagram','webchat','telegram')),
  status            VARCHAR(20) DEFAULT 'bot' CHECK (status IN ('bot','queue','open','closed')),
  assigned_to       UUID REFERENCES users(id) ON DELETE SET NULL,
  opened_at         TIMESTAMPTZ DEFAULT NOW(),
  closed_at         TIMESTAMPTZ,
  satisfaction_score INT CHECK (satisfaction_score BETWEEN 1 AND 5),
  n8n_session_id    VARCHAR(255),
  metadata          JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_tickets_tenant_status ON tickets(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned ON tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tickets_opened ON tickets(opened_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- MESSAGES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id    UUID REFERENCES tickets(id) ON DELETE CASCADE,
  tenant_id    UUID REFERENCES tenants(id) ON DELETE CASCADE,
  sender_type  VARCHAR(10) CHECK (sender_type IN ('customer','agent','bot')),
  sender_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  content      TEXT NOT NULL,
  media_url    TEXT,
  media_type   VARCHAR(20),
  sent_at      TIMESTAMPTZ DEFAULT NOW(),
  read         BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_messages_ticket ON messages(ticket_id, sent_at);
CREATE INDEX IF NOT EXISTS idx_messages_tenant ON messages(tenant_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- INTEGRATIONS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS integrations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID REFERENCES tenants(id) ON DELETE CASCADE,
  type              VARCHAR(50) NOT NULL,
  label             VARCHAR(100),
  api_key_encrypted TEXT,
  config_json       JSONB DEFAULT '{}',
  active            BOOLEAN DEFAULT false,
  last_tested_at    TIMESTAMPTZ,
  last_test_status  VARCHAR(10) CHECK (last_test_status IN ('ok','error')),
  last_test_message TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_integrations_tenant ON integrations(tenant_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- APPOINTMENTS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS appointments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID REFERENCES tenants(id) ON DELETE CASCADE,
  ticket_id         UUID REFERENCES tickets(id) ON DELETE SET NULL,
  contact_name      VARCHAR(255),
  contact_phone     VARCHAR(20),
  professional_id   UUID REFERENCES users(id) ON DELETE SET NULL,
  professional_name VARCHAR(255),
  service           VARCHAR(255),
  scheduled_at      TIMESTAMPTZ NOT NULL,
  duration_minutes  INT DEFAULT 30,
  status            VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('confirmed','pending','cancelled','completed')),
  created_by        VARCHAR(10) CHECK (created_by IN ('bot','agent','admin')),
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointments_tenant_date ON appointments(tenant_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_appointments_professional ON appointments(professional_id, scheduled_at);

-- ─────────────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE tenants      ENABLE ROW LEVEL SECURITY;
ALTER TABLE users        ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets      ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages     ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Helper: retorna o tenant_id do usuário logado
CREATE OR REPLACE FUNCTION get_my_tenant_id()
RETURNS UUID LANGUAGE sql STABLE AS $$
  SELECT tenant_id FROM users WHERE supabase_auth_id = auth.uid() LIMIT 1;
$$;

-- Policies: isolamento por tenant
CREATE POLICY "tenant_isolation_users"
  ON users FOR ALL
  USING (tenant_id = get_my_tenant_id());

CREATE POLICY "tenant_isolation_tickets"
  ON tickets FOR ALL
  USING (tenant_id = get_my_tenant_id());

CREATE POLICY "tenant_isolation_messages"
  ON messages FOR ALL
  USING (tenant_id = get_my_tenant_id());

CREATE POLICY "tenant_isolation_integrations"
  ON integrations FOR ALL
  USING (tenant_id = get_my_tenant_id());

CREATE POLICY "tenant_isolation_appointments"
  ON appointments FOR ALL
  USING (tenant_id = get_my_tenant_id());

-- Tenants: usuário vê apenas o seu próprio tenant
CREATE POLICY "own_tenant"
  ON tenants FOR ALL
  USING (id = get_my_tenant_id());

-- ─────────────────────────────────────────────────────────────────────────────
-- REALTIME — habilita publicação nas tabelas principais
-- ─────────────────────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE appointments;

-- ─────────────────────────────────────────────────────────────────────────────
-- FUNÇÃO: volume de tickets por hora (para gráfico do admin)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION tickets_by_hour(p_tenant_id UUID, p_date DATE)
RETURNS TABLE(hour INT, count BIGINT) LANGUAGE sql STABLE AS $$
  SELECT
    EXTRACT(HOUR FROM opened_at)::INT AS hour,
    COUNT(*) AS count
  FROM tickets
  WHERE tenant_id = p_tenant_id
    AND opened_at::DATE = p_date
  GROUP BY hour
  ORDER BY hour;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- DADOS SEED: tenant + admin padrão para desenvolvimento
-- Remova em produção ou use via supabase seed
-- ─────────────────────────────────────────────────────────────────────────────
-- INSERT INTO tenants (name, slug, plan)
-- VALUES ('Sirius Demo', 'sirius-demo', 'starter');
