-- 気分チェックインの1日の基準を0時から5時に変更
-- 0時～4時59分は前日扱い、5時～23時59分は当日扱い

-- 既存のユニークインデックスを削除
DROP INDEX IF EXISTS idx_mood_checkins_user_date;

-- 重複データを削除（5時基準で同じ日に複数チェックインがある場合、最初のものだけを残す）
DELETE FROM mood_checkins
WHERE id IN (
  SELECT id
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY user_id, DATE((created_at AT TIME ZONE 'Asia/Tokyo') - INTERVAL '5 hours')
        ORDER BY created_at ASC
      ) as rn
    FROM mood_checkins
  ) sub
  WHERE rn > 1
);

-- 新しいユニークインデックスを作成（5時間遡った日付で判定）
CREATE UNIQUE INDEX idx_mood_checkins_user_date ON mood_checkins(
  user_id,
  DATE((created_at AT TIME ZONE 'Asia/Tokyo') - INTERVAL '5 hours')
);

COMMENT ON INDEX idx_mood_checkins_user_date IS 'ユーザーごとに1日1回のチェックイン制約（5時基準）';
