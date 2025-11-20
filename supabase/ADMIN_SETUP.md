# 管理者設定ガイド

## 初期管理者の設定方法

### 1. マイグレーションを実行

`003_add_admin_role.sql`をSupabase SQL Editorで実行してください。

### 2. 自分のアカウントを管理者にする

#### 方法1: Supabase Dashboard

1. Supabase Dashboard → **Table Editor** → **profiles**
2. 自分のユーザーIDの行を見つける
3. `is_admin`カラムを`false`から`true`に変更
4. 保存

#### 方法2: SQL Editor

```sql
-- 自分のuser_idを確認
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- 該当user_idのis_adminをtrueに設定
UPDATE profiles SET is_admin = true WHERE user_id = 'あなたのuser_id';
```

### 3. 管理者権限の確認

管理者になると、以下が可能になります：

- ✅ 診断名マスターの追加・編集・削除
- ✅ 治療法マスターの追加・編集・削除
- ✅ 有効成分マスターの追加・編集・削除
- ✅ 製品マスターの追加・編集・削除

## セキュリティ

- `is_admin`フラグは、ユーザー自身が変更できません
- 管理者フラグの変更は、Supabase Dashboardまたは別の管理者のみが可能
- 一般ユーザーは自分のプロフィール（`display_name`, `bio`）のみ編集可能

## 将来の拡張

管理画面を作成する場合：

1. **管理者専用ページ**を作成（例：`/admin`）
2. ページアクセス時に`is_admin`をチェック
3. 管理者のみがアクセス可能にする

```typescript
// 管理者チェックの例
const { data: profile } = await supabase
  .from('profiles')
  .select('is_admin')
  .eq('user_id', user.id)
  .single();

if (!profile?.is_admin) {
  // 管理者でない場合はリダイレクト
  router.push('/');
}
```
