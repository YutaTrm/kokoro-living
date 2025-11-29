import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { Heart, MessageCircle, UserPlus } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl } from 'react-native';

import LoginPrompt from '@/components/LoginPrompt';
import { Avatar, AvatarFallbackText, AvatarImage } from '@/components/ui/avatar';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useNotificationContext } from '@/src/contexts/NotificationContext';
import { supabase } from '@/src/lib/supabase';

interface Notification {
  id: string;
  type: 'like' | 'reply' | 'follow';
  post_id: string | null;
  is_read: boolean;
  created_at: string;
  actor: {
    user_id: string;
    display_name: string;
    avatar_url: string | null;
  };
  post_content?: string | null;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const { refetch: refetchBadge } = useNotificationContext();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });
  }, []);

  // フォーカス時に通知を読み込む
  useFocusEffect(
    useCallback(() => {
      if (userId) {
        loadNotifications();
      }
    }, [userId])
  );

  const loadNotifications = async () => {
    if (!userId) return;

    try {
      // ブロックしているユーザーとブロックされているユーザーを取得
      const { data: blocksData } = await supabase
        .from('blocks')
        .select('blocked_id')
        .eq('blocker_id', userId);

      const blockedIds = blocksData?.map((b) => b.blocked_id) || [];

      const { data: blockedByData } = await supabase
        .from('blocks')
        .select('blocker_id')
        .eq('blocked_id', userId);

      const blockedByIds = blockedByData?.map((b) => b.blocker_id) || [];

      // ミュートしているユーザーを取得
      const { data: mutesData } = await supabase
        .from('mutes')
        .select('muted_id')
        .eq('muter_id', userId);

      const mutedIds = mutesData?.map((m) => m.muted_id) || [];

      const allBlockedIds = [...blockedIds, ...blockedByIds, ...mutedIds];

      // 通知を取得（ブロックユーザーを除外）
      let query = supabase
        .from('notifications')
        .select(`
          id,
          type,
          post_id,
          is_read,
          created_at,
          actor:actor_id(user_id, display_name, avatar_url)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      // ブロックリストがある場合のみ除外
      if (allBlockedIds.length > 0) {
        query = query.not('actor_id', 'in', `(${allBlockedIds.join(',')})`);
      }

      const { data, error } = await query;

      if (error) throw error;

      // 投稿内容と作成者を取得
      const postIds = (data || []).map((n) => n.post_id).filter(Boolean) as string[];
      let postsMap = new Map<string, string>();
      let postAuthorsMap = new Map<string, string>();

      if (postIds.length > 0) {
        // いいね通知の場合は元の投稿、返信通知の場合は返信自体の親投稿を取得
        const { data: postsData } = await supabase
          .from('posts')
          .select('id, content, parent_post_id, user_id')
          .in('id', postIds);

        if (postsData) {
          // 返信の場合は親投稿のIDを収集
          const parentPostIds = postsData
            .filter((p) => p.parent_post_id)
            .map((p) => p.parent_post_id) as string[];

          let parentPostsMap = new Map<string, string>();
          let parentAuthorsMap = new Map<string, string>();
          if (parentPostIds.length > 0) {
            const { data: parentPostsData } = await supabase
              .from('posts')
              .select('id, content, user_id')
              .in('id', parentPostIds);

            if (parentPostsData) {
              parentPostsData.forEach((p) => {
                parentPostsMap.set(p.id, p.content);
                parentAuthorsMap.set(p.id, p.user_id);
              });
            }
          }

          postsData.forEach((p) => {
            // 返信通知の場合は親投稿の内容と作成者を使用
            if (p.parent_post_id && parentPostsMap.has(p.parent_post_id)) {
              postsMap.set(p.id, parentPostsMap.get(p.parent_post_id)!);
              postAuthorsMap.set(p.id, parentAuthorsMap.get(p.parent_post_id)!);
            } else {
              postsMap.set(p.id, p.content);
              postAuthorsMap.set(p.id, p.user_id);
            }
          });
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formatted: Notification[] = (data || [])
        .filter((n: any) => {
          // ブロックした人の投稿に対する通知を除外
          if (n.post_id && postAuthorsMap.has(n.post_id)) {
            const postAuthor = postAuthorsMap.get(n.post_id);
            return !allBlockedIds.includes(postAuthor!);
          }
          return true;
        })
        .map((n: any) => ({
          id: n.id,
          type: n.type,
          post_id: n.post_id,
          is_read: n.is_read,
          created_at: n.created_at,
          actor: {
            user_id: n.actor?.user_id || '',
            display_name: n.actor?.display_name || 'Unknown',
            avatar_url: n.actor?.avatar_url || null,
          },
          post_content: n.post_id ? postsMap.get(n.post_id) || null : null,
        }));

      setNotifications(formatted);
    } catch (error) {
      console.error('通知取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  }, [userId]);

  const markAsRead = async (notificationId: string) => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
    );

    // バッジを更新
    refetchBadge();
  };

  const handlePress = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    if (notification.type === 'follow') {
      router.push(`/(tabs)/(notifications)/user/${notification.actor.user_id}`);
    } else if (notification.post_id) {
      router.push(`/(tabs)/(notifications)/post/${notification.post_id}`);
    }
  };

  const getNotificationMessage = (type: string) => {
    switch (type) {
      case 'like':
        return 'があなたの投稿にいいねしました';
      case 'reply':
        return 'があなたの投稿に返信しました';
      case 'follow':
        return 'があなたをフォローしました';
      default:
        return '';
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Icon as={Heart} size="xl" className="text-secondary-400 fill-secondary-400" />;
      case 'reply':
        return <Icon as={MessageCircle} size="xl" className="text-info-600" />;
      case 'follow':
        return <Icon as={UserPlus} size="xl" className="text-success-600" />;
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'たった今';
    if (minutes < 60) return `${minutes}分前`;
    if (hours < 24) return `${hours}時間前`;
    if (days < 7) return `${days}日前`;
    return date.toLocaleDateString('ja-JP');
  };

  const renderNotification = ({ item }: { item: Notification }) => (
    <Pressable onPress={() => handlePress(item)}>
      <HStack
        className={`p-4 border-b border-outline-200 ${!item.is_read ? 'bg-primary-50' : ''}`}
        space="md"
      >
        {getNotificationIcon(item.type)}
        <VStack className="flex-1" space="xs">
          <Avatar size="sm">
              <AvatarFallbackText>{item.actor.display_name}</AvatarFallbackText>
              {item.actor.avatar_url && <AvatarImage source={{ uri: item.actor.avatar_url }} />}
            </Avatar>
          <HStack className="items-start" space="xs">

            <Text className="flex-1 text-sm">
              <Text className="font-semibold">{item.actor.display_name}</Text>
              {getNotificationMessage(item.type)}
            </Text>
          </HStack>
          {(item.type === 'like' || item.type === 'reply') && item.post_content && (
            <Text
              className="text-sm text-typography-500"
              numberOfLines={2}
            >
              {item.post_content}
            </Text>
          )}
          <Text className="text-sm text-typography-400 text-right">{formatDate(item.created_at)}</Text>
        </VStack>
      </HStack>
    </Pressable>
  );

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
        <Text className="text-lg text-typography-400">通知はありません</Text>
      </Box>
    );
  };

  return (
    <LoginPrompt>
      <Box className="flex-1 bg-background-0">
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderNotification}
          ListEmptyComponent={renderEmpty}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      </Box>
    </LoginPrompt>
  );
}
