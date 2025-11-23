import { useRouter } from 'expo-router';
import { CornerDownRight } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import PostActionButtons from '@/components/PostActionButtons';
import { Text } from '@/components/Themed';
import { Avatar, AvatarFallbackText, AvatarImage } from '@/components/ui/avatar';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { supabase } from '@/src/lib/supabase';

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
  };
  parentPostContent?: string;
  showVerticalLine?: boolean;
  depth?: number;
  onReplyCreated?: () => void;
}

export default function ReplyItem({
  reply,
  parentPostContent,
  showVerticalLine = false,
  depth = 0,
  onReplyCreated,
}: ReplyItemProps) {
  const router = useRouter();
  const [likesCount, setLikesCount] = useState(0);
  const [repliesCount, setRepliesCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    checkLoginStatus();
    loadCounts();
    checkInteractionStatus();
  }, [reply.id]);

  const checkLoginStatus = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setIsLoggedIn(!!session);
    setCurrentUserId(session?.user?.id ?? null);
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'たった今';
    if (minutes < 60) return `${minutes}分前`;
    if (hours < 24) return `${hours}時間前`;
    if (days < 7) return `${days}日前`;
    return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
  };

  const truncateText = (text: string, maxLength: number = 30) => {
    const firstLine = text.split('\n')[0];
    if (firstLine.length <= maxLength) return firstLine;
    return firstLine.substring(0, maxLength) + '...';
  };

  const handlePress = () => {
    router.push(`/post/${reply.id}`);
  };

  const handleAvatarPress = () => {
    // 自分のアバターならマイページへ遷移
    if (currentUserId === reply.user.user_id) {
      router.push('/(tabs)/profile');
    } else {
      router.push(`/user/${reply.user.user_id}`);
    }
  };

  const handleParentPress = () => {
    if (reply.parent_post_id) {
      router.push(`/post/${reply.parent_post_id}`);
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

  return (
    <Pressable onPress={handlePress}>
      <Box className={`px-4 py-3 ${showBorder ? 'border-b border-outline-200' : ''}`}>
        <HStack space="sm" className="items-start">
          {/* アバターと点線縦線のコンテナ */}
          <View className="items-center">
            <Pressable onPress={handleAvatarPress}>
              <Avatar size="sm">
                {reply.user.avatar_url ? (
                  <AvatarImage source={{ uri: reply.user.avatar_url }} />
                ) : (
                  <AvatarFallbackText>{reply.user.display_name}</AvatarFallbackText>
                )}
              </Avatar>
            </Pressable>
            {/* 点線の縦線（子返信がある場合に表示） */}
            {/* {showVerticalLine && (
              <View
                className="flex-1 mt-1 border-primary-300 min-h-20 w-1 border-l border"
              />
            )} */}
          </View>

          {/* 返信内容 */}
          <VStack className="flex-1" space="xs">
            {/* 返信インジケーター（親投稿へのリンク） */}
            {parentPostContent && reply.parent_post_id && (
              <Pressable onPress={handleParentPress}>
                <HStack space="xs" className="items-center mb-1">
                  <CornerDownRight size={12} />
                  <Text className="text-xs text-primary-300 pr-4" numberOfLines={1}>
                    {truncateText(parentPostContent)}
                  </Text>
                </HStack>
              </Pressable>
            )}

            {/* ユーザー名と時間 */}
            <HStack space="xs" className="items-center">
              <Text className="font-semibold text-sm">{reply.user.display_name}</Text>
              <Text className="text-xs text-typography-500">·</Text>
              <Text className="text-xs text-typography-500">{formatDate(reply.created_at)}</Text>
            </HStack>

            {/* 返信テキスト */}
            <Text className="text-base leading-5">{reply.content}</Text>

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
