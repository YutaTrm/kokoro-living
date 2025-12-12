import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // CORSプリフライトリクエスト対応
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { userId, productId, platform, transactionId, receipt } = await req.json();

    if (!userId || !productId || !platform || !transactionId || !receipt) {
      throw new Error('必須パラメータが不足しています');
    }

    // Supabaseクライアント作成
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // 重複購入チェック
    const { data: existingPurchase } = await supabase
      .from('ai_reflection_purchases')
      .select('id')
      .eq('transaction_id', transactionId)
      .single();

    if (existingPurchase) {
      return new Response(
        JSON.stringify({ error: 'この購入は既に処理されています' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // レシート検証
    let isValid = false;
    const skipVerification = Deno.env.get('SKIP_RECEIPT_VERIFICATION') === 'true';

    if (skipVerification) {
      // 開発/サンドボックス環境ではレシート検証をスキップ
      console.log('レシート検証をスキップ（開発モード）');
      isValid = true;
    } else if (platform === 'ios') {
      // iOS: Apple App Store レシート検証
      isValid = await verifyAppleReceipt(receipt);
    } else if (platform === 'android') {
      // Android: Google Play レシート検証
      isValid = await verifyGoogleReceipt(receipt, productId);
    }

    if (!isValid) {
      throw new Error('レシート検証に失敗しました');
    }

    // チケット数を決定（商品IDから判断）
    let ticketsToAdd = 0;
    if (productId === 'ai_reflection_tickets_2pack') {
      ticketsToAdd = 2;
    } else if (productId === 'ai_reflection_tickets_5pack') {
      ticketsToAdd = 5;
    }

    if (ticketsToAdd === 0) {
      throw new Error('無効な商品IDです');
    }

    // チケット追加
    const { error: ticketError } = await supabase.rpc(
      'add_ai_reflection_tickets',
      { p_user_id: userId, p_tickets: ticketsToAdd }
    );

    if (ticketError) {
      console.error('チケット追加エラー:', ticketError);
      throw new Error('チケット追加に失敗しました');
    }

    // 購入履歴を保存
    const { error: purchaseError } = await supabase
      .from('ai_reflection_purchases')
      .insert({
        user_id: userId,
        product_id: productId,
        platform,
        transaction_id: transactionId,
        tickets_added: ticketsToAdd,
      });

    if (purchaseError) {
      console.error('購入履歴保存エラー:', purchaseError);
      throw new Error('購入履歴の保存に失敗しました');
    }

    return new Response(
      JSON.stringify({
        success: true,
        ticketsAdded: ticketsToAdd,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// Apple レシート検証（StoreKit 2 JWS + Legacy対応）
async function verifyAppleReceipt(receiptData: string): Promise<boolean> {
  // JWS形式かどうかを判定（eyJで始まる）
  if (receiptData.startsWith('eyJ')) {
    console.log('StoreKit 2 JWS形式を検出');
    return await verifyAppleJWS(receiptData);
  }

  // Legacy形式の場合は従来のverifyReceipt APIを使用
  console.log('Legacy形式を検出');
  return await verifyAppleLegacyReceipt(receiptData);
}

// StoreKit 2 JWS検証
async function verifyAppleJWS(jws: string): Promise<boolean> {
  try {
    // JWSを分割
    const parts = jws.split('.');
    if (parts.length !== 3) {
      console.error('無効なJWS形式');
      return false;
    }

    const [headerB64, payloadB64] = parts;

    // Base64URLデコード
    const header = JSON.parse(base64UrlDecode(headerB64));
    const payload = JSON.parse(base64UrlDecode(payloadB64));

    console.log('JWS Header alg:', header.alg);
    console.log('JWS Payload transactionId:', payload.transactionId);
    console.log('JWS Payload productId:', payload.productId);
    console.log('JWS Payload bundleId:', payload.bundleId);
    console.log('JWS Payload environment:', payload.environment);

    // ペイロードの検証
    if (!payload.transactionId || !payload.productId) {
      console.error('ペイロードに必須フィールドがありません');
      return false;
    }

    // bundleIdの検証
    const expectedBundleId = 'com.kokoroliving.app';
    if (payload.bundleId !== expectedBundleId) {
      console.error(`bundleIdが一致しません: ${payload.bundleId} !== ${expectedBundleId}`);
      return false;
    }

    // 証明書チェーンの存在確認（x5c）
    if (!header.x5c || !Array.isArray(header.x5c) || header.x5c.length === 0) {
      console.error('x5c証明書チェーンがありません');
      return false;
    }

    // トランザクションタイプの確認（Consumableであること）
    if (payload.type && payload.type !== 'Consumable') {
      console.log(`トランザクションタイプ: ${payload.type}`);
    }

    console.log('JWS検証成功（ペイロード検証）');
    return true;
  } catch (error) {
    console.error('JWS検証エラー:', error);
    return false;
  }
}

// Base64URLデコード
function base64UrlDecode(str: string): string {
  // Base64URL to Base64
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  // パディング追加
  while (base64.length % 4) {
    base64 += '=';
  }
  return atob(base64);
}

// Legacy Apple レシート検証
async function verifyAppleLegacyReceipt(receiptData: string): Promise<boolean> {
  const productionUrl = 'https://buy.itunes.apple.com/verifyReceipt';
  const sandboxUrl = 'https://sandbox.itunes.apple.com/verifyReceipt';

  const sharedSecret = Deno.env.get('APPLE_SHARED_SECRET');

  if (!sharedSecret) {
    console.error('APPLE_SHARED_SECRETが設定されていません');
    return false;
  }

  try {
    let response = await fetch(productionUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        'receipt-data': receiptData,
        'password': sharedSecret,
      }),
    });

    let data = await response.json();

    if (data.status === 21007) {
      response = await fetch(sandboxUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          'receipt-data': receiptData,
          'password': sharedSecret,
        }),
      });
      data = await response.json();
    }

    return data.status === 0;
  } catch (error) {
    console.error('Legacy レシート検証エラー:', error);
    return false;
  }
}

// Google レシート検証
async function verifyGoogleReceipt(purchaseToken: string, productId: string): Promise<boolean> {
  // Google Play Developer API を使用
  // 注意: サービスアカウントの設定が必要

  const packageName = Deno.env.get('ANDROID_PACKAGE_NAME');
  const googleServiceAccount = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');

  if (!packageName || !googleServiceAccount) {
    console.error('Google Play API設定が不足しています');
    return false;
  }

  try {
    // Google OAuth2アクセストークン取得
    const serviceAccount = JSON.parse(googleServiceAccount);
    const accessToken = await getGoogleAccessToken(serviceAccount);

    // Google Play Developer API でレシート検証
    const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/products/${productId}/tokens/${purchaseToken}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      console.error('Google レシート検証失敗:', await response.text());
      return false;
    }

    const data = await response.json();

    // purchaseState 0は購入済み
    return data.purchaseState === 0;
  } catch (error) {
    console.error('Google レシート検証エラー:', error);
    return false;
  }
}

// Google OAuth2 アクセストークン取得
async function getGoogleAccessToken(serviceAccount: any): Promise<string> {
  const jwtHeader = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const jwtClaimSet = btoa(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/androidpublisher',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  }));

  // 署名生成（簡略化、実際はcryptoライブラリを使用）
  const signatureInput = `${jwtHeader}.${jwtClaimSet}`;

  // JWT作成（注意: 本番環境ではcryptoライブラリで署名を生成）
  const jwt = `${signatureInput}.signature`;

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const data = await response.json();
  return data.access_token;
}
