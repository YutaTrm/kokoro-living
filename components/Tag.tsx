import { ReactNode } from 'react';
import { Pressable } from 'react-native';

import { Text } from '@/components/ui/text';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';

type TagSize = 'xs' | 'md' | 'lg';

interface TagProps {
  name: string;
  color: string;
  size?: TagSize;
  children?: ReactNode;
  onPress?: () => void;
}

// NativeWindでは動的クラス名が使えないため、マッピングで対応
const bgColorMap: Record<string, string> = {
  // fuchsia
  'fuchsia-300': 'bg-fuchsia-300',
  'fuchsia-400': 'bg-fuchsia-400',
  'fuchsia-500': 'bg-fuchsia-500',
  // cyan
  'cyan-300': 'bg-cyan-300',
  'cyan-400': 'bg-cyan-400',
  'cyan-500': 'bg-cyan-500',
  // green
  'green-300': 'bg-green-300',
  'green-400': 'bg-green-400',
  'green-500': 'bg-green-500',
  // amber
  'amber-300': 'bg-amber-300',
  'amber-400': 'bg-amber-400',
  'amber-500': 'bg-amber-500',
  // gray (終了済みなど)
  'gray-300': 'bg-gray-300',
  'gray-400': 'bg-gray-400',
  'gray-500': 'bg-gray-500',
};

const textSizeMap: Record<TagSize, string> = {
  xs: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

export default function Tag({ name, color, size = 'md', children, onPress }: TagProps) {
  const bgClass = bgColorMap[color] || 'bg-gray-400';
  const textClass = textSizeMap[size];

  const content = (
    <Box className={`text-center rounded py-1 px-2 ${bgClass}`}>
      {children ? (
        <HStack space="xs" className="items-center">
          <Text className={textClass}>{name}</Text>
          {children}
        </HStack>
      ) : (
        <Text className={textClass}>{name}</Text>
      )}
    </Box>
  );

  if (onPress) {
    return <Pressable onPress={onPress}>{content}</Pressable>;
  }

  return content;
}
