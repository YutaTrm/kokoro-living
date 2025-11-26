-- 通報機能とpost非表示機能の実装

-- 1. postsテーブルに非表示フラグを追加
ALTER TABLE public.posts
ADD COLUMN is_hidden BOOLEAN DEFAULT FALSE NOT NULL,
ADD COLUMN hidden_at TIMESTAMPTZ,
ADD COLUMN hidden_reason TEXT;

-- 2. reportsテーブルを作成
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN (
    'self_harm',      -- 自傷・自殺の誘発
    'harassment',     -- ハラスメント・攻撃的な内容
    'spam',           -- スパム・宣伝
    'privacy',        -- 個人情報の漏洩
    'other'           -- その他
  )),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  -- 同じユーザーが同じ投稿を複数回通報できないようにする
  UNIQUE(post_id, reporter_id)
);

-- 3. reportsテーブルのインデックス
CREATE INDEX idx_reports_post_id ON public.reports(post_id);
CREATE INDEX idx_reports_reporter_id ON public.reports(reporter_id);
CREATE INDEX idx_reports_created_at ON public.reports(created_at DESC);

-- 4. RLSポリシーの設定
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- 通報は誰でも作成可能
CREATE POLICY "Anyone can create reports"
  ON public.reports
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

-- 自分が作成した通報のみ閲覧可能（将来的には管理者も閲覧可能にする）
CREATE POLICY "Users can view their own reports"
  ON public.reports
  FOR SELECT
  TO authenticated
  USING (auth.uid() = reporter_id);

-- 5. 通報処理用のRPC関数（閾値チェックと自動非表示）
CREATE OR REPLACE FUNCTION public.report_post(
  p_post_id UUID,
  p_reason TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reporter_id UUID;
  v_report_count INT;
  v_threshold INT;
  v_should_hide BOOLEAN := FALSE;
  v_already_hidden BOOLEAN;
BEGIN
  -- 認証されたユーザーIDを取得
  v_reporter_id := auth.uid();

  IF v_reporter_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 投稿が既に非表示かチェック
  SELECT is_hidden INTO v_already_hidden
  FROM public.posts
  WHERE id = p_post_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Post not found';
  END IF;

  -- 通報を挿入（重複の場合はエラー）
  INSERT INTO public.reports (post_id, reporter_id, reason, description)
  VALUES (p_post_id, v_reporter_id, p_reason, p_description);

  -- 通報数をカウント
  SELECT COUNT(*) INTO v_report_count
  FROM public.reports
  WHERE post_id = p_post_id;

  -- 理由ごとの閾値を設定
  CASE p_reason
    WHEN 'self_harm' THEN v_threshold := 3;   -- 自傷誘発は3件
    WHEN 'harassment' THEN v_threshold := 5;  -- ハラスメントは5件
    WHEN 'spam' THEN v_threshold := 5;        -- スパムは5件
    WHEN 'privacy' THEN v_threshold := 3;     -- 個人情報は3件
    WHEN 'other' THEN v_threshold := 10;      -- その他は10件
    ELSE v_threshold := 10;
  END CASE;

  -- 閾値を超えたら自動非表示（既に非表示でない場合のみ）
  IF v_report_count >= v_threshold AND NOT v_already_hidden THEN
    UPDATE public.posts
    SET
      is_hidden = TRUE,
      hidden_at = NOW(),
      hidden_reason = p_reason
    WHERE id = p_post_id;

    v_should_hide := TRUE;
  END IF;

  -- 結果を返す
  RETURN json_build_object(
    'success', TRUE,
    'report_count', v_report_count,
    'threshold', v_threshold,
    'hidden', v_should_hide
  );
END;
$$;

-- 6. 非表示投稿をタイムラインから除外するためのビューを更新
-- （既存のクエリを変更する必要があるため、アプリケーション側で is_hidden = FALSE をフィルタする）
