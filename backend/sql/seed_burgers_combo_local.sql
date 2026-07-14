UPDATE menu_items
SET
  price = 28,
  options = '[
    {"id":"sanduiche","label":"Só o sanduíche","price":28},
    {"id":"combo","label":"Combo (batata + refri lata)","price":38}
  ]'::jsonb
WHERE category = 'hamburgueres';
