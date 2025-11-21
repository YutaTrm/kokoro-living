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
}

export default function ProfileHeader({ profile, onLogout }: ProfileHeaderProps) {
  return (
    <>
      <HStack className="py-6 px-5" space="md">
        {profile.avatarUrl && (
          <Avatar size="lg">
            <AvatarFallbackText>{profile.userName || 'User'}</AvatarFallbackText>
            <AvatarImage source={{ uri: profile.avatarUrl }} />
          </Avatar>
        )}
        <VStack className="flex-1 justify-center" space="xs">
          {profile.userName && <Heading size="xl">{profile.userName}</Heading>}
          {profile.accountName && (
            <Text className="text-sm opacity-60">@{profile.accountName}</Text>
          )}
          {profile.createdAt && (
            <Text className="text-xs opacity-50">
              登録日時: {new Date(profile.createdAt).toLocaleDateString('ja-JP')}
            </Text>
          )}
        </VStack>
      </HStack>

      <Box className="px-5 mb-4">
        <Button onPress={onLogout} action="negative" className="w-full">
          <ButtonText>ログアウト</ButtonText>
        </Button>
      </Box>
    </>
  );
}
