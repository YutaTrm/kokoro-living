-- ============================================
-- スキーマキャッシュをリフレッシュ
-- ============================================

-- PostgREST のスキーマキャッシュをリロード
NOTIFY pgrst, 'reload schema';

-- 既存の外部キー制約を確認
SELECT
    con.conname AS constraint_name,
    att.attname AS column_name,
    cl2.relname AS referenced_table
FROM pg_constraint con
JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY(con.conkey)
JOIN pg_class cl ON cl.oid = con.conrelid
JOIN pg_class cl2 ON cl2.oid = con.confrelid
WHERE con.conrelid = 'reports'::regclass
AND con.contype = 'f'
ORDER BY con.conname;
