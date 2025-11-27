-- ブロック機能のために、followsテーブルのDELETEポリシーを更新
-- ブロックしたユーザーからのフォローも削除できるようにする

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "自分のフォローのみ削除可能" ON follows;

-- 新しいポリシーを作成
CREATE POLICY "自分のフォローまたはブロックしたユーザーからのフォローを削除可能" ON follows
FOR DELETE
USING (
  -- 自分がフォローしているレコード
  auth.uid() = follower_id
  OR
  -- 自分がブロックしたユーザーが自分をフォローしているレコード
  (
    auth.uid() = following_id
    AND EXISTS (
      SELECT 1 FROM blocks
      WHERE blocker_id = auth.uid()
      AND blocked_id = follower_id
    )
  )
);

COMMENT ON POLICY "自分のフォローまたはブロックしたユーザーからのフォローを削除可能" ON follows IS
'ユーザーは自分のフォローを削除できる。また、ブロック時に相手からのフォローも削除できる。';
