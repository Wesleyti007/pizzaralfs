-- Gera itens de Calzone a partir das pizzas ativas.
-- Preferível (local ou produção + foto):
--   ./scripts/seed-calzone.sh
--   ./scripts/seed-calzone.sh --production
--
-- Regras:
--   - Categoria calzone (label Calzone) com subcategorias: salgadas, doces
--   - Um item por sabor de pizza (mesmo nome)
--   - Tamanhos: Pequeno R$ 17, Grande R$ 24 (sabor único)
--   - Doces: subcategoria doces nas pizzas ou nome com indício de doce

BEGIN;

-- Garante categoria Calzone no cardápio (mantém as demais categorias)
DO $$
DECLARE
  cats jsonb;
  filtered jsonb := '[]'::jsonb;
  elem jsonb;
  calzone_id text := 'calzone';
  calzone jsonb;
BEGIN
  SELECT categories INTO cats FROM catalog_settings WHERE id = 1;

  IF cats IS NULL THEN
    cats := '[]'::jsonb;
  END IF;

  SELECT cat_elem->>'id'
  INTO calzone_id
  FROM jsonb_array_elements(cats) AS cat_elem
  WHERE lower(trim(cat_elem->>'id')) = 'calzone'
  LIMIT 1;

  IF calzone_id IS NULL OR trim(calzone_id) = '' THEN
    calzone_id := 'calzone';
  END IF;

  calzone := jsonb_build_object(
    'id', calzone_id,
    'label', 'Calzone',
    'minOrderQty', 1,
    'subcategories', jsonb_build_array(
      jsonb_build_object('id', 'salgadas', 'label', 'Salgadas', 'minOrderQty', 1),
      jsonb_build_object('id', 'doces', 'label', 'Doces', 'minOrderQty', 1)
    )
  );

  FOR elem IN SELECT value FROM jsonb_array_elements(cats)
  LOOP
    IF lower(trim(elem->>'id')) IS DISTINCT FROM 'calzone' THEN
      filtered := filtered || jsonb_build_array(elem);
    END IF;
  END LOOP;

  filtered := filtered || jsonb_build_array(calzone);

  INSERT INTO catalog_settings (id, categories, updated_at)
  VALUES (1, filtered, NOW())
  ON CONFLICT (id) DO UPDATE
  SET categories = EXCLUDED.categories,
      updated_at = NOW();
END $$;

-- Remove calzones antigos para poder rodar o script de novo
DELETE FROM menu_items WHERE lower(trim(category)) = 'calzone';

-- Cria calzones espelhando pizzas ativas
INSERT INTO menu_items (
  category,
  subcategory,
  name,
  description,
  price,
  delivery_price,
  sizes,
  options,
  image_base64,
  is_active,
  min_order_qty
)
SELECT
  COALESCE(
    (SELECT c->>'id'
     FROM catalog_settings cs,
          jsonb_array_elements(cs.categories) AS c
     WHERE lower(trim(c->>'id')) = 'calzone'
     LIMIT 1),
    'calzone'
  ),
  CASE
    WHEN p.subcategory IN ('doces', 'doce')
      OR lower(COALESCE(p.subcategory, '')) LIKE '%doce%'
      OR lower(p.name) LIKE '%chocolate%'
      OR lower(p.name) LIKE '%brigadeiro%'
      OR lower(p.name) LIKE '%nutella%'
      OR lower(p.name) LIKE '%romeu%'
      OR lower(p.name) LIKE '%prestígio%'
      OR lower(p.name) LIKE '%prestigio%'
      OR lower(p.name) LIKE '%banana%'
      OR lower(p.name) LIKE '%doce%'
    THEN 'doces'
    ELSE 'salgadas'
  END AS subcategory,
  p.name,
  COALESCE(
    NULLIF(trim(p.description), ''),
    'Calzone ' || p.name || '. Tamanhos: Pequeno ou Grande (1 sabor).'
  ) AS description,
  17::numeric AS price,
  NULL::numeric AS delivery_price,
  jsonb_build_array(
    jsonb_build_object('id', 'pequeno', 'label', 'Pequeno', 'pieces', 1, 'price', 17),
    jsonb_build_object('id', 'grande', 'label', 'Grande', 'pieces', 1, 'price', 24)
  ) AS sizes,
  '[]'::jsonb AS options,
  '' AS image_base64,
  COALESCE(p.is_active, true) AS is_active,
  1 AS min_order_qty
FROM menu_items p
WHERE p.category = 'pizzas'
  AND COALESCE(p.is_active, true) = true
ORDER BY p.name;

COMMIT;

-- Conferência
SELECT subcategory, COUNT(*) AS itens
FROM menu_items
WHERE lower(trim(category)) = 'calzone'
GROUP BY subcategory
ORDER BY subcategory;

SELECT id, subcategory, name, price, sizes
FROM menu_items
WHERE lower(trim(category)) = 'calzone'
ORDER BY subcategory, name
LIMIT 20;
