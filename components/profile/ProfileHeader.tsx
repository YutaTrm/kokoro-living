import { Pencil } from 'lucide-react-native';
import { Pressable, TouchableOpacity } from 'react-native';

import { Text } from '@/components/Themed';
import { Avatar, AvatarFallbackText, AvatarImage } from '@/components/ui/avatar';
import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
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
  return (
    <Box className="p-4">
      <HStack className="mt-2" space="md">
        {profile.avatarUrl && (
          <Avatar size="lg">
            <AvatarFallbackText>{profile.userName || 'User'}</AvatarFallbackText>
            <AvatarImage source={{ uri: profile.avatarUrl }} />
          </Avatar>
        )}
        <VStack className="flex-1 justify-center" space="xs">
          <HStack className="items-center" space="xs">
            <Heading size="lg" className="text-primary-500">
              {profile.userName || 'ユーザー'}
            </Heading>
            <TouchableOpacity onPress={onEditName} className="p-1">
              <Icon as={Pencil} size="sm" className="text-typography-500" />
            </TouchableOpacity>
          </HStack>
          {profile.xUserName && profile.userName !== profile.xUserName && (
            <Text className="text-sm text-primary-300">
              Xアカウントの名前: {profile.xUserName}
            </Text>
          )}
          {profile.accountName && (
            <Text className="text-sm text-primary-300">
              ログイン中のXアカウント: @{profile.accountName}
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
