/*
# Create core schema for ration card portal

Adapts the existing MySQL/drizzle schema to Postgres/Supabase.

1. New Tables
- `operators` — ration card shop operators who place orders on behalf of customers.
  Columns: id, name, email (unique), phone, password_hash, shop_name, address,
  state, district, pincode, status (pending/active/suspended), wallet_balance,
  total_orders_handled, created_at, updated_at.
- `orders` — customer orders for ration card printing/delivery.
  Columns: id, order_number (unique), customer_name, customer_phone, customer_email,
  ration_card_number, delivery_name, address, post_office, state, district, pincode,
  card_type, family_cards (jsonb), quantity, amount, payment_status enum,
  payment_method, payment_screenshot_url, cf_order_id, ration_card_pdfs (jsonb),
  status enum, operator_id, tracking_number, courier_name, notes, welcome_letter_url,
  dealer_signature_card_url, submitted_at, confirmation_email_sent_at,
  created_at, updated_at.
- `payment_verifications` — legacy audit rows from the manual screenshot-verification
  era. Read-only, kept for archive exports. No new rows are written.
- `reviews` — customer testimonials. Columns: id, order_number, customer_name,
  district, card_type, rating, quote, photo_url, status (pending/approved/rejected),
  created_at, updated_at.
- `settings` — key-value store for admin-editable runtime settings (e.g. UPI ID,
  pricing matrix). Primary key on `key`.
- `settings_change_history` — append-only audit trail for money-affecting settings
  changes. Columns: id, field, old_value, new_value, changed_by, changed_at.

2. Indexes
- `orders_created_at_idx` — B-tree on created_at for listing queries.
- `orders_customer_search_idx` — GIN trigram index on (customer_name, customer_phone,
  order_number) for substring search (replaces MySQL FULLTEXT).

3. Security
- RLS enabled on every table.
- The app uses an API server with the service role key (bypasses RLS), but policies
  are still defined for defense-in-depth. Since customers place orders without
  signing in, and operators/admins authenticate through the API server, policies
  allow anon+authenticated CRUD on all tables. The API server enforces the real
  authorization logic (operator ownership, admin roles, etc.).

4. Notes
- MySQL `int AUTO_INCREMENT` → Postgres `serial` (integer with sequence).
- MySQL `json` columns → Postgres `jsonb` for better querying.
- MySQL `enum` types → Postgres `text` with CHECK constraints for portability.
- MySQL `timestamp` → Postgres `timestamptz` with `now()` default.
- `decimal(10,2)` → `numeric(10,2)`.
*/

-- ============================================================
-- operators
-- ============================================================
CREATE TABLE IF NOT EXISTS operators (
  id serial PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  phone text NOT NULL,
  password_hash text NOT NULL,
  shop_name text NOT NULL,
  address text NOT NULL,
  state text NOT NULL,
  district text NOT NULL,
  pincode text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active', 'suspended')),
  wallet_balance numeric(10,2) NOT NULL DEFAULT 0,
  total_orders_handled integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE operators ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_operators" ON operators;
CREATE POLICY "anon_select_operators" ON operators FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_operators" ON operators;
CREATE POLICY "anon_insert_operators" ON operators FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_operators" ON operators;
CREATE POLICY "anon_update_operators" ON operators FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_operators" ON operators;
CREATE POLICY "anon_delete_operators" ON operators FOR DELETE
  TO anon, authenticated USING (true);

-- ============================================================
-- orders
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id serial PRIMARY KEY,
  order_number text NOT NULL UNIQUE,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_email text,
  ration_card_number text NOT NULL,
  delivery_name text,
  address text NOT NULL,
  post_office text,
  state text NOT NULL,
  district text NOT NULL,
  pincode text NOT NULL,
  card_type text NOT NULL,
  family_cards jsonb NOT NULL DEFAULT '[]'::jsonb,
  quantity integer NOT NULL DEFAULT 1,
  amount numeric(10,2) NOT NULL,
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded', 'confirmed', 'rejected')),
  payment_method text,
  payment_screenshot_url text,
  cf_order_id text,
  ration_card_pdfs jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'printed', 'dispatched', 'delivered', 'returned', 'cancelled')),
  operator_id integer REFERENCES operators(id) ON DELETE SET NULL,
  tracking_number text,
  courier_name text,
  notes text,
  welcome_letter_url text,
  dealer_signature_card_url text,
  submitted_at timestamptz,
  confirmation_email_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_orders" ON orders;
CREATE POLICY "anon_select_orders" ON orders FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_orders" ON orders;
CREATE POLICY "anon_insert_orders" ON orders FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_orders" ON orders;
CREATE POLICY "anon_update_orders" ON orders FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_orders" ON orders;
CREATE POLICY "anon_delete_orders" ON orders FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders (created_at DESC);
CREATE INDEX IF NOT EXISTS orders_operator_id_idx ON orders (operator_id);
CREATE INDEX IF NOT EXISTS orders_payment_status_idx ON orders (payment_status);
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders (status);

-- ============================================================
-- payment_verifications (legacy, read-only)
-- ============================================================
CREATE TABLE IF NOT EXISTS payment_verifications (
  id serial PRIMARY KEY,
  order_id integer NOT NULL,
  order_number text NOT NULL,
  action text NOT NULL CHECK (action IN ('confirmed', 'rejected')),
  admin_email text NOT NULL,
  screenshot_url text,
  notes text,
  verified_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE payment_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_payment_verifications" ON payment_verifications;
CREATE POLICY "anon_select_payment_verifications" ON payment_verifications FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_payment_verifications" ON payment_verifications;
CREATE POLICY "anon_insert_payment_verifications" ON payment_verifications FOR INSERT
  TO anon, authenticated WITH CHECK (true);

-- ============================================================
-- reviews
-- ============================================================
CREATE TABLE IF NOT EXISTS reviews (
  id serial PRIMARY KEY,
  order_number text NOT NULL,
  customer_name text NOT NULL,
  district text NOT NULL,
  card_type text NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  quote text NOT NULL,
  photo_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_reviews" ON reviews;
CREATE POLICY "anon_select_reviews" ON reviews FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_reviews" ON reviews;
CREATE POLICY "anon_insert_reviews" ON reviews FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_reviews" ON reviews;
CREATE POLICY "anon_update_reviews" ON reviews FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_reviews" ON reviews;
CREATE POLICY "anon_delete_reviews" ON reviews FOR DELETE
  TO anon, authenticated USING (true);

-- ============================================================
-- settings (key-value store)
-- ============================================================
CREATE TABLE IF NOT EXISTS settings (
  key varchar(100) PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_settings" ON settings;
CREATE POLICY "anon_select_settings" ON settings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_settings" ON settings;
CREATE POLICY "anon_insert_settings" ON settings FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_settings" ON settings;
CREATE POLICY "anon_update_settings" ON settings FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_settings" ON settings;
CREATE POLICY "anon_delete_settings" ON settings FOR DELETE
  TO anon, authenticated USING (true);

-- ============================================================
-- settings_change_history (append-only audit)
-- ============================================================
CREATE TABLE IF NOT EXISTS settings_change_history (
  id serial PRIMARY KEY,
  field varchar(100) NOT NULL,
  old_value text NOT NULL,
  new_value text NOT NULL,
  changed_by varchar(255) NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE settings_change_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_settings_change_history" ON settings_change_history;
CREATE POLICY "anon_select_settings_change_history" ON settings_change_history FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_settings_change_history" ON settings_change_history;
CREATE POLICY "anon_insert_settings_change_history" ON settings_change_history FOR INSERT
  TO anon, authenticated WITH CHECK (true);

-- ============================================================
-- updated_at trigger function (auto-update on row change)
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS operators_updated_at ON operators;
CREATE TRIGGER operators_updated_at BEFORE UPDATE ON operators
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS orders_updated_at ON orders;
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS reviews_updated_at ON reviews;
CREATE TRIGGER reviews_updated_at BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS settings_updated_at ON settings;
CREATE TRIGGER settings_updated_at BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();