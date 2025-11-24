-- 通知テーブル作成
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('like', 'reply', 'follow')),
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- 同じ通知の重複を防ぐユニーク制約
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_unique_like ON public.notifications(user_id, actor_id, type, post_id) WHERE type = 'like';
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_unique_follow ON public.notifications(user_id, actor_id, type) WHERE type = 'follow';

-- RLSを有効化
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 自分の通知のみ閲覧可能
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

-- 自分の通知のみ更新可能（既読化用）
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- トリガー用のinsertポリシー（サービスロール用）
CREATE POLICY "Service can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (TRUE);

-- いいね時に通知を作成するトリガー関数
CREATE OR REPLACE FUNCTION public.create_like_notification()
RETURNS TRIGGER AS $$
DECLARE
  post_owner_id UUID;
BEGIN
  -- 投稿の所有者を取得
  SELECT user_id INTO post_owner_id FROM public.posts WHERE id = NEW.post_id;

  -- 自分自身へのいいねは通知しない
  IF post_owner_id IS NOT NULL AND post_owner_id != NEW.user_id THEN
    INSERT INTO public.notifications (user_id, actor_id, type, post_id)
    VALUES (post_owner_id, NEW.user_id, 'like', NEW.post_id)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- いいね追加時のトリガー
DROP TRIGGER IF EXISTS on_like_created ON public.likes;
CREATE TRIGGER on_like_created
  AFTER INSERT ON public.likes
  FOR EACH ROW
  EXECUTE FUNCTION public.create_like_notification();

-- 返信時に通知を作成するトリガー関数
CREATE OR REPLACE FUNCTION public.create_reply_notification()
RETURNS TRIGGER AS $$
DECLARE
  parent_owner_id UUID;
BEGIN
  -- 親投稿がある場合のみ（返信の場合）
  IF NEW.parent_post_id IS NOT NULL THEN
    -- 親投稿の所有者を取得
    SELECT user_id INTO parent_owner_id FROM public.posts WHERE id = NEW.parent_post_id;

    -- 自分自身への返信は通知しない
    IF parent_owner_id IS NOT NULL AND parent_owner_id != NEW.user_id THEN
      INSERT INTO public.notifications (user_id, actor_id, type, post_id)
      VALUES (parent_owner_id, NEW.user_id, 'reply', NEW.id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 返信追加時のトリガー
DROP TRIGGER IF EXISTS on_reply_created ON public.posts;
CREATE TRIGGER on_reply_created
  AFTER INSERT ON public.posts
  FOR EACH ROW
  WHEN (NEW.parent_post_id IS NOT NULL)
  EXECUTE FUNCTION public.create_reply_notification();

-- いいね削除時に通知も削除するトリガー関数
CREATE OR REPLACE FUNCTION public.delete_like_notification()
RETURNS TRIGGER AS $$
DECLARE
  post_owner_id UUID;
BEGIN
  -- 投稿の所有者を取得
  SELECT user_id INTO post_owner_id FROM public.posts WHERE id = OLD.post_id;

  IF post_owner_id IS NOT NULL THEN
    DELETE FROM public.notifications
    WHERE user_id = post_owner_id
      AND actor_id = OLD.user_id
      AND type = 'like'
      AND post_id = OLD.post_id;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- いいね削除時のトリガー
DROP TRIGGER IF EXISTS on_like_deleted ON public.likes;
CREATE TRIGGER on_like_deleted
  AFTER DELETE ON public.likes
  FOR EACH ROW
  EXECUTE FUNCTION public.delete_like_notification();
