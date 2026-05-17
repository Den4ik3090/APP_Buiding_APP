-- ============================================================
-- RLS for core business tables
-- Single-tenant deployment: all authenticated users = trusted staff
-- All tables get: SELECT/INSERT/UPDATE/DELETE for authenticated role
-- ============================================================

-- ── employees ────────────────────────────────────────────────
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "employees_select" ON employees;
DROP POLICY IF EXISTS "employees_insert" ON employees;
DROP POLICY IF EXISTS "employees_update" ON employees;
DROP POLICY IF EXISTS "employees_delete" ON employees;

CREATE POLICY "employees_select" ON employees
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "employees_insert" ON employees
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "employees_update" ON employees
  FOR UPDATE USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "employees_delete" ON employees
  FOR DELETE USING (auth.role() = 'authenticated');

-- ── permits ──────────────────────────────────────────────────
ALTER TABLE permits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "permits_select" ON permits;
DROP POLICY IF EXISTS "permits_insert" ON permits;
DROP POLICY IF EXISTS "permits_update" ON permits;
DROP POLICY IF EXISTS "permits_delete" ON permits;

CREATE POLICY "permits_select" ON permits
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "permits_insert" ON permits
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "permits_update" ON permits
  FOR UPDATE USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "permits_delete" ON permits
  FOR DELETE USING (auth.role() = 'authenticated');

-- ── orders ───────────────────────────────────────────────────
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orders_select" ON orders;
DROP POLICY IF EXISTS "orders_insert" ON orders;
DROP POLICY IF EXISTS "orders_update" ON orders;
DROP POLICY IF EXISTS "orders_delete" ON orders;

CREATE POLICY "orders_select" ON orders
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "orders_insert" ON orders
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "orders_update" ON orders
  FOR UPDATE USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "orders_delete" ON orders
  FOR DELETE USING (auth.role() = 'authenticated');

-- ── prescriptions ─────────────────────────────────────────────
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "prescriptions_select" ON prescriptions;
DROP POLICY IF EXISTS "prescriptions_insert" ON prescriptions;
DROP POLICY IF EXISTS "prescriptions_update" ON prescriptions;
DROP POLICY IF EXISTS "prescriptions_delete" ON prescriptions;

CREATE POLICY "prescriptions_select" ON prescriptions
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "prescriptions_insert" ON prescriptions
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "prescriptions_update" ON prescriptions
  FOR UPDATE USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "prescriptions_delete" ON prescriptions
  FOR DELETE USING (auth.role() = 'authenticated');

-- ── organization_docs ─────────────────────────────────────────
ALTER TABLE organization_docs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "organization_docs_select" ON organization_docs;
DROP POLICY IF EXISTS "organization_docs_insert" ON organization_docs;
DROP POLICY IF EXISTS "organization_docs_update" ON organization_docs;
DROP POLICY IF EXISTS "organization_docs_delete" ON organization_docs;

CREATE POLICY "organization_docs_select" ON organization_docs
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "organization_docs_insert" ON organization_docs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "organization_docs_update" ON organization_docs
  FOR UPDATE USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "organization_docs_delete" ON organization_docs
  FOR DELETE USING (auth.role() = 'authenticated');
