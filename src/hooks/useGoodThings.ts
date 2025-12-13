import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/src/lib/supabase';

// 5時基準の今日の日付を取得（0時〜4時59分は前日扱い）
function get5amBasedToday(): string {
  const now = new Date();

  // JST = UTC + 9時間
  const jstOffset = 9 * 60 * 60 * 1000;
  const jstTime = new Date(now.getTime() + jstOffset);

  // 5時間を引く（5時未満の場合は前日扱い）
  const adjustedTime = new Date(jstTime.getTime() - 5 * 60 * 60 * 1000);

  const year = adjustedTime.getUTCFullYear();
  const month = String(adjustedTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(adjustedTime.getUTCDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export interface GoodThing {
  id: string;
  content: string;
  recorded_date: string;
  display_order: number;
  created_at: string;
}

export interface GoodThingsByDate {
  date: string;
  items: GoodThing[];
}

export function useGoodThings() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [todayItems, setTodayItems] = useState<GoodThing[]>([]);
  const [history, setHistory] = useState<GoodThingsByDate[]>([]);
  const [hasMore, setHasMore] = useState(true);

  const fetchTodayItems = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = get5amBasedToday();

      const { data, error } = await supabase
        .from('user_good_things')
        .select('*')
        .eq('user_id', user.id)
        .eq('recorded_date', today)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setTodayItems(data || []);
    } catch (error) {
      console.error('今日の良かったリスト取得エラー:', error);
    }
  }, []);

  const fetchHistory = useCallback(async (reset = false) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const currentOffset = reset ? 0 : history.length;
      const limit = 30; // 日付ごとにグループ化するので多めに取得

      const { data, error } = await supabase
        .from('user_good_things')
        .select('*')
        .eq('user_id', user.id)
        .order('recorded_date', { ascending: false })
        .order('display_order', { ascending: true })
        .range(currentOffset, currentOffset + limit - 1);

      if (error) throw error;

      // 日付ごとにグループ化
      const grouped = (data || []).reduce<Record<string, GoodThing[]>>((acc, item) => {
        if (!acc[item.recorded_date]) {
          acc[item.recorded_date] = [];
        }
        acc[item.recorded_date].push(item);
        return acc;
      }, {});

      const newHistory: GoodThingsByDate[] = Object.entries(grouped)
        .map(([date, items]) => ({ date, items }))
        .sort((a, b) => b.date.localeCompare(a.date));

      if (reset) {
        setHistory(newHistory);
      } else {
        setHistory(prev => {
          const existingDates = new Set(prev.map(h => h.date));
          const uniqueNew = newHistory.filter(h => !existingDates.has(h.date));
          return [...prev, ...uniqueNew];
        });
      }

      setHasMore((data || []).length === limit);
    } catch (error) {
      console.error('良かったリスト履歴取得エラー:', error);
    }
  }, [history.length]);

  const submitGoodThings = useCallback(async (contents: string[]): Promise<GoodThing[]> => {
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('ログインが必要です');

      const today = get5amBasedToday();

      // 既存の今日の記録を削除
      await supabase
        .from('user_good_things')
        .delete()
        .eq('user_id', user.id)
        .eq('recorded_date', today);

      // 新しい記録を挿入
      const insertData = contents.map((content, index) => ({
        user_id: user.id,
        content: content.trim(),
        recorded_date: today,
        display_order: index + 1,
      }));

      const { data, error } = await supabase
        .from('user_good_things')
        .insert(insertData)
        .select();

      if (error) throw error;

      setTodayItems(data || []);
      return data || [];
    } finally {
      setSubmitting(false);
    }
  }, []);

  const deleteItem = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('user_good_things')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // ローカル状態を更新
      setTodayItems(prev => prev.filter(item => item.id !== id));
      setHistory(prev => prev.map(h => ({
        ...h,
        items: h.items.filter(item => item.id !== id),
      })).filter(h => h.items.length > 0));
    } catch (error) {
      console.error('良かったリスト削除エラー:', error);
      throw error;
    }
  }, []);

  const updateItem = useCallback(async (id: string, newContent: string) => {
    try {
      const { error } = await supabase
        .from('user_good_things')
        .update({ content: newContent.trim() })
        .eq('id', id);

      if (error) throw error;

      // ローカル状態を更新
      setTodayItems(prev => prev.map(item =>
        item.id === id ? { ...item, content: newContent.trim() } : item
      ));
      setHistory(prev => prev.map(h => ({
        ...h,
        items: h.items.map(item =>
          item.id === id ? { ...item, content: newContent.trim() } : item
        ),
      })));
    } catch (error) {
      console.error('良かったリスト更新エラー:', error);
      throw error;
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchTodayItems();
      setLoading(false);
    };
    load();
  }, [fetchTodayItems]);

  return {
    loading,
    submitting,
    todayItems,
    history,
    hasMore,
    hasRecordedToday: todayItems.length > 0,
    fetchTodayItems,
    fetchHistory,
    submitGoodThings,
    deleteItem,
    updateItem,
  };
}
