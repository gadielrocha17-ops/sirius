-- Migration 002: Permissions & Items tables

-- ==========================================
-- PERMISSION PROFILES
-- ==========================================
CREATE TABLE IF NOT EXISTS permission_profiles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  permissions JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE permission_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_pp" ON permission_profiles
  USING (tenant_id = get_my_tenant_id());

CREATE INDEX IF NOT EXISTS idx_pp_tenant ON permission_profiles(tenant_id);

-- ==========================================
-- ITEMS / PRODUCTS
-- ==========================================
CREATE TABLE IF NOT EXISTS items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  price       NUMERIC(12,2) NOT NULL DEFAULT 0,
  quantity    INTEGER NOT NULL DEFAULT 0,
  unit        TEXT NOT NULL DEFAULT 'un',
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_items" ON items
  USING (tenant_id = get_my_tenant_id());

CREATE INDEX IF NOT EXISTS idx_items_tenant ON items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_items_active ON items(tenant_id, active);

-- ==========================================
-- ITEM MOVEMENTS (stock history)
-- ==========================================
CREATE TABLE IF NOT EXISTS item_movements (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id          UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  quantity_change  INTEGER NOT NULL,  -- positive = entrada, negative = baixa
  reason           TEXT,
  created_by       UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE item_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_movements" ON item_movements
  USING (tenant_id = get_my_tenant_id());

CREATE INDEX IF NOT EXISTS idx_movements_item ON item_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_movements_tenant ON item_movements(tenant_id);

-- updated_at trigger for items
CREATE OR REPLACE FUNCTION update_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS items_updated_at ON items;
CREATE TRIGGER items_updated_at
  BEFORE UPDATE ON items
  FOR EACH ROW EXECUTE FUNCTION update_items_updated_at();
