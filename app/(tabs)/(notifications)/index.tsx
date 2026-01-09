import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { Heart, MessageCircle, Quote, Repeat2, UserRoundPlus } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl } from 'react-native';

import LoginPrompt from '@/components/LoginPrompt';
import ReplyIndicator from '@/components/ReplyIndicator';
import DefaultAvatar from '@/components/icons/DefaultAvatar';
import { Avatar, AvatarImage } from '@/components/ui/avatar';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useNotificationContext } from '@/src/contexts/NotificationContext';
import { supabase } from '@/src/lib/supabase';
import { formatRelativeDate } from '@/src/utils/dateUtils';

interface Notification {
  id: string;
  type: 'like' | 'reply' | 'follow' | 'repost' | 'quote';
  post_id: string | null;
  is_read: boolean;
  created_at: string;
  actor: {
    user_id: string;
    display_name: string;
    avatar_url: string | null;
  };
  post_content?: string | null;
  parent_post_content?: string | null; // 返信通知の場合、親投稿の内容
  parent_post_id?: string | null; // 返信通知の場合、親投稿のID
  parent_post_avatar_url?: string | null; // 返信通知の場合、親投稿者のアバター
}

const LIMIT = 20;

export default function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
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
        loadNotifications(true);
      }
    }, [userId])
  );

  const loadNotifications = async (reset = false) => {
    if (!userId) return;
    if (!reset && (!hasMore || loadingMore)) return;

    const currentOffset = reset ? 0 : notifications.length;

    try {
      if (reset) {
        setLoading(true);
        setHasMore(true);
      } else {
        setLoadingMore(true);
      }

      // ブロックしているユーザー、ブロックされているユーザー、ミュートしているユーザーを並列取得
      const [blocksRes, blockedByRes, mutesRes] = await Promise.all([
        supabase
          .from('blocks')
          .select('blocked_id')
          .eq('blocker_id', userId),
        supabase
          .from('blocks')
          .select('blocker_id')
          .eq('blocked_id', userId),
        supabase
          .from('mutes')
          .select('muted_id')
          .eq('muter_id', userId),
      ]);

      const blockedIds = blocksRes.data?.map((b) => b.blocked_id) || [];
      const blockedByIds = blockedByRes.data?.map((b) => b.blocker_id) || [];
      const mutedIds = mutesRes.data?.map((m) => m.muted_id) || [];

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
        .range(currentOffset, currentOffset + LIMIT - 1);

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
      let parentPostsContentMap = new Map<string, string>(); // 返信の場合の親投稿内容
      let parentPostsIdMap = new Map<string, string>(); // 返信の場合の親投稿ID
      let parentPostsAvatarMap = new Map<string, string | null>(); // 返信の場合の親投稿者アバター

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
          let parentAvatarsMap = new Map<string, string | null>();
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

              // 親投稿の投稿者のアバターを取得
              const parentUserIds = [...new Set(parentPostsData.map((p) => p.user_id))];
              if (parentUserIds.length > 0) {
                const { data: parentUsersData } = await supabase
                  .from('users')
                  .select('user_id, avatar_url')
                  .in('user_id', parentUserIds);

                const userAvatarMap = new Map<string, string | null>();
                parentUsersData?.forEach((u) => {
                  userAvatarMap.set(u.user_id, u.avatar_url);
                });

                parentPostsData.forEach((p) => {
                  parentAvatarsMap.set(p.id, userAvatarMap.get(p.user_id) || null);
                });
              }
            }
          }

          postsData.forEach((p) => {
            // 投稿内容は常に自身の内容を表示（返信の場合も返信自体の内容を表示）
            postsMap.set(p.id, p.content);

            // 返信の場合、親投稿の内容・ID・アバターを保存
            if (p.parent_post_id && parentPostsMap.has(p.parent_post_id)) {
              parentPostsContentMap.set(p.id, parentPostsMap.get(p.parent_post_id)!);
              parentPostsIdMap.set(p.id, p.parent_post_id);
              parentPostsAvatarMap.set(p.id, parentAvatarsMap.get(p.parent_post_id) || null);
              postAuthorsMap.set(p.id, parentAuthorsMap.get(p.parent_post_id)!);
            } else {
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
          parent_post_content: n.post_id ? parentPostsContentMap.get(n.post_id) || null : null,
          parent_post_id: n.post_id ? parentPostsIdMap.get(n.post_id) || null : null,
          parent_post_avatar_url: n.post_id ? parentPostsAvatarMap.get(n.post_id) || null : null,
        }));

      if (reset) {
        setNotifications(formatted);
      } else {
        setNotifications((prev) => {
          const existingIds = new Set(prev.map((n) => n.id));
          const newNotifications = formatted.filter((n) => !existingIds.has(n.id));
          return [...prev, ...newNotifications];
        });
      }
      setHasMore(formatted.length === LIMIT);
    } catch (error) {
      console.error('通知取得エラー:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadNotifications(true);
    setRefreshing(false);
  }, [userId]);

  const handleLoadMore = () => {
    if (!loading && !loadingMore && hasMore) {
      loadNotifications(false);
    }
  };

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
      case 'repost':
        return 'があなたの投稿をリポストしました';
      case 'quote':
        return 'があなたの投稿を引用しました';
      default:
        return '';
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Icon as={Heart} size="xl" className="text-secondary-400 fill-secondary-400" />;
      case 'reply':
        return <Icon as={MessageCircle} size="xl" className="text-typography-600" />;
      case 'follow':
        return <Icon as={UserRoundPlus} size="xl" className="text-info-600" />;
      case 'repost':
        return <Icon as={Repeat2} size="xl" className="text-success-500" />;
      case 'quote':
        return <Icon as={Quote} size="xl" className="text-primary-500" />;
      default:
        return null;
    }
  };

  const handleParentPress = (parentPostId: string) => {
    router.push(`/(tabs)/(notifications)/post/${parentPostId}`);
  };

  const renderNotification = ({ item }: { item: Notification }) => (
    <Pressable onPress={() => handlePress(item)}>
      <HStack
        className={`p-4 border-b border-outline-200 ${!item.is_read ? 'bg-primary-50' : ''}`}
        space="md"
      >
        {getNotificationIcon(item.type)}
        <VStack className="flex-1" space="xs">
          <HStack className="items-start">
            <HStack space="sm" className="flex-1 items-start">
              <Avatar size="sm">
                {item.actor.avatar_url ? (
                  <AvatarImage source={{ uri: item.actor.avatar_url }} />
                ) : (
                  <DefaultAvatar size="sm" />
                )}
              </Avatar>
              <Text className="flex-1 text-sm">
                <Text className="font-semibold">{item.actor.display_name}さん</Text>
                {getNotificationMessage(item.type)}
              </Text>
            </HStack>
            <Text className="text-sm text-typography-400">{formatRelativeDate(item.created_at)}</Text>
          </HStack>

          {/* 返信通知の場合：親投稿インジケータ + 返信内容 */}
          {item.type === 'reply' && item.parent_post_content && item.parent_post_id && (
            <VStack space="xs">
              <ReplyIndicator
                parentContent={item.parent_post_content}
                parentAvatarUrl={item.parent_post_avatar_url}
                onPress={() => handleParentPress(item.parent_post_id!)}
              />
              {item.post_content && (
                <Text className="text-base" numberOfLines={2}>
                  {item.post_content}
                </Text>
              )}
            </VStack>
          )}

          {/* いいね・リポスト・引用リポスト通知の場合：投稿内容のみ */}
          {(item.type === 'like' || item.type === 'repost' || item.type === 'quote') && item.post_content && (
            <Text
              className="text-base text-typography-500"
              numberOfLines={2}
            >
              {item.post_content}
            </Text>
          )}
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
          ListFooterComponent={
            loadingMore ? (
              <Box className="py-4 items-center">
                <Spinner size="small" />
              </Box>
            ) : null
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
        />
      </Box>
    </LoginPrompt>
  );
}
