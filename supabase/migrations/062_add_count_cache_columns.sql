-- postsテーブルにカウントキャッシュカラムを追加

-- 1. カラム追加
ALTER TABLE posts ADD COLUMN IF NOT EXISTS replies_count INTEGER DEFAULT 0;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS reposts_count INTEGER DEFAULT 0;

-- 2. 既存データの集計
UPDATE posts SET replies_count = (
  SELECT COUNT(*) FROM posts AS replies WHERE replies.parent_post_id = posts.id
);

UPDATE posts SET likes_count = (
  SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id
);

UPDATE posts SET reposts_count = (
  SELECT COUNT(*) FROM reposts WHERE reposts.post_id = posts.id
);

-- 3. いいね数更新トリガー
CREATE OR REPLACE FUNCTION update_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_post_likes_count ON likes;
CREATE TRIGGER trigger_update_post_likes_count
AFTER INSERT OR DELETE ON likes
FOR EACH ROW EXECUTE FUNCTION update_post_likes_count();

-- 4. リポスト数更新トリガー
CREATE OR REPLACE FUNCTION update_post_reposts_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET reposts_count = reposts_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET reposts_count = GREATEST(reposts_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_post_reposts_count ON reposts;
CREATE TRIGGER trigger_update_post_reposts_count
AFTER INSERT OR DELETE ON reposts
FOR EACH ROW EXECUTE FUNCTION update_post_reposts_count();

-- 5. 返信数更新トリガー
CREATE OR REPLACE FUNCTION update_post_replies_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.parent_post_id IS NOT NULL THEN
    UPDATE posts SET replies_count = replies_count + 1 WHERE id = NEW.parent_post_id;
  ELSIF TG_OP = 'DELETE' AND OLD.parent_post_id IS NOT NULL THEN
    UPDATE posts SET replies_count = GREATEST(replies_count - 1, 0) WHERE id = OLD.parent_post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_post_replies_count ON posts;
CREATE TRIGGER trigger_update_post_replies_count
AFTER INSERT OR DELETE ON posts
FOR EACH ROW EXECUTE FUNCTION update_post_replies_count();
