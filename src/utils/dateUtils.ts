/**
 * 日付関連のユーティリティ関数
 */

/**
 * 相対的な日付表示（X分前、X時間前など）
 */
export const formatRelativeDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'たった今';
  if (minutes < 60) return `${minutes}分前`;
  if (hours < 24) return `${hours}時間前`;
  if (days < 7) return `${days}日前`;
  return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
};

/**
 * 完全な日時表示（投稿詳細用）
 */
export const formatFullDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * 体験日時表示（年月のみ）
 */
export const formatExperiencedAt = (dateString: string): string => {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  return `${year}年${month}月頃`;
};

/**
 * 日付範囲の表示（開始日-終了日）
 */
export const formatDateRange = (startDate: string | null, endDate: string | null): string => {
  if (!startDate) return '';

  const start = new Date(startDate);
  const startYear = start.getFullYear();
  const startMonth = start.getMonth() + 1;

  if (!endDate) {
    return `${startYear}年${startMonth}月〜`;
  }

  const end = new Date(endDate);
  const endYear = end.getFullYear();
  const endMonth = end.getMonth() + 1;

  return `${startYear}年${startMonth}月〜${endYear}年${endMonth}月`;
};
