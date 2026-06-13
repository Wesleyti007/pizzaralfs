-- Pizza Ralf's: cardápio só com pizza Grande (sem massa broto/média).

UPDATE catalog_settings
SET pizza_enabled_sizes = '["grande"]'::jsonb
WHERE id = 1;
