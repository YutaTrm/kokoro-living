import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface MoodCheckin {
  id: string;
  user_id: string;
  mood: number;
  created_at: string;
}

export interface MoodStats {
  totalCheckins: number;
  sameMoodCount: number;
  moodCounts: Record<number, number>; // 各気分ごとのカウント
}

export const MOOD_EMOJIS = {
  1: '😞',
  2: '😔',
  3: '😐',
  4: '🙂',
  5: '😊',
} as const;

export const MOOD_LABELS = {
  1: 'とても良くない',
  2: '良くない',
  3: '普通',
  4: '良い',
  5: 'とても良い',
} as const;

// 5時基準の日付を取得（0時～4時59分は前日扱い）
function get5amBasedDate(): string {
  const now = new Date();

  // JST = UTC + 9時間
  const jstOffset = 9 * 60 * 60 * 1000;
  const jstTime = new Date(now.getTime() + jstOffset);

  // 5時未満の場合は1日前にする（5時間を引く）
  const adjustedTime = new Date(jstTime.getTime() - 5 * 60 * 60 * 1000);

  const year = adjustedTime.getUTCFullYear();
  const month = String(adjustedTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(adjustedTime.getUTCDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function useMoodCheckin() {
  const [todayCheckin, setTodayCheckin] = useState<MoodCheckin | null>(null);
  const [stats, setStats] = useState<MoodStats>({ totalCheckins: 0, sameMoodCount: 0, moodCounts: {} });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // 今日のチェックイン状態を取得
  const fetchTodayCheckin = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // 5時基準で今日の日付を取得
      const todayStart = get5amBasedDate();

      const { data, error } = await supabase
        .from('mood_checkins')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', todayStart)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setTodayCheckin(data);
    } catch (error) {
      console.error('今日のチェックイン取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  // 統計情報を取得
  const fetchStats = async (mood?: number) => {
    try {
      // 5時基準で今日の日付を取得
      const todayStart = get5amBasedDate();

      // 今日の全チェックインデータを取得
      const { data: allCheckins, error: allError } = await supabase
        .from('mood_checkins')
        .select('mood')
        .gte('created_at', todayStart);

      if (allError) throw allError;

      // 気分ごとのカウントを集計
      const moodCounts: Record<number, number> = {};
      let sameMoodCount = 0;

      (allCheckins || []).forEach(checkin => {
        moodCounts[checkin.mood] = (moodCounts[checkin.mood] || 0) + 1;
        if (mood && checkin.mood === mood) {
          sameMoodCount++;
        }
      });

      setStats({
        totalCheckins: allCheckins?.length || 0,
        sameMoodCount,
        moodCounts,
      });
    } catch (error) {
      console.error('統計情報取得エラー:', error);
    }
  };

  // チェックイン実行
  const submitCheckin = async (mood: number) => {
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('ログインしてください');
      }

      const { data, error } = await supabase
        .from('mood_checkins')
        .insert({
          user_id: user.id,
          mood,
        })
        .select()
        .single();

      if (error) throw error;

      setTodayCheckin(data);
      await fetchStats(mood);
      return { success: true, data };
    } catch (error: any) {
      console.error('チェックイン送信エラー:', error);

      // 重複エラーの場合
      if (error.code === '23505') {
        return { success: false, error: '今日はすでにチェックイン済みです' };
      }

      return { success: false, error: 'チェックインに失敗しました' };
    } finally {
      setSubmitting(false);
    }
  };

  // リフレッシュ
  const refresh = async () => {
    setLoading(true);
    await fetchTodayCheckin();
    if (todayCheckin) {
      await fetchStats(todayCheckin.mood);
    }
  };

  useEffect(() => {
    fetchTodayCheckin();
  }, []);

  useEffect(() => {
    if (todayCheckin) {
      fetchStats(todayCheckin.mood);
    }
  }, [todayCheckin]);

  return {
    todayCheckin,
    stats,
    loading,
    submitting,
    submitCheckin,
    refresh,
    hasCheckedIn: !!todayCheckin,
  };
}
