import { Camera, Pencil, RotateCcw, Trash2, Upload } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, TouchableOpacity } from 'react-native';

import ConfirmModal from '@/components/ConfirmModal';
import DefaultAvatar from '@/components/icons/DefaultAvatar';
import { Avatar, AvatarImage } from '@/components/ui/avatar';
import { Box } from '@/components/ui/box';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Menu, MenuItem, MenuItemLabel } from '@/components/ui/menu';
import { Text } from '@/components/ui/text';
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
  onAvatarChange?: () => void;
  onAvatarDelete?: () => void;
  onAvatarReset?: () => void;
  followCounts?: FollowCounts;
  onFollowingPress?: () => void;
  onFollowersPress?: () => void;
}

export default function ProfileHeader({
  profile,
  onEditName,
  onAvatarChange,
  onAvatarDelete,
  onAvatarReset,
  followCounts,
  onFollowingPress,
  onFollowersPress,
}: ProfileHeaderProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);

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

  // 削除確認
  const handleDeleteConfirm = () => {
    setShowDeleteModal(false);
    onAvatarDelete?.();
  };

  return (
    <Box className="p-4">
      <HStack className="mt-2" space="md">
        {/* アバター + カメラボタン */}
        <Box style={{ position: 'relative', width: 64, height: 64 }}>
          <Avatar size="lg" key={profile.avatarUrl || 'default'}>
            {profile.avatarUrl ? (
              <AvatarImage source={{ uri: profile.avatarUrl }} />
            ) : (
              <DefaultAvatar size={64} />
            )}
          </Avatar>
          {/* カメラボタン（右下に重なる） */}
          <Box style={{ position: 'absolute', bottom: 0, right: 4, zIndex: 10 }}>
            <Menu
              placement="bottom left"
              offset={5}
              trigger={({ ...triggerProps }) => {
                return (
                  <Pressable
                    {...triggerProps}
                    className="bg-primary-500 rounded-full p-1.5"
                    style={{
                      elevation: 3,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.25,
                      shadowRadius: 3.84,
                    }}
                  >
                    <Icon as={Camera} size="xs" className="text-white" />
                  </Pressable>
                );
              }}
            >
              <MenuItem key="change" textValue="変更" onPress={onAvatarChange}>
                <Icon as={Upload} size="sm" className="text-typography-700" />
                <MenuItemLabel className="ml-2">変更</MenuItemLabel>
              </MenuItem>
              <MenuItem key="reset" textValue={`${providerLabel}のアバターに戻す`} onPress={onAvatarReset}>
                <Icon as={RotateCcw} size="sm" className="text-typography-700" />
                <MenuItemLabel className="ml-2">{providerLabel}のアバターに戻す</MenuItemLabel>
              </MenuItem>
              <MenuItem key="delete" textValue="削除" onPress={() => setShowDeleteModal(true)}>
                <Icon as={Trash2} size="sm" className="text-error-500" />
                <MenuItemLabel className="ml-2 text-error-500">削除</MenuItemLabel>
              </MenuItem>
            </Menu>
          </Box>
        </Box>
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
            <Text className="text-sm text-typography-400">
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

      {/* 削除確認モーダル */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        title="プロフィール画像を削除"
        message="プロフィール画像を削除してもよろしいですか？"
        confirmText="削除"
      />
    </Box>
  );
}
