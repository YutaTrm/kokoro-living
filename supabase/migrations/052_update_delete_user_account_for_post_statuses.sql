-- マイグレーション: delete_user_account関数にpost_statuses削除を追加
-- 作成日: 2025-12-07

CREATE OR REPLACE FUNCTION delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
BEGIN
  -- 現在のユーザーIDを取得
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 関連データを削除（外部キー制約の順序に注意）
  -- いいねを削除
  DELETE FROM public.likes WHERE user_id = current_user_id;

  -- ブックマークを削除
  DELETE FROM public.bookmarks WHERE user_id = current_user_id;

  -- 投稿のタグ関連を削除
  DELETE FROM public.post_diagnoses WHERE post_id IN (SELECT id FROM public.posts WHERE user_id = current_user_id);
  DELETE FROM public.post_treatments WHERE post_id IN (SELECT id FROM public.posts WHERE user_id = current_user_id);
  DELETE FROM public.post_medications WHERE post_id IN (SELECT id FROM public.posts WHERE user_id = current_user_id);
  DELETE FROM public.post_statuses WHERE post_id IN (SELECT id FROM public.posts WHERE user_id = current_user_id);

  -- 投稿を削除（返信も含む）
  DELETE FROM public.posts WHERE user_id = current_user_id;

  -- 医療情報を削除
  DELETE FROM public.user_diagnoses WHERE user_id = current_user_id;
  DELETE FROM public.user_treatments WHERE user_id = current_user_id;
  DELETE FROM public.user_medications WHERE user_id = current_user_id;
  DELETE FROM public.user_statuses WHERE user_id = current_user_id;

  -- フォロー関係を削除
  DELETE FROM public.follows WHERE follower_id = current_user_id OR following_id = current_user_id;

  -- ユーザープロフィールを削除
  DELETE FROM public.users WHERE user_id = current_user_id;

  -- auth.usersからユーザーを削除
  DELETE FROM auth.users WHERE id = current_user_id;
END;
$$;
