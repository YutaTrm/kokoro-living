-- 他のユーザーの医療情報を閲覧可能にする（プライバシー設定は後で追加可能）

-- user_diagnoses: 全員が閲覧可能に
DROP POLICY IF EXISTS "Users can view own diagnoses" ON user_diagnoses;
CREATE POLICY "Users can view all diagnoses" ON user_diagnoses
  FOR SELECT USING (true);

-- user_treatments: 全員が閲覧可能に
DROP POLICY IF EXISTS "Users can view own treatments" ON user_treatments;
CREATE POLICY "Users can view all treatments" ON user_treatments
  FOR SELECT USING (true);

-- user_medications: 全員が閲覧可能に
DROP POLICY IF EXISTS "Users can view own medications" ON user_medications;
CREATE POLICY "Users can view all medications" ON user_medications
  FOR SELECT USING (true);

-- user_statuses: 全員が閲覧可能に
DROP POLICY IF EXISTS "Users can view own statuses" ON user_statuses;
CREATE POLICY "Users can view all statuses" ON user_statuses
  FOR SELECT USING (true);
