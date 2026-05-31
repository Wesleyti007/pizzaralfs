-- Endereço da pizzaria + taxa por km (CEP do cliente)
ALTER TABLE catalog_settings ADD COLUMN IF NOT EXISTS establishment_cep TEXT NOT NULL DEFAULT '';
ALTER TABLE catalog_settings ADD COLUMN IF NOT EXISTS establishment_street TEXT NOT NULL DEFAULT '';
ALTER TABLE catalog_settings ADD COLUMN IF NOT EXISTS establishment_number TEXT NOT NULL DEFAULT '';
ALTER TABLE catalog_settings ADD COLUMN IF NOT EXISTS establishment_neighborhood TEXT NOT NULL DEFAULT '';
ALTER TABLE catalog_settings ADD COLUMN IF NOT EXISTS establishment_city TEXT NOT NULL DEFAULT '';
ALTER TABLE catalog_settings ADD COLUMN IF NOT EXISTS establishment_state TEXT NOT NULL DEFAULT '';
ALTER TABLE catalog_settings ADD COLUMN IF NOT EXISTS delivery_price_per_km NUMERIC(10,2) NOT NULL DEFAULT 0;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_cep TEXT NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_distance_km NUMERIC(8,2);
