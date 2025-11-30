import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { LogOut, MessageCircleOff, Moon, ShieldBan, Sun, UserX, X } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable } from 'react-native';

import ConfirmModal from '@/components/ConfirmModal';
import { Button, ButtonIcon, ButtonText } from '@/components/ui/button';
import { Divider } from '@/components/ui/divider';
import {
  Drawer,
  DrawerBackdrop,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
} from '@/components/ui/drawer';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useTheme } from '@/src/contexts/ThemeContext';
import { supabase } from '@/src/lib/supabase';

interface ProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileDrawer({ isOpen, onClose }: ProfileDrawerProps) {
  const router = useRouter();
  const { themeMode, setThemeMode } = useTheme();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeleteAccountConfirm, setShowDeleteAccountConfirm] = useState(false);

  const handleBlockList = () => {
    onClose();
    router.push('/(tabs)/(profile)/blocks');
  };

  const handleMuteList = () => {
    onClose();
    router.push('/(tabs)/(profile)/mutes');
  };

  const handleOpenLink = async (url: string) => {
    await WebBrowser.openBrowserAsync(url);
  };

  const handleLogoutConfirm = () => {
    setShowLogoutConfirm(true);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      await AsyncStorage.clear();
      setShowLogoutConfirm(false);
      onClose();
    } catch (error) {
      Alert.alert('エラー', 'ログアウトに失敗しました');
    }
  };

  const handleDeleteAccountConfirm = () => {
    setShowDeleteAccountConfirm(true);
  };

  const handleDeleteAccount = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('エラー', '退会処理に失敗しました');
        return;
      }

      const { error } = await supabase.rpc('delete_user_account', { user_id: user.id });
      if (error) throw error;

      Alert.alert('退会完了', 'アカウントが削除されました');
      await supabase.auth.signOut();
      await AsyncStorage.clear();
      setShowDeleteAccountConfirm(false);
      onClose();
    } catch (error) {
      console.error('退会エラー:', error);
      Alert.alert('エラー', '退会処理に失敗しました');
    }
  };

  return (
    <>
      <Drawer isOpen={isOpen} onClose={onClose} size="lg" anchor="right">
        <DrawerBackdrop />
        <DrawerContent className="">
          <DrawerHeader>
            <Heading size="md">メニュー</Heading>
            <DrawerCloseButton>
              <Icon as={X} size="lg" />
            </DrawerCloseButton>
          </DrawerHeader>
          <DrawerBody>
            <VStack space="md">
              {/*  */}
              <Text className="text-sm text-typography-500 mb-2">プライバシー</Text>

              {/* ブロックリスト */}
              <Pressable onPress={handleBlockList}>
                <HStack space="md" className="items-center">
                  <Icon as={ShieldBan} size="md" className="text-typography-700" />
                  <Text className="text-lg -ml-2">ブロックリスト</Text>
                </HStack>
              </Pressable>

              {/* ミュートリスト */}
              <Pressable onPress={handleMuteList}>
                <HStack space="md" className="items-center">
                  <Icon as={MessageCircleOff} size="md" className="text-typography-700" />
                  <Text className="text-lg -ml-2">ミュートリスト</Text>
                </HStack>
              </Pressable>

              <Divider className="my-2" />

              {/* テーマ設定 */}
              <Text className="text-sm text-typography-500 mb-2">テーマ</Text>

              {/* ライト */}
              <Pressable onPress={() => setThemeMode('light')} className="">
                <HStack space="md" className="items-center">
                  <Icon
                    as={Sun}
                    size="md"
                    className={themeMode === 'light' ? 'text-primary-500' : 'text-typography-700'}
                  />
                  <Text className={`text-lg -ml-2 ${themeMode === 'light' ? 'text-primary-500 font-semibold' : ''}`}>
                    ライト
                  </Text>
                </HStack>
              </Pressable>

              {/* ダーク */}
              <Pressable onPress={() => setThemeMode('dark')} className="">
                <HStack space="md" className="items-center">
                  <Icon
                    as={Moon}
                    size="md"
                    className={themeMode === 'dark' ? 'text-primary-500' : 'text-typography-700'}
                  />
                  <Text className={`text-lg -ml-2 ${themeMode === 'dark' ? 'text-primary-500 font-semibold' : ''}`}>
                    ダーク
                  </Text>
                </HStack>
              </Pressable>

              <Divider className="my-2" />

              {/* その他 */}
              <Text className="text-sm text-typography-500 mb-2">その他</Text>

              {/* 利用規約 */}
              <Pressable
                onPress={() =>
                  handleOpenLink('https://yutatrm.github.io/kokoro-living/terms.html')
                }
              >
                <HStack space="md" className="items-center">
                  <Text className="text-lg -mr-2">利用規約</Text>
                  {/* <Icon as={ExternalLink} size="md" className="text-typography-700" /> */}
                </HStack>
              </Pressable>

              {/* プライバシーポリシー */}
              <Pressable
                onPress={() =>
                  handleOpenLink('https://yutatrm.github.io/kokoro-living/privacy.html')
                }
              >
                <HStack space="md" className="items-center">
                  <Text className="text-lg -mr-2">プライバシーポリシー</Text>
                  {/* <Icon as={ExternalLink} size="md" className="text-typography-700" /> */}
                </HStack>
              </Pressable>

              {/* サポートページ */}
              <Pressable
                onPress={() =>
                  handleOpenLink('https://yutatrm.github.io/kokoro-living/support.html')
                }
              >
                <HStack space="md" className="items-center">
                  <Text className="text-lg -mr-2">サポートページ</Text>
                  {/* <Icon as={ExternalLink} size="md" className="text-typography-700" /> */}
                </HStack>
              </Pressable>
            </VStack>
          </DrawerBody>
          <DrawerFooter className='mb-10'>
            <VStack className="w-full gap-2">
              {/* ログアウト */}
              <Button
                onPress={handleLogoutConfirm}
                action="negative"
                variant="outline"
                className="w-full"
              >
                <ButtonText className="text-error-500">ログアウト</ButtonText>
                <ButtonIcon as={LogOut} />
              </Button>

              {/* アプリ退会 */}
              <Button
                onPress={handleDeleteAccountConfirm}
                action="negative"
                variant="solid"
                className="w-full"
              >
                <ButtonText>アプリ退会</ButtonText>
                <ButtonIcon as={UserX} />
              </Button>
            </VStack>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* ログアウト確認モーダル */}
      <ConfirmModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
        title="ログアウト"
        message="ログアウトしますか？"
        confirmText="ログアウト"
      />

      {/* 退会確認モーダル */}
      <ConfirmModal
        isOpen={showDeleteAccountConfirm}
        onClose={() => setShowDeleteAccountConfirm(false)}
        onConfirm={handleDeleteAccount}
        title="アプリ退会"
        message="退会すると、投稿やいいねなど全てのデータが削除されます。この操作は取り消せません。本当に退会しますか？"
        confirmText="退会"
      />
    </>
  );
}
