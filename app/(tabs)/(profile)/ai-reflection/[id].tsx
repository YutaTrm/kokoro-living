import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useLayoutEffect, useState } from 'react';
import { Image, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Box } from '@/components/ui/box';
import { Card } from '@/components/ui/card';
import { HStack } from '@/components/ui/hstack';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { supabase } from '@/src/lib/supabase';

// AIアバター画像
const AI_AVATAR = require('@/assets/images/living-ai.png');

interface Reflection {
  id: string;
  content: string;
  tokens_used: number;
  created_at: string;
}

export default function AIReflectionDetailScreen() {
  const navigation = useNavigation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [reflection, setReflection] = useState<Reflection | null>(null);

  // 詳細を取得
  const loadReflection = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_reflections')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      setReflection(data);
    } catch (error) {
      console.error('振り返り取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  useState(() => {
    loadReflection();
  });

  useLayoutEffect(() => {
    if (reflection) {
      const date = new Date(reflection.created_at);
      const formattedDate = date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      navigation.setOptions({
        title: `${formattedDate}の振り返り`,
      });
    }
  }, [navigation, reflection]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background-0" edges={['bottom']}>
        <Box className="flex-1 items-center justify-center">
          <Spinner size="large" />
        </Box>
      </SafeAreaView>
    );
  }

  if (!reflection) {
    return (
      <SafeAreaView className="flex-1 bg-background-0" edges={['bottom']}>
        <Box className="flex-1 items-center justify-center p-4">
          <Text className="text-center text-typography-500">
            振り返りが見つかりませんでした
          </Text>
        </Box>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background-0" edges={['bottom']}>
      <ScrollView className="flex-1 p-4">
        <VStack space="md">
          {/* AIヘッダー */}
          <Card className="p-4">
            <VStack space="md">
              <HStack space="sm" className="items-center">
                <Image
                  source={AI_AVATAR}
                  className="w-12 h-12 rounded-full border-2 border-secondary-400"
                />
                <VStack>
                  <Text className="text-base font-semibold text-typography-900">
                    リビングAI
                  </Text>
                  <Text className="text-xs text-typography-500">
                    {new Date(reflection.created_at).toLocaleString('ja-JP', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </VStack>
              </HStack>

              {/* 振り返り内容 */}
              <Text className="text-base leading-6">{reflection.content}</Text>
            </VStack>
          </Card>

          {/* 注意書き */}
          <Card className="p-3 bg-background-50">
            <Text className="text-xs text-typography-400">
              ※ AIによる分析のため、生成結果が正確でない場合があります。
            </Text>
          </Card>
        </VStack>
      </ScrollView>
    </SafeAreaView>
  );
}
