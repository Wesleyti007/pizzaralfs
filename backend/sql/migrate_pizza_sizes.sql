-- Tamanhos de pizza (Broto, Media, Grande) com precos por tamanho

ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS sizes JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS size_id TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS size_label TEXT NOT NULL DEFAULT '';

-- Pizzas existentes: copia o preco atual para os 3 tamanhos (ajuste depois no admin)
UPDATE menu_items
SET sizes = jsonb_build_array(
  jsonb_build_object('id', 'broto', 'label', 'Broto', 'pieces', 4, 'price', price),
  jsonb_build_object('id', 'media', 'label', 'Media', 'pieces', 6, 'price', price),
  jsonb_build_object('id', 'grande', 'label', 'Grande', 'pieces', 8, 'price', price)
)
WHERE category = 'pizzas'
  AND (sizes IS NULL OR sizes = '[]'::jsonb);
