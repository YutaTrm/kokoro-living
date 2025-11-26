-- 通報テーブルの外部キー制約を修正

-- 既存の外部キー制約を削除
ALTER TABLE public.reports
DROP CONSTRAINT reports_reporter_id_fkey;

-- auth.usersを参照する外部キー制約を追加
ALTER TABLE public.reports
ADD CONSTRAINT reports_reporter_id_fkey
FOREIGN KEY (reporter_id)
REFERENCES auth.users(id)
ON DELETE CASCADE;
