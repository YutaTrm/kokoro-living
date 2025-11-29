import { Alert } from 'react-native';

/**
 * エラーハンドリングのユーティリティ関数
 */

/**
 * エラーをコンソールに出力し、ユーザーにアラートを表示
 * @param error エラーオブジェクト
 * @param customMessage カスタムエラーメッセージ（省略時は汎用メッセージ）
 */
export const handleError = (error: unknown, customMessage?: string): void => {
  console.error('エラー:', error);
  const message = customMessage || '予期しないエラーが発生しました';
  Alert.alert('エラー', message);
};

/**
 * エラーメッセージのみをアラート表示（コンソール出力なし）
 * @param message エラーメッセージ
 */
export const showError = (message: string): void => {
  Alert.alert('エラー', message);
};

/**
 * 成功メッセージを表示
 * @param title タイトル
 * @param message メッセージ
 */
export const showSuccess = (title: string, message: string): void => {
  Alert.alert(title, message);
};
