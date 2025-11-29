-- notificationsテーブルのパフォーマンス改善用インデックス

-- 1. 通知一覧取得の最適化用複合インデックス
-- user_id で絞り込み、created_at DESC でソートするため
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
ON public.notifications (user_id, created_at DESC);

-- 2. 既存の単独インデックスは削除（複合インデックスで代用可能）
-- created_atのみのインデックスは不要になる
DROP INDEX IF EXISTS idx_notifications_created_at;

-- 注: idx_notifications_user_id は他のクエリで使う可能性があるため残す
-- 注: idx_notifications_user_unread は未読通知カウント用に必要なので残す
