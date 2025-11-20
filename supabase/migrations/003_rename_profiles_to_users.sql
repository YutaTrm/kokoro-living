-- profilesテーブルをusersにリネーム

-- テーブル名を変更
ALTER TABLE profiles RENAME TO users;

-- インデックス名を変更
ALTER INDEX idx_profiles_user_id RENAME TO idx_users_user_id;
ALTER INDEX idx_profiles_is_admin RENAME TO idx_users_is_admin;

-- RLSポリシー名を変更（削除して再作成）
DROP POLICY IF EXISTS "Users can view all profiles" ON users;
DROP POLICY IF EXISTS "Users can update own profile except admin flag" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;

CREATE POLICY "Users can view all users" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own user except admin flag" ON users
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND is_admin = (SELECT is_admin FROM users WHERE user_id = auth.uid())
);
CREATE POLICY "Users can insert own user" ON users FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 診断、治療、薬のポリシーを更新（profilesからusersに変更）
-- 削除して再作成が必要
DROP POLICY IF EXISTS "Admins can insert diagnoses" ON diagnoses;
DROP POLICY IF EXISTS "Admins can update diagnoses" ON diagnoses;
DROP POLICY IF EXISTS "Admins can delete diagnoses" ON diagnoses;
DROP POLICY IF EXISTS "Admins can insert treatments" ON treatments;
DROP POLICY IF EXISTS "Admins can update treatments" ON treatments;
DROP POLICY IF EXISTS "Admins can delete treatments" ON treatments;
DROP POLICY IF EXISTS "Admins can insert ingredients" ON ingredients;
DROP POLICY IF EXISTS "Admins can update ingredients" ON ingredients;
DROP POLICY IF EXISTS "Admins can delete ingredients" ON ingredients;
DROP POLICY IF EXISTS "Admins can insert products" ON products;
DROP POLICY IF EXISTS "Admins can update products" ON products;
DROP POLICY IF EXISTS "Admins can delete products" ON products;

-- diagnoses
CREATE POLICY "Admins can insert diagnoses" ON diagnoses
FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE user_id = auth.uid() AND is_admin = true)
);
CREATE POLICY "Admins can update diagnoses" ON diagnoses
FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM users WHERE user_id = auth.uid() AND is_admin = true)
);
CREATE POLICY "Admins can delete diagnoses" ON diagnoses
FOR DELETE
USING (
  EXISTS (SELECT 1 FROM users WHERE user_id = auth.uid() AND is_admin = true)
);

-- treatments
CREATE POLICY "Admins can insert treatments" ON treatments
FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE user_id = auth.uid() AND is_admin = true)
);
CREATE POLICY "Admins can update treatments" ON treatments
FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM users WHERE user_id = auth.uid() AND is_admin = true)
);
CREATE POLICY "Admins can delete treatments" ON treatments
FOR DELETE
USING (
  EXISTS (SELECT 1 FROM users WHERE user_id = auth.uid() AND is_admin = true)
);

-- ingredients
CREATE POLICY "Admins can insert ingredients" ON ingredients
FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE user_id = auth.uid() AND is_admin = true)
);
CREATE POLICY "Admins can update ingredients" ON ingredients
FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM users WHERE user_id = auth.uid() AND is_admin = true)
);
CREATE POLICY "Admins can delete ingredients" ON ingredients
FOR DELETE
USING (
  EXISTS (SELECT 1 FROM users WHERE user_id = auth.uid() AND is_admin = true)
);

-- products
CREATE POLICY "Admins can insert products" ON products
FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE user_id = auth.uid() AND is_admin = true)
);
CREATE POLICY "Admins can update products" ON products
FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM users WHERE user_id = auth.uid() AND is_admin = true)
);
CREATE POLICY "Admins can delete products" ON products
FOR DELETE
USING (
  EXISTS (SELECT 1 FROM users WHERE user_id = auth.uid() AND is_admin = true)
);

-- トリガーを更新
DROP TRIGGER IF EXISTS update_profiles_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 新規ユーザー登録時に自動的にusersレコードを作成するトリガー関数
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (user_id, display_name, is_admin, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'user_name', NEW.raw_user_meta_data->>'full_name'),
    false,
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- auth.usersテーブルにトリガーを設定
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 既存のauth.usersに対応するusersレコードを作成
INSERT INTO public.users (user_id, display_name, is_admin, created_at, updated_at)
SELECT
  id,
  COALESCE(raw_user_meta_data->>'user_name', raw_user_meta_data->>'full_name', email),
  false,
  created_at,
  NOW()
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.users);
