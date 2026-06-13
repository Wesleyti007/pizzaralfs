-- Quais tamanhos de pizza aparecem no cardápio (broto, media, grande)

ALTER TABLE catalog_settings
  ADD COLUMN IF NOT EXISTS pizza_enabled_sizes JSONB NOT NULL DEFAULT '["broto","media","grande"]'::jsonb;

UPDATE catalog_settings
SET pizza_enabled_sizes = '["broto","media","grande"]'::jsonb
WHERE pizza_enabled_sizes IS NULL
   OR jsonb_typeof(pizza_enabled_sizes) <> 'array'
   OR jsonb_array_length(pizza_enabled_sizes) = 0;
