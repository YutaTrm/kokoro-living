-- 管理者ロールの追加とマスターテーブルのRLS設定

-- マスターテーブルのRLSを有効化（002の内容を統合）
ALTER TABLE diagnoses ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- 読み取り専用ポリシー（全員が閲覧可能）
CREATE POLICY "Anyone can view diagnoses" ON diagnoses FOR SELECT USING (true);
CREATE POLICY "Anyone can view treatments" ON treatments FOR SELECT USING (true);
CREATE POLICY "Anyone can view ingredients" ON ingredients FOR SELECT USING (true);
CREATE POLICY "Anyone can view products" ON products FOR SELECT USING (true);

-- profilesテーブルにis_adminカラムを追加
ALTER TABLE profiles ADD COLUMN is_admin BOOLEAN DEFAULT false NOT NULL;

-- is_adminカラムのインデックス作成
CREATE INDEX idx_profiles_is_admin ON profiles(is_admin);

-- profilesのRLSポリシーを更新（is_adminは自分では変更できない）
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- 新しい更新ポリシー：is_admin以外のカラムのみ更新可能
CREATE POLICY "Users can update own profile except admin flag" ON profiles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND is_admin = (SELECT is_admin FROM profiles WHERE user_id = auth.uid())
);

-- 管理者のみがマスターテーブルを編集可能
-- diagnoses
CREATE POLICY "Admins can insert diagnoses" ON diagnoses
FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_admin = true)
);

CREATE POLICY "Admins can update diagnoses" ON diagnoses
FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_admin = true)
);

CREATE POLICY "Admins can delete diagnoses" ON diagnoses
FOR DELETE
USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_admin = true)
);

-- treatments
CREATE POLICY "Admins can insert treatments" ON treatments
FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_admin = true)
);

CREATE POLICY "Admins can update treatments" ON treatments
FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_admin = true)
);

CREATE POLICY "Admins can delete treatments" ON treatments
FOR DELETE
USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_admin = true)
);

-- ingredients
CREATE POLICY "Admins can insert ingredients" ON ingredients
FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_admin = true)
);

CREATE POLICY "Admins can update ingredients" ON ingredients
FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_admin = true)
);

CREATE POLICY "Admins can delete ingredients" ON ingredients
FOR DELETE
USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_admin = true)
);

-- products
CREATE POLICY "Admins can insert products" ON products
FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_admin = true)
);

CREATE POLICY "Admins can update products" ON products
FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_admin = true)
);

CREATE POLICY "Admins can delete products" ON products
FOR DELETE
USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_admin = true)
);

-- コメント: 初期管理者の設定方法
-- Supabase Dashboard → Table Editor → profiles で該当ユーザーのis_adminをtrueに変更
