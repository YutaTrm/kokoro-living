import { Href, useRouter, useSegments } from 'expo-router';
import { Pressable } from 'react-native';

import DefaultAvatar from '@/components/icons/DefaultAvatar';
import { Text } from '@/components/ui/text';
import { Avatar, AvatarImage } from '@/components/ui/avatar';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { getCurrentTab } from '@/src/utils/getCurrentTab';

interface UserListItemProps {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  bio?: string | null;
}

export default function UserListItem({ userId, displayName, avatarUrl, bio }: UserListItemProps) {
  const router = useRouter();
  const segments = useSegments();

  const handlePress = () => {
    const currentTab = getCurrentTab(segments);
    router.push(`/(tabs)/${currentTab}/user/${userId}` as Href);
  };

  return (
    <Pressable onPress={handlePress}>
      <HStack className="p-4 border-b border-outline-200" space="md">
        <Avatar size="md">
          {avatarUrl ? (
            <AvatarImage source={{ uri: avatarUrl }} />
          ) : (
            <DefaultAvatar size={48} />
          )}
        </Avatar>
        <VStack className="flex-1" space="xs">
          <Text className="font-semibold">{displayName}</Text>
          {bio && (
            <Text className="text-sm text-typography-500" numberOfLines={2}>
              {bio}
            </Text>
          )}
        </VStack>
      </HStack>
    </Pressable>
  );
}
