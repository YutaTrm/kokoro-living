-- マイグレーション: usersテーブルにavatar_urlカラムを追加
-- 作成日: 2025-01-21

-- 1. usersテーブルにavatar_urlカラムを追加
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. 既存ユーザーのavatar_urlを更新する関数
CREATE OR REPLACE FUNCTION sync_avatar_url()
RETURNS TRIGGER AS $$
BEGIN
  -- auth.usersのuser_metadataからavatar_urlを取得してusersテーブルに保存
  UPDATE users
  SET avatar_url = NEW.raw_user_meta_data->>'avatar_url'
  WHERE user_id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. トリガーを作成（auth.usersが更新されたらusersテーブルも更新）
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_avatar_url();

-- 4. 既存ユーザーのavatar_urlを同期
UPDATE users u
SET avatar_url = au.raw_user_meta_data->>'avatar_url'
FROM auth.users au
WHERE u.user_id = au.id;
