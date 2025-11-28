import { Tabs, usePathname } from 'expo-router';
import React, { useEffect, useState } from 'react';

import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import { Icon } from '@/components/ui/icon';
import { NotificationProvider, useNotificationContext } from '@/src/contexts/NotificationContext';
import { supabase } from '@/src/lib/supabase';

import {
  Bell,
  House,
  Search,
  User,
} from 'lucide-react-native';

function TabsContent() {
  const { unreadCount, refetch } = useNotificationContext();
  const pathname = usePathname();

  // 通知タブにフォーカスした時に再フェッチ
  useEffect(() => {
    if (pathname === '/notifications' || pathname.startsWith('/(notifications)')) {
      refetch();
    }
  }, [pathname, refetch]);

  return (
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
              className={focused ? 'text-primary-500' : 'text-typography-500'}
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
              className={focused ? 'text-primary-500' : 'text-typography-500'}
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
              className={focused ? 'text-primary-500' : 'text-typography-500'}
            />
          ),
          tabBarBadge: unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount) : undefined,
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
              className={focused ? 'text-primary-500' : 'text-typography-500'}
            />
          ),
        }}
      />
    </Tabs>
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
      <TabsContent />
    </NotificationProvider>
  );
}
