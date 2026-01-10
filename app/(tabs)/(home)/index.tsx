import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { List } from 'lucide-react-native';
import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl } from 'react-native';

import CreateListModal from '@/components/home/CreateListModal';
import EditListModal from '@/components/home/EditListModal';
import HomeDrawer from '@/components/home/HomeDrawer';
import { MoodCheckinModal } from '@/components/MoodCheckinModal';
import PostItem from '@/components/PostItem';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { MOOD_EMOJIS, MOOD_LABELS, useMoodCheckin } from '@/src/hooks/useMoodCheckin';
import { supabase } from '@/src/lib/supabase';
import { fetchPostMetadata, fetchPostTags, fetchQuotedPostInfo, fetchRepostMetadata, fetchRepostsForTimeline, QuotedPostInfo, RepostForTimeline } from '@/src/utils/postUtils';

const SELECTED_LIST_KEY = 'selected_list_id';
const LIMIT = 20;

interface Post {
  id: string;
  content: string;
  created_at: string;
  experienced_at?: string | null;
  quoted_post_id?: string | null;
  quotedPost?: QuotedPostInfo | null;
  is_hidden?: boolean;
  user: {
    display_name: string;
    user_id: string;
    avatar_url?: string | null;
  };
  diagnoses: string[];
  treatments: string[];
  medications: string[];
  statuses: string[];
  repliesCount?: number;
  likesCount?: number;
  repostsCount?: number;
  isLikedByCurrentUser?: boolean;
  isRepostedByCurrentUser?: boolean;
  hasRepliedByCurrentUser?: boolean;
  repostedBy?: {
    user_id: string;
    display_name: string;
    avatar_url?: string | null;
  } | null;
  // リポスト経由の場合、タイムライン上のソート用日時
  timelineSortDate?: string;
}

interface List {
  id: string;
  name: string;
  created_at: string;
}

export default function TabOneScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // リスト機能のstate
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingList, setEditingList] = useState<List | null>(null);

  // 気分チェックイン機能
  const { todayCheckin, stats, submitting, submitCheckin, hasCheckedIn, loading: moodLoading } = useMoodCheckin();
  const [isMoodModalOpen, setIsMoodModalOpen] = useState(false);
  const [isMoodCardExpanded, setIsMoodCardExpanded] = useState(false);


  // ヘッダーにドロワーアイコンを設定
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={() => setIsDrawerOpen(true)} style={{ marginLeft: 5, padding: 4 }}>
          <Icon as={List} size="lg" className={selectedListId ? "text-primary-400" : "text-typography-900"} strokeWidth={selectedListId ? 3 : 2} />
        </Pressable>
      ),
    });
  }, [navigation, selectedListId]);

  // 選択中のリストをAsyncStorageから読み込み
  useEffect(() => {
    const loadSelectedList = async () => {
      try {
        const saved = await AsyncStorage.getItem(SELECTED_LIST_KEY);
        if (saved) {
          setSelectedListId(saved);
        }
      } catch (error) {
        console.error('リスト選択の読み込みエラー:', error);
      }
    };
    loadSelectedList();
  }, []);

  // 選択中のリストが変わったらAsyncStorageに保存
  useEffect(() => {
    const saveSelectedList = async () => {
      try {
        if (selectedListId === null) {
          await AsyncStorage.removeItem(SELECTED_LIST_KEY);
        } else {
          await AsyncStorage.setItem(SELECTED_LIST_KEY, selectedListId);
        }
      } catch (error) {
        console.error('リスト選択の保存エラー:', error);
      }
    };
    saveSelectedList();
  }, [selectedListId]);

  // リストが変わったら投稿を再読み込み
  useEffect(() => {
    if (!loading) {
      loadPosts(true);
    }
  }, [selectedListId]);

  // 起動時に気分チェックインモーダルを表示（未チェックインかつログイン済みの場合）
  useEffect(() => {
    if (!loading && !moodLoading && isLoggedIn && !hasCheckedIn) {
      // 少し遅延させてからモーダルを表示（UX改善）
      const timer = setTimeout(() => {
        setIsMoodModalOpen(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [loading, moodLoading, isLoggedIn, hasCheckedIn]);

  // チェックイン済みになったらモーダルを閉じる
  useEffect(() => {
    if (hasCheckedIn && isMoodModalOpen) {
      setIsMoodModalOpen(false);
    }
  }, [hasCheckedIn, isMoodModalOpen]);

  useEffect(() => {
    checkLoginStatus();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 画面にフォーカスが当たった時にタイムラインを再読み込み
  useFocusEffect(
    useCallback(() => {
      loadPosts(true);
    }, [selectedListId])
  );

  const checkLoginStatus = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const loggedIn = !!session;
    setIsLoggedIn(loggedIn);
    setLoading(false);
  };

  const loadPosts = async (reset = false) => {
    if (!reset && (!hasMore || loadingMore)) return;

    const currentOffset = reset ? 0 : posts.length;

    try {
      if (reset) {
        setLoadingPosts(true);
        setHasMore(true);
      } else {
        setLoadingMore(true);
      }

      const { data: { user } } = await supabase.auth.getUser();

      let postsData: Array<{
        id: string;
        content: string;
        created_at: string;
        experienced_at: string | null;
        quoted_post_id: string | null;
        user_id: string;
        is_hidden: boolean;
      }> = [];
      let postsError = null;
      let rawPostsCount = 0; // フィルタリング前の件数を保持

      if (user) {
        // ミュートしているユーザーIDを取得
        const { data: mutesData } = await supabase
          .from('mutes')
          .select('muted_id')
          .eq('muter_id', user.id);

        const mutedIds = mutesData?.map(m => m.muted_id) || [];

        // すべての投稿が選択されている場合
        if (selectedListId === 'all') {
          // ブロックしているユーザーIDを取得
          const { data: blocksData } = await supabase
            .from('blocks')
            .select('blocked_id')
            .eq('blocker_id', user.id);
          const blockedIds = blocksData?.map(b => b.blocked_id) || [];

          // 自分をブロックしているユーザーIDを取得
          const { data: blockedByData } = await supabase
            .from('blocks')
            .select('blocker_id')
            .eq('blocked_id', user.id);
          const blockedByIds = blockedByData?.map(b => b.blocker_id) || [];

          const excludeUserIds = [...blockedIds, ...blockedByIds, ...mutedIds];

          // 全投稿を取得（ブロック・ミュートを除外）
          let query = supabase
            .from('posts')
            .select('id, content, created_at, experienced_at, quoted_post_id, user_id, is_hidden')
            .is('parent_post_id', null)
            .eq('is_hidden', false)
            .order('created_at', { ascending: false })
            .range(currentOffset, currentOffset + LIMIT - 1);

          // 除外するユーザーがいる場合のみフィルタを追加
          if (excludeUserIds.length > 0) {
            query = query.not('user_id', 'in', `(${excludeUserIds.join(',')})`);
          }

          const { data: allPosts, error: allError } = await query;

          rawPostsCount = (allPosts || []).length;
          postsData = allPosts || [];
          postsError = allError;
        } else if (selectedListId) {
          // リストに追加されたユーザーIDを取得
          const { data: listMembersData } = await supabase
            .from('list_members')
            .select('user_id')
            .eq('list_id', selectedListId);

          const listMemberIds = listMembersData?.map(m => m.user_id) || [];

          if (listMemberIds.length === 0) {
            // リストにメンバーがいない場合
            if (reset) setPosts([]);
            setHasMore(false);
            return;
          }

          // リストメンバーの投稿を取得（非表示を除外）
          const { data: listPosts, error: listError } = await supabase
            .from('posts')
            .select('id, content, created_at, experienced_at, quoted_post_id, user_id, is_hidden')
            .in('user_id', listMemberIds)
            .is('parent_post_id', null)
            .eq('is_hidden', false)
            .order('created_at', { ascending: false })
            .range(currentOffset, currentOffset + LIMIT - 1);

          // ミュートユーザーの投稿を除外
          rawPostsCount = (listPosts || []).length;
          const filteredPosts = (listPosts || []).filter(p => !mutedIds.includes(p.user_id));
          postsData = filteredPosts;
          postsError = listError;
        } else {
          // タイムライン: 自分がフォローしている人のIDを取得
          const { data: followingData } = await supabase
            .from('follows')
            .select('following_id')
            .eq('follower_id', user.id);

          const followingIds = followingData?.map(f => f.following_id) || [];
          const timelineUserIds = [user.id, ...followingIds];

          // 自分とフォローしている人の投稿とリポストを並列取得
          const [timelinePostsRes, repostsForTimeline] = await Promise.all([
            supabase
              .from('posts')
              .select('id, content, created_at, experienced_at, quoted_post_id, user_id, is_hidden')
              .in('user_id', timelineUserIds)
              .is('parent_post_id', null)
              .order('created_at', { ascending: false })
              .range(currentOffset, currentOffset + LIMIT * 2 - 1), // リポストとマージ後にLIMIT件になるよう多めに取得
            fetchRepostsForTimeline(timelineUserIds, LIMIT * 2, currentOffset),
          ]);

          const { data: timelinePosts, error: timelineError } = timelinePostsRes;
          postsError = timelineError;

          // リポスト元の投稿を取得
          const repostedPostIds = repostsForTimeline
            .map(r => r.postId)
            .filter(id => !timelinePosts?.some(p => p.id === id)); // 既に取得済みの投稿は除外

          let repostedPostsData: typeof timelinePosts = [];
          if (repostedPostIds.length > 0) {
            const { data } = await supabase
              .from('posts')
              .select('id, content, created_at, experienced_at, quoted_post_id, user_id, is_hidden')
              .in('id', repostedPostIds)
              .is('parent_post_id', null);
            repostedPostsData = data || [];
          }

          // リポスト情報をマップに変換
          const repostInfoMap = new Map<string, RepostForTimeline>();
          repostsForTimeline.forEach(r => {
            // 同じ投稿が複数人にリポストされている場合は最新のものを使用
            if (!repostInfoMap.has(r.postId) || r.repostedAt > repostInfoMap.get(r.postId)!.repostedAt) {
              repostInfoMap.set(r.postId, r);
            }
          });

          // 通常投稿とリポスト経由の投稿をマージ
          const allPostsMap = new Map<string, {
            post: NonNullable<typeof timelinePosts>[0];
            timelineSortDate: string;
            repostedBy?: { user_id: string; display_name: string };
          }>();

          // 通常投稿を追加
          (timelinePosts || []).forEach(p => {
            allPostsMap.set(p.id, {
              post: p,
              timelineSortDate: p.created_at,
            });
          });

          // リポスト経由の投稿を追加（リポスト日時でソート）
          repostedPostsData.forEach(p => {
            const repostInfo = repostInfoMap.get(p.id);
            if (repostInfo) {
              // 既に通常投稿として存在する場合は、リポスト日時の方が新しければ上書き
              const existing = allPostsMap.get(p.id);
              if (!existing || repostInfo.repostedAt > existing.timelineSortDate) {
                allPostsMap.set(p.id, {
                  post: p,
                  timelineSortDate: repostInfo.repostedAt,
                  repostedBy: repostInfo.repostedBy,
                });
              }
            }
          });

          // 既存の投稿がリポストされた場合もrepostedByを追加
          (timelinePosts || []).forEach(p => {
            const repostInfo = repostInfoMap.get(p.id);
            if (repostInfo) {
              const existing = allPostsMap.get(p.id);
              if (existing && repostInfo.repostedAt > existing.timelineSortDate) {
                allPostsMap.set(p.id, {
                  post: p,
                  timelineSortDate: repostInfo.repostedAt,
                  repostedBy: repostInfo.repostedBy,
                });
              }
            }
          });

          // ソートしてLIMIT件に絞る
          const mergedPosts = Array.from(allPostsMap.values())
            .sort((a, b) => new Date(b.timelineSortDate).getTime() - new Date(a.timelineSortDate).getTime())
            .slice(0, LIMIT);

          // 非表示・ミュートをフィルタリング
          rawPostsCount = mergedPosts.length;
          const filteredPosts = mergedPosts
            .filter(item => {
              const p = item.post;
              if (p.user_id === user.id) return true; // 自分の投稿は常に表示
              if (p.is_hidden) return false; // 他人の非表示投稿は除外
              if (mutedIds.includes(p.user_id)) return false; // ミュートユーザーは除外
              return true;
            })
            .map(item => ({
              ...item.post,
              timelineSortDate: item.timelineSortDate,
              repostedBy: item.repostedBy,
            }));

          postsData = filteredPosts;
        }
      } else {
        // 未ログイン: すべての投稿を取得（非表示を除外）
        const result = await supabase
          .from('posts')
          .select('id, content, created_at, experienced_at, quoted_post_id, user_id, is_hidden')
          .is('parent_post_id', null)
          .eq('is_hidden', false)
          .order('created_at', { ascending: false })
          .range(currentOffset, currentOffset + LIMIT - 1);

        postsData = result.data || [];
        rawPostsCount = postsData.length;
        postsError = result.error;
      }

      if (postsError) throw postsError;

      // フィルタ後のデータが空の場合
      if (!postsData || postsData.length === 0) {
        if (reset) setPosts([]);
        // 元データが空なら終了、フィルタで消えただけなら続行可能性あり
        setHasMore(rawPostsCount === LIMIT);
        return;
      }

      // 投稿者のユーザーIDと投稿IDを取得
      const postUserIds = [...new Set(postsData.map(p => p.user_id))];
      const postIds = postsData.map(p => p.id);
      const quotedPostIds = postsData
        .map(p => p.quoted_post_id)
        .filter((id): id is string => id !== null);

      // ユーザー情報・タグ・メタデータ・引用投稿・リポストを並列取得
      const [usersRes, tagsResult, metadataResult, quotedPostsMap, repostMetadataResult] = await Promise.all([
        supabase
          .from('users')
          .select('user_id, display_name, avatar_url')
          .in('user_id', postUserIds),
        fetchPostTags(postIds),
        fetchPostMetadata(postIds, user?.id || null),
        fetchQuotedPostInfo(quotedPostIds),
        fetchRepostMetadata(postIds, user?.id || null),
      ]);

      if (usersRes.error) throw usersRes.error;

      // ユーザー情報をマップに変換
      const usersMap = new Map(
        (usersRes.data || []).map(u => [u.user_id, { display_name: u.display_name, avatar_url: u.avatar_url }])
      );

      const { diagnosesMap, treatmentsMap, medicationsMap, statusesMap } = tagsResult;
      const { repliesMap, likesMap, myLikesMap, myRepliesMap } = metadataResult;
      const { repostsMap, myRepostsMap } = repostMetadataResult;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formattedPosts: Post[] = postsData.map((post: any) => ({
        id: post.id,
        content: post.content,
        created_at: post.created_at,
        experienced_at: post.experienced_at || null,
        quoted_post_id: post.quoted_post_id || null,
        quotedPost: post.quoted_post_id ? quotedPostsMap.get(post.quoted_post_id) || null : null,
        is_hidden: post.is_hidden || false,
        user: {
          display_name: usersMap.get(post.user_id)?.display_name || 'Unknown',
          user_id: post.user_id,
          avatar_url: usersMap.get(post.user_id)?.avatar_url || null,
        },
        diagnoses: diagnosesMap.get(post.id) || [],
        treatments: treatmentsMap.get(post.id) || [],
        medications: medicationsMap.get(post.id) || [],
        statuses: statusesMap.get(post.id) || [],
        repliesCount: repliesMap.get(post.id) || 0,
        likesCount: likesMap.get(post.id) || 0,
        repostsCount: repostsMap.get(post.id) || 0,
        isLikedByCurrentUser: myLikesMap.get(post.id) || false,
        isRepostedByCurrentUser: myRepostsMap.get(post.id) || false,
        hasRepliedByCurrentUser: myRepliesMap.get(post.id) || false,
        repostedBy: post.repostedBy || null,
        timelineSortDate: post.timelineSortDate || post.created_at,
      }));

      if (reset) {
        setPosts(formattedPosts);
      } else {
        setPosts((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const newPosts = formattedPosts.filter((p) => !existingIds.has(p.id));
          return [...prev, ...newPosts];
        });
      }
      setHasMore(rawPostsCount === LIMIT);
    } catch (error) {
      console.error('投稿取得エラー:', error);
    } finally {
      setLoadingPosts(false);
      setLoadingMore(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPosts(true);
    setRefreshing(false);
  };

  const handleLoadMore = () => {
    if (!loadingPosts && !loadingMore && hasMore) {
      loadPosts(false);
    }
  };

  const renderEmptyComponent = () => {
    // ローディング中はスピナーを表示
    if (loadingPosts) {
      return (
        <Box className="flex-1 items-center justify-center pt-24">
          <Spinner size="large" />
        </Box>
      );
    }

    // ローディング完了後、データがない場合はメッセージを表示
    return (
      <Box className="flex-1 items-center justify-center pt-48">
        <Text className="text-lg opacity-50 p-6">
          {selectedListId
            ? 'まだリストには誰も追加されていません'
            : 'ここにはあなたと、あなたがフォローしているユーザーの投稿が表示されます。ユーザー検索して仲間を探しましょう！'}
        </Text>
      </Box>
    );
  };

  const handleXLogin = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'twitter',
        options: {
          redirectTo: 'kokoroliving://auth/callback',
          skipBrowserRedirect: false,
        },
      });

      if (error) {
        console.error('[Login] Supabase Auth エラー:', error);
        Alert.alert('ログインエラー', error.message);
        return;
      }

      if (data?.url) {
        console.log('[Login] 認証URL取得:', data.url);

        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          'kokoroliving://auth/callback'
        );

        console.log('[Login] WebBrowser結果:', JSON.stringify(result));

        if (result.type === 'success' && result.url) {
          const url = result.url;
          console.log('[Login] コールバックURL:', url);

          // エラーチェック
          if (url.includes('error=')) {
            const errorMatch = url.match(/error=([^&]+)/);
            const errorDescMatch = url.match(/error_description=([^&]+)/);
            const errorDesc = errorDescMatch ? decodeURIComponent(errorDescMatch[1]) : 'Unknown error';
            console.error('[Login] 認証エラー:', errorDesc);
            Alert.alert('認証エラー', errorDesc);
            return;
          }

          // トークン取得を試みる
          const params = new URL(url).searchParams;
          const hashParams = new URLSearchParams(url.split('#')[1] || '');

          const accessToken = params.get('access_token') || hashParams.get('access_token');
          const refreshToken = params.get('refresh_token') || hashParams.get('refresh_token');

          console.log('[Login] トークン取得:', {
            accessToken: !!accessToken,
            refreshToken: !!refreshToken,
          });

          if (accessToken && refreshToken) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (sessionError) {
              console.error('[Login] セッション確立エラー:', sessionError);
              Alert.alert('エラー', 'ログインに失敗しました: ' + sessionError.message);
            } else {
              console.log('[Login] ログイン成功！');
              Alert.alert('成功', 'ログインしました');
            }
          } else {
            console.error('[Login] トークンが見つかりません');
            console.error('[Login] URL全体:', url);
            Alert.alert('エラー', 'トークンを取得できませんでした');
          }
        } else if (result.type === 'cancel') {
          console.log('[Login] ユーザーがキャンセル');
        } else {
          console.log('[Login] 認証結果:', result.type);
        }
      }
    } catch (error) {
      console.error('[Login] 予期しないエラー:', error);
      Alert.alert('エラー', '予期しないエラーが発生しました');
    }
  };

  const handleSelectList = (listId: string | null) => {
    setSelectedListId(listId);
  };

  const handleCreateList = () => {
    setIsDrawerOpen(false);
    setIsCreateModalOpen(true);
  };

  const handleEditList = (list: List) => {
    setEditingList(list);
    setIsDrawerOpen(false);
    setIsEditModalOpen(true);
  };

  const handleListCreated = () => {
    // ドロワーを再度開く
    setIsCreateModalOpen(false);
    setIsDrawerOpen(true);
  };

  const handleListUpdated = () => {
    // ドロワーを再度開く
    setIsEditModalOpen(false);
    setIsDrawerOpen(true);
  };

  const handleMoodSubmit = async (mood: number) => {
    // 既にチェックイン済みの場合は送信しない
    if (hasCheckedIn) {
      setIsMoodModalOpen(false);
      return;
    }
    await submitCheckin(mood);
  };

  if (loading) {
    return (
      <Box className="flex-1 items-center justify-center">
        <Spinner size="large" />
      </Box>
    );
  }

  // タイムライン表示（ログイン状態に関わらず）
  return (
    <Box className="flex-1">
      <FlatList
        className=""
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PostItem post={item} />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={renderEmptyComponent}
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
      {/* 気分チェックイン - 展開可能カード */}
      {isLoggedIn && hasCheckedIn && todayCheckin && (
        <Pressable
          onPress={() => setIsMoodCardExpanded(!isMoodCardExpanded)}
          className="absolute bottom-5 left-5 bg-background-0 rounded-2xl shadow-lg border border-outline-200"
          style={{
            padding: 12,
            maxWidth: isMoodCardExpanded ? 240 : 160,
            zIndex: 10,
          }}
        >
          {!isMoodCardExpanded ? (
            // 縮小時：コンパクト表示
            <HStack space="sm" className="items-center">
              <Text className="text-2xl">{MOOD_EMOJIS[todayCheckin.mood as keyof typeof MOOD_EMOJIS]}</Text>
              <Text className="text-sm text-typography-600">同じ気分 {stats.sameMoodCount}人</Text>
            </HStack>
          ) : (
            // 展開時：全気分の統計
            <VStack space="sm" className='w-[40vw]'>
              <Text className="text-xs text-typography-500 font-semibold">今日の気分</Text>
              <Text className="text-xs text-typography-500 mb-1">チェックイン: {stats.totalCheckins}人</Text>
              {[5, 4, 3, 2, 1].map((mood) => {
                const count = stats.moodCounts[mood] || 0;
                const isCurrent = mood === todayCheckin.mood;
                return (
                  <HStack
                    key={mood}
                    space="sm"
                    className="items-center"
                  >
                    <Text className="text-xl">{MOOD_EMOJIS[mood as keyof typeof MOOD_EMOJIS]}</Text>
                    <Text className={`text-xs flex-1 text-typography-600 ${isCurrent ? 'text-bold text-secondary-500' : ''}`}>
                      {MOOD_LABELS[mood as keyof typeof MOOD_LABELS]}
                    </Text>
                    <Text className="text-xs text-typography-500">{count}人</Text>
                  </HStack>
                );
              })}
            </VStack>
          )}
        </Pressable>
      )}

      {/* ホームドロワー */}
      <HomeDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        selectedListId={selectedListId}
        onSelectList={handleSelectList}
        onCreateList={handleCreateList}
        onEditList={handleEditList}
      />

      {/* リスト作成モーダル */}
      <CreateListModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={handleListCreated}
      />

      {/* リスト編集モーダル */}
      <EditListModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onUpdated={handleListUpdated}
        list={editingList}
      />

      {/* 気分チェックインモーダル */}
      <MoodCheckinModal
        visible={isMoodModalOpen}
        onClose={() => setIsMoodModalOpen(false)}
        onSubmit={handleMoodSubmit}
        submitting={submitting}
      />
    </Box>
  );
}
