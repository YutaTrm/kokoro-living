-- フォロー時に通知を作成するトリガー関数
CREATE OR REPLACE FUNCTION public.create_follow_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- 自分自身へのフォローは通知しない（チェック制約があるので通常は起きない）
  IF NEW.following_id != NEW.follower_id THEN
    INSERT INTO public.notifications (user_id, actor_id, type, post_id)
    VALUES (NEW.following_id, NEW.follower_id, 'follow', NULL)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- フォロー追加時のトリガー
DROP TRIGGER IF EXISTS on_follow_created ON public.follows;
CREATE TRIGGER on_follow_created
  AFTER INSERT ON public.follows
  FOR EACH ROW
  EXECUTE FUNCTION public.create_follow_notification();

-- フォロー解除時に通知を削除するトリガー関数
CREATE OR REPLACE FUNCTION public.delete_follow_notification()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.notifications
  WHERE user_id = OLD.following_id
    AND actor_id = OLD.follower_id
    AND type = 'follow';

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- フォロー解除時のトリガー
DROP TRIGGER IF EXISTS on_follow_deleted ON public.follows;
CREATE TRIGGER on_follow_deleted
  AFTER DELETE ON public.follows
  FOR EACH ROW
  EXECUTE FUNCTION public.delete_follow_notification();
