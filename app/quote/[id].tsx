import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import QuotedPostCard from '@/components/QuotedPostCard';
import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { supabase } from '@/src/lib/supabase';
import { checkNGWords } from '@/src/utils/ngWordFilter';

interface QuotedPost {
  id: string;
  content: string;
  created_at: string;
  is_hidden?: boolean;
  user: {
    display_name: string;
    avatar_url?: string | null;
  };
}

export default function QuoteRepostScreen() {
  const router = useRouter();
  const { id: quotedPostId } = useLocalSearchParams<{ id: string }>();
  const contentRef = useRef('');
  const inputRef = useRef<TextInput>(null);
  const [contentLength, setContentLength] = useState(0);
  const [loading, setLoading] = useState(false);
  const [quotedPost, setQuotedPost] = useState<QuotedPost | null>(null);
  const [loadingQuoted, setLoadingQuoted] = useState(true);

  const maxLength = 140;
  const remainingChars = maxLength - contentLength;

  useEffect(() => {
    if (quotedPostId) {
      loadQuotedPost();
    }
  }, [quotedPostId]);

  const loadQuotedPost = async () => {
    try {
      const { data: postData, error: postError } = await supabase
        .from('posts')
        .select('id, content, created_at, user_id, is_hidden')
        .eq('id', quotedPostId)
        .single();

      if (postError) throw postError;

      const { data: userData } = await supabase
        .from('users')
        .select('display_name, avatar_url')
        .eq('user_id', postData.user_id)
        .single();

      setQuotedPost({
        id: postData.id,
        content: postData.content,
        created_at: postData.created_at,
        is_hidden: postData.is_hidden,
        user: {
          display_name: userData?.display_name || 'Unknown',
          avatar_url: userData?.avatar_url,
        },
      });
    } catch (error) {
      console.error('引用元投稿取得エラー:', error);
    } finally {
      setLoadingQuoted(false);
    }
  };

  const handlePost = async () => {
    const content = contentRef.current;
    if (!content.trim()) {
      Alert.alert('エラー', 'コメントを入力してください');
      return;
    }

    if (content.length > maxLength) {
      Alert.alert('エラー', `コメントは${maxLength}文字以内で入力してください`);
      return;
    }

    // NGワードチェック
    const ngWordCheck = checkNGWords(content);
    if (!ngWordCheck.isValid) {
      Alert.alert('投稿できません', ngWordCheck.message);
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('エラー', 'ログインしてください');
        return;
      }

      // 引用リポストを作成
      const { error: postError } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          content: content.trim(),
          quoted_post_id: quotedPostId,
        });

      if (postError) {
        throw postError;
      }

      // タイムラインにリダイレクト
      router.replace('/(tabs)/(home)');
    } catch (error) {
      console.error('引用リポストエラー:', error);
      Alert.alert('エラー', '投稿に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background-0" edges={['top', 'bottom']}>
      {/* ヘッダー */}
      <HStack className="justify-between items-center px-4 py-3 border-b border-outline-200">
        <Button variant="link" onPress={() => router.back()}>
          <ButtonText>キャンセル</ButtonText>
        </Button>
        <Button
          onPress={handlePost}
          disabled={loading || contentLength === 0}
          size="sm"
        >
          <ButtonText>{loading ? '投稿中...' : '投稿'}</ButtonText>
        </Button>
      </HStack>

      <ScrollView className="flex-1">
        <VStack className="p-4" space="lg">
          {/* テキスト入力 */}
          <Box>
            <TextInput
              ref={inputRef}
              className="min-h-[120px] text-lg text-typography-600"
              placeholder="コメントを追加"
              placeholderTextColor="#999"
              multiline
              textAlignVertical="top"
              defaultValue=""
              onChangeText={(text) => {
                contentRef.current = text;
                setContentLength(text.length);
              }}
              maxLength={maxLength}
              autoFocus
            />
            <Text className="text-sm text-right mt-2">
              残り{remainingChars}文字
            </Text>
          </Box>

          {/* 引用元投稿の表示 */}
          {loadingQuoted ? (
            <Box className="py-4 items-center">
              <Spinner size="small" />
            </Box>
          ) : quotedPost && (
            <QuotedPostCard post={quotedPost} />
          )}
        </VStack>
      </ScrollView>
    </SafeAreaView>
  );
}
