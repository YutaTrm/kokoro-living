/**
 * 現在のタブを判定する共通関数
 * @param segments - useSegments()から取得したセグメント配列
 * @returns タブ名 '(home)' | '(search)' | '(notifications)' | '(profile)'
 */
export function getCurrentTab(segments: string[]): string {
  if (segments.includes('(notifications)')) return '(notifications)';
  if (segments.includes('(search)')) return '(search)';
  if (segments.includes('(profile)')) return '(profile)';
  if (segments.includes('(home)')) return '(home)';
  return '(home)'; // デフォルトはホーム
}
