-- ============================================
-- reports テーブルに外部キー制約を追加
-- ============================================

-- reporter_id に外部キー制約を追加
ALTER TABLE reports
ADD CONSTRAINT reports_reporter_id_fkey
FOREIGN KEY (reporter_id)
REFERENCES users(user_id)
ON DELETE CASCADE;

-- reported_user_id に外部キー制約を追加（既存の場合はスキップ）
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'reports'
        AND column_name = 'reported_user_id'
    ) THEN
        ALTER TABLE reports
        ADD CONSTRAINT reports_reported_user_id_fkey
        FOREIGN KEY (reported_user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- post_id に外部キー制約を追加
ALTER TABLE reports
ADD CONSTRAINT reports_post_id_fkey
FOREIGN KEY (post_id)
REFERENCES posts(id)
ON DELETE CASCADE;
