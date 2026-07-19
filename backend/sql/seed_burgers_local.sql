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
    'Ralf''s Smash Duplo Salada',
    'Ralf''s Clássico',
    'Ralf''s Bacon',
    'Ralf''s Chicken',
    'Ralf''s Gorgonzola',
    'Ralf''s Burger',
    'Ralf''s Nordestino',
    'Master Ralf''s',
    'Ralf''s Monster',
    'Duplo Hoclaroma',
    'Ralf''s Hoclaroma',
    'Ralf`s Hoclaroma'
  );

INSERT INTO menu_items (category, subcategory, name, description, price, sizes, options, extras, is_active)
VALUES
(
  'hamburgueres', '',
  'Ralf''s Smash Duplo Salada',
  'Pão Brioche, 2 smash 100g, Queijo, Alface, Tomate, Picles, Maionese da casa, Molho Ralf''s',
  22, '[]'::jsonb,
  '[{"id":"burguer","label":"Burguer","price":22},{"id":"combo","label":"Combo (+ batata + refri)","price":30}]'::jsonb,
  '[{"id":"cebola-caramelizada-add","label":"Cebola Caramelizada","type":"add","price":3},{"id":"smash-100-gramas-add","label":"Smash 100 Gramas","type":"add","price":5},{"id":"batata-frita-250-gramas-add","label":"Batata Frita 250 Gramas","type":"add","price":14},{"id":"nuggets-add","label":"Nuggets","type":"add","price":12}]'::jsonb,
  TRUE
),
(
  'hamburgueres', '',
  'Ralf''s Clássico',
  'Pão Brioche, 2 smash 100g, Queijo, Bacon, Maionese da casa, Picles, cebola caramelizada, Molho Ralf''s, Ketchup, Mostarda',
  20, '[]'::jsonb,
  '[{"id":"burguer","label":"Burguer","price":20},{"id":"combo","label":"Combo (+ batata + refri)","price":28}]'::jsonb,
  '[{"id":"cebola-caramelizada-add","label":"Cebola Caramelizada","type":"add","price":3},{"id":"smash-100-gramas-add","label":"Smash 100 Gramas","type":"add","price":5},{"id":"batata-frita-250-gramas-add","label":"Batata Frita 250 Gramas","type":"add","price":14},{"id":"nuggets-add","label":"Nuggets","type":"add","price":12}]'::jsonb,
  TRUE
),
(
  'hamburgueres', '',
  'Ralf''s Bacon',
  'Pão Brioche, Queijo, Bacon, Maionese da casa, Picles, cebola caramelizada, Molho Ralf''s, Ketchup, Mostarda',
  21, '[]'::jsonb,
  '[{"id":"burguer","label":"Burguer","price":21},{"id":"combo","label":"Combo (+ batata + refri)","price":29}]'::jsonb,
  '[{"id":"cebola-caramelizada-add","label":"Cebola Caramelizada","type":"add","price":3},{"id":"smash-100-gramas-add","label":"Smash 100 Gramas","type":"add","price":5},{"id":"batata-frita-250-gramas-add","label":"Batata Frita 250 Gramas","type":"add","price":14},{"id":"nuggets-add","label":"Nuggets","type":"add","price":12}]'::jsonb,
  TRUE
),
(
  'hamburgueres', '',
  'Ralf''s Chicken',
  'Pão Brioche, Queijo, Maionese da casa, Frango Empanado, Tomate, Alface, Picles, Molho Ralf''s',
  18, '[]'::jsonb,
  '[{"id":"burguer","label":"Burguer","price":18},{"id":"combo","label":"Combo (+ batata + refri)","price":26}]'::jsonb,
  '[{"id":"cebola-caramelizada-add","label":"Cebola Caramelizada","type":"add","price":3},{"id":"smash-100-gramas-add","label":"Smash 100 Gramas","type":"add","price":5},{"id":"batata-frita-250-gramas-add","label":"Batata Frita 250 Gramas","type":"add","price":14},{"id":"nuggets-add","label":"Nuggets","type":"add","price":12}]'::jsonb,
  TRUE
),
(
  'hamburgueres', '',
  'Ralf''s Gorgonzola',
  'Pão Brioche, 2 smash 100g, cebola caramelizada, Picles, Maionese da casa, Creme de gorgonzola, Molho Ralf''s',
  24, '[]'::jsonb,
  '[{"id":"burguer","label":"Burguer","price":24},{"id":"combo","label":"Combo (+ batata + refri)","price":32}]'::jsonb,
  '[{"id":"cebola-caramelizada-add","label":"Cebola Caramelizada","type":"add","price":3},{"id":"smash-100-gramas-add","label":"Smash 100 Gramas","type":"add","price":5},{"id":"batata-frita-250-gramas-add","label":"Batata Frita 250 Gramas","type":"add","price":14},{"id":"nuggets-add","label":"Nuggets","type":"add","price":12}]'::jsonb,
  TRUE
),
(
  'hamburgueres', '',
  'Ralf''s Burger',
  'Pão Brioche, 2 smash 100g, Queijo, Maionese da casa, Molho Ralf''s',
  19, '[]'::jsonb,
  '[{"id":"burguer","label":"Burguer","price":19},{"id":"combo","label":"Combo (+ batata + refri)","price":27}]'::jsonb,
  '[{"id":"cebola-caramelizada-add","label":"Cebola Caramelizada","type":"add","price":3},{"id":"smash-100-gramas-add","label":"Smash 100 Gramas","type":"add","price":5},{"id":"batata-frita-250-gramas-add","label":"Batata Frita 250 Gramas","type":"add","price":14},{"id":"nuggets-add","label":"Nuggets","type":"add","price":12}]'::jsonb,
  TRUE
),
(
  'hamburgueres', '',
  'Ralf''s Nordestino',
  'Pão Brioche, 2 smash 100g, Queijo Coalho, melaço, cebola roxa, tomate, alface, Molho Ralf''s',
  23, '[]'::jsonb,
  '[{"id":"burguer","label":"Burguer","price":23},{"id":"combo","label":"Combo (+ batata + refri)","price":31}]'::jsonb,
  '[{"id":"cebola-caramelizada-add","label":"Cebola Caramelizada","type":"add","price":3},{"id":"smash-100-gramas-add","label":"Smash 100 Gramas","type":"add","price":5},{"id":"batata-frita-250-gramas-add","label":"Batata Frita 250 Gramas","type":"add","price":14},{"id":"nuggets-add","label":"Nuggets","type":"add","price":12}]'::jsonb,
  TRUE
),
(
  'hamburgueres', '',
  'Ralf''s Monster',
  'Pão Brioche, 4 smash 100g, Queijo, Bacon, cebola caramelizada, picles, maionese da casa, Ketchup original, Molho Ralf''s, Ketchup, Mostarda',
  34, '[]'::jsonb,
  '[{"id":"burguer","label":"Burguer","price":34},{"id":"combo","label":"Combo (+ batata + refri)","price":42}]'::jsonb,
  '[{"id":"cebola-caramelizada-add","label":"Cebola Caramelizada","type":"add","price":3},{"id":"smash-100-gramas-add","label":"Smash 100 Gramas","type":"add","price":5},{"id":"batata-frita-250-gramas-add","label":"Batata Frita 250 Gramas","type":"add","price":14},{"id":"nuggets-add","label":"Nuggets","type":"add","price":12}]'::jsonb,
  TRUE
),
(
  'hamburgueres', '',
  'Ralf''s Hoclaroma',
  'Pão Brioche, 2 smash 100g, Picles, Queijo, cebola roxa, cheddar, bacon, maionese da casa, Molho Ralf''s',
  24, '[]'::jsonb,
  '[{"id":"burguer","label":"Burguer","price":24},{"id":"combo","label":"Combo (+ batata + refri)","price":32}]'::jsonb,
  '[{"id":"cebola-caramelizada-add","label":"Cebola Caramelizada","type":"add","price":3},{"id":"smash-100-gramas-add","label":"Smash 100 Gramas","type":"add","price":5},{"id":"batata-frita-250-gramas-add","label":"Batata Frita 250 Gramas","type":"add","price":14},{"id":"nuggets-add","label":"Nuggets","type":"add","price":12}]'::jsonb,
  TRUE
);
