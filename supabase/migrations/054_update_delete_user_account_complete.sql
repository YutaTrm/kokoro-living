-- マイグレーション: delete_user_account関数を全テーブル対応に更新
-- 作成日: 2025-12-21
-- 原因: iPadでアカウント削除時にエラーが発生（Apple審査リジェクト）

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

  -- AI関連
  DELETE FROM public.ai_reflections WHERE user_id = current_user_id;
  DELETE FROM public.ai_reflection_purchases WHERE user_id = current_user_id;

  -- 気分チェックイン
  DELETE FROM public.mood_checkins WHERE user_id = current_user_id;

  -- リスト関連（先にメンバーを削除）
  DELETE FROM public.list_members WHERE list_id IN (SELECT id FROM public.lists WHERE owner_id = current_user_id);
  DELETE FROM public.lists WHERE owner_id = current_user_id;
  -- 他のリストからも自分を削除
  DELETE FROM public.list_members WHERE user_id = current_user_id;

  -- 通知（自分宛ての通知と自分が起こした通知）
  DELETE FROM public.notifications WHERE user_id = current_user_id OR actor_id = current_user_id;

  -- 通報
  DELETE FROM public.reports WHERE reporter_id = current_user_id;

  -- ブロック・ミュート（双方向）
  DELETE FROM public.blocks WHERE blocker_id = current_user_id OR blocked_id = current_user_id;
  DELETE FROM public.mutes WHERE muter_id = current_user_id OR muted_id = current_user_id;

  -- いいねを削除
  DELETE FROM public.likes WHERE user_id = current_user_id;
  -- 自分の投稿へのいいねも削除
  DELETE FROM public.likes WHERE post_id IN (SELECT id FROM public.posts WHERE user_id = current_user_id);

  -- ブックマークを削除
  DELETE FROM public.bookmarks WHERE user_id = current_user_id;
  -- 自分の投稿へのブックマークも削除
  DELETE FROM public.bookmarks WHERE post_id IN (SELECT id FROM public.posts WHERE user_id = current_user_id);

  -- 投稿のタグ関連を削除
  DELETE FROM public.post_diagnoses WHERE post_id IN (SELECT id FROM public.posts WHERE user_id = current_user_id);
  DELETE FROM public.post_treatments WHERE post_id IN (SELECT id FROM public.posts WHERE user_id = current_user_id);
  DELETE FROM public.post_medications WHERE post_id IN (SELECT id FROM public.posts WHERE user_id = current_user_id);
  DELETE FROM public.post_statuses WHERE post_id IN (SELECT id FROM public.posts WHERE user_id = current_user_id);

  -- 投稿を削除（返信も含む）
  -- 先に自分の投稿への返信を削除（他ユーザーからの返信のparent_post_idをNULLに）
  UPDATE public.posts SET parent_post_id = NULL WHERE parent_post_id IN (SELECT id FROM public.posts WHERE user_id = current_user_id);
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

-- RPC関数の実行権限を認証済みユーザーに付与
GRANT EXECUTE ON FUNCTION delete_user_account() TO authenticated;
