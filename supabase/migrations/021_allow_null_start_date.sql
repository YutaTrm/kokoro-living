-- start_dateのNOT NULL制約を外す（年月指定なしでの登録を許可）

-- user_diagnoses
ALTER TABLE user_diagnoses ALTER COLUMN start_date DROP NOT NULL;

-- user_treatments
ALTER TABLE user_treatments ALTER COLUMN start_date DROP NOT NULL;

-- user_medications
ALTER TABLE user_medications ALTER COLUMN start_date DROP NOT NULL;

-- user_statuses
ALTER TABLE user_statuses ALTER COLUMN start_date DROP NOT NULL;
