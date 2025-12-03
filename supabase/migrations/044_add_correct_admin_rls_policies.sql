-- ============================================
-- 管理者用 RLS ポリシー（修正版）
-- ============================================
-- 循環参照を避けるため、セキュリティ定義者関数を使用

-- 管理者チェック用の関数を作成
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE user_id = auth.uid()
    AND is_admin = true
  );
END;
$$;

-- 1. reports テーブル: 管理者は全件閲覧可能
CREATE POLICY "管理者は全通報を閲覧可能"
ON reports
FOR SELECT
TO authenticated
USING (is_admin());

-- 2. posts テーブル: 管理者は全件閲覧可能
CREATE POLICY "管理者は全投稿を閲覧可能"
ON posts
FOR SELECT
TO authenticated
USING (is_admin());

-- 3. posts テーブル: 管理者は更新可能（is_hiddenの変更用）
CREATE POLICY "管理者は投稿を更新可能"
ON posts
FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- 4. users テーブル: 管理者は全ユーザーを閲覧可能
CREATE POLICY "管理者は全ユーザーを閲覧可能"
ON users
FOR SELECT
TO authenticated
USING (is_admin());
