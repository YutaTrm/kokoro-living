-- 気分チェックインテーブル
CREATE TABLE IF NOT EXISTS mood_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mood integer NOT NULL CHECK (mood >= 1 AND mood <= 5),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- インデックス作成
CREATE INDEX idx_mood_checkins_user_id ON mood_checkins(user_id);
CREATE INDEX idx_mood_checkins_created_at ON mood_checkins(created_at);

-- 1日1回のみチェックイン可能（ユニークインデックス）
CREATE UNIQUE INDEX idx_mood_checkins_user_date ON mood_checkins(
  user_id,
  DATE(created_at AT TIME ZONE 'Asia/Tokyo')
);

-- RLSポリシー有効化
ALTER TABLE mood_checkins ENABLE ROW LEVEL SECURITY;

-- 自分のチェックインは読み取り可能
CREATE POLICY "Users can view their own mood checkins"
  ON mood_checkins
  FOR SELECT
  USING (auth.uid() = user_id);

-- 自分のチェックインを作成可能
CREATE POLICY "Users can insert their own mood checkins"
  ON mood_checkins
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 統計情報は全員が閲覧可能（集計クエリ用）
CREATE POLICY "Everyone can view mood statistics"
  ON mood_checkins
  FOR SELECT
  USING (true);

COMMENT ON TABLE mood_checkins IS '気分チェックイン記録（1日1回）';
COMMENT ON COLUMN mood_checkins.mood IS '気分レベル: 1=😞とても良くない, 2=😔良くない, 3=😐普通, 4=🙂良い, 5=😊とても良い';
