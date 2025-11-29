import { CornerDownRight } from 'lucide-react-native';
import { Pressable } from 'react-native';

import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';

interface ReplyIndicatorProps {
  parentContent: string;
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
  onPress,
  maxLength = 50,
}: ReplyIndicatorProps) {
  return (
    <Pressable onPress={onPress}>
      <HStack space="xs" className="items-center">
        <Icon as={CornerDownRight} size="sm" className="text-typography-600" />
        <Text className="text-sm text-typography-500 pr-4" numberOfLines={1}>
          {truncateText(parentContent, maxLength)}
        </Text>
      </HStack>
    </Pressable>
  );
}
