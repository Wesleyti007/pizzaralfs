-- Catálogo compartilhado de molhos dos burgers (sessão única)

ALTER TABLE catalog_settings
  ADD COLUMN IF NOT EXISTS burger_sauces JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Seed a partir do Hoclaroma (produção), com IDs limpos
UPDATE catalog_settings
SET burger_sauces = '[
  {"id":"maionese-ralfs","label":"Maionese ralf''s","type":"sauce","price":3},
  {"id":"molho-ralfs","label":"Molho ralf''s","type":"sauce","price":3},
  {"id":"maionese-verde","label":"Maionese verde","type":"sauce","price":3},
  {"id":"maionese-bacon","label":"Maionese bacon","type":"sauce","price":3},
  {"id":"molho-cheddar","label":"Molho cheddar","type":"sauce","price":3}
]'::jsonb
WHERE id = 1
  AND (
    burger_sauces IS NULL
    OR jsonb_typeof(burger_sauces) <> 'array'
    OR jsonb_array_length(burger_sauces) = 0
  );

-- Remove molhos por item (type = sauce/molho) de todos os burgers
UPDATE menu_items
SET extras = COALESCE((
  SELECT jsonb_agg(elem)
  FROM jsonb_array_elements(COALESCE(extras, '[]'::jsonb)) AS elem
  WHERE lower(COALESCE(elem->>'type', '')) NOT IN ('sauce', 'molho')
), '[]'::jsonb)
WHERE category IN ('hamburgueres', 'burgers', 'hamburguer');

-- Remove labels de molho que estavam cadastrados como add (evita duplicar o catálogo)
UPDATE menu_items
SET extras = COALESCE((
  SELECT jsonb_agg(elem)
  FROM jsonb_array_elements(COALESCE(extras, '[]'::jsonb)) AS elem
  WHERE NOT (
    lower(COALESCE(elem->>'label', '')) ~* 'molho cheddar'
    OR lower(COALESCE(elem->>'label', '')) ~* 'molho ralf'
    OR lower(COALESCE(elem->>'label', '')) ~* 'maionese verde'
    OR lower(COALESCE(elem->>'label', '')) ~* 'maionese ralf'
    OR lower(COALESCE(elem->>'label', '')) ~* 'maionese bacon'
    OR lower(COALESCE(elem->>'label', '')) ~* '^molho verde$'
    OR lower(COALESCE(elem->>'label', '')) ~* '^barbecue$'
  )
), '[]'::jsonb)
WHERE category IN ('hamburgueres', 'burgers', 'hamburguer');
