-- Corrige rótulos Salgadas / Doces na categoria Calzone (sem recriar itens).
-- Uso: psql ... -f backend/sql/fix_calzone_subcategories.sql

BEGIN;

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

  UPDATE catalog_settings
  SET categories = filtered,
      updated_at = NOW()
  WHERE id = 1;
END $$;

UPDATE menu_items
SET subcategory = 'salgadas'
WHERE lower(trim(category)) = 'calzone'
  AND subcategory IN ('salgados', 'salgado', 'Salgados');

UPDATE menu_items
SET subcategory = 'doces'
WHERE lower(trim(category)) = 'calzone'
  AND subcategory IN ('doce', 'Doce')
  AND subcategory <> 'doces';

COMMIT;

SELECT subcategory, COUNT(*) AS itens
FROM menu_items
WHERE lower(trim(category)) = 'calzone'
GROUP BY subcategory
ORDER BY subcategory;
