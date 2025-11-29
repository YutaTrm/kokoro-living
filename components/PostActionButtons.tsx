import { Bookmark, Heart, MessageCircle } from 'lucide-react-native';
import { Pressable } from 'react-native';

import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';

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
  const iconSize = size === 'sm' ? 'sm' : 'md';
  const textClass = size === 'sm' ? 'text-xs' : 'text-sm font-semibold';

  return (
    <HStack space="4xl" className="items-center">
      {/* 返信ボタン */}
      {showReplyButton && (
        <Pressable onPress={onReply} className="flex-row items-center mr-[1rem]">
          <HStack space="xs" className="items-center">
            <Icon as={MessageCircle} size={iconSize} className="text-typography-500" />
            {repliesCount > 0 && (
              <Text className={`${textClass} text-typography-500`}>{repliesCount}</Text>
            )}
          </HStack>
        </Pressable>
      )}

      {/* いいねボタン */}
      <HStack space="xs" className="items-center">
        <Pressable onPress={onLike}>
          <Icon
            as={Heart}
            size={iconSize}
            className={isLiked ? 'text-secondary-500 fill-secondary-500' : 'text-typography-500 fill-none'}
          />
        </Pressable>
        <Pressable onPress={onLikesCountPress} className="min-w-[2rem]">
          {likesCount > 0 && (
            <Text className={`${textClass} ${isLiked ? 'text-secondary-500' : 'text-typography-500'} pl-1`}>
              {likesCount}
            </Text>
          )}
        </Pressable>
      </HStack>

      {/* ブックマークボタン */}
      <Pressable onPress={onBookmark} className="flex-row items-center">
        <Icon
          as={Bookmark}
          size={iconSize}
          className={isBookmarked ? 'text-primary-500 fill-primary-500' : 'text-typography-500 fill-none'}
        />
      </Pressable>
    </HStack>
  );
}
