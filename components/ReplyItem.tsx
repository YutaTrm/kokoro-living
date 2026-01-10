import { Href, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import DefaultAvatar from '@/components/icons/DefaultAvatar';
import PostActionButtons from '@/components/PostActionButtons';
import ReplyIndicator from '@/components/ReplyIndicator';
import { Avatar, AvatarImage } from '@/components/ui/avatar';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useCurrentUser } from '@/src/hooks/useCurrentUser';
import { supabase } from '@/src/lib/supabase';
import { formatRelativeDate } from '@/src/utils/dateUtils';
import { getCurrentTab } from '@/src/utils/getCurrentTab';

interface ReplyItemProps {
  reply: {
    id: string;
    content: string;
    created_at: string;
    parent_post_id: string | null;
    user: {
      display_name: string;
      user_id: string;
      avatar_url?: string | null;
    };
    isMuted?: boolean;
  };
  parentPostContent?: string;
  parentAvatarUrl?: string | null;
  showVerticalLine?: boolean;
  depth?: number;
  onReplyCreated?: () => void;
}

export default function ReplyItem({
  reply,
  parentPostContent,
  parentAvatarUrl,
  showVerticalLine = false,
  depth = 0,
  onReplyCreated,
}: ReplyItemProps) {
  const router = useRouter();
  const segments = useSegments();
  const [likesCount, setLikesCount] = useState(0);
  const [repliesCount, setRepliesCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    checkLoginStatus();
    loadCounts();
    checkInteractionStatus();
  }, [reply.id]);

  const checkLoginStatus = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setIsLoggedIn(!!session);
  };

  const loadCounts = async () => {
    try {
      const [likesResult, repliesResult] = await Promise.all([
        supabase
          .from('likes')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', reply.id),
        supabase
          .from('posts')
          .select('*', { count: 'exact', head: true })
          .eq('parent_post_id', reply.id),
      ]);

      if (likesResult.count !== null) setLikesCount(likesResult.count);
      if (repliesResult.count !== null) setRepliesCount(repliesResult.count);
    } catch (error) {
      console.error('カウント取得エラー:', error);
    }
  };

  const checkInteractionStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [likeResult, bookmarkResult] = await Promise.all([
        supabase
          .from('likes')
          .select('id')
          .eq('post_id', reply.id)
          .eq('user_id', user.id)
          .single(),
        supabase
          .from('bookmarks')
          .select('id')
          .eq('post_id', reply.id)
          .eq('user_id', user.id)
          .single(),
      ]);

      setIsLiked(!!likeResult.data);
      setIsBookmarked(!!bookmarkResult.data);
    } catch (error) {
      // エラーは無視
    }
  };

  const handlePress = () => {
    const currentTab = getCurrentTab(segments);
    router.push(`/(tabs)/${currentTab}/post/${reply.id}` as Href);
  };

  const handleAvatarPress = () => {
    // 現在のタブ内のユーザー詳細に遷移（自分でも他人でも同じ）
    const currentTab = getCurrentTab(segments);
    router.push(`/(tabs)/${currentTab}/user/${reply.user.user_id}` as Href);
  };

  const handleParentPress = () => {
    if (reply.parent_post_id) {
      const currentTab = getCurrentTab(segments);
      router.push(`/(tabs)/${currentTab}/post/${reply.parent_post_id}` as Href);
    }
  };

  const handleLike = async () => {
    if (!isLoggedIn) {
      Alert.alert('エラー', 'ログインしてください');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (isLiked) {
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('post_id', reply.id)
          .eq('user_id', user.id);

        if (!error) {
          setIsLiked(false);
          setLikesCount(prev => prev - 1);
        }
      } else {
        const { error } = await supabase
          .from('likes')
          .insert({ post_id: reply.id, user_id: user.id });

        if (!error) {
          setIsLiked(true);
          setLikesCount(prev => prev + 1);
        }
      }
    } catch (error) {
      console.error('いいねエラー:', error);
    }
  };

  const handleBookmark = async () => {
    if (!isLoggedIn) {
      Alert.alert('エラー', 'ログインしてください');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (isBookmarked) {
        const { error } = await supabase
          .from('bookmarks')
          .delete()
          .eq('post_id', reply.id)
          .eq('user_id', user.id);

        if (!error) {
          setIsBookmarked(false);
        }
      } else {
        const { error } = await supabase
          .from('bookmarks')
          .insert({ post_id: reply.id, user_id: user.id });

        if (!error) {
          setIsBookmarked(true);
        }
      }
    } catch (error) {
      console.error('ブックマークエラー:', error);
    }
  };

  const handleReply = () => {
    if (!isLoggedIn) {
      Alert.alert('エラー', 'ログインしてください');
      return;
    }
    router.push(`/reply/${reply.id}`);
  };

  // 1階層目のみ上下の線で分ける
  const showBorder = depth === 0;

  // ミュートユーザーの折りたたみ表示
  if (reply.isMuted && !isExpanded) {
    return (
      <Pressable onPress={() => setIsExpanded(true)}>
        <Box className={`px-4 py-3 ${showBorder ? 'border-b border-outline-200' : ''}`}>
          <HStack space="sm" className="items-center">
            <Avatar size="sm">
              <DefaultAvatar size="sm" />
            </Avatar>
            <Text className="text-base text-typography-400">ミュートユーザーの投稿（タップして表示）</Text>
          </HStack>
        </Box>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={handlePress}>
      <Box className={`px-4 py-3 ${showBorder ? 'border-b border-outline-200' : ''}`}>
        <HStack space="sm" className="items-start">
          {/* アバターと点線縦線のコンテナ */}
          <View className="items-center">
            <Pressable onPress={handleAvatarPress}>
              <Avatar size="md">
                {reply.user.avatar_url ? (
                  <AvatarImage source={{ uri: reply.user.avatar_url }} />
                ) : (
                  <DefaultAvatar size="md" />
                )}
              </Avatar>
            </Pressable>
          </View>

          {/* 返信内容 */}
          <VStack className="flex-1" space="xs">

            {/* ユーザー名と時間 */}
            <HStack space="xs" className="items-center">
              <Text className="font-semibold">{reply.user.display_name}</Text>
              <Text className="text-xs text-typography-500">{formatRelativeDate(reply.created_at)}</Text>
            </HStack>

            {/* 返信インジケーター（親投稿へのリンク） */}
            {parentPostContent && reply.parent_post_id && (
              <ReplyIndicator
                parentContent={parentPostContent}
                parentAvatarUrl={parentAvatarUrl}
                onPress={handleParentPress}
              />
            )}

            {/* 返信テキスト */}
            <Text className="text-lg leading-6">{reply.content}</Text>

            {/* アクションボタン */}
            <Box className="mt-2">
              <PostActionButtons
                repliesCount={repliesCount}
                likesCount={likesCount}
                isLiked={isLiked}
                isBookmarked={isBookmarked}
                onReply={handleReply}
                onLike={handleLike}
                onBookmark={handleBookmark}
                size="sm"
                showReplyButton={true}
              />
            </Box>
          </VStack>
        </HStack>
      </Box>
    </Pressable>
  );
}
