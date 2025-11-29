-- postsテーブルのパフォーマンス改善用インデックス

-- 1. タイムライン取得用の複合インデックス
-- parent_post_id IS NULL でフィルタし、created_at DESC でソートするため
CREATE INDEX IF NOT EXISTS idx_posts_parent_null_created_at
ON posts (created_at DESC)
WHERE parent_post_id IS NULL;

-- 2. is_hiddenカラムのインデックス
-- 非表示投稿を除外するクエリで使用
CREATE INDEX IF NOT EXISTS idx_posts_is_hidden
ON posts (is_hidden);

-- 3. user_idとparent_post_idの複合インデックス（ユーザーの投稿一覧取得用）
CREATE INDEX IF NOT EXISTS idx_posts_user_parent_created
ON posts (user_id, parent_post_id, created_at DESC);

-- 4. タイムライン最適化: user_id IN (...) クエリ用
-- parent_post_id IS NULL, is_hidden = false でフィルタし、created_at でソート
CREATE INDEX IF NOT EXISTS idx_posts_timeline_optimized
ON posts (user_id, created_at DESC)
WHERE parent_post_id IS NULL AND is_hidden = false;
