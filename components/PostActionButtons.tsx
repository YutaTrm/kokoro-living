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
  size = 'md',
  showReplyButton = true,
}: PostActionButtonsProps) {
  const iconSize = size === 'sm' ? 16 : 20;
  const textClass = size === 'sm' ? 'text-xs' : 'text-sm font-semibold';

  return (
    <HStack space="lg" className="items-center">
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
      <Pressable onPress={onLike} className="flex-row items-center">
        <HStack space="xs" className="items-center">
          <Heart
            size={iconSize}
            color={isLiked ? 'red' : 'gray'}
            fill={isLiked ? 'red' : 'none'}
          />
          {likesCount > 0 && (
            <Text className={`${textClass} ${isLiked ? 'text-red-500' : 'text-typography-500'}`}>
              {likesCount}
            </Text>
          )}
        </HStack>
      </Pressable>

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
