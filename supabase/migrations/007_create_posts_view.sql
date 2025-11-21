-- 投稿とユーザー情報を結合するビューを作成

CREATE OR REPLACE VIEW posts_with_users AS
SELECT
  p.id,
  p.user_id,
  p.content,
  p.created_at,
  p.updated_at,
  p.parent_post_id,
  u.display_name,
  u.user_id as author_user_id
FROM posts p
LEFT JOIN users u ON p.user_id = u.user_id;

-- RLS を有効化
ALTER VIEW posts_with_users SET (security_invoker = true);
