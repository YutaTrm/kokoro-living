import { useRouter } from 'expo-router';
import { memo, useCallback } from 'react';
import { Image, Pressable } from 'react-native';

import { Card } from '@/components/ui/card';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { AIReflection } from '@/src/types/profile';

// AIアバター画像
const AI_AVATAR = require('@/assets/images/living-ai.png');

// AI振り返りカードコンポーネント（メモ化で点滅防止）
export const AIReflectionCard = memo(
  function AIReflectionCard({ reflection }: { reflection: AIReflection }) {
    const router = useRouter();

    const handlePress = useCallback(() => {
      router.push(`/(tabs)/(profile)/ai-reflection/${reflection.id}`);
    }, [router, reflection.id]);

    return (
      <Pressable onPress={handlePress}>
        <Card className="p-3 border-b border-outline-200 rounded-none">
          <HStack space="sm">
            <Image
              source={AI_AVATAR}
              className="w-12 h-12 rounded-full border-2 border-secondary-400"
            />
            <VStack className="flex-1 flex-shrink">
              <HStack className="items-center" space="xs">
                <Text className="text-sm font-semibold text-typography-900">
                  『こころのリビング』AI リビくん
                </Text>
                <Text className="text-xs text-typography-500">
                  {new Date(reflection.created_at).toLocaleDateString('ja-JP')}
                </Text>
              </HStack>
              <Text className="text-sm text-typography-700 line-clamp-3 mt-1">
                {reflection.content}
              </Text>
            </VStack>
          </HStack>
        </Card>
      </Pressable>
    );
  },
  (prevProps, nextProps) => prevProps.reflection.id === nextProps.reflection.id
);
