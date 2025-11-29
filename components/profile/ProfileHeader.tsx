import { Pencil } from 'lucide-react-native';
import { Pressable, TouchableOpacity } from 'react-native';

import DefaultAvatar from '@/components/icons/DefaultAvatar';
import { Text } from '@/components/ui/text';
import { Avatar, AvatarImage } from '@/components/ui/avatar';
import { Box } from '@/components/ui/box';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { VStack } from '@/components/ui/vstack';

interface UserProfile {
  avatarUrl: string | null;
  userName: string | null;
  xUserName: string | null;
  accountName: string | null;
  createdAt: string | null;
  provider: string | null;
}

interface FollowCounts {
  followingCount: number;
  followersCount: number;
}

interface ProfileHeaderProps {
  profile: UserProfile;
  onEditName: () => void;
  followCounts?: FollowCounts;
  onFollowingPress?: () => void;
  onFollowersPress?: () => void;
}

export default function ProfileHeader({
  profile,
  onEditName,
  followCounts,
  onFollowingPress,
  onFollowersPress,
}: ProfileHeaderProps) {
  // プロバイダーに応じた表示名を取得
  const getProviderLabel = () => {
    switch (profile.provider) {
      case 'apple':
        return 'Apple';
      case 'google':
        return 'Google';
      case 'twitter':
        return 'X';
      default:
        return 'アカウント';
    }
  };

  const providerLabel = getProviderLabel();

  return (
    <Box className="p-4">
      <HStack className="mt-2" space="md">
        <Avatar size="lg">
          {profile.avatarUrl ? (
            <AvatarImage source={{ uri: profile.avatarUrl }} />
          ) : (
            <DefaultAvatar size={64} />
          )}
        </Avatar>
        <VStack className="flex-1 justify-center" space="xs">
          <HStack className="items-center" space="xs">
            <Heading size="xl" className="text-primary-500">
              {profile.userName || 'ユーザー'}
            </Heading>
            <TouchableOpacity onPress={onEditName} className="p-1">
              <Icon as={Pencil} size="md" className="text-typography-500" />
            </TouchableOpacity>
          </HStack>
          {profile.xUserName && profile.userName !== profile.xUserName && (
            <Text className="text-base">
              {providerLabel}アカウントの名前: {profile.xUserName}
            </Text>
          )}
          {profile.accountName && (
            <Text className="text-base">
              ログイン中の{providerLabel}アカウント: @{profile.accountName}
            </Text>
          )}
          {profile.createdAt && (
            <Text className="text-sm text-primary-300">
              アプリ登録日時: {new Date(profile.createdAt).toLocaleDateString('ja-JP')}
            </Text>
          )}
          {/* フォロー数 */}
          {followCounts && (
            <HStack space="md" className="mt-1">
              <Pressable onPress={onFollowingPress}>
                <HStack space="xs">
                  <Text className="font-bold">{followCounts.followingCount}</Text>
                  <Text className="text-typography-500">フォロー</Text>
                </HStack>
              </Pressable>
              <Pressable onPress={onFollowersPress}>
                <HStack space="xs">
                  <Text className="font-bold">{followCounts.followersCount}</Text>
                  <Text className="text-typography-500">フォロワー</Text>
                </HStack>
              </Pressable>
            </HStack>
          )}
        </VStack>
      </HStack>
    </Box>
  );
}
