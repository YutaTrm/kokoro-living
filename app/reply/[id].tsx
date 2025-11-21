import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { TextInput, ScrollView, Alert } from 'react-native';

import { Text } from '@/components/Themed';
import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { supabase } from '@/src/lib/supabase';

export default function ReplyScreen() {
  const router = useRouter();
  const { id: parentPostId } = useLocalSearchParams<{ id: string }>();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const maxLength = 140;
  const remainingChars = maxLength - content.length;

  const handlePost = async () => {
    if (!content.trim()) {
      Alert.alert('エラー', '返信内容を入力してください');
      return;
    }

    if (content.length > maxLength) {
      Alert.alert('エラー', `返信は${maxLength}文字以内で入力してください`);
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('エラー', 'ログインしてください');
        return;
      }

      // 返信を作成
      const { error: postError } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          content: content.trim(),
          parent_post_id: parentPostId,
        });

      if (postError) {
        throw postError;
      }

      // 投稿詳細ページに戻る（リロードされる）
      router.replace(`/post/${parentPostId}`);
    } catch (error) {
      console.error('返信エラー:', error);
      Alert.alert('エラー', '返信に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box className="flex-1 bg-background-0">
      {/* ヘッダー */}
      <HStack className="justify-between items-center px-4 py-3 border-b border-outline-200">
        <Button variant="link" onPress={() => router.back()}>
          <ButtonText>キャンセル</ButtonText>
        </Button>
        <Button
          onPress={handlePost}
          disabled={loading || !content.trim()}
          size="sm"
        >
          <ButtonText>{loading ? '返信中...' : '返信'}</ButtonText>
        </Button>
      </HStack>

      <ScrollView className="flex-1">
        <VStack className="p-4" space="lg">
          {/* テキスト入力 */}
          <Box>
            <TextInput
              className="text-base min-h-[120px] text-typography-900"
              placeholder="返信を入力"
              placeholderTextColor="#999"
              multiline
              value={content}
              onChangeText={setContent}
              maxLength={maxLength}
              autoFocus
            />
            <Text
              className={`text-sm text-right mt-2 ${
                remainingChars < 0 ? 'text-error-500' : 'text-typography-500'
              }`}
            >
              {remainingChars}
            </Text>
          </Box>
        </VStack>
      </ScrollView>
    </Box>
  );
}
