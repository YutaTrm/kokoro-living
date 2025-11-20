-- こころリビング データベーススキーマ

-- 1. プロフィールテーブル
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  display_name TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 診断名マスターテーブル
CREATE TABLE diagnoses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 治療法マスターテーブル
CREATE TABLE treatments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 有効成分マスターテーブル
CREATE TABLE ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. 製品マスターテーブル
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  manufacturer TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. ユーザー診断記録テーブル
CREATE TABLE user_diagnoses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  diagnosis_id UUID REFERENCES diagnoses(id) ON DELETE CASCADE NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. ユーザー治療記録テーブル
CREATE TABLE user_treatments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  treatment_id UUID REFERENCES treatments(id) ON DELETE CASCADE NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. ユーザー服薬記録テーブル
CREATE TABLE user_medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  ingredient_id UUID REFERENCES ingredients(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT at_least_one_medication CHECK (ingredient_id IS NOT NULL OR product_id IS NOT NULL)
);

-- 9. 投稿テーブル
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_products_ingredient_id ON products(ingredient_id);
CREATE INDEX idx_user_diagnoses_user_id ON user_diagnoses(user_id);
CREATE INDEX idx_user_treatments_user_id ON user_treatments(user_id);
CREATE INDEX idx_user_medications_user_id ON user_medications(user_id);
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);

-- RLS (Row Level Security) の有効化
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_diagnoses ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_treatments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- RLS ポリシー: プロフィール
CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS ポリシー: ユーザー診断記録
CREATE POLICY "Users can view own diagnoses" ON user_diagnoses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own diagnoses" ON user_diagnoses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own diagnoses" ON user_diagnoses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own diagnoses" ON user_diagnoses FOR DELETE USING (auth.uid() = user_id);

-- RLS ポリシー: ユーザー治療記録
CREATE POLICY "Users can view own treatments" ON user_treatments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own treatments" ON user_treatments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own treatments" ON user_treatments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own treatments" ON user_treatments FOR DELETE USING (auth.uid() = user_id);

-- RLS ポリシー: ユーザー服薬記録
CREATE POLICY "Users can view own medications" ON user_medications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own medications" ON user_medications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own medications" ON user_medications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own medications" ON user_medications FOR DELETE USING (auth.uid() = user_id);

-- RLS ポリシー: 投稿
CREATE POLICY "Users can view all posts" ON posts FOR SELECT USING (true);
CREATE POLICY "Users can insert own posts" ON posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own posts" ON posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own posts" ON posts FOR DELETE USING (auth.uid() = user_id);

-- マスターテーブルはRLSなし（全員が閲覧可能）
-- diagnoses, treatments, ingredients, products

-- テストデータ挿入
INSERT INTO ingredients (name, description) VALUES ('テスト成分', 'テスト用の有効成分');
INSERT INTO products (ingredient_id, name, manufacturer)
VALUES (
  (SELECT id FROM ingredients WHERE name = 'テスト成分'),
  'テストリン',
  'テスト製薬'
);

INSERT INTO diagnoses (name, description) VALUES ('テスト病', 'テスト用の診断名');
INSERT INTO treatments (name, description) VALUES ('テスト療法', 'テスト用の治療法');

-- updated_at自動更新のトリガー関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- updated_atトリガーの設定
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_diagnoses_updated_at BEFORE UPDATE ON user_diagnoses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_treatments_updated_at BEFORE UPDATE ON user_treatments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_medications_updated_at BEFORE UPDATE ON user_medications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
