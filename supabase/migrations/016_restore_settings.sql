-- テストで無効化した設定を元に戻す

-- RLSを再度有効化
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- RLSポリシーが存在するか確認（念のため再作成）
DROP POLICY IF EXISTS "Users can view all users" ON users;
DROP POLICY IF EXISTS "Users can update own user except admin flag" ON users;
DROP POLICY IF EXISTS "Users can insert own user" ON users;

CREATE POLICY "Users can view all users" ON users
  FOR SELECT USING (true);

CREATE POLICY "Users can update own user except admin flag" ON users
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND is_admin = (SELECT is_admin FROM users WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert own user" ON users
  FOR INSERT WITH CHECK (auth.uid() = user_id);
