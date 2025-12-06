import * as MediaLibrary from 'expo-media-library';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { Download } from 'lucide-react-native';
import { useLayoutEffect, useRef, useState } from 'react';
import { Alert, Image, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ViewShot from 'react-native-view-shot';

import { Box } from '@/components/ui/box';
import { Button, ButtonIcon, ButtonSpinner, ButtonText } from '@/components/ui/button';
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
  const [saving, setSaving] = useState(false);
  const viewShotRef = useRef<ViewShot>(null);

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

  // 画像を保存
  const handleSaveImage = async () => {
    if (!viewShotRef.current) return;

    setSaving(true);
    try {
      // 権限を確認
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('エラー', '写真ライブラリへのアクセス権限が必要です');
        return;
      }

      // キャプチャ
      const uri = await viewShotRef.current.capture?.();
      if (!uri) {
        throw new Error('画像のキャプチャに失敗しました');
      }

      // 保存
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('保存完了', '画像を保存しました');
    } catch (error) {
      console.error('保存エラー:', error);
      Alert.alert('エラー', '画像の保存に失敗しました');
    } finally {
      setSaving(false);
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
          {/* キャプチャ対象のカード */}
          <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1 }}>
            <View className="bg-background-50 p-4 rounded-xl">
              <VStack space="md">
                <HStack space="sm" className="items-center">
                  <Image
                    source={AI_AVATAR}
                    className="w-14 h-14 rounded-full border-2 border-secondary-400"
                  />
                  <VStack>
                    <Text className="text-base font-semibold text-typography-900">
                      『こころのリビング』AI リビくん
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
                <Text className="text-base leading-6 text-typography-800">
                  {reflection.content}
                </Text>

                {/* クレジット */}
                <Text className="text-xs text-typography-400">
                  スマホアプリ『こころのリビング』で生成
                </Text>
              </VStack>
            </View>
          </ViewShot>

          {/* 注意書き */}
          <Card className="p-3 bg-background-50">
            <Text className="text-xs text-typography-400">
              ※ AIによる分析のため、生成結果が正確でない場合があります。
            </Text>
          </Card>

          {/* 保存ボタン */}
          <Button
            onPress={handleSaveImage}
            variant="outline"
            className="w-full"
            isDisabled={saving}
          >
            {saving ? (
              <ButtonSpinner />
            ) : (
              <>
                <ButtonIcon as={Download} />
                <ButtonText>アルバムに画像で保存</ButtonText>
              </>
            )}
          </Button>
        </VStack>
      </ScrollView>
    </SafeAreaView>
  );
}
