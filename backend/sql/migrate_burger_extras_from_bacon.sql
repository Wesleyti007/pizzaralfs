-- Copia os adicionais do Ralf's Bacon para todos os burgers.
-- Fonte (produção): Cebola Caramelizada, Smash 100g, Batata Frita 250g, Nuggets.
-- Molhos continuam no catálogo compartilhado (burger_sauces); não entram em extras.

UPDATE menu_items
SET extras = '[
  {"id":"cebola-caramelizada-add","label":"Cebola Caramelizada","type":"add","price":3},
  {"id":"smash-100-gramas-add","label":"Smash 100 Gramas","type":"add","price":5},
  {"id":"batata-frita-250-gramas-add","label":"Batata Frita 250 Gramas","type":"add","price":14},
  {"id":"nuggets-add","label":"Nuggets","type":"add","price":12}
]'::jsonb
WHERE category IN ('hamburgueres', 'burgers', 'hamburguer');
