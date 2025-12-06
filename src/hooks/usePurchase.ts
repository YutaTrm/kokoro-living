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
  ios: ['ai_reflection_2_tickets'],
  android: ['ai_reflection_2_tickets'],
  default: [],
}) as string[];

export const usePurchase = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [purchasing, setPurchasing] = useState(false);

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
        await initConnection();
        console.log('IAP接続成功');

        // 商品情報を取得
        const availableProducts = await fetchProducts({ skus: PRODUCT_IDS });
        console.log('商品情報取得成功:', availableProducts);
        if (availableProducts) {
          setProducts(availableProducts as Product[]);
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
              } catch (error) {
                console.error('レシート検証エラー:', error);
                Alert.alert('エラー', '購入処理に失敗しました。サポートにお問い合わせください。');
              }
            }
          }
        );
      } catch (error) {
        console.error('IAP初期化エラー:', error);
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
  const handlePurchase = useCallback(async () => {
    if (PRODUCT_IDS.length === 0) {
      Alert.alert('エラー', 'この端末では購入できません');
      return;
    }

    setPurchasing(true);
    try {
      // 購入リクエスト（プラットフォーム別）
      const purchaseArgs = Platform.OS === 'ios'
        ? { request: { sku: PRODUCT_IDS[0] }, type: 'in-app' as const }
        : { request: { skus: PRODUCT_IDS }, type: 'in-app' as const };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await requestPurchase(purchaseArgs as any);

      // 購入完了後の処理はpurchaseUpdatedListenerで行われる
      Alert.alert('成功', 'チケットを2回分追加しました！');
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
