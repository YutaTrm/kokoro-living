-- ============================================
-- 042で追加したポリシーをロールバック
-- ============================================

-- 1. reports テーブルのポリシー削除
DROP POLICY IF EXISTS "管理者は全通報を閲覧可能" ON reports;

-- 2. posts テーブルのポリシー削除（SELECT）
DROP POLICY IF EXISTS "管理者は全投稿を閲覧可能" ON posts;

-- 3. posts テーブルのポリシー削除（UPDATE）
DROP POLICY IF EXISTS "管理者は投稿を更新可能" ON posts;

-- 4. users テーブルのポリシー削除
DROP POLICY IF EXISTS "管理者は全ユーザーを閲覧可能" ON users;
