-- Sincroniza burgers com o cardápio impresso (ralfs-burgers-menu-a4.png):
-- nomes, descrições (ingredientes), preços e opções Burguer/Combo.

-- 1) Ralf's Smash Duplo Salada
UPDATE menu_items
SET
  name = 'Ralf''s Smash Duplo Salada',
  description = 'Pão Brioche, 2 smash 100g, Queijo, Alface, Tomate, Picles, Maionese da casa, Molho Ralf''s',
  price = 22,
  options = '[{"id":"burguer","label":"Burguer","price":22},{"id":"combo","label":"Combo (+ batata + refri)","price":30}]'::jsonb
WHERE category IN ('hamburgueres', 'burgers', 'hamburguer')
  AND (
    id = 182
    OR name ILIKE '%Smash Duplo Salada%'
  );

-- 2) Ralf's Clássico
UPDATE menu_items
SET
  name = 'Ralf''s Clássico',
  description = 'Pão Brioche, 2 smash 100g, Queijo, Bacon, Maionese da casa, Picles, cebola caramelizada, Molho Ralf''s, Ketchup, Mostarda',
  price = 20,
  options = '[{"id":"burguer","label":"Burguer","price":20},{"id":"combo","label":"Combo (+ batata + refri)","price":28}]'::jsonb
WHERE category IN ('hamburgueres', 'burgers', 'hamburguer')
  AND (
    id = 183
    OR name ILIKE '%Clássico%'
    OR name ILIKE '%Classico%'
  );

-- 3) Ralf's Bacon
UPDATE menu_items
SET
  name = 'Ralf''s Bacon',
  description = 'Pão Brioche, Queijo, Bacon, Maionese da casa, Picles, cebola caramelizada, Molho Ralf''s, Ketchup, Mostarda',
  price = 21,
  options = '[{"id":"burguer","label":"Burguer","price":21},{"id":"combo","label":"Combo (+ batata + refri)","price":29}]'::jsonb
WHERE category IN ('hamburgueres', 'burgers', 'hamburguer')
  AND (
    id = 184
    OR name ~* '^Ralf.?s Bacon$'
  );

-- 4) Ralf's Chicken
UPDATE menu_items
SET
  name = 'Ralf''s Chicken',
  description = 'Pão Brioche, Queijo, Maionese da casa, Frango Empanado, Tomate, Alface, Picles, Molho Ralf''s',
  price = 18,
  options = '[{"id":"burguer","label":"Burguer","price":18},{"id":"combo","label":"Combo (+ batata + refri)","price":26}]'::jsonb
WHERE category IN ('hamburgueres', 'burgers', 'hamburguer')
  AND (
    id = 185
    OR name ILIKE '%Chicken%'
  );

-- 5) Ralf's Gorgonzola
UPDATE menu_items
SET
  name = 'Ralf''s Gorgonzola',
  description = 'Pão Brioche, 2 smash 100g, cebola caramelizada, Picles, Maionese da casa, Creme de gorgonzola, Molho Ralf''s',
  price = 24,
  options = '[{"id":"burguer","label":"Burguer","price":24},{"id":"combo","label":"Combo (+ batata + refri)","price":32}]'::jsonb
WHERE category IN ('hamburgueres', 'burgers', 'hamburguer')
  AND (
    id = 186
    OR name ILIKE '%Gorgonzola%'
  );

-- 6) Ralf's Burger
UPDATE menu_items
SET
  name = 'Ralf''s Burger',
  description = 'Pão Brioche, 2 smash 100g, Queijo, Maionese da casa, Molho Ralf''s',
  price = 19,
  options = '[{"id":"burguer","label":"Burguer","price":19},{"id":"combo","label":"Combo (+ batata + refri)","price":27}]'::jsonb
WHERE category IN ('hamburgueres', 'burgers', 'hamburguer')
  AND (
    id = 187
    OR name ~* '^Ralf.?s Burger$'
  );

-- 7) Ralf's Nordestino
UPDATE menu_items
SET
  name = 'Ralf''s Nordestino',
  description = 'Pão Brioche, 2 smash 100g, Queijo Coalho, melaço, cebola roxa, tomate, alface, Molho Ralf''s',
  price = 23,
  options = '[{"id":"burguer","label":"Burguer","price":23},{"id":"combo","label":"Combo (+ batata + refri)","price":31}]'::jsonb
WHERE category IN ('hamburgueres', 'burgers', 'hamburguer')
  AND (
    id = 188
    OR name ILIKE '%Nordestino%'
  );

-- 8) Ralf's Monster (antes Master Ralf's)
UPDATE menu_items
SET
  name = 'Ralf''s Monster',
  description = 'Pão Brioche, 4 smash 100g, Queijo, Bacon, cebola caramelizada, picles, maionese da casa, Ketchup original, Molho Ralf''s, Ketchup, Mostarda',
  price = 34,
  options = '[{"id":"burguer","label":"Burguer","price":34},{"id":"combo","label":"Combo (+ batata + refri)","price":42}]'::jsonb
WHERE category IN ('hamburgueres', 'burgers', 'hamburguer')
  AND (
    id = 189
    OR name ILIKE '%Monster%'
    OR name ILIKE '%Master Ralf%'
  );

-- 9) Ralf's Hoclaroma
UPDATE menu_items
SET
  name = 'Ralf''s Hoclaroma',
  description = 'Pão Brioche, 2 smash 100g, Picles, Queijo, cebola roxa, cheddar, bacon, maionese da casa, Molho Ralf''s',
  price = 24,
  options = '[{"id":"burguer","label":"Burguer","price":24},{"id":"combo","label":"Combo (+ batata + refri)","price":32}]'::jsonb
WHERE category IN ('hamburgueres', 'burgers', 'hamburguer')
  AND (
    id = 190
    OR name ILIKE '%Hoclaroma%'
  );
