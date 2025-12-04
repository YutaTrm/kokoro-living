import { useCallback, useEffect, useState } from 'react';
import {
  initConnection,
  endConnection,
  getProducts,
  requestPurchase,
  Purchase,
  purchaseUpdatedListener,
  finishTransaction,
  PurchaseError,
  Product,
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
    let purchaseUpdateSubscription: any;

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
        const availableProducts = await getProducts(PRODUCT_IDS);
        console.log('商品情報取得成功:', availableProducts);
        setProducts(availableProducts);

        // 購入リスナーを設定
        purchaseUpdateSubscription = purchaseUpdatedListener(
          async (purchase: Purchase) => {
            console.log('購入イベント受信:', purchase);
            const receipt = purchase.transactionReceipt || purchase.transactionId;

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
    const receipt = purchase.transactionReceipt || purchase.transactionId || '';

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
      // 購入リクエスト
      await requestPurchase({ sku: PRODUCT_IDS[0], andDangerouslyFinishTransactionAutomaticallyIOS: false });

      // 購入完了後の処理はpurchaseUpdatedListenerで行われる
      Alert.alert('成功', 'チケットを2回分追加しました！');
    } catch (error: any) {
      console.error('購入エラー:', error);

      if ((error as PurchaseError).code === 'E_USER_CANCELLED') {
        // ユーザーがキャンセルした場合は何もしない
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
