-- リスト機能のテーブル作成

-- listsテーブル（リストのマスター）
CREATE TABLE lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) <= 20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス
CREATE INDEX lists_user_id_idx ON lists(user_id);
CREATE INDEX lists_created_at_idx ON lists(created_at DESC);

-- RLS
ALTER TABLE lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own lists"
  ON lists FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own lists"
  ON lists FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (
      SELECT COUNT(*) FROM lists WHERE user_id = auth.uid()
    ) < 5
  );

CREATE POLICY "Users can update their own lists"
  ON lists FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own lists"
  ON lists FOR DELETE
  USING (auth.uid() = user_id);

-- list_membersテーブル（リストに追加されたユーザー）
CREATE TABLE list_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  list_id UUID NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(list_id, user_id)
);

-- インデックス
CREATE INDEX list_members_list_id_idx ON list_members(list_id);
CREATE INDEX list_members_user_id_idx ON list_members(user_id);

-- RLS
ALTER TABLE list_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view members of their own lists"
  ON list_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM lists
      WHERE lists.id = list_members.list_id
      AND lists.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add members to their own lists"
  ON list_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lists
      WHERE lists.id = list_members.list_id
      AND lists.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can remove members from their own lists"
  ON list_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM lists
      WHERE lists.id = list_members.list_id
      AND lists.user_id = auth.uid()
    )
  );

-- updated_at自動更新トリガー
CREATE OR REPLACE FUNCTION update_lists_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER lists_updated_at_trigger
  BEFORE UPDATE ON lists
  FOR EACH ROW
  EXECUTE FUNCTION update_lists_updated_at();
