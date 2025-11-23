import { Text } from '@/components/Themed';
import { Avatar, AvatarFallbackText, AvatarImage } from '@/components/ui/avatar';
import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';

interface UserProfile {
  avatarUrl: string | null;
  userName: string | null;
  accountName: string | null;
  createdAt: string | null;
}

interface ProfileHeaderProps {
  profile: UserProfile;
  onLogout: () => void;
  onDeleteAccount: () => void;
}

export default function ProfileHeader({ profile, onLogout, onDeleteAccount }: ProfileHeaderProps) {
  return (
    <Box className="p-4 bg-">
      <Heading size="md" className="text-primary-500">
        ログイン中のアカウント
      </Heading>
      <HStack className="mt-2" space="md">
        {profile.avatarUrl && (
          <Avatar size="lg">
            <AvatarFallbackText>{profile.userName || 'User'}</AvatarFallbackText>
            <AvatarImage source={{ uri: profile.avatarUrl }} />
          </Avatar>
        )}
        <VStack className="flex-1 justify-center" space="xs">
          {profile.userName && <Heading size="xl" className="text-primary-300">{profile.userName}</Heading>}
          {profile.accountName && (
            <Text className="text-sm text-primary-300">@{profile.accountName}</Text>
          )}
          {profile.createdAt && (
            <Text className="text-sm text-primary-300">
              アプリ登録日時: {new Date(profile.createdAt).toLocaleDateString('ja-JP')}
            </Text>
          )}
        </VStack>
      </HStack>

      <HStack className="my-4" space="sm">
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
