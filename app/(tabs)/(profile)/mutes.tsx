import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList } from 'react-native';

import { Text } from '@/components/Themed';
import UserListItem from '@/components/UserListItem';
import { Box } from '@/components/ui/box';
import { Spinner } from '@/components/ui/spinner';
import { supabase } from '@/src/lib/supabase';

interface User {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
}

export default function MutesListScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserId(session?.user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    if (currentUserId) loadMutes();
  }, [currentUserId]);

  const loadMutes = async () => {
    if (!currentUserId) return;

    try {
      // ミュートしているユーザーIDを取得
      const { data: mutesData, error: mutesError } = await supabase
        .from('mutes')
        .select('muted_id')
        .eq('muter_id', currentUserId)
        .order('created_at', { ascending: false });

      if (mutesError) throw mutesError;
      if (!mutesData || mutesData.length === 0) {
        setUsers([]);
        return;
      }

      const userIds = mutesData.map((m) => m.muted_id);

      // ユーザー情報を取得
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('user_id, display_name, avatar_url, bio')
        .in('user_id', userIds);

      if (usersError) throw usersError;

      // ミュートの順序を保持
      const usersMap = new Map(usersData?.map((u) => [u.user_id, u]) || []);
      const orderedUsers = userIds
        .map((userId) => usersMap.get(userId))
        .filter((u): u is User => u !== undefined);

      setUsers(orderedUsers);
    } catch (error) {
      console.error('ミュートリスト取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderEmpty = () => {
    if (loading) {
      return (
        <Box className="flex-1 items-center justify-center py-8">
          <Spinner size="large" />
        </Box>
      );
    }
    return (
      <Box className="flex-1 items-center justify-center py-8">
        <Text className="text-base text-typography-400">ミュート中のユーザーはいません</Text>
      </Box>
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: 'ミュートリスト' }} />
      <Box className="flex-1 bg-background-0">
        <FlatList
          data={users}
          keyExtractor={(item) => item.user_id}
          renderItem={({ item }) => (
            <UserListItem
              userId={item.user_id}
              displayName={item.display_name}
              avatarUrl={item.avatar_url}
              bio={item.bio}
              onActionComplete={loadMutes}
            />
          )}
          ListEmptyComponent={renderEmpty}
        />
      </Box>
    </>
  );
}
