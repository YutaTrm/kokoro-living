import { CornerDownRight } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable } from 'react-native';

import DefaultAvatar from '@/components/icons/DefaultAvatar';
import { Avatar, AvatarImage } from '@/components/ui/avatar';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';

interface ReplyIndicatorProps {
  parentContent: string;
  parentAvatarUrl?: string | null;
  onPress: () => void;
  maxLength?: number;
}

const truncateText = (text: string, maxLength: number = 50): string => {
  const firstLine = text.split('\n')[0];
  if (firstLine.length <= maxLength) return firstLine;
  return firstLine.substring(0, maxLength) + '...';
};

export default function ReplyIndicator({
  parentContent,
  parentAvatarUrl,
  onPress,
  maxLength = 50,
}: ReplyIndicatorProps) {
  const [imageError, setImageError] = useState(false);

  return (
    <Pressable onPress={onPress}>
      <HStack space="xs" className="items-center">
        <Icon as={CornerDownRight} size="sm" className="text-typography-600" />
        <Avatar size="xs">
          {parentAvatarUrl && !imageError ? (
            <AvatarImage
              source={{ uri: parentAvatarUrl }}
              onError={() => setImageError(true)}
            />
          ) : (
            <DefaultAvatar size="xs" />
          )}
        </Avatar>
        <Text className="text-sm text-typography-500 pr-4 flex-1" numberOfLines={1}>
          {truncateText(parentContent, maxLength)}
        </Text>
      </HStack>
    </Pressable>
  );
}
