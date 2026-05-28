-- Migracao: categorias flexiveis + subcategorias nos produtos
-- Rode: psql -U postgres -d pizzaralfs -f sql/migrate_categories.sql

CREATE TABLE IF NOT EXISTS catalog_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  categories JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS subcategory TEXT NOT NULL DEFAULT '';

ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS subcategory TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_menu_items_subcategory ON menu_items(category, subcategory);

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
