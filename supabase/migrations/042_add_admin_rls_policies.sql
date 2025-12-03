-- ============================================
-- 管理者用 RLS ポリシー
-- ============================================
-- 管理画面からすべてのデータにアクセスできるようにする

-- 1. reports テーブル: 管理者は全件閲覧可能
CREATE POLICY "管理者は全通報を閲覧可能"
ON reports
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.user_id = auth.uid()
    AND users.is_admin = true
  )
);

-- 2. posts テーブル: 管理者は全件閲覧可能
CREATE POLICY "管理者は全投稿を閲覧可能"
ON posts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.user_id = auth.uid()
    AND users.is_admin = true
  )
);

-- 3. posts テーブル: 管理者は更新可能（is_hiddenの変更用）
CREATE POLICY "管理者は投稿を更新可能"
ON posts
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.user_id = auth.uid()
    AND users.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.user_id = auth.uid()
    AND users.is_admin = true
  )
);

-- 4. users テーブル: 管理者は全ユーザーを閲覧可能
CREATE POLICY "管理者は全ユーザーを閲覧可能"
ON users
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.user_id = auth.uid()
    AND users.is_admin = true
  )
);
