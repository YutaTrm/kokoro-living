import { useNavigation } from 'expo-router';
import { Sparkles } from 'lucide-react-native';
import { useLayoutEffect, useState } from 'react';
import { Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Box } from '@/components/ui/box';
import { Button, ButtonIcon, ButtonSpinner, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { supabase } from '@/src/lib/supabase';

interface Reflection {
  id: string;
  content: string;
  tokens_used: number;
  created_at: string;
}

interface Stats {
  postsCount: number;
  likesCount: number;
  repliesCount: number;
  followsCount: number;
  tokensUsed: number;
}

export default function AIReflectionTestScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [lastStats, setLastStats] = useState<Stats | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'AI振り返りテスト 🧪',
    });
  }, [navigation]);

  // 過去の振り返りを取得
  const loadReflections = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('ai_reflections')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setReflections(data || []);
    } catch (error) {
      console.error('振り返り取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  // 初回ロード
  useState(() => {
    loadReflections();
  });

  // AI振り返りを生成
  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('エラー', 'ログインしてください');
        return;
      }

      // Supabase Functionを呼び出し
      const { data, error } = await supabase.functions.invoke('generate-ai-reflection', {
        body: { userId: user.id },
      });

      if (error) {
        console.error('Function error:', error);

        // エラーメッセージを抽出
        let errorMessage = '生成に失敗しました';

        try {
          // error.context は Response オブジェクト
          if (error.context && typeof error.context.json === 'function') {
            const errorData = await error.context.json();
            console.log('Error data:', errorData);
            errorMessage = errorData.error || errorMessage;
          } else if (data?.error) {
            errorMessage = data.error;
          } else if (error.message) {
            errorMessage = error.message;
          }
        } catch (e) {
          console.error('Error parsing response:', e);
          // デフォルトメッセージを使用
        }

        Alert.alert('エラー', errorMessage);
        return;
      }

      if (data?.error) {
        Alert.alert('エラー', data.error);
        return;
      }

      // 成功
      setLastStats(data.stats);
      await loadReflections();
      Alert.alert('成功', 'AI振り返りが生成されました！');
    } catch (error: any) {
      console.error('生成エラー:', error);
      Alert.alert('エラー', error.message || '生成に失敗しました');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background-0" edges={['bottom']}>
        <Box className="flex-1 items-center justify-center">
          <Spinner size="large" />
        </Box>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background-0" edges={['bottom']}>
      <ScrollView className="flex-1 p-4">
        <VStack space="xl">
          {/* 説明 */}
          <Card className="p-4 bg-warning-50">
            <VStack space="sm">
              <Heading size="sm">開発用テスト機能</Heading>
              <Text className="text-sm text-typography-600">
                この機能は開発環境でのみ表示されます。投稿・返信・気分チェックインをもとにAIが振り返りを生成します。
              </Text>
              <Text className="text-sm text-typography-600 font-semibold">
                前回の生成から3日以上経過し、新しいデータが十分に溜まっている必要があります。
              </Text>
            </VStack>
          </Card>

          {/* 生成ボタン */}
          <Button
            onPress={handleGenerate}
            isDisabled={generating}
            size="lg"
            className="w-full"
          >
            {generating ? (
              <>
                <ButtonSpinner />
                <ButtonText>生成中...</ButtonText>
              </>
            ) : (
              <>
                <ButtonIcon as={Sparkles} />
                <ButtonText>AI振り返りを生成</ButtonText>
              </>
            )}
          </Button>

          {/* 最後の生成統計 */}
          {lastStats && (
            <Card className="p-4 bg-info-50">
              <VStack space="sm">
                <Heading size="sm">最後の生成統計</Heading>
                <Text className="text-sm">投稿・返信数: {lastStats.postsCount}件</Text>
                <Text className="text-sm">いいね数: {lastStats.likesCount}回</Text>
                <Text className="text-sm">返信数: {lastStats.repliesCount}回</Text>
                <Text className="text-sm">フォロー数: {lastStats.followsCount}人</Text>
                <Text className="text-sm text-typography-500">
                  使用トークン: {lastStats.tokensUsed}
                </Text>
              </VStack>
            </Card>
          )}

          {/* 振り返り一覧 */}
          {reflections.length > 0 ? (
            <VStack space="md">
              <Heading size="md">生成された振り返り</Heading>
              {reflections.map((reflection) => (
                <Card key={reflection.id} className="p-4">
                  <VStack space="sm">
                    <Text className="text-xs text-typography-500">
                      {new Date(reflection.created_at).toLocaleString('ja-JP')}
                    </Text>
                    <Text className="text-base leading-6">{reflection.content}</Text>
                    <Text className="text-xs text-typography-400">
                      使用トークン: {reflection.tokens_used}
                    </Text>
                  </VStack>
                </Card>
              ))}
            </VStack>
          ) : (
            <Card className="p-8">
              <VStack space="sm" className="items-center">
                <Text className="text-center text-typography-500">
                  まだ振り返りがありません
                </Text>
                <Text className="text-center text-sm text-typography-400">
                  「AI振り返りを生成」ボタンで作成できます
                </Text>
              </VStack>
            </Card>
          )}
        </VStack>
      </ScrollView>
    </SafeAreaView>
  );
}
