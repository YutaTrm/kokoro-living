# OAuth認証設定ガイド

このガイドでは、Apple Sign InとGoogleサインインをSupabaseで設定する手順を説明します。

## 📋 目次

1. [Sign in with Appleの設定](#1-sign-in-with-appleの設定)
2. [Googleサインインの設定](#2-googleサインインの設定)
3. [アプリ側の確認](#3-アプリ側の確認)
4. [テスト手順](#4-テスト手順)

---

## 1. Sign in with Appleの設定

### 1-1. Apple Developer Consoleでの設定

#### ステップ1: App IDの設定
1. [Apple Developer Console](https://developer.apple.com/account/)にアクセス
2. 左メニューから「Certificates, Identifiers & Profiles」を選択
3. 「Identifiers」→ 既存のApp IDを選択（`com.yourteam.kokoroliving`など）
4. 「Sign in with Apple」にチェックを入れる
5. 「Save」をクリック

#### ステップ2: Services IDの作成
1. 「Identifiers」→ 「+」ボタンをクリック
2. 「Services IDs」を選択して「Continue」
3. 以下を入力：
   - **Description**: `Kokoro Living Sign In` （任意）
   - **Identifier**: `com.yourteam.kokoroliving.signin` （App IDとは異なる必要あり）
4. 「Continue」→「Register」
5. 作成したServices IDをクリックして編集
6. 「Sign in with Apple」にチェックを入れる
7. 「Configure」ボタンをクリック
8. 以下を設定：
   - **Primary App ID**: 先ほどのApp IDを選択
   - **Domains and Subdomains**: Supabaseプロジェクトのドメインを入力
     - 例：`<project-ref>.supabase.co`
     - Supabaseダッシュボード → Settings → APIで確認可能
   - **Return URLs**: SupabaseのコールバックURLを入力
     - 例：`https://<project-ref>.supabase.co/auth/v1/callback`
9. 「Save」→「Continue」→「Save」

#### ステップ3: Keyの作成
1. 左メニューから「Keys」を選択
2. 「+」ボタンをクリック
3. 以下を入力：
   - **Key Name**: `Sign in with Apple Key` （任意）
   - 「Sign in with Apple」にチェックを入れる
4. 「Configure」をクリック
5. **Primary App ID**を選択して「Save」
6. 「Continue」→「Register」
7. **Download Your Key**画面で：
   - ✅ `.p8`ファイルをダウンロード（再ダウンロード不可なので安全に保管）
   - ✅ **Key ID**をメモ（10文字の英数字）
8. **Team ID**をメモ：
   - Apple Developer Consoleの右上に表示されている（例：ABC123DEF4）

### 1-2. Supabaseでの設定

1. [Supabase Dashboard](https://app.supabase.com/)にアクセス
2. プロジェクトを選択
3. 左メニューから「Authentication」→「Providers」を選択
4. 「Apple」を探してクリック
5. 「Enable Sign in with Apple」をONにする
6. 以下を入力：
   - **Services ID**: `com.yourteam.kokoroliving.signin` （先ほど作成したServices ID）
   - **Key ID**: 先ほどメモした10文字のKey ID
   - **Team ID**: 先ほどメモしたTeam ID
   - **Secret Key**: `.p8`ファイルの内容をコピー＆ペースト
     - ファイルをテキストエディタで開き、全文をコピー
     - `-----BEGIN PRIVATE KEY-----` から `-----END PRIVATE KEY-----` まで
7. 「Save」をクリック

---

## 2. Googleサインインの設定

### 2-1. Google Cloud Consoleでの設定

#### ステップ1: プロジェクトの作成または選択
1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. 既存のプロジェクトがあればそれを選択、なければ新規作成
   - 新規作成の場合：画面上部の「プロジェクトを選択」→「新しいプロジェクト」
   - プロジェクト名：`Kokoro Living` （任意）

#### ステップ2: OAuth同意画面の設定
1. 左メニューから「APIとサービス」→「OAuth同意画面」を選択
2. ユーザータイプ：
   - **外部**を選択（一般公開する場合）
   - 「作成」をクリック
3. アプリ情報を入力：
   - **アプリ名**: `こころのリビング`
   - **ユーザーサポートメール**: あなたのメールアドレス
   - **デベロッパーの連絡先情報**: あなたのメールアドレス
4. 「保存して次へ」を繰り返して完了

#### ステップ3: OAuth 2.0 クライアントIDの作成

**3-1. Web用クライアントID**
1. 左メニューから「APIとサービス」→「認証情報」を選択
2. 「認証情報を作成」→「OAuth クライアント ID」
3. アプリケーションの種類：**ウェブ アプリケーション**
4. 名前：`Kokoro Living Web`
5. 承認済みのリダイレクトURIに追加：
   - `https://<project-ref>.supabase.co/auth/v1/callback`
   - SupabaseのプロジェクトURLを確認して入力
6. 「作成」をクリック
7. ✅ **クライアントID**と**クライアントシークレット**をメモ

**3-2. iOS用クライアントID**
1. 「認証情報を作成」→「OAuth クライアント ID」
2. アプリケーションの種類：**iOS**
3. 名前：`Kokoro Living iOS`
4. **Bundle ID**: `com.yourteam.kokoroliving` （app.jsonで設定したBundleID）
5. 「作成」をクリック

**3-3. Android用クライアントID**
1. 「認証情報を作成」→「OAuth クライアント ID」
2. アプリケーションの種類：**Android**
3. 名前：`Kokoro Living Android`
4. **パッケージ名**: `com.yourteam.kokoroliving` （app.jsonで設定したパッケージ名）
5. **SHA-1証明書フィンガープリント**の取得：

   **開発用（デバッグビルド）:**
   ```bash
   # Macの場合
   keytool -keystore ~/.android/debug.keystore -list -v -alias androiddebugkey
   # パスワード: android

   # SHA-1フィンガープリントをコピー（例：AB:CD:EF:12:34:56:...）
   ```

   **本番用（リリースビルド）:**
   ```bash
   # リリース用keystoreから取得
   keytool -keystore /path/to/release.keystore -list -v
   # keystoreのパスワードを入力
   ```

6. SHA-1フィンガープリントを入力
7. 「作成」をクリック

### 2-2. Supabaseでの設定

1. [Supabase Dashboard](https://app.supabase.com/)にアクセス
2. プロジェクトを選択
3. 左メニューから「Authentication」→「Providers」を選択
4. 「Google」を探してクリック
5. 「Enable Sign in with Google」をONにする
6. 以下を入力：
   - **Client ID**: Web用クライアントIDを入力
   - **Client Secret**: Web用クライアントシークレットを入力
7. 「Save」をクリック

---

## 3. アプリ側の確認

### 3-1. Supabase URLとANON KEYの確認

環境変数が正しく設定されていることを確認：

**EAS Environment Variables（本番・プレビュー用）:**
1. Expo Dashboard → プロジェクト → Secrets
2. 以下が設定されていることを確認：
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`

**ローカル開発用（.env）:**
```bash
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3-2. リダイレクトURLの確認

`LoginPrompt.tsx`で以下が設定されていることを確認：
```typescript
redirectTo: 'kokoroliving://auth/callback'
```

### 3-3. app.jsonの確認

`app.json`に以下が設定されていることを確認：
```json
{
  "expo": {
    "scheme": "kokoroliving",
    "ios": {
      "bundleIdentifier": "com.yourteam.kokoroliving"
    },
    "android": {
      "package": "com.yourteam.kokoroliving"
    }
  }
}
```

---

## 4. テスト手順

### 4-1. ローカル開発でのテスト

**重要：Development Buildが必要**
- カスタムスキーム（`kokoroliving://`）を使用するため、Expo Goでは動作しません
- 以下のいずれかでテスト：
  1. `npx expo run:ios`（iOS実機またはシミュレータ）
  2. `npx expo run:android`（Android実機またはエミュレータ）
  3. EAS Buildで作成したDevelopment Build

**テスト手順:**
1. アプリを起動
2. ログイン画面で各ボタンをタップ：
   - 「Appleでサインイン」
   - 「Googleでサインイン」
   - 「Xアカウントで登録」
3. 認証画面が開くことを確認
4. 認証を完了してアプリに戻る
5. ホーム画面が表示されることを確認

### 4-2. トラブルシューティング

**問題：「Invalid redirect URL」エラー**
- 原因：Supabase/Apple/Googleの設定でリダイレクトURLが一致していない
- 解決：各コンソールで設定したURLを再確認

**問題：「Provider not enabled」エラー**
- 原因：Supabaseで該当プロバイダーが有効化されていない
- 解決：Supabaseダッシュボード → Authentication → Providersで有効化

**問題：トークンが取得できない**
- 原因：Services ID/Client IDの設定ミス
- 解決：
  1. Apple: Services IDが正しいか確認
  2. Google: Web用クライアントIDを使用しているか確認

**問題：Androidでのみエラー**
- 原因：SHA-1フィンガープリントが正しくない
- 解決：開発用・本番用の両方を登録

**ログの確認:**
```bash
# iOSの場合
npx react-native log-ios

# Androidの場合
npx react-native log-android
```

コンソールに `[LoginPrompt]` のログが表示されるので、エラー箇所を特定できます。

---

## 5. チェックリスト

### Apple Sign In
- [ ] App IDにSign in with Appleを追加
- [ ] Services IDを作成
- [ ] Services IDにドメインとリダイレクトURLを設定
- [ ] Keyを作成してダウンロード
- [ ] SupabaseにServices ID、Key ID、Team ID、Secret Keyを設定

### Google Sign In
- [ ] Google Cloud Consoleでプロジェクト作成
- [ ] OAuth同意画面を設定
- [ ] Web用クライアントIDを作成
- [ ] iOS用クライアントIDを作成（Bundle ID設定）
- [ ] Android用クライアントIDを作成（SHA-1設定）
- [ ] SupabaseにWeb用のClient IDとClient Secretを設定

### アプリ側
- [ ] 環境変数が設定されている
- [ ] app.jsonにscheme、bundleIdentifier、packageが設定されている
- [ ] LoginPrompt.tsxが更新されている

### テスト
- [ ] Development Buildを作成
- [ ] Apple Sign Inをテスト
- [ ] Google Sign Inをテスト
- [ ] X認証をテスト

---

## 6. 本番デプロイ時の注意事項

### 本番用SHA-1フィンガープリントの追加
- 開発用とは別に、本番用（リリースビルド）のSHA-1フィンガープリントを登録
- Google Cloud Console → Android用クライアントID → 「SHA-1証明書フィンガープリントを追加」

### Appleアプリ審査
- Sign in with Appleを実装したアプリは、App Store審査時に実際にテスト可能である必要がある
- 審査用のテストアカウントは不要（Apple IDでテスト可能）

### プライバシーポリシー
- OAuth認証を使用する場合、プライバシーポリシーに以下を明記：
  - どのOAuthプロバイダーを使用するか
  - 取得するデータ（メールアドレス、名前など）
  - データの使用目的

---

## 7. 参考リンク

- [Supabase - Sign in with Apple](https://supabase.com/docs/guides/auth/social-login/auth-apple)
- [Supabase - Sign in with Google](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Apple Developer - Sign in with Apple](https://developer.apple.com/sign-in-with-apple/)
- [Google - OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
