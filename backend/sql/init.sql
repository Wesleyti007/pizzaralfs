CREATE TABLE IF NOT EXISTS orders (
  id BIGSERIAL PRIMARY KEY,
  table_number INTEGER,
  order_type TEXT NOT NULL DEFAULT 'table',
  customer_name TEXT NOT NULL DEFAULT '',
  customer_phone TEXT NOT NULL DEFAULT '',
  delivery_address TEXT NOT NULL DEFAULT '',
  delivery_reference TEXT NOT NULL DEFAULT '',
  customer_cep TEXT NOT NULL DEFAULT '',
  delivery_distance_km NUMERIC(8,2),
  items_subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  observation TEXT DEFAULT '',
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS catalog_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  categories JSONB NOT NULL DEFAULT '[]'::jsonb,
  delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  establishment_cep TEXT NOT NULL DEFAULT '',
  establishment_street TEXT NOT NULL DEFAULT '',
  establishment_number TEXT NOT NULL DEFAULT '',
  establishment_neighborhood TEXT NOT NULL DEFAULT '',
  establishment_city TEXT NOT NULL DEFAULT '',
  establishment_state TEXT NOT NULL DEFAULT '',
  delivery_price_per_km NUMERIC(10,2) NOT NULL DEFAULT 0,
  orders_open BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS menu_items (
  id BIGSERIAL PRIMARY KEY,
  category TEXT NOT NULL DEFAULT 'pizzas',
  subcategory TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  delivery_price NUMERIC(10,2),
  sizes JSONB NOT NULL DEFAULT '[]'::jsonb,
  image_base64 TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  item_id BIGINT,
  item_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'pizzas',
  subcategory TEXT NOT NULL DEFAULT '',
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  size_id TEXT NOT NULL DEFAULT '',
  size_label TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category);
CREATE INDEX IF NOT EXISTS idx_menu_items_active ON menu_items(is_active);
CREATE INDEX IF NOT EXISTS idx_menu_items_subcategory ON menu_items(category, subcategory);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

INSERT INTO catalog_settings (id, categories)
VALUES (
  1,
  '[
    {"id":"pizzas","label":"Pizzas","subcategories":[
      {"id":"doces","label":"Pizza Doces"},
      {"id":"promocionais","label":"Pizza Promocionais"},
      {"id":"premium","label":"Pizzas Premium"}
    ]},
    {"id":"esfirras","label":"Esfirras","subcategories":[]},
    {"id":"coxinhas","label":"Coxinhas","subcategories":[]},
    {"id":"bebidas","label":"Bebidas","subcategories":[]},
    {"id":"sobremesas","label":"Sobremesas","subcategories":[]}
  ]'::jsonb
)
ON CONFLICT (id) DO NOTHING;

