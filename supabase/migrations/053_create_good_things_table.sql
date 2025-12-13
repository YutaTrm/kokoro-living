-- いいことリスト機能用テーブル
CREATE TABLE user_good_things (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  recorded_date DATE NOT NULL DEFAULT CURRENT_DATE,
  display_order INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 同じ日に同じ順番は1つのみ
  UNIQUE(user_id, recorded_date, display_order),

  -- display_orderは1〜3のみ
  CONSTRAINT valid_display_order CHECK (display_order BETWEEN 1 AND 3)
);

-- インデックス
CREATE INDEX idx_user_good_things_user_date
  ON user_good_things(user_id, recorded_date DESC);

-- RLS有効化
ALTER TABLE user_good_things ENABLE ROW LEVEL SECURITY;

-- 自分の記録のみ参照可能
CREATE POLICY "Users can view own good things"
  ON user_good_things FOR SELECT
  USING (auth.uid() = user_id);

-- 自分の記録のみ作成可能
CREATE POLICY "Users can insert own good things"
  ON user_good_things FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 自分の記録のみ更新可能
CREATE POLICY "Users can update own good things"
  ON user_good_things FOR UPDATE
  USING (auth.uid() = user_id);

-- 自分の記録のみ削除可能
CREATE POLICY "Users can delete own good things"
  ON user_good_things FOR DELETE
  USING (auth.uid() = user_id);
