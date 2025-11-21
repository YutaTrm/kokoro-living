-- 既存のトリガーと関数を再作成（修正版）
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 新しいユーザー作成時のトリガー関数を修正
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (user_id, display_name, is_admin, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'user_name', NEW.raw_user_meta_data->>'full_name', NEW.email, 'User'),
    false,
    NOW(),
    NOW()
  );
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- ユーザーが既に存在する場合は何もしない
    RETURN NEW;
  WHEN others THEN
    -- その他のエラーをログに記録
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- トリガーを再作成
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
