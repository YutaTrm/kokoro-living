-- ブロック機能のテーブル作成
-- ユーザーが他のユーザーをブロックする機能

CREATE TABLE public.blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id),
  CHECK (blocker_id != blocked_id)
);

-- インデックス作成（パフォーマンス最適化）
CREATE INDEX idx_blocks_blocker ON public.blocks(blocker_id);
CREATE INDEX idx_blocks_blocked ON public.blocks(blocked_id);

-- RLSポリシー設定
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分がブロックしたユーザーのリストを見られる
CREATE POLICY "Users can view their own blocks" ON public.blocks
  FOR SELECT
  USING (auth.uid() = blocker_id);

-- ユーザーは他のユーザーをブロックできる
CREATE POLICY "Users can block other users" ON public.blocks
  FOR INSERT
  WITH CHECK (auth.uid() = blocker_id AND blocker_id != blocked_id);

-- ユーザーは自分のブロックを解除できる
CREATE POLICY "Users can unblock" ON public.blocks
  FOR DELETE
  USING (auth.uid() = blocker_id);

COMMENT ON TABLE public.blocks IS 'ユーザーのブロック関係を管理するテーブル';
COMMENT ON COLUMN public.blocks.blocker_id IS 'ブロックした人のID';
COMMENT ON COLUMN public.blocks.blocked_id IS 'ブロックされた人のID';
