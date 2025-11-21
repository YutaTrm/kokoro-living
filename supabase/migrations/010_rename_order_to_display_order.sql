-- マイグレーション: orderカラムをdisplay_orderにリネーム
-- 作成日: 2025-01-21
-- 理由: orderはSQL予約語のため、display_orderに変更

-- 1. statusesテーブル
ALTER TABLE statuses RENAME COLUMN "order" TO display_order;

-- 2. diagnosesテーブル
ALTER TABLE diagnoses RENAME COLUMN "order" TO display_order;

-- 3. treatmentsテーブル
ALTER TABLE treatments RENAME COLUMN "order" TO display_order;

-- 4. ingredientsテーブル
ALTER TABLE ingredients RENAME COLUMN "order" TO display_order;

-- 5. インデックスの再作成（statuses）
DROP INDEX IF EXISTS idx_statuses_sort_order;
DROP INDEX IF EXISTS idx_statuses_order;
CREATE INDEX IF NOT EXISTS idx_statuses_display_order ON statuses(display_order);

-- 6. インデックスの作成（他のテーブル）
CREATE INDEX IF NOT EXISTS idx_diagnoses_display_order ON diagnoses(display_order);
CREATE INDEX IF NOT EXISTS idx_treatments_display_order ON treatments(display_order);
CREATE INDEX IF NOT EXISTS idx_ingredients_display_order ON ingredients(display_order);
