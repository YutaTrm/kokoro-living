-- ブロックテーブルのRLSポリシーを追加
-- ユーザーは「自分をブロックしている人」のリストも閲覧できるようにする
-- これにより、ブロックした側のアクションをブロックされた側から非表示にできる

CREATE POLICY "Users can view blocks against them" ON public.blocks
  FOR SELECT
  USING (auth.uid() = blocked_id);

COMMENT ON POLICY "Users can view blocks against them" ON public.blocks IS
'ユーザーは自分をブロックしている人のリストを閲覧できる。これにより、ブロックした側のアクションを自分の通知やいいね欄から除外できる。';
