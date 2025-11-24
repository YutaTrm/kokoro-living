-- 通知テーブルを一時的に削除（デバッグ用）
DROP TABLE IF EXISTS public.notifications CASCADE;

-- トリガー関数も削除
DROP FUNCTION IF EXISTS public.create_like_notification();
DROP FUNCTION IF EXISTS public.create_reply_notification();
DROP FUNCTION IF EXISTS public.delete_like_notification();
