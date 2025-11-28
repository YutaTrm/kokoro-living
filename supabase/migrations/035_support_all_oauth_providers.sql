-- sync_avatar_url関数を修正（Apple/Google/Xすべてに対応）
CREATE OR REPLACE FUNCTION public.sync_avatar_url()
RETURNS TRIGGER AS $$
DECLARE
  avatar_url_value TEXT;
  provider_value TEXT;
BEGIN
  -- プロバイダーを取得
  provider_value := NEW.raw_app_meta_data->>'provider';

  -- プロバイダー別にアバターURLを取得
  CASE provider_value
    WHEN 'twitter' THEN
      -- X（Twitter）: avatar_url
      avatar_url_value := NEW.raw_user_meta_data->>'avatar_url';
    WHEN 'google' THEN
      -- Google: picture
      avatar_url_value := NEW.raw_user_meta_data->>'picture';
    WHEN 'apple' THEN
      -- Apple: プロフィール画像を提供しないのでnull
      avatar_url_value := NULL;
    ELSE
      -- その他のプロバイダー
      avatar_url_value := COALESCE(
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.raw_user_meta_data->>'picture'
      );
  END CASE;

  -- usersテーブルを更新
  UPDATE public.users
  SET
    avatar_url = avatar_url_value,
    provider = provider_value
  WHERE user_id = NEW.id;

  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- エラーが発生しても処理を続行
    RAISE WARNING 'Error in sync_avatar_url: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- usersテーブルにproviderカラムを追加（まだなければ）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'users'
    AND column_name = 'provider'
  ) THEN
    ALTER TABLE public.users ADD COLUMN provider TEXT;
  END IF;
END $$;

-- 既存のAppleユーザーのproviderを更新
UPDATE public.users u
SET provider = (
  SELECT raw_app_meta_data->>'provider'
  FROM auth.users au
  WHERE au.id = u.user_id
)
WHERE provider IS NULL;
