-- マイグレーション: 投稿にステータスタグを関連付けるテーブル作成
-- 作成日: 2025-12-07

-- post_statuses テーブル（投稿とステータスの関連付け）
CREATE TABLE post_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  user_status_id UUID REFERENCES user_statuses(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(post_id, user_status_id)
);

-- インデックス
CREATE INDEX post_statuses_post_id_idx ON post_statuses(post_id);
CREATE INDEX post_statuses_user_status_id_idx ON post_statuses(user_status_id);

-- RLS
ALTER TABLE post_statuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "投稿タグ（ステータス）は全員が閲覧可能" ON post_statuses FOR SELECT USING (true);

CREATE POLICY "投稿者のみタグ（ステータス）を追加可能" ON post_statuses
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM posts WHERE posts.id = post_id AND posts.user_id = auth.uid()
    )
  );

CREATE POLICY "投稿者のみタグ（ステータス）を削除可能" ON post_statuses
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM posts WHERE posts.id = post_id AND posts.user_id = auth.uid()
    )
  );
