import { useCallback, useEffect, useState } from 'react';
import {
  initConnection,
  endConnection,
  fetchProducts,
  requestPurchase,
  purchaseUpdatedListener,
  finishTransaction,
  type Purchase,
  type Product,
} from 'react-native-iap';
import { Alert, Platform } from 'react-native';
import { supabase } from '@/src/lib/supabase';

// 商品ID
const PRODUCT_IDS = Platform.select({
  ios: ['ai_reflection_tickets_2pack'],
  android: ['ai_reflection_tickets_2pack'],
  default: [],
}) as string[];

// 確認用の仮データ（本番では削除）
const MOCK_PRODUCTS: Product[] = [
  {
    id: 'ai_reflection_tickets_2pack',
    title: 'AI振り返りチケット(2枚)',
    description: 'AI振り返り機能を2回利用できるチケットです。',
    displayPrice: '¥100',
  } as Product,
  {
    id: 'ai_reflection_tickets_5pack',
    title: 'AI振り返りチケット(5枚)',
    description: 'AI振り返り機能を5回利用できるチケットです。',
    displayPrice: '¥200',
  } as Product,
];
const USE_MOCK_PRODUCTS = true; // 確認用：本番ではfalseにする

interface UsePurchaseOptions {
  onPurchaseComplete?: () => void;
}

export const usePurchase = (options?: UsePurchaseOptions) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const onPurchaseCompleteRef = { current: options?.onPurchaseComplete };

  // オプションの更新を反映
  onPurchaseCompleteRef.current = options?.onPurchaseComplete;

  // IAPの初期化と商品情報取得
  useEffect(() => {
    let purchaseUpdateSubscription: { remove: () => void } | undefined;

    const initialize = async () => {
      try {
        // ログイン状態をチェック
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.log('未ログイン: IAP初期化をスキップ');
          return;
        }

        // IAPを初期化
        console.log('IAP初期化開始...');
        const connectionResult = await initConnection();
        console.log('IAP接続成功:', connectionResult);

        // 商品情報を取得
        if (USE_MOCK_PRODUCTS) {
          console.log('確認用の仮データを使用');
          setProducts(MOCK_PRODUCTS);
        } else {
          console.log('商品情報取得中... SKUs:', PRODUCT_IDS);
          const availableProducts = await fetchProducts({ skus: PRODUCT_IDS });
          console.log('商品情報取得結果:', JSON.stringify(availableProducts, null, 2));
          console.log('商品数:', availableProducts?.length || 0);
          if (availableProducts && availableProducts.length > 0) {
            setProducts(availableProducts as Product[]);
          } else {
            console.warn('⚠️ 商品が見つかりません。App Store Connectで商品が設定されているか確認してください');
          }
        }

        // 購入リスナーを設定
        purchaseUpdateSubscription = purchaseUpdatedListener(
          async (purchase: Purchase) => {
            console.log('購入イベント受信:', purchase);
            const receipt = purchase.transactionId;

            if (receipt) {
              try {
                // レシート検証
                await verifyPurchase(purchase);

                // トランザクション完了
                await finishTransaction({ purchase, isConsumable: true });
                console.log('トランザクション完了');

                // 購入成功
                Alert.alert('成功', 'チケットを2枚追加しました！');
                onPurchaseCompleteRef.current?.();
              } catch (error) {
                console.error('レシート検証エラー:', error);
                Alert.alert('エラー', '購入処理に失敗しました。サポートにお問い合わせください。');
              }
            }
          }
        );
      } catch (error) {
        console.error('IAP初期化エラー:', error);
        console.error('エラー詳細:', JSON.stringify(error, null, 2));
      }
    };

    initialize();

    // クリーンアップ
    return () => {
      if (purchaseUpdateSubscription) {
        purchaseUpdateSubscription.remove();
      }
      endConnection();
    };
  }, []);

  // レシート検証
  const verifyPurchase = async (purchase: Purchase) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('ユーザーが見つかりません');

    const platform = Platform.OS === 'ios' ? 'ios' : 'android';
    const receipt = purchase.transactionId || '';

    // Edge Functionを呼び出し
    const { data, error } = await supabase.functions.invoke('verify-purchase', {
      body: {
        userId: user.id,
        productId: purchase.productId,
        platform,
        transactionId: purchase.transactionId,
        receipt,
      },
    });

    if (error) throw error;
    if (data?.error) throw new Error(data.error);

    return data;
  };

  // 購入処理
  const handlePurchase = useCallback(async (sku: string) => {
    console.log('handlePurchase開始, SKU:', sku);

    if (!sku) {
      Alert.alert('エラー', '商品が選択されていません');
      return;
    }

    setPurchasing(true);
    try {
      console.log('購入リクエスト送信中...');
      // 購入リクエスト
      if (Platform.OS === 'ios') {
        console.log('iOS購入リクエスト実行');
        const result = await requestPurchase({
          type: 'in-app',
          request: {
            ios: {
              sku,
            },
          },
        });
        console.log('iOS購入リクエスト結果:', result);
      } else {
        console.log('Android購入リクエスト実行');
        const result = await requestPurchase({
          type: 'in-app',
          request: {
            android: {
              skus: [sku],
            },
          },
        });
        console.log('Android購入リクエスト結果:', result);
      }

      // 購入完了後の処理はpurchaseUpdatedListenerで行われる
      console.log('購入リクエスト完了');
    } catch (error: unknown) {
      console.error('購入エラー:', error);

      // ユーザーキャンセルのチェック
      const errorMessage = error instanceof Error ? error.message : '';
      if (errorMessage.includes('cancel') || errorMessage.includes('Cancel')) {
        console.log('購入がキャンセルされました');
      } else {
        Alert.alert('エラー', '購入に失敗しました');
      }
    } finally {
      setPurchasing(false);
    }
  }, []);

  return {
    products,
    loading,
    purchasing,
    handlePurchase,
  };
};
