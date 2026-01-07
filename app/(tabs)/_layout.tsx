import { Tabs, usePathname, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Button, ButtonIcon } from '@/components/ui/button';
import { Icon, AddIcon } from '@/components/ui/icon';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import { NotificationProvider, useNotificationContext } from '@/src/contexts/NotificationContext';
import { supabase } from '@/src/lib/supabase';

import {
  Bell,
  House,
  Search,
  User,
} from 'lucide-react-native';

function TabsContent({ isLoggedIn }: { isLoggedIn: boolean }) {
  const { unreadCount, refetch } = useNotificationContext();
  const pathname = usePathname();
  const router = useRouter();

  // 通知タブにフォーカスした時に再フェッチ
  useEffect(() => {
    if (pathname === '/notifications' || pathname.startsWith('/(notifications)')) {
      refetch();
    }
  }, [pathname, refetch]);

  // 各タブのルート画面かどうかを判定
  const isRootScreen =
    pathname === '/' ||
    pathname === '/index' ||
    pathname === '/search' ||
    pathname === '/notifications' ||
    pathname === '/profile';

  return (
    <View className="flex-1">
      <Tabs
      screenOptions={{
        tabBarShowLabel: false,
        // Disable the static render of the header on web
        // to prevent a hydration error in React Navigation v6.
        headerShown: useClientOnlyValue(false, true),
      }}>
      <Tabs.Screen
        name="(home)"
        options={{
          title: 'ホーム',
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <Icon
              as={House}
              size="xl"
              className={focused ? 'text-primary-500' : 'text-typography-300'}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="(search)"
        options={{
          title: '検索',
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <Icon
              as={Search}
              size="xl"
              className={focused ? 'text-primary-500' : 'text-typography-300'}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="(notifications)"
        options={{
          title: '通知',
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <Icon
              as={Bell}
              size="xl"
              className={focused ? 'text-primary-500' : 'text-typography-300'}
            />
          ),
          tabBarBadge: unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount) : undefined,
          tabBarBadgeStyle: {
            backgroundColor: 'rgb(199, 126, 108)',
            color: '#FFFFFF',
            fontSize: 10,
            fontWeight: '600',
          },
        }}
      />
      <Tabs.Screen
        name="(profile)"
        options={{
          title: 'マイページ',
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <Icon
              as={User}
              size="xl"
              className={focused ? 'text-primary-500' : 'text-typography-300'}
            />
          ),
        }}
      />
      </Tabs>

      {/* 投稿ボタン（FAB）- 各タブのルート画面のみ表示 */}
      {isLoggedIn && isRootScreen && (
        <Button
          className="absolute right-5 bottom-28 rounded-full shadow-lg h-16 w-16 bg-primary-400"
          variant="solid"
          size="md"
          onPress={() => router.push('/create-post')}
        >
          <ButtonIcon as={AddIcon} size="xl" className="text-white w-6 h-6" />
        </Button>
      )}
    </View>
  );
}

export default function TabLayout() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <NotificationProvider userId={userId}>
      <TabsContent isLoggedIn={!!userId} />
    </NotificationProvider>
  );
}
