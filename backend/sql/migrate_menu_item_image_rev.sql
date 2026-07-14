ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS image_rev TEXT NOT NULL DEFAULT '';

UPDATE menu_items
SET image_rev = left(md5(image_base64), 12)
WHERE length(trim(COALESCE(image_base64, ''))) > 32
  AND trim(COALESCE(image_rev, '')) = '';
