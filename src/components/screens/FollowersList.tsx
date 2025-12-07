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

const LIMIT = 20;

export default function FollowersListScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [allBlockedIds, setAllBlockedIds] = useState<string[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserId(session?.user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    if (id && currentUserId) {
      initializeAndLoad();
    }
  }, [id, currentUserId]);

  const initializeAndLoad = async () => {
    if (!currentUserId) return;

    try {
      // ブロックしているユーザーとブロックされているユーザーを並列取得
      const [blocksRes, blockedByRes] = await Promise.all([
        supabase
          .from('blocks')
          .select('blocked_id')
          .eq('blocker_id', currentUserId),
        supabase
          .from('blocks')
          .select('blocker_id')
          .eq('blocked_id', currentUserId),
      ]);

      const blockedIds = blocksRes.data?.map((b) => b.blocked_id) || [];
      const blockedByIds = blockedByRes.data?.map((b) => b.blocker_id) || [];
      const blocked = [...blockedIds, ...blockedByIds];
      setAllBlockedIds(blocked);

      await loadFollowers(true, blocked);
    } catch (error) {
      console.error('初期化エラー:', error);
      setLoading(false);
    }
  };

  const loadFollowers = async (reset = false, blockedIds?: string[]) => {
    if (!reset && (!hasMore || loadingMore)) return;

    const currentOffset = reset ? 0 : users.length;
    const blocked = blockedIds ?? allBlockedIds;

    try {
      if (reset) {
        setLoading(true);
        setHasMore(true);
      } else {
        setLoadingMore(true);
      }

      // フォロワーのユーザーIDを取得
      const { data: followsData, error: followsError } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('following_id', id)
        .order('created_at', { ascending: false })
        .range(currentOffset, currentOffset + LIMIT - 1);

      if (followsError) throw followsError;
      if (!followsData || followsData.length === 0) {
        if (reset) setUsers([]);
        setHasMore(false);
        return;
      }

      // ブロックユーザーを除外
      const userIds = followsData
        .map((f) => f.follower_id)
        .filter((userId) => !blocked.includes(userId));

      if (userIds.length === 0) {
        if (reset) setUsers([]);
        setHasMore(followsData.length === LIMIT);
        return;
      }

      // ユーザー情報を取得
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('user_id, display_name, avatar_url, bio')
        .in('user_id', userIds);

      if (usersError) throw usersError;

      // フォローの順序を保持
      const usersMap = new Map(usersData?.map((u) => [u.user_id, u]) || []);
      const orderedUsers = userIds
        .map((userId) => usersMap.get(userId))
        .filter((u): u is User => u !== undefined);

      if (reset) {
        setUsers(orderedUsers);
      } else {
        setUsers((prev) => {
          const existingIds = new Set(prev.map((u) => u.user_id));
          const newUsers = orderedUsers.filter((u) => !existingIds.has(u.user_id));
          return [...prev, ...newUsers];
        });
      }
      setHasMore(followsData.length === LIMIT);
    } catch (error) {
      console.error('フォロワー一覧取得エラー:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      loadFollowers(false);
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
        <Text className="text-base text-typography-400">フォロワーはいません</Text>
      </Box>
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: 'フォロワー' }} />
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
          ListFooterComponent={
            loadingMore ? (
              <Box className="py-4 items-center">
                <Spinner size="small" />
              </Box>
            ) : null
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
        />
      </Box>
    </>
  );
}
