-- AI振り返り機能のテーブル作成（最小限版）

-- ai_reflectionsテーブル: 生成された振り返りテキストを保存
CREATE TABLE IF NOT EXISTS ai_reflections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL, -- 生成されたテキスト
  tokens_used INTEGER, -- 使用トークン数（コスト管理用）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS ai_reflections_user_id_idx ON ai_reflections(user_id);
CREATE INDEX IF NOT EXISTS ai_reflections_created_at_idx ON ai_reflections(created_at DESC);

-- RLS（Row Level Security）
ALTER TABLE ai_reflections ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分の振り返りのみ閲覧可能
CREATE POLICY "Users can view their own reflections"
  ON ai_reflections FOR SELECT
  USING (auth.uid() = user_id);

-- ユーザーは自分の振り返りを削除可能
CREATE POLICY "Users can delete their own reflections"
  ON ai_reflections FOR DELETE
  USING (auth.uid() = user_id);

-- 管理者は全ての振り返りを閲覧可能
CREATE POLICY "Admins can view all reflections"
  ON ai_reflections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.user_id = auth.uid()
      AND users.is_admin = true
    )
  );
