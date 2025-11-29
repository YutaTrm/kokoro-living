import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList } from 'react-native';

import { Text } from '@/components/ui/text';
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

export default function PostLikesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserId(session?.user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    if (id && currentUserId) loadLikedUsers();
  }, [id, currentUserId]);

  const loadLikedUsers = async () => {
    if (!currentUserId) return;

    try {
      // ブロックしているユーザーとブロックされているユーザーを取得
      const { data: blocksData } = await supabase
        .from('blocks')
        .select('blocked_id')
        .eq('blocker_id', currentUserId);

      const blockedIds = blocksData?.map((b) => b.blocked_id) || [];

      const { data: blockedByData } = await supabase
        .from('blocks')
        .select('blocker_id')
        .eq('blocked_id', currentUserId);

      const blockedByIds = blockedByData?.map((b) => b.blocker_id) || [];

      const allBlockedIds = [...blockedIds, ...blockedByIds];

      // 投稿の作成者を確認
      const { data: postData } = await supabase
        .from('posts')
        .select('user_id')
        .eq('id', id)
        .single();

      // 投稿の作成者がブロックリストに含まれている場合は空のリストを返す
      if (postData && allBlockedIds.includes(postData.user_id)) {
        setUsers([]);
        return;
      }

      const { data: likesData, error: likesError } = await supabase
        .from('likes')
        .select('user_id')
        .eq('post_id', id)
        .order('created_at', { ascending: false });

      if (likesError) throw likesError;
      if (!likesData || likesData.length === 0) {
        setUsers([]);
        return;
      }

      // ブロックユーザーを除外
      const userIds = likesData
        .map((l) => l.user_id)
        .filter((userId) => !allBlockedIds.includes(userId));

      if (userIds.length === 0) {
        setUsers([]);
        return;
      }

      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('user_id, display_name, avatar_url, bio')
        .in('user_id', userIds);

      if (usersError) throw usersError;

      // いいねの順序を保持
      const usersMap = new Map(usersData?.map((u) => [u.user_id, u]) || []);
      const orderedUsers = userIds
        .map((userId) => usersMap.get(userId))
        .filter((u): u is User => u !== undefined);

      setUsers(orderedUsers);
    } catch (error) {
      console.error('いいねユーザー取得エラー:', error);
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
        <Text className="text-base text-typography-400">いいねしたユーザーはいません</Text>
      </Box>
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: 'いいね' }} />
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
            />
          )}
          ListEmptyComponent={renderEmpty}
        />
      </Box>
    </>
  );
}
