ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS options JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE menu_items
SET options = '[
  {"id":"coca-cola","label":"Coca-Cola"},
  {"id":"guarana","label":"Guaraná Antarctica"},
  {"id":"fanta-laranja","label":"Fanta Laranja"},
  {"id":"sprite","label":"Sprite"},
  {"id":"schweppes","label":"Schweppes"}
]'::jsonb
WHERE name = 'Refrigerante Lata'
  AND (options IS NULL OR options = '[]'::jsonb);
