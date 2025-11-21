import { useRouter } from 'expo-router';
import { Pressable } from 'react-native';

import { Text } from '@/components/Themed';
import { Avatar, AvatarFallbackText } from '@/components/ui/avatar';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';

interface PostItemProps {
  post: {
    id: string;
    content: string;
    created_at: string;
    user: {
      display_name: string;
      user_id: string;
    };
    tags: string[];
  };
}

export default function PostItem({ post }: PostItemProps) {
  const router = useRouter();

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

  const handlePress = () => {
    router.push(`/post/${post.id}`);
  };

  return (
    <Pressable onPress={handlePress}>
      <Box className="border-b border-outline-200 px-4 py-3">
        <HStack space="sm" className="items-start">
          {/* アバター */}
          <Avatar size="md">
            <AvatarFallbackText>{post.user.display_name || 'User'}</AvatarFallbackText>
          </Avatar>

          {/* 投稿内容 */}
          <VStack className="flex-1" space="xs">
            {/* ユーザー名と時間 */}
            <HStack space="xs" className="items-center">
              <Text className="font-semibold text-base">{post.user.display_name}</Text>
              <Text className="text-sm text-typography-500">·</Text>
              <Text className="text-sm text-typography-500">{formatDate(post.created_at)}</Text>
            </HStack>

            {/* 投稿テキスト */}
            <Text className="text-base leading-5">{post.content}</Text>
          </VStack>
        </HStack>
      </Box>
    </Pressable>
  );
}
