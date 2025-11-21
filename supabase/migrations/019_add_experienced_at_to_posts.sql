-- postsテーブルにexperienced_atカラムを追加
-- 過去のことを呟くための日付フィールド（年月のみ使用）

ALTER TABLE posts ADD COLUMN IF NOT EXISTS experienced_at DATE;

-- 既存の投稿はNULLのまま（デフォルト値なし）
