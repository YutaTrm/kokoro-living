-- sync_avatar_url関数を修正（スキーマを明示的に指定）
CREATE OR REPLACE FUNCTION public.sync_avatar_url()
RETURNS TRIGGER AS $$
BEGIN
  -- public.usersと明示的に指定
  UPDATE public.users
  SET avatar_url = NEW.raw_user_meta_data->>'avatar_url'
  WHERE user_id = NEW.id;
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- エラーが発生しても処理を続行
    RAISE WARNING 'Error in sync_avatar_url: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
