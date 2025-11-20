-- 検索用インデックスの追加

-- pg_trgm拡張機能を有効化（部分一致検索用）
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 有効成分名の検索用インデックス
CREATE INDEX idx_ingredients_name_search ON ingredients USING gin (name gin_trgm_ops);

-- 製品名の検索用インデックス
CREATE INDEX idx_products_name_search ON products USING gin (name gin_trgm_ops);

-- 診断名の検索用インデックス
CREATE INDEX idx_diagnoses_name_search ON diagnoses USING gin (name gin_trgm_ops);

-- 治療法の検索用インデックス
CREATE INDEX idx_treatments_name_search ON treatments USING gin (name gin_trgm_ops);

-- 検索用のビューを作成（オプション：UIで使いやすくするため）
CREATE OR REPLACE VIEW medication_search AS
SELECT
  id,
  name,
  'ingredient' as type,
  NULL as ingredient_name,
  description
FROM ingredients
UNION ALL
SELECT
  p.id,
  p.name,
  'product' as type,
  i.name as ingredient_name,
  p.manufacturer as description
FROM products p
JOIN ingredients i ON p.ingredient_id = i.id;

-- 検索用のヘルパー関数（オプション）
CREATE OR REPLACE FUNCTION search_medications(search_term TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  type TEXT,
  ingredient_name TEXT,
  description TEXT,
  similarity REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ms.id,
    ms.name,
    ms.type,
    ms.ingredient_name,
    ms.description,
    similarity(ms.name, search_term) as similarity
  FROM medication_search ms
  WHERE ms.name ILIKE '%' || search_term || '%'
     OR ms.ingredient_name ILIKE '%' || search_term || '%'
  ORDER BY similarity DESC, ms.name ASC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql;
