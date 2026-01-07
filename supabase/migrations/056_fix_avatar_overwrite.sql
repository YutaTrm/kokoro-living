-- アバターがログイン時に上書きされる問題を修正
-- カスタムアバター（Storageにアップロード）は上書きしない

CREATE OR REPLACE FUNCTION public.sync_avatar_url()
RETURNS TRIGGER AS $$
DECLARE
  avatar_url_value TEXT;
  provider_value TEXT;
  current_avatar TEXT;
BEGIN
  -- プロバイダーを取得
  provider_value := NEW.raw_app_meta_data->>'provider';

  -- 現在のアバターURLを取得
  SELECT avatar_url INTO current_avatar
  FROM public.users
  WHERE user_id = NEW.id;

  -- カスタムアバター（Storageにアップロードされた画像）の場合は上書きしない
  IF current_avatar IS NOT NULL AND current_avatar LIKE '%/avatars/%' THEN
    -- providerのみ更新
    UPDATE public.users
    SET provider = provider_value
    WHERE user_id = NEW.id;
    RETURN NEW;
  END IF;

  -- プロバイダー別にアバターURLを取得
  CASE provider_value
    WHEN 'twitter' THEN
      avatar_url_value := NEW.raw_user_meta_data->>'avatar_url';
    WHEN 'google' THEN
      avatar_url_value := NEW.raw_user_meta_data->>'picture';
    WHEN 'apple' THEN
      avatar_url_value := NULL;
    ELSE
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
    RAISE WARNING 'Error in sync_avatar_url: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
