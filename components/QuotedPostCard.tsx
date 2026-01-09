import { useState } from 'react';
import { Pressable } from 'react-native';

import DefaultAvatar from '@/components/icons/DefaultAvatar';
import { Avatar, AvatarImage } from '@/components/ui/avatar';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { formatRelativeDate } from '@/src/utils/dateUtils';

interface QuotedPostCardProps {
  post: {
    id: string;
    content: string;
    created_at: string;
    is_hidden?: boolean;
    user: {
      display_name: string;
      avatar_url?: string | null;
    };
  } | null;
  onPress?: () => void;
}

export default function QuotedPostCard({ post, onPress }: QuotedPostCardProps) {
  const [imageError, setImageError] = useState(false);

  // 削除された投稿の場合
  if (!post || post.is_hidden) {
    return (
      <Box className="border border-outline-200 rounded-lg p-3 bg-background-50">
        <Text className="text-typography-400 text-sm">この投稿は削除されました</Text>
      </Box>
    );
  }

  return (
    <Pressable onPress={onPress}>
      <Box className="border border-outline-200 rounded-lg p-3 bg-background-50">
        <VStack space="sm">
          {/* ユーザー情報 */}
          <HStack space="sm" className="items-center">
            <Avatar size="xs">
              {post.user.avatar_url && !imageError ? (
                <AvatarImage
                  source={{ uri: post.user.avatar_url }}
                  onError={() => setImageError(true)}
                />
              ) : (
                <DefaultAvatar size="xs" />
              )}
            </Avatar>
            <Text className="text-sm font-semibold text-typography-700" numberOfLines={1}>
              {post.user.display_name}
            </Text>
            <Text className="text-xs text-typography-400">
              {formatRelativeDate(post.created_at)}
            </Text>
          </HStack>

          {/* 投稿内容 */}
          <Text className="text-sm text-typography-700" numberOfLines={3}>
            {post.content}
          </Text>
        </VStack>
      </Box>
    </Pressable>
  );
}
