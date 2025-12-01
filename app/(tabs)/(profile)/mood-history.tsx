import { useNavigation, useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useEffect, useLayoutEffect, useState } from 'react';
import { Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { Icon } from '@/components/ui/icon';
import { Spinner } from '@/components/ui/spinner';
import { supabase } from '@/src/lib/supabase';
import { MOOD_EMOJIS, MOOD_LABELS } from '@/src/hooks/useMoodCheckin';

interface MoodCheckin {
  id: string;
  mood: number;
  created_at: string;
}

interface MonthStats {
  totalCheckins: number;
  moodCounts: Record<number, number>;
}

export default function MoodHistoryScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [checkins, setCheckins] = useState<MoodCheckin[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [stats, setStats] = useState<MonthStats>({ totalCheckins: 0, moodCounts: {} });
  const [firstCheckinMonth, setFirstCheckinMonth] = useState<Date | null>(null);
  const [lastCheckinMonth, setLastCheckinMonth] = useState<Date | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'チェックイン履歴',
    });
  }, [navigation]);

  useEffect(() => {
    loadCheckinRange();
  }, []);

  useEffect(() => {
    loadMonthCheckins();
  }, [currentMonth]);

  const loadCheckinRange = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 全チェックインから最初と最後の日付を取得
      const { data, error } = await supabase
        .from('mood_checkins')
        .select('created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        const firstDate = new Date(data[0].created_at);
        const lastDate = new Date(data[data.length - 1].created_at);

        // 月の初日に設定
        setFirstCheckinMonth(new Date(firstDate.getFullYear(), firstDate.getMonth(), 1));
        setLastCheckinMonth(new Date(lastDate.getFullYear(), lastDate.getMonth(), 1));
      }
    } catch (error) {
      console.error('チェックイン範囲取得エラー:', error);
    }
  };

  const loadMonthCheckins = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1;
      const monthStart = `${year}-${month.toString().padStart(2, '0')}-01`;
      const nextMonth = new Date(year, month, 1);
      const monthEnd = `${nextMonth.getFullYear()}-${(nextMonth.getMonth() + 1).toString().padStart(2, '0')}-01`;

      const { data, error } = await supabase
        .from('mood_checkins')
        .select('id, mood, created_at')
        .eq('user_id', user.id)
        .gte('created_at', monthStart)
        .lt('created_at', monthEnd)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setCheckins(data || []);

      // 統計情報を計算
      const moodCounts: Record<number, number> = {};
      (data || []).forEach(c => {
        moodCounts[c.mood] = (moodCounts[c.mood] || 0) + 1;
      });

      setStats({
        totalCheckins: data?.length || 0,
        moodCounts,
      });
    } catch (error) {
      console.error('気分履歴取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const goToPreviousMonth = () => {
    const prevMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    // 最初のチェックイン月より前には戻れない
    if (!firstCheckinMonth || prevMonth >= firstCheckinMonth) {
      setCurrentMonth(prevMonth);
    }
  };

  const goToNextMonth = () => {
    const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    // 最後のチェックイン月より後には進めない
    if (!lastCheckinMonth || nextMonth <= lastCheckinMonth) {
      setCurrentMonth(nextMonth);
    }
  };

  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); // 0=日曜日
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // チェックインデータを日付ごとにマップ
    const checkinsMap = new Map<string, number>();
    checkins.forEach(c => {
      const date = new Date(c.created_at);
      const day = date.getDate();
      checkinsMap.set(day.toString(), c.mood);
    });

    const weeks: JSX.Element[] = [];
    let days: JSX.Element[] = [];

    // 曜日ヘッダー
    const weekDays = ['日', '月', '火', '水', '木', '金', '土'];
    const weekDayHeader = (
      <HStack key="header" className="justify-between mb-2">
        {weekDays.map((day, i) => (
          <Box key={i} className="w-[14%] items-center">
            <Text size="xs" className="text-typography-500">{day}</Text>
          </Box>
        ))}
      </HStack>
    );

    // 月初の空白
    for (let i = 0; i < firstDay; i++) {
      days.push(
        <Box key={`empty-${i}`} className="w-[14%] aspect-square" />
      );
    }

    // 日付セル
    for (let day = 1; day <= daysInMonth; day++) {
      const mood = checkinsMap.get(day.toString());
      const isToday =
        new Date().getDate() === day &&
        new Date().getMonth() === month &&
        new Date().getFullYear() === year;

      days.push(
        <Box
          key={day}
          className={`w-[14%] aspect-square items-center justify-start pt-1 ${
            isToday ? 'bg-primary-100 rounded-lg' : ''
          }`}
        >
          <Text size="xs" className="text-typography-900">{day}</Text>
          {mood && (
            <Text className="text-xl mt-1">{MOOD_EMOJIS[mood as keyof typeof MOOD_EMOJIS]}</Text>
          )}
        </Box>
      );

      // 週末（土曜日）で改行
      if (days.length === 7) {
        weeks.push(
          <HStack key={`week-${weeks.length}`} className="justify-between mb-2">
            {days}
          </HStack>
        );
        days = [];
      }
    }

    // 最終週の残り
    if (days.length > 0) {
      weeks.push(
        <HStack key={`week-${weeks.length}`} className="justify-between mb-2">
          {days}
        </HStack>
      );
    }

    return (
      <VStack space="sm">
        {weekDayHeader}
        {weeks}
      </VStack>
    );
  };

  // ボタンの無効化判定
  const canGoPrevious = firstCheckinMonth
    ? new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1) >= firstCheckinMonth
    : false;

  const canGoNext = lastCheckinMonth
    ? new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1) <= lastCheckinMonth
    : false;

  return (
    <SafeAreaView className="flex-1 bg-background-0" edges={['bottom']}>
      <ScrollView className="flex-1">
        <VStack className="p-4" space="xl">
          {/* 月選択 */}
          <HStack className="items-center justify-between">
            <Pressable
              onPress={goToPreviousMonth}
              disabled={!canGoPrevious}
              className="p-2"
            >
              <Icon
                as={ChevronLeft}
                size="lg"
                className={canGoPrevious ? 'text-typography-900' : 'text-typography-300'}
              />
            </Pressable>
            <Heading size="lg">
              {currentMonth.getFullYear()}年{currentMonth.getMonth() + 1}月
            </Heading>
            <Pressable
              onPress={goToNextMonth}
              disabled={!canGoNext}
              className="p-2"
            >
              <Icon
                as={ChevronRight}
                size="lg"
                className={canGoNext ? 'text-typography-900' : 'text-typography-300'}
              />
            </Pressable>
          </HStack>

          {/* ローディング */}
          {loading ? (
            <Box className="items-center py-8">
              <Spinner size="large" />
            </Box>
          ) : (
            <>
              {/* カレンダー */}
              <Box className="bg-background-50 rounded-lg p-4">
                {renderCalendar()}
              </Box>

              {/* 統計情報 */}
              <VStack space="md" className="bg-background-50 rounded-lg p-4">
                <Heading size="sm">今月の統計</Heading>
                <Text>チェックイン回数: {stats.totalCheckins}回</Text>

                {Object.keys(stats.moodCounts).length > 0 && (
                  <VStack space="sm" className="mt-2">
                    {Object.entries(stats.moodCounts)
                      .sort(([a], [b]) => Number(b) - Number(a))
                      .map(([mood, count]) => (
                        <HStack key={mood} space="md" className="items-center">
                          <Text className="text-2xl">
                            {MOOD_EMOJIS[Number(mood) as keyof typeof MOOD_EMOJIS]}
                          </Text>
                          <Text className="flex-1">
                            {MOOD_LABELS[Number(mood) as keyof typeof MOOD_LABELS]}
                          </Text>
                          <Text className="text-typography-500">{count}回</Text>
                        </HStack>
                      ))}
                  </VStack>
                )}
              </VStack>
            </>
          )}
        </VStack>
      </ScrollView>
    </SafeAreaView>
  );
}
