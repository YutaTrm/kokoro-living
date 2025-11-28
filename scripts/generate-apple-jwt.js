/**
 * Apple Sign In用のJWTを生成するスクリプト
 *
 * 使い方:
 * 1. npm install jsonwebtoken
 * 2. node scripts/generate-apple-jwt.js
 */

const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// ========================================
// ここに設定を入力してください
// ========================================
const TEAM_ID = 'YOUR_TEAM_ID';        // 例: ABC123DEF4
const KEY_ID = 'YOUR_KEY_ID';          // 例: XYZ987WVU6
const CLIENT_ID = 'YOUR_SERVICES_ID';  // 例: com.yourteam.kokoroliving.signin
const P8_FILE_PATH = './AuthKey_YOUR_KEY_ID.p8'; // .p8ファイルのパス

// ========================================
// JWT生成
// ========================================
try {
  // .p8ファイルを読み込み
  const privateKey = fs.readFileSync(path.resolve(P8_FILE_PATH), 'utf8');

  // JWTペイロード
  const payload = {
    iss: TEAM_ID,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 15777000, // 6ヶ月後
    aud: 'https://appleid.apple.com',
    sub: CLIENT_ID,
  };

  // JWT署名
  const token = jwt.sign(payload, privateKey, {
    algorithm: 'ES256',
    keyid: KEY_ID,
  });

  console.log('\n========================================');
  console.log('Apple Sign In JWT生成完了！');
  console.log('========================================\n');
  console.log('Supabaseの設定に以下を入力してください:\n');
  console.log('Client ID (Services ID):');
  console.log(CLIENT_ID);
  console.log('\nSecret Key (JWT):');
  console.log(token);
  console.log('\n========================================\n');

  // ファイルにも保存
  fs.writeFileSync('apple-jwt.txt', `Client ID: ${CLIENT_ID}\n\nSecret Key (JWT):\n${token}`);
  console.log('✅ apple-jwt.txt にも保存しました\n');

} catch (error) {
  console.error('エラー:', error.message);
  console.log('\n確認事項:');
  console.log('1. jsonwebtokenをインストールしましたか？ → npm install jsonwebtoken');
  console.log('2. .p8ファイルのパスは正しいですか？');
  console.log('3. TEAM_ID、KEY_ID、CLIENT_IDは正しく入力しましたか？');
}
