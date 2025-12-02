import { useRouter, useSegments } from 'expo-router';
import { Clock, Flag, Heart, MessageCircle } from 'lucide-react-native';
import { Pressable, ScrollView } from 'react-native';

import DefaultAvatar from '@/components/icons/DefaultAvatar';
import ReplyIndicator from '@/components/ReplyIndicator';
import Tag from '@/components/Tag';
import { Avatar, AvatarImage } from '@/components/ui/avatar';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useCurrentUser } from '@/src/hooks/useCurrentUser';
import { formatExperiencedAt, formatRelativeDate } from '@/src/utils/dateUtils';
import { getCurrentTab } from '@/src/utils/getCurrentTab';

interface PostItemProps {
  post: {
    id: string;
    content: string;
    created_at: string;
    experienced_at?: string | null;
    parent_post_id?: string | null;
    parentContent?: string;
    is_hidden?: boolean;
    user: {
      display_name: string;
      user_id: string;
      avatar_url?: string | null;
    };
    diagnoses: string[];
    treatments: string[];
    medications: string[];
    isMuted?: boolean;
    repliesCount?: number;
    likesCount?: number;
    isLikedByCurrentUser?: boolean;
    hasRepliedByCurrentUser?: boolean;
  };
  disableAvatarTap?: boolean;
}

export default function PostItem({ post, disableAvatarTap = false }: PostItemProps) {
  const router = useRouter();
  const segments = useSegments();
  const { currentUserId } = useCurrentUser();

  const handlePress = () => {
    const currentTab = getCurrentTab(segments);
    router.push(`/(tabs)/${currentTab}/post/${post.id}`);
  };

  const handleAvatarPress = (e: { stopPropagation: () => void }) => {
    if (disableAvatarTap) return;
    e.stopPropagation();
    // 現在のタブ内のユーザー詳細に遷移（自分でも他人でも同じ）
    const currentTab = getCurrentTab(segments);
    router.push(`/(tabs)/${currentTab}/user/${post.user.user_id}`);
  };

  const handleParentPress = () => {
    if (post.parent_post_id) {
      const currentTab = getCurrentTab(segments);
      router.push(`/(tabs)/${currentTab}/post/${post.parent_post_id}`);
    }
  };

  const displayName = post.isMuted ? 'ミュートユーザー' : post.user.display_name;
  const hasAvatar = !post.isMuted && post.user.avatar_url;

  const AvatarComponent = disableAvatarTap || post.isMuted ? (
    <Avatar size="md">
      {hasAvatar ? (
        <AvatarImage source={{ uri: post.user.avatar_url! }} />
      ) : (
        <DefaultAvatar size={48} />
      )}
    </Avatar>
  ) : (
    <Pressable onPress={handleAvatarPress}>
      <Avatar size="md">
        {hasAvatar ? (
          <AvatarImage source={{ uri: post.user.avatar_url! }} />
        ) : (
          <DefaultAvatar size={48} />
        )}
      </Avatar>
    </Pressable>
  );

  return (
    <Pressable onPress={handlePress}>
      <Box className="border-b border-outline-200 px-4 py-3">
        <HStack space="sm" className="items-start">
          {/* アバター */}
          {AvatarComponent}

          {/* 投稿内容 */}
          <VStack className="flex-1" space="xs">
            {/* 返信インジケーター */}
            {post.parent_post_id && post.parentContent && (
              <Box className="mb-1">
                <ReplyIndicator parentContent={post.parentContent} onPress={handleParentPress} />
              </Box>
            )}

            {/* ユーザー名、時間、タグ */}
            <HStack space="xs" className="items-center flex-1">
              <Text className="font-semibold text-base">{displayName}</Text>
              <Text className="text-sm text-typography-500">{formatRelativeDate(post.created_at)}</Text>

              {/* タグ（横スクロール） */}
              {(post.diagnoses.length > 0 || post.treatments.length > 0 || post.medications.length > 0) && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  className="flex-1"
                >
                  <HStack space="xs" className="ml-1">
                    {post.diagnoses.map((tag, index) => (
                      <Tag key={`d-${index}`} name={tag} color="fuchsia-400" size="xs" />
                    ))}
                    {post.treatments.map((tag, index) => (
                      <Tag key={`t-${index}`} name={tag} color="green-400" size="xs" />
                    ))}
                    {post.medications.map((tag, index) => (
                      <Tag key={`m-${index}`} name={tag} color="cyan-400" size="xs" />
                    ))}
                  </HStack>
                </ScrollView>
              )}
            </HStack>

            {/* 投稿テキスト */}
            <Text className="text-lg leading-5" numberOfLines={3} ellipsizeMode="tail">
              {post.content}
            </Text>

            {/* 体験日とアクションボタン（横並び） */}
            <HStack className="items-center justify-between">
              {/* 体験日（左側） */}
              {post.experienced_at ? (
                <HStack space="xs" className="items-center">
                  <Icon as={Clock} size="sm" className="text-typography-500" />
                  <Text className="text-sm text-typography-500">{formatExperiencedAt(post.experienced_at)}</Text>
                </HStack>
              ) : (
                <Box />
              )}

              {/* アクションボタン（右側） */}
              <HStack space="lg" className="items-center">
                {/* 返信数 */}
                <HStack space="xs" className="items-center">
                  <Icon
                    as={MessageCircle}
                    size="sm"
                    className={post.hasRepliedByCurrentUser ? "text-primary-500" : "text-typography-500"}
                  />
                  {(post.repliesCount ?? 0) > 0 && (
                    <Text className={`text-sm ${post.hasRepliedByCurrentUser ? "text-primary-500" : "text-typography-500"}`}>
                      {post.repliesCount}
                    </Text>
                  )}
                </HStack>

                {/* いいね数 */}
                <HStack space="xs" className="items-center">
                  <Icon
                    as={Heart}
                    size="sm"
                    className={post.isLikedByCurrentUser ? "text-secondary-400 fill-secondary-400" : "text-typography-500"}
                  />
                  {(post.likesCount ?? 0) > 0 && (
                    <Text className={`text-sm ${post.isLikedByCurrentUser ? "text-secondary-400" : "text-typography-500"}`}>
                      {post.likesCount}
                    </Text>
                  )}
                </HStack>
              </HStack>
            </HStack>

            {/* 非表示警告バナー（自分の投稿のみ） */}
            {post.is_hidden && currentUserId === post.user.user_id && (
              <Box className="bg-error-50 border border-error-200 rounded-md p-2 mt-2">
                <HStack space="xs" className="items-center">
                  <Icon as={Flag} size="sm" className="text-error-500" />
                  <Text className="text-xs text-error-500 flex-1">
                    通報により非表示（あなたのみ表示）
                  </Text>
                </HStack>
              </Box>
            )}
          </VStack>
        </HStack>
      </Box>
    </Pressable>
  );
}
