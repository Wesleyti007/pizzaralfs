UPDATE catalog_settings
SET categories = CASE
  WHEN categories::text LIKE '%hamburgueres%' THEN categories
  ELSE categories || '[{"id":"hamburgueres","label":"Burgers","subcategories":[],"minOrderQty":1}]'::jsonb
END
WHERE id = 1;

DELETE FROM menu_items
WHERE category = 'hamburgueres'
  AND name IN (
    'Smash Duplo Salada',
    'Ralf''s Clássico',
    'Ralf''s Bacon',
    'Ralf''s Chicken',
    'Ralf''s Gorgonzola',
    'Ralf''s Burger',
    'Ralf''s Nordestino',
    'Master Ralf''s',
    'Duplo Hoclaroma'
  );

INSERT INTO menu_items (category, subcategory, name, description, price, sizes, options, extras, is_active)
VALUES
(
  'hamburgueres', '',
  'Smash Duplo Salada',
  'Pão Brioche, 2 smash 100g, Queijo, Alface, Tomate, Picles, Maionese da casa',
  28, '[]'::jsonb,
  '[{"id":"sanduiche","label":"Só o sanduíche","price":28},{"id":"combo","label":"Combo (batata + refri lata)","price":38}]'::jsonb,
  '[{"id":"molho-verde","label":"Molho verde","type":"sauce","price":3},{"id":"barbecue","label":"Barbecue","type":"sauce","price":3},{"id":"bacon-extra","label":"Bacon extra","type":"add","price":5},{"id":"sem-picles","label":"Picles","type":"remove","price":0}]'::jsonb,
  TRUE
),
(
  'hamburgueres', '',
  'Ralf''s Clássico',
  '2 smash 100g, Queijo, Bacon, Maionese da casa, Picles, cebola caramelizada',
  28, '[]'::jsonb,
  '[{"id":"sanduiche","label":"Só o sanduíche","price":28},{"id":"combo","label":"Combo (batata + refri lata)","price":38}]'::jsonb,
  '[{"id":"molho-verde","label":"Molho verde","type":"sauce","price":3},{"id":"barbecue","label":"Barbecue","type":"sauce","price":3},{"id":"queijo-extra","label":"Queijo extra","type":"add","price":4},{"id":"sem-cebola","label":"Cebola caramelizada","type":"remove","price":0}]'::jsonb,
  TRUE
),
(
  'hamburgueres', '',
  'Ralf''s Bacon',
  'Pão Brioche, Queijo, Bacon, Maionese da casa, Picles, cebola caramelizada',
  28, '[]'::jsonb,
  '[{"id":"sanduiche","label":"Só o sanduíche","price":28},{"id":"combo","label":"Combo (batata + refri lata)","price":38}]'::jsonb,
  '[{"id":"molho-verde","label":"Molho verde","type":"sauce","price":3},{"id":"barbecue","label":"Barbecue","type":"sauce","price":3},{"id":"bacon-extra","label":"Bacon extra","type":"add","price":5},{"id":"sem-picles","label":"Picles","type":"remove","price":0}]'::jsonb,
  TRUE
),
(
  'hamburgueres', '',
  'Ralf''s Chicken',
  'Pão Brioche, Queijo, Maionese da casa, Frango Empanado, Tomate, Alface, Picles',
  28, '[]'::jsonb,
  '[{"id":"sanduiche","label":"Só o sanduíche","price":28},{"id":"combo","label":"Combo (batata + refri lata)","price":38}]'::jsonb,
  '[{"id":"molho-verde","label":"Molho verde","type":"sauce","price":3},{"id":"barbecue","label":"Barbecue","type":"sauce","price":3},{"id":"bacon-extra","label":"Bacon extra","type":"add","price":5}]'::jsonb,
  TRUE
),
(
  'hamburgueres', '',
  'Ralf''s Gorgonzola',
  'Pão Brioche, 2 smash 100g, cebola caramelizada, Picles, Maionese da casa, Creme de gorgonzola',
  28, '[]'::jsonb,
  '[{"id":"sanduiche","label":"Só o sanduíche","price":28},{"id":"combo","label":"Combo (batata + refri lata)","price":38}]'::jsonb,
  '[{"id":"molho-verde","label":"Molho verde","type":"sauce","price":3},{"id":"barbecue","label":"Barbecue","type":"sauce","price":3},{"id":"bacon-extra","label":"Bacon extra","type":"add","price":5}]'::jsonb,
  TRUE
),
(
  'hamburgueres', '',
  'Ralf''s Burger',
  'Pão Brioche, 2 smash 100g, Queijo, Maionese da casa',
  28, '[]'::jsonb,
  '[{"id":"sanduiche","label":"Só o sanduíche","price":28},{"id":"combo","label":"Combo (batata + refri lata)","price":38}]'::jsonb,
  '[{"id":"molho-verde","label":"Molho verde","type":"sauce","price":3},{"id":"barbecue","label":"Barbecue","type":"sauce","price":3},{"id":"bacon-extra","label":"Bacon extra","type":"add","price":5},{"id":"queijo-extra","label":"Queijo extra","type":"add","price":4}]'::jsonb,
  TRUE
),
(
  'hamburgueres', '',
  'Ralf''s Nordestino',
  'Pão Brioche, 2 smash 100g, Queijo Coalho, melaço, cebola roxa, tomate, alface',
  28, '[]'::jsonb,
  '[{"id":"sanduiche","label":"Só o sanduíche","price":28},{"id":"combo","label":"Combo (batata + refri lata)","price":38}]'::jsonb,
  '[{"id":"molho-verde","label":"Molho verde","type":"sauce","price":3},{"id":"barbecue","label":"Barbecue","type":"sauce","price":3},{"id":"bacon-extra","label":"Bacon extra","type":"add","price":5}]'::jsonb,
  TRUE
),
(
  'hamburgueres', '',
  'Master Ralf''s',
  'Pão Brioche, 4 smash 100g, Queijo, Bacon, cebola caramelizada, picles, maionese da casa, cheddar original',
  28, '[]'::jsonb,
  '[{"id":"sanduiche","label":"Só o sanduíche","price":28},{"id":"combo","label":"Combo (batata + refri lata)","price":38}]'::jsonb,
  '[{"id":"molho-verde","label":"Molho verde","type":"sauce","price":3},{"id":"barbecue","label":"Barbecue","type":"sauce","price":3},{"id":"bacon-extra","label":"Bacon extra","type":"add","price":5},{"id":"sem-picles","label":"Picles","type":"remove","price":0}]'::jsonb,
  TRUE
),
(
  'hamburgueres', '',
  'Duplo Hoclaroma',
  'Pão Brioche, 2 smash 100g, Picles, Queijo, cebola roxa, cheddar, bacon, maionese da casa',
  28, '[]'::jsonb,
  '[{"id":"sanduiche","label":"Só o sanduíche","price":28},{"id":"combo","label":"Combo (batata + refri lata)","price":38}]'::jsonb,
  '[{"id":"molho-verde","label":"Molho verde","type":"sauce","price":3},{"id":"barbecue","label":"Barbecue","type":"sauce","price":3},{"id":"bacon-extra","label":"Bacon extra","type":"add","price":5},{"id":"sem-cebola-roxa","label":"Cebola roxa","type":"remove","price":0}]'::jsonb,
  TRUE
);
