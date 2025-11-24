interface RecordWithStartDate {
  startDate: string | null;
}

/**
 * start_dateで昇順ソート（nullは最後）
 */
export function sortByStartDate<T extends RecordWithStartDate>(records: T[]): T[] {
  return [...records].sort((a, b) => {
    // 両方nullの場合は順序を維持
    if (a.startDate === null && b.startDate === null) return 0;
    // aがnullの場合はbより後
    if (a.startDate === null) return 1;
    // bがnullの場合はaより後
    if (b.startDate === null) return -1;
    // 両方日付がある場合は昇順
    return a.startDate.localeCompare(b.startDate);
  });
}
