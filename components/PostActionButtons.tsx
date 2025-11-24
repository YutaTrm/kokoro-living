import { Bookmark, Heart, MessageCircle } from 'lucide-react-native';
import { Pressable } from 'react-native';

import { Text } from '@/components/Themed';
import { HStack } from '@/components/ui/hstack';

interface PostActionButtonsProps {
  repliesCount: number;
  likesCount: number;
  isLiked: boolean;
  isBookmarked: boolean;
  onReply: () => void;
  onLike: () => void;
  onBookmark: () => void;
  onLikesCountPress?: () => void;
  size?: 'sm' | 'md';
  showReplyButton?: boolean;
}

export default function PostActionButtons({
  repliesCount,
  likesCount,
  isLiked,
  isBookmarked,
  onReply,
  onLike,
  onBookmark,
  onLikesCountPress,
  size = 'md',
  showReplyButton = true,
}: PostActionButtonsProps) {
  const iconSize = size === 'sm' ? 16 : 20;
  const textClass = size === 'sm' ? 'text-xs' : 'text-sm font-semibold';

  return (
    <HStack space="4xl" className="items-center">
      {/* 返信ボタン */}
      {showReplyButton && (
        <Pressable onPress={onReply} className="flex-row items-center">
          <HStack space="xs" className="items-center">
            <MessageCircle size={iconSize} color="gray" />
            {repliesCount > 0 && (
              <Text className={`${textClass} text-typography-500`}>{repliesCount}</Text>
            )}
          </HStack>
        </Pressable>
      )}

      {/* いいねボタン */}
      <HStack space="xs" className="items-center">
        <Pressable onPress={onLike}>
          <Heart
            size={iconSize}
            color={isLiked ? 'red' : 'gray'}
            fill={isLiked ? 'red' : 'none'}
          />
        </Pressable>
        {likesCount > 0 && (
          <Pressable onPress={onLikesCountPress}>
            <Text className={`${textClass} ${isLiked ? 'text-red-500' : 'text-typography-500'} pl-1`}>
              {likesCount}
            </Text>
          </Pressable>
        )}
      </HStack>

      {/* ブックマークボタン */}
      <Pressable onPress={onBookmark} className="flex-row items-center">
        <Bookmark
          size={iconSize}
          color={isBookmarked ? '#3b82f6' : 'gray'}
          fill={isBookmarked ? '#3b82f6' : 'none'}
        />
      </Pressable>
    </HStack>
  );
}
