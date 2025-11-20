import { Tabs } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';

import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import { supabase } from '@/src/lib/supabase';

import {
  House,
  Search,
  Bell,
  User,
} from 'lucide-react-native';

// テーマカラー定義
const colors = {
  light: {
    primary: '#45a393',
    error: '#f08080',
  },
  dark: {
    primary: '#5ec4b0',
    error: '#ff9999',
  },
};

export default function TabLayout() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const colorScheme = useColorScheme();
  const themeColors = colors[colorScheme === 'dark' ? 'dark' : 'light'];

  useEffect(() => {
    // ログイン状態を確認
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
    });

    // ログイン状態の変更を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: themeColors.primary,
        tabBarShowLabel: false,
        tabBarStyle: isLoggedIn ? undefined : { display: 'none' },
        // Disable the static render of the header on web
        // to prevent a hydration error in React Navigation v6.
        headerShown: useClientOnlyValue(false, true),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'ホーム',
          tabBarIcon: ({ color }) => <House color={color} size={24} />,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: '検索',
          tabBarIcon: ({ color }) => <Search color={color} size={24} />,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: '通知',
          tabBarIcon: ({ color }) => <Bell color={color} size={24} />,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'マイページ',
          tabBarIcon: ({ color }) => <User color={color} size={24} />,
          headerShown: false,
        }}
      />
    </Tabs>
  );
}
