-- 月の無料AI振り返り枠を1回→2回に変更

CREATE OR REPLACE FUNCTION check_free_reflection_quota(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  start_of_month TIMESTAMP WITH TIME ZONE;
  free_count INTEGER;
BEGIN
  -- 今月の開始日時を取得
  start_of_month := date_trunc('month', NOW());

  -- 今月の無料生成回数を取得
  SELECT COUNT(*)
  INTO free_count
  FROM ai_reflections
  WHERE user_id = p_user_id
    AND is_free = true
    AND created_at >= start_of_month;

  -- 無料枠が残っているか（月2回まで）
  RETURN free_count < 2;
END;
$$;
