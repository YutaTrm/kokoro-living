-- 修正: lists テーブルの owner_id → user_id
-- エラー: column "owner_id" does not exist

CREATE OR REPLACE FUNCTION delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- AI関連
  DELETE FROM public.ai_reflections WHERE user_id = current_user_id;
  DELETE FROM public.ai_reflection_purchases WHERE user_id = current_user_id;

  -- 気分チェックイン
  DELETE FROM public.mood_checkins WHERE user_id = current_user_id;

  -- リスト関連（owner_id → user_id に修正）
  DELETE FROM public.list_members WHERE list_id IN (SELECT id FROM public.lists WHERE user_id = current_user_id);
  DELETE FROM public.lists WHERE user_id = current_user_id;
  DELETE FROM public.list_members WHERE user_id = current_user_id;

  -- 通知
  DELETE FROM public.notifications WHERE user_id = current_user_id OR actor_id = current_user_id;

  -- 通報
  DELETE FROM public.reports WHERE reporter_id = current_user_id;

  -- ブロック・ミュート
  DELETE FROM public.blocks WHERE blocker_id = current_user_id OR blocked_id = current_user_id;
  DELETE FROM public.mutes WHERE muter_id = current_user_id OR muted_id = current_user_id;

  -- いいね
  DELETE FROM public.likes WHERE user_id = current_user_id;
  DELETE FROM public.likes WHERE post_id IN (SELECT id FROM public.posts WHERE user_id = current_user_id);

  -- ブックマーク
  DELETE FROM public.bookmarks WHERE user_id = current_user_id;
  DELETE FROM public.bookmarks WHERE post_id IN (SELECT id FROM public.posts WHERE user_id = current_user_id);

  -- 投稿タグ
  DELETE FROM public.post_diagnoses WHERE post_id IN (SELECT id FROM public.posts WHERE user_id = current_user_id);
  DELETE FROM public.post_treatments WHERE post_id IN (SELECT id FROM public.posts WHERE user_id = current_user_id);
  DELETE FROM public.post_medications WHERE post_id IN (SELECT id FROM public.posts WHERE user_id = current_user_id);
  DELETE FROM public.post_statuses WHERE post_id IN (SELECT id FROM public.posts WHERE user_id = current_user_id);

  -- 投稿
  UPDATE public.posts SET parent_post_id = NULL WHERE parent_post_id IN (SELECT id FROM public.posts WHERE user_id = current_user_id);
  DELETE FROM public.posts WHERE user_id = current_user_id;

  -- 医療情報
  DELETE FROM public.user_diagnoses WHERE user_id = current_user_id;
  DELETE FROM public.user_treatments WHERE user_id = current_user_id;
  DELETE FROM public.user_medications WHERE user_id = current_user_id;
  DELETE FROM public.user_statuses WHERE user_id = current_user_id;

  -- フォロー
  DELETE FROM public.follows WHERE follower_id = current_user_id OR following_id = current_user_id;

  -- ユーザー
  DELETE FROM public.users WHERE user_id = current_user_id;

  -- 認証
  DELETE FROM auth.users WHERE id = current_user_id;
END;
$$;
