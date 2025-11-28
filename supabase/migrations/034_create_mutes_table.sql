-- ミュート機能のテーブル作成
-- ユーザーが他のユーザーをミュートする機能
-- ブロックと異なり、フォロー関係は維持され、片方向の非表示

CREATE TABLE public.mutes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  muter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  muted_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(muter_id, muted_id),
  CHECK (muter_id != muted_id)
);

-- インデックス作成（パフォーマンス最適化）
CREATE INDEX idx_mutes_muter ON public.mutes(muter_id);
CREATE INDEX idx_mutes_muted ON public.mutes(muted_id);

-- RLSポリシー設定
ALTER TABLE public.mutes ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分がミュートしたユーザーのリストを見られる
CREATE POLICY "Users can view their own mutes" ON public.mutes
  FOR SELECT
  USING (auth.uid() = muter_id);

-- ユーザーは他のユーザーをミュートできる
CREATE POLICY "Users can mute other users" ON public.mutes
  FOR INSERT
  WITH CHECK (auth.uid() = muter_id AND muter_id != muted_id);

-- ユーザーは自分のミュートを解除できる
CREATE POLICY "Users can unmute" ON public.mutes
  FOR DELETE
  USING (auth.uid() = muter_id);

COMMENT ON TABLE public.mutes IS 'ユーザーのミュート関係を管理するテーブル';
COMMENT ON COLUMN public.mutes.muter_id IS 'ミュートした人のID';
COMMENT ON COLUMN public.mutes.muted_id IS 'ミュートされた人のID';
