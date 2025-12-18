-- 2025年11月以降のexperienced_atをnullに更新
UPDATE posts
SET experienced_at = NULL
WHERE experienced_at >= '2025-11-01';
