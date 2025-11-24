-- 通知トリガーを一時的に無効化（デバッグ用）
DROP TRIGGER IF EXISTS on_like_created ON public.likes;
DROP TRIGGER IF EXISTS on_like_deleted ON public.likes;
DROP TRIGGER IF EXISTS on_reply_created ON public.posts;
