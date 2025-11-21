-- マイグレーション: bioとステータス機能の追加
-- 作成日: 2025-01-21

-- 1. usersテーブルにbioカラムを追加
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;

-- 2. statusesマスターテーブル作成
CREATE TABLE IF NOT EXISTS statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0, -- 0は非表示、100番台は就業系、200番台は医療療養系
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. user_statusesテーブル作成（診断名と同じ構造）
CREATE TABLE IF NOT EXISTS user_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status_id UUID NOT NULL REFERENCES statuses(id) ON DELETE CASCADE,
  start_date TEXT NOT NULL,
  end_date TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 初期データ投入（就業関連と医療・療養関連のみ）

-- 就業関連（100番台）
INSERT INTO statuses (name, sort_order) VALUES
  ('フルタイム', 101),
  ('パートタイム', 102),
  ('契約社員', 103),
  ('派遣社員', 104),
  ('在宅勤務', 105),
  ('時短勤務', 106),
  ('アルバイト', 107),
  ('フリーランス', 108),
  ('自営業', 109),
  ('休職中', 110),
  ('求職中', 111),
  ('退職', 112),
  ('無職', 113)
ON CONFLICT (name) DO NOTHING;

-- 医療・療養関連（200番台）
INSERT INTO statuses (name, sort_order) VALUES
  ('自宅療養中', 201),
  ('入院中', 202),
  ('リハビリ中', 203),
  ('デイケア通所中', 204),
  ('デイナイトケア通所中', 205),
  ('訪問看護利用中', 206),
  ('作業所通所中', 207),
  ('就労移行支援利用中', 208),
  ('就労継続支援A型利用中', 209),
  ('就労継続支援B型利用中', 210),
  ('自立訓練利用中', 211),
  ('リワーク利用中', 212)
ON CONFLICT (name) DO NOTHING;

-- 5. インデックス作成
CREATE INDEX IF NOT EXISTS idx_user_statuses_user_id ON user_statuses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_statuses_status_id ON user_statuses(status_id);
CREATE INDEX IF NOT EXISTS idx_statuses_sort_order ON statuses(sort_order);

-- 6. RLS (Row Level Security) ポリシー設定

-- statusesテーブル: 全員が読み取り可能
ALTER TABLE statuses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "statuses_select_policy" ON statuses FOR SELECT USING (true);

-- user_statusesテーブル: 自分のデータのみ操作可能
ALTER TABLE user_statuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_statuses_select_policy" ON user_statuses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_statuses_insert_policy" ON user_statuses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_statuses_update_policy" ON user_statuses
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "user_statuses_delete_policy" ON user_statuses
  FOR DELETE USING (auth.uid() = user_id);
