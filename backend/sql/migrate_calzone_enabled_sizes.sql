-- Quais tamanhos de calzone aparecem no cardápio (pequeno, grande)

ALTER TABLE catalog_settings
  ADD COLUMN IF NOT EXISTS calzone_enabled_sizes JSONB NOT NULL DEFAULT '["pequeno","grande"]'::jsonb;

UPDATE catalog_settings
SET calzone_enabled_sizes = '["pequeno","grande"]'::jsonb
WHERE calzone_enabled_sizes IS NULL
   OR jsonb_typeof(calzone_enabled_sizes) <> 'array'
   OR jsonb_array_length(calzone_enabled_sizes) = 0;
