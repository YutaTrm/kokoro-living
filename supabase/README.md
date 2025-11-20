# Supabase SQL管理

このディレクトリはSupabaseのデータベース関連ファイルを管理します。

## ディレクトリ構造

```
/supabase/
  /migrations/     # スキーマ変更のマイグレーションファイル
  /seeds/          # テストデータやマスターデータ
  /functions/      # Supabase Edge Functions（将来使う場合）
  README.md        # このファイル
```

## マイグレーションファイルの命名規則

`XXX_description.sql` の形式で命名してください。

例：
- `001_initial_schema.sql` - 初期スキーマ
- `002_add_likes_table.sql` - いいね機能のテーブル追加
- `003_add_comments.sql` - コメント機能追加

## 実行方法

### Supabase Dashboard で実行

1. https://supabase.com/dashboard にアクセス
2. プロジェクトを選択
3. **SQL Editor** を開く
4. マイグレーションファイルの内容をコピー＆ペースト
5. **Run** をクリック

### ローカルで実行（Supabase CLI使用時）

```bash
supabase db push
```

## 注意事項

- マイグレーションは番号順に実行してください
- 本番環境に適用する前に、必ずバックアップを取ってください
- RLS（Row Level Security）ポリシーは必ず設定してください
