import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, TextInput } from 'react-native';

import { Text } from '@/components/Themed';
import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Spinner } from '@/components/ui/spinner';
import { VStack } from '@/components/ui/vstack';
import { supabase } from '@/src/lib/supabase';

interface ParentPost {
  id: string;
  content: string;
  user: {
    display_name: string;
  };
}

export default function ReplyScreen() {
  const router = useRouter();
  const { id: parentPostId } = useLocalSearchParams<{ id: string }>();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [parentPost, setParentPost] = useState<ParentPost | null>(null);
  const [loadingParent, setLoadingParent] = useState(true);

  const maxLength = 140;
  const remainingChars = maxLength - content.length;

  useEffect(() => {
    if (parentPostId) {
      loadParentPost();
    }
  }, [parentPostId]);

  const loadParentPost = async () => {
    try {
      const { data: postData, error: postError } = await supabase
        .from('posts')
        .select('id, content, user_id')
        .eq('id', parentPostId)
        .single();

      if (postError) throw postError;

      const { data: userData } = await supabase
        .from('users')
        .select('display_name')
        .eq('user_id', postData.user_id)
        .single();

      setParentPost({
        id: postData.id,
        content: postData.content,
        user: {
          display_name: userData?.display_name || 'Unknown',
        },
      });
    } catch (error) {
      console.error('親投稿取得エラー:', error);
    } finally {
      setLoadingParent(false);
    }
  };

  const truncateText = (text: string, maxLen: number = 50) => {
    const firstLine = text.split('\n')[0];
    if (firstLine.length <= maxLen) return firstLine;
    return firstLine.substring(0, maxLen) + '...';
  };

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
          {/* 返信先の表示 */}
          {loadingParent ? (
            <Box className="py-2">
              <Spinner size="small" />
            </Box>
          ) : parentPost && (
            <Box className="pb-3 border-b border-outline-200">
              <Text className="text-sm text-typography-500">
                {parentPost.user.display_name}さんの投稿に返信:
              </Text>
              <Text className="text-sm text-typography-600 mt-1" numberOfLines={2}>
                {truncateText(parentPost.content)}
              </Text>
            </Box>
          )}

          {/* テキスト入力 */}
          <Box>
            <TextInput
              className="min-h-[120px] text-typography-900"
              placeholder="返信を入力"
              placeholderTextColor="#999"
              multiline
              value={content}
              onChangeText={setContent}
              maxLength={maxLength}
              autoFocus
            />
            <Text className="text-sm text-right mt-2" >
              残り{remainingChars}文字
            </Text>
          </Box>
        </VStack>
      </ScrollView>
    </Box>
  );
}
