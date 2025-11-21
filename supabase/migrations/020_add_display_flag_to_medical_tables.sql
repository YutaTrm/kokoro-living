-- diagnoses/ingredients/treatments/statusesテーブルにdisplay_flagカラムを追加
-- display_flagがtrueのものだけを検索画面で表示するため

-- diagnosesテーブルにdisplay_flagを追加
ALTER TABLE diagnoses ADD COLUMN IF NOT EXISTS display_flag BOOLEAN DEFAULT true;

-- ingredientsテーブルにdisplay_flagを追加
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS display_flag BOOLEAN DEFAULT true;

-- treatmentsテーブルにdisplay_flagを追加
ALTER TABLE treatments ADD COLUMN IF NOT EXISTS display_flag BOOLEAN DEFAULT true;

-- statusesテーブルにdisplay_flagを追加
ALTER TABLE statuses ADD COLUMN IF NOT EXISTS display_flag BOOLEAN DEFAULT true;

-- 既存のレコードはすべてtrueに設定（デフォルト値により自動設定）
