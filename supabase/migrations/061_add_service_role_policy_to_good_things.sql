-- user_good_thingsテーブルに管理者向けポリシーを追加

-- 管理者は全てのレコードを閲覧可能
CREATE POLICY "Admins can view all good things"
  ON user_good_things FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.user_id = auth.uid()
      AND users.is_admin = true
    )
  );
