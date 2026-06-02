-- Cardapio inicial (itens que estavam estaticos no frontend)
-- Pode rodar mais de uma vez: so insere se o nome ainda nao existir.

INSERT INTO menu_items (category, name, description, price, image_base64)
SELECT 'pizzas', 'Margherita', 'Molho de tomate, mussarela, manjericao e azeite.', 49.90,
  'https://images.unsplash.com/photo-1604382355076-af4b0eb60143?auto=format&fit=crop&w=800&q=80'
WHERE NOT EXISTS (SELECT 1 FROM menu_items WHERE name = 'Margherita');

INSERT INTO menu_items (category, name, description, price, image_base64)
SELECT 'pizzas', 'Calabresa', 'Molho de tomate, mussarela, calabresa e cebola.', 54.90,
  'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?auto=format&fit=crop&w=800&q=80'
WHERE NOT EXISTS (SELECT 1 FROM menu_items WHERE name = 'Calabresa');

INSERT INTO menu_items (category, name, description, price, image_base64)
SELECT 'pizzas', 'Portuguesa', 'Presunto, ovos, cebola, azeitona e mussarela.', 59.90,
  'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80'
WHERE NOT EXISTS (SELECT 1 FROM menu_items WHERE name = 'Portuguesa');

INSERT INTO menu_items (category, name, description, price, image_base64)
SELECT 'esfirras', 'Esfirra de Carne', 'Esfirra aberta recheada com carne temperada.', 8.90,
  'https://images.unsplash.com/photo-1548365328-9f547fb0953a?auto=format&fit=crop&w=800&q=80'
WHERE NOT EXISTS (SELECT 1 FROM menu_items WHERE name = 'Esfirra de Carne');

INSERT INTO menu_items (category, name, description, price, image_base64)
SELECT 'coxinhas', 'Coxinha de Frango', 'Massa crocante com recheio cremoso de frango.', 9.90,
  'https://images.unsplash.com/photo-1626200419199-391ae4be7a41?auto=format&fit=crop&w=800&q=80'
WHERE NOT EXISTS (SELECT 1 FROM menu_items WHERE name = 'Coxinha de Frango');

INSERT INTO menu_items (category, name, description, price, image_base64, options)
SELECT 'bebidas', 'Refrigerante Lata', 'Lata 350ml — escolha o sabor.', 6.50,
  'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=800&q=80',
  '[
    {"id":"coca-cola","label":"Coca-Cola"},
    {"id":"guarana","label":"Guaraná Antarctica"},
    {"id":"fanta-laranja","label":"Fanta Laranja"},
    {"id":"sprite","label":"Sprite"},
    {"id":"schweppes","label":"Schweppes"}
  ]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM menu_items WHERE name = 'Refrigerante Lata');
