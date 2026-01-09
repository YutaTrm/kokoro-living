import { Href, useRouter, useSegments } from 'expo-router';
import { CalendarDays, Clock, Flag, Heart, MessageCircle, Repeat2 } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView } from 'react-native';

import DefaultAvatar from '@/components/icons/DefaultAvatar';
import QuotedPostCard from '@/components/QuotedPostCard';
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

interface PostItemProps {
  post: {
    id: string;
    content: string;
    created_at: string;
    experienced_at?: string | null;
    parent_post_id?: string | null;
    parentContent?: string;
    parentAvatarUrl?: string | null;
    quoted_post_id?: string | null;
    quotedPost?: QuotedPost | null;
    is_hidden?: boolean;
    user: {
      display_name: string;
      user_id: string;
      avatar_url?: string | null;
    };
    diagnoses: string[];
    treatments: string[];
    medications: string[];
    statuses: string[];
    isMuted?: boolean;
    repliesCount?: number;
    likesCount?: number;
    repostsCount?: number;
    isLikedByCurrentUser?: boolean;
    isRepostedByCurrentUser?: boolean;
    hasRepliedByCurrentUser?: boolean;
    repostedBy?: {
      user_id: string;
      display_name: string;
      avatar_url?: string | null;
    } | null;
  };
  disableAvatarTap?: boolean;
}

export default function PostItem({ post, disableAvatarTap = false }: PostItemProps) {
  const router = useRouter();
  const segments = useSegments();
  const { currentUserId } = useCurrentUser();

  const handlePress = () => {
    const currentTab = getCurrentTab(segments);
    router.push(`/(tabs)/${currentTab}/post/${post.id}` as Href);
  };

  const handleAvatarPress = (e: { stopPropagation: () => void }) => {
    if (disableAvatarTap) return;
    e.stopPropagation();
    // 現在のタブ内のユーザー詳細に遷移（自分でも他人でも同じ）
    const currentTab = getCurrentTab(segments);
    router.push(`/(tabs)/${currentTab}/user/${post.user.user_id}` as Href);
  };

  const handleParentPress = () => {
    if (post.parent_post_id) {
      const currentTab = getCurrentTab(segments);
      router.push(`/(tabs)/${currentTab}/post/${post.parent_post_id}` as Href);
    }
  };

  const handleQuotedPostPress = () => {
    if (post.quoted_post_id) {
      const currentTab = getCurrentTab(segments);
      router.push(`/(tabs)/${currentTab}/post/${post.quoted_post_id}` as Href);
    }
  };

  const handleRepostedByPress = (e: { stopPropagation: () => void }) => {
    if (post.repostedBy) {
      e.stopPropagation();
      const currentTab = getCurrentTab(segments);
      router.push(`/(tabs)/${currentTab}/user/${post.repostedBy.user_id}` as Href);
    }
  };

  const [repostAvatarError, setRepostAvatarError] = useState(false);
  const displayName = post.isMuted ? 'ミュートユーザー' : post.user.display_name;
  const hasAvatar = !post.isMuted && post.user.avatar_url;

  const AvatarComponent = disableAvatarTap || post.isMuted ? (
    <Avatar size="md">
      {hasAvatar ? (
        <AvatarImage source={{ uri: post.user.avatar_url! }} />
      ) : (
        <DefaultAvatar size="md" />
      )}
    </Avatar>
  ) : (
    <Pressable onPress={handleAvatarPress}>
      <Avatar size="md">
        {hasAvatar ? (
          <AvatarImage source={{ uri: post.user.avatar_url! }} />
        ) : (
          <DefaultAvatar size="md" />
        )}
      </Avatar>
    </Pressable>
  );

  return (
    <Pressable onPress={handlePress}>
      <Box className="border-b border-outline-200 px-4 py-3">
        {/* リポストインジケーター */}
        {post.repostedBy && (
          <Pressable onPress={handleRepostedByPress}>
            <HStack space="xs" className="items-center mb-1 ml-12">
              <Icon as={Repeat2} size="sm" className="text-typography-600" />
              <Avatar size="xs">
                {post.repostedBy.avatar_url && !repostAvatarError ? (
                  <AvatarImage
                    source={{ uri: post.repostedBy.avatar_url }}
                    onError={() => setRepostAvatarError(true)}
                  />
                ) : (
                  <DefaultAvatar size="xs" />
                )}
              </Avatar>
              <Text className="text-sm text-typography-500">
                {post.repostedBy.display_name}さんがリポスト
              </Text>
            </HStack>
          </Pressable>
        )}

        <HStack space="sm" className="items-start">
          {/* アバター */}
          {AvatarComponent}

          {/* 投稿内容 */}
          <VStack className="flex-1" space="xs">
            {/* 返信インジケーター */}
            {post.parent_post_id && post.parentContent && (
              <Box className="mb-1">
                <ReplyIndicator
                  parentContent={post.parentContent}
                  parentAvatarUrl={post.parentAvatarUrl}
                  onPress={handleParentPress}
                />
              </Box>
            )}

            {/* ユーザー名、タグ */}
            <HStack space="xs" className="items-center flex-1">
              <Text className="font-semibold text-base">{displayName}</Text>

              {/* タグ（横スクロール） */}
              {(post.diagnoses.length > 0 || post.treatments.length > 0 || post.medications.length > 0 || post.statuses.length > 0) && (
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
                    {post.statuses.map((tag, index) => (
                      <Tag key={`s-${index}`} name={tag} color="orange-400" size="xs" />
                    ))}
                  </HStack>
                </ScrollView>
              )}
            </HStack>

            {/* 投稿テキスト */}
            <Text className="text-lg leading-5" numberOfLines={3} ellipsizeMode="tail">
              {post.content}
            </Text>

            {/* 引用リポストカード */}
            {post.quoted_post_id && post.quotedPost && (
              <Box className="mt-2">
                <QuotedPostCard
                  post={post.quotedPost}
                  onPress={handleQuotedPostPress}
                />
              </Box>
            )}

            {/* 体験日・投稿時間とアクションボタン（横並び） */}
            <HStack className="items-center justify-between">
              {/* 体験日・投稿時間（左側） */}
              <HStack space="md" className="items-center">
                <HStack space="xs" className="items-center">
                  <Icon as={Clock} size="sm" className="text-typography-500" />
                  <Text className="text-sm text-typography-500">{formatRelativeDate(post.created_at)}</Text>
                </HStack>
                {post.experienced_at && (
                  <HStack space="xs" className="items-center">
                    <Icon as={CalendarDays} size="sm" className="text-typography-500" />
                    <Text className="text-sm text-typography-500">{formatExperiencedAt(post.experienced_at)}</Text>
                  </HStack>
                )}
              </HStack>

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

                {/* リポスト数 */}
                <HStack space="xs" className="items-center">
                  <Icon
                    as={Repeat2}
                    size="sm"
                    className={post.isRepostedByCurrentUser ? "text-success-500" : "text-typography-500"}
                  />
                  {(post.repostsCount ?? 0) > 0 && (
                    <Text className={`text-sm ${post.isRepostedByCurrentUser ? "text-success-500" : "text-typography-500"}`}>
                      {post.repostsCount}
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
