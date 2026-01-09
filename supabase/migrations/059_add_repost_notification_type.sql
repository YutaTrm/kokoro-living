-- 通知タイプにrepostとquoteを追加

-- 既存のCHECK制約を削除して新しい制約を追加
alter table notifications drop constraint if exists notifications_type_check;
alter table notifications add constraint notifications_type_check
  check (type in ('like', 'reply', 'follow', 'repost', 'quote'));

-- 重複防止のユニークインデックス
create unique index if not exists idx_notifications_unique_repost
  on notifications(user_id, actor_id, type, post_id) where type = 'repost';
create unique index if not exists idx_notifications_unique_quote
  on notifications(user_id, actor_id, type, post_id) where type = 'quote';
