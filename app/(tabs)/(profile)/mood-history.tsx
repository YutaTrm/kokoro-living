import { useNavigation, useRouter } from 'expo-router';
import { useEffect, useLayoutEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Calendar, DateData, LocaleConfig } from 'react-native-calendars';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Box } from '@/components/ui/box';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { MOOD_EMOJIS, MOOD_LABELS } from '@/src/hooks/useMoodCheckin';
import { supabase } from '@/src/lib/supabase';

// 日本語ロケール設定
LocaleConfig.locales['jp'] = {
  monthNames: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
  monthNamesShort: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
  dayNames: ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'],
  dayNamesShort: ['日', '月', '火', '水', '木', '金', '土'],
  today: '今日'
};
LocaleConfig.defaultLocale = 'jp';

interface MoodCheckin {
  id: string;
  mood: number;
  created_at: string;
}

interface MonthStats {
  totalCheckins: number;
  moodCounts: Record<number, number>;
}

// created_atから5時基準の日付を取得（0時～4時59分は前日扱い）
function get5amBasedDateFromTimestamp(timestamp: string): string {
  const date = new Date(timestamp);

  // JST = UTC + 9時間
  const jstOffset = 9 * 60 * 60 * 1000;
  const jstTime = new Date(date.getTime() + jstOffset);

  // 5時間を引く（5時未満の場合は前日扱い）
  const adjustedTime = new Date(jstTime.getTime() - 5 * 60 * 60 * 1000);

  const year = adjustedTime.getUTCFullYear();
  const month = String(adjustedTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(adjustedTime.getUTCDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

// 5時基準の今日の日付を取得
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

export default function MoodHistoryScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [checkins, setCheckins] = useState<MoodCheckin[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [stats, setStats] = useState<MonthStats>({ totalCheckins: 0, moodCounts: {} });
  const [firstCheckinMonth, setFirstCheckinMonth] = useState<Date | null>(null);
  const [lastCheckinMonth, setLastCheckinMonth] = useState<Date | null>(null);
  const [totalAllCheckins, setTotalAllCheckins] = useState(0);

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

        // 全期間のチェックイン回数を設定
        setTotalAllCheckins(data.length);
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

  // マークされた日付を作成
  const markedDates: { [key: string]: any } = {};
  checkins.forEach(c => {
    const dateStr = c.created_at.split('T')[0]; // YYYY-MM-DD形式
    const mood = c.mood;
    markedDates[dateStr] = {
      marked: true,
      dotColor: 'transparent',
      customStyles: {
        container: {
          backgroundColor: new Date().toISOString().split('T')[0] === dateStr ? '#e0f2fe' : 'transparent',
        },
        text: {
          color: '#000',
        },
      },
    };
  });

  const handleMonthChange = (month: DateData) => {
    const newMonth = new Date(month.year, month.month - 1, 1);

    // 範囲チェック
    if (firstCheckinMonth && newMonth < firstCheckinMonth) return;
    if (lastCheckinMonth && newMonth > lastCheckinMonth) return;

    setCurrentMonth(newMonth);
  };

  const currentDateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-01`;

  // 範囲制限用の日付文字列
  const minDateStr = firstCheckinMonth
    ? `${firstCheckinMonth.getFullYear()}-${String(firstCheckinMonth.getMonth() + 1).padStart(2, '0')}-01`
    : undefined;

  const maxDateStr = lastCheckinMonth
    ? `${lastCheckinMonth.getFullYear()}-${String(lastCheckinMonth.getMonth() + 1).padStart(2, '0')}-${new Date(lastCheckinMonth.getFullYear(), lastCheckinMonth.getMonth() + 1, 0).getDate()}`
    : undefined;

  // 矢印ボタンの無効化判定
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
          {/* ローディング */}
          {loading ? (
            <Box className="items-center py-8">
              <Spinner size="large" />
            </Box>
          ) : (
            <>
              {/* カレンダー */}
              <Calendar
                current={currentDateStr}
                onMonthChange={handleMonthChange}
                minDate={minDateStr}
                maxDate={maxDateStr}
                disableArrowLeft={!canGoPrevious}
                disableArrowRight={!canGoNext}
                hideExtraDays
                theme={{
                  textDayFontSize: 14,
                  textMonthFontSize: 18,
                  textMonthFontWeight: 'bold',
                  // @ts-ignore - カスタムスタイルシート
                  'stylesheet.calendar.main': {
                    week: {
                      marginTop: 0,
                      marginBottom: 4,
                      flexDirection: 'row',
                      justifyContent: 'space-around',
                    },
                  },
                }}
                style={{
                  borderRadius: 12,
                  padding: 8,
                }}
                renderHeader={(date) => {
                  const year = currentMonth.getFullYear();
                  const month = currentMonth.getMonth() + 1;
                  return (
                    <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
                      {year} {month}月
                    </Text>
                  );
                }}
                dayComponent={({ date, state }) => {
                  if (!date) return <View style={{ width: 40, height: 60 }} />;

                  const dateStr = date.dateString;
                  const checkin = checkins.find(c => get5amBasedDateFromTimestamp(c.created_at) === dateStr);
                  const isToday = get5amBasedToday() === dateStr;
                  const isDisabled = state === 'disabled';

                  return (
                    <View style={{
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      paddingTop: 2,
                      backgroundColor: isToday ? '#e0f2fe' : 'transparent',//transparent
                      // borderRadius: 8,
                      width: 40,
                      height: 60,
                    }}>
                      <Text style={{
                        fontSize: 14,
                        color: isDisabled ? '#d1d5db' : '#000',
                        fontWeight: isToday ? 'bold' : 'normal',
                      }}>
                        {date.day}
                      </Text>
                      {checkin && !isDisabled && (
                        <View style={{ alignItems: 'center', marginTop: -2 }}>
                          <Text style={{ fontSize: 20, lineHeight: 24 }}>
                            {MOOD_EMOJIS[checkin.mood as keyof typeof MOOD_EMOJIS]}
                          </Text>
                          <Text style={{ fontSize: 10, color: '#6b7280', marginTop: -6 }}>
                            {(() => {
                              const date = new Date(checkin.created_at);
                              const jstOffset = 9 * 60 * 60 * 1000;
                              const jstTime = new Date(date.getTime() + jstOffset);
                              const hours = String(jstTime.getUTCHours()).padStart(2, '0');
                              const minutes = String(jstTime.getUTCMinutes()).padStart(2, '0');
                              return `${hours}:${minutes}`;
                            })()}
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                }}
              />

              {/* 統計情報 */}
              <VStack space="md" className="bg-background-50 rounded-lg p-4">
                <HStack space="md">
                  <Heading size="sm">全期間のチェックイン回数 </Heading>
                  <Text className="text-typography-600">
                    {totalAllCheckins}回
                  </Text>
                </HStack>

                <Heading size="sm">
                  {currentMonth.getFullYear()}年{currentMonth.getMonth() + 1}月の統計
                </Heading>
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
