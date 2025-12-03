-- AI振り返りチケットシステム実装

-- 1. usersテーブルにチケット数カラムを追加
ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_reflection_tickets INTEGER DEFAULT 0;

-- 2. ai_reflectionsテーブルに無料フラグを追加
ALTER TABLE ai_reflections ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT false;

-- 3. 購入履歴テーブルを作成
CREATE TABLE IF NOT EXISTS ai_reflection_purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL, -- 'ai_reflection_2_tickets'
  platform TEXT NOT NULL, -- 'ios' or 'android'
  transaction_id TEXT NOT NULL UNIQUE, -- Apple/GoogleのトランザクションID（重複購入防止）
  tickets_added INTEGER NOT NULL, -- 追加されたチケット数（2）
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS ai_reflection_purchases_user_id_idx ON ai_reflection_purchases(user_id);
CREATE INDEX IF NOT EXISTS ai_reflection_purchases_purchased_at_idx ON ai_reflection_purchases(purchased_at DESC);
CREATE INDEX IF NOT EXISTS ai_reflection_purchases_transaction_id_idx ON ai_reflection_purchases(transaction_id);

-- RLS設定
ALTER TABLE ai_reflection_purchases ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分の購入履歴のみ閲覧可能
CREATE POLICY "Users can view their own purchases"
  ON ai_reflection_purchases FOR SELECT
  USING (auth.uid() = user_id);

-- 管理者は全ての購入履歴を閲覧可能
CREATE POLICY "Admins can view all purchases"
  ON ai_reflection_purchases FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.user_id = auth.uid()
      AND users.is_admin = true
    )
  );

-- 4. チケット追加のRPC関数
CREATE OR REPLACE FUNCTION add_ai_reflection_tickets(p_user_id UUID, p_tickets INTEGER)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE users
  SET ai_reflection_tickets = ai_reflection_tickets + p_tickets
  WHERE user_id = p_user_id;
END;
$$;

-- 5. チケット消費のRPC関数
CREATE OR REPLACE FUNCTION consume_ai_reflection_ticket(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE users
  SET ai_reflection_tickets = GREATEST(ai_reflection_tickets - 1, 0)
  WHERE user_id = p_user_id;
END;
$$;

-- 6. 今月の無料枠をチェックする関数
CREATE OR REPLACE FUNCTION check_free_reflection_quota(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  start_of_month TIMESTAMP WITH TIME ZONE;
  free_count INTEGER;
BEGIN
  -- 今月の開始日時を取得
  start_of_month := date_trunc('month', NOW());

  -- 今月の無料生成回数を取得
  SELECT COUNT(*)
  INTO free_count
  FROM ai_reflections
  WHERE user_id = p_user_id
    AND is_free = true
    AND created_at >= start_of_month;

  -- 無料枠が残っているか（月1回まで）
  RETURN free_count < 1;
END;
$$;
