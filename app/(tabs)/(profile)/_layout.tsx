import { Stack } from 'expo-router';
import { Menu } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable } from 'react-native';

import ProfileDrawer from '@/components/profile/ProfileDrawer';
import { Icon } from '@/components/ui/icon';
import { supabase } from '@/src/lib/supabase';

export default function ProfileLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const checkLoginStatus = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
    };
    checkLoginStatus();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: true,
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: 'マイページ',
            headerRight: isLoggedIn ? () => (
              <Pressable
                onPress={() => setDrawerOpen(true)}
                style={{ marginLeft: 3, padding: 4 }}
              >
                <Icon as={Menu} size="xl" className="text-typography-900" />
              </Pressable>
            ) : undefined,
          }}
        />
      <Stack.Screen
        name="user/[id]/index"
        options={{
          title: 'ユーザー',
        }}
      />
      <Stack.Screen
        name="user/[id]/following"
        options={{
          title: 'フォロー中',
        }}
      />
      <Stack.Screen
        name="user/[id]/followers"
        options={{
          title: 'フォロワー',
        }}
      />
      <Stack.Screen
        name="post/[id]/index"
        options={{
          title: 'ポスト',
        }}
      />
      <Stack.Screen
        name="post/[id]/likes"
        options={{
          title: 'いいね',
        }}
      />
      <Stack.Screen
        name="blocks"
        options={{
          title: 'ブロックリスト',
        }}
      />
      <Stack.Screen
        name="mutes"
        options={{
          title: 'ミュートリスト',
        }}
      />
      <Stack.Screen
        name="profile-card"
        options={{
          title: 'プロフィールカード',
        }}
      />
    </Stack>
      <ProfileDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
