-- ============================================
-- RLS ポリシーの確認と修正
-- ============================================

-- まず、is_admin() 関数が正しく動作するかテスト
-- （このクエリは管理者でログインしている状態で実行してください）
SELECT
  auth.uid() as current_user_id,
  is_admin() as is_admin_result,
  (SELECT is_admin FROM users WHERE user_id = auth.uid()) as is_admin_from_table;

-- users テーブルの既存ポリシーを確認
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'users'
ORDER BY policyname;

-- reports テーブルの既存ポリシーを確認
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'reports'
ORDER BY policyname;

-- posts テーブルの既存ポリシーを確認
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'posts'
ORDER BY policyname;

-- もし既存のポリシーが厳しすぎる場合は、以下のように一時的に無効化して確認
-- （テスト後は必ず有効化すること！）
-- ALTER TABLE reports DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE posts DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE users DISABLE ROW LEVEL SECURITY;
