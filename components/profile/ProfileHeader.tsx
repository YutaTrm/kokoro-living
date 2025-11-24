import { Pencil } from 'lucide-react-native';
import { TouchableOpacity } from 'react-native';

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

interface ProfileHeaderProps {
  profile: UserProfile;
  onLogout: () => void;
  onDeleteAccount: () => void;
  onEditName: () => void;
}

export default function ProfileHeader({
  profile,
  onLogout,
  onDeleteAccount,
  onEditName,
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
        </VStack>
      </HStack>

      <HStack className="mt-4" space="sm">
        <Button onPress={onLogout} variant="outline" action="negative" className="flex-1">
          <ButtonText>ログアウト</ButtonText>
        </Button>
        <Button onPress={onDeleteAccount} action="negative" className="flex-1">
          <ButtonText>アプリ退会</ButtonText>
        </Button>
      </HStack>
    </Box>
  );
}
