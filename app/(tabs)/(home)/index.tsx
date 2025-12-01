import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { List } from 'lucide-react-native';
import { useEffect, useLayoutEffect, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl } from 'react-native';

import CreateListModal from '@/components/home/CreateListModal';
import EditListModal from '@/components/home/EditListModal';
import HomeDrawer from '@/components/home/HomeDrawer';
import { MoodCheckinModal } from '@/components/MoodCheckinModal';
import PostItem from '@/components/PostItem';
import { Box } from '@/components/ui/box';
import { Button, ButtonIcon } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { AddIcon, Icon } from '@/components/ui/icon';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { MOOD_EMOJIS, MOOD_LABELS, useMoodCheckin } from '@/src/hooks/useMoodCheckin';
import { supabase } from '@/src/lib/supabase';

const SELECTED_LIST_KEY = 'selected_list_id';

interface Post {
  id: string;
  content: string;
  created_at: string;
  is_hidden?: boolean;
  user: {
    display_name: string;
    user_id: string;
    avatar_url?: string | null;
  };
  diagnoses: string[];
  treatments: string[];
  medications: string[];
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
  const [posts, setPosts] = useState<Post[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // リスト機能のstate
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingList, setEditingList] = useState<List | null>(null);

  // 気分チェックイン機能
  const { todayCheckin, stats, submitting, submitCheckin, hasCheckedIn } = useMoodCheckin();
  const [isMoodModalOpen, setIsMoodModalOpen] = useState(false);
  const [isMoodCardExpanded, setIsMoodCardExpanded] = useState(false);

  // ヘッダーにドロワーアイコンを設定
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={() => setIsDrawerOpen(true)} style={{ marginLeft: 5, padding: 4 }}>
          <Icon as={List} size="lg" className="text-typography-900" />
        </Pressable>
      ),
    });
  }, [navigation]);

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
      loadPosts();
    }
  }, [selectedListId]);

  // 起動時に気分チェックインモーダルを表示（未チェックインかつログイン済みの場合）
  useEffect(() => {
    if (!loading && isLoggedIn && !hasCheckedIn) {
      // 少し遅延させてからモーダルを表示（UX改善）
      const timer = setTimeout(() => {
        setIsMoodModalOpen(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [loading, isLoggedIn, hasCheckedIn]);

  useEffect(() => {
    checkLoginStatus();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkLoginStatus = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const loggedIn = !!session;
    setIsLoggedIn(loggedIn);
    setLoading(false);

    // ログイン状態に関わらず投稿を読み込む
    loadPosts();
  };

  const loadPosts = async () => {
    setLoadingPosts(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      let postsData;
      let postsError;

      if (user) {
        // ミュートしているユーザーIDを取得
        const { data: mutesData } = await supabase
          .from('mutes')
          .select('muted_id')
          .eq('muter_id', user.id);

        const mutedIds = mutesData?.map(m => m.muted_id) || [];

        // リストが選択されている場合
        if (selectedListId) {
          // リストに追加されたユーザーIDを取得
          const { data: listMembersData } = await supabase
            .from('list_members')
            .select('user_id')
            .eq('list_id', selectedListId);

          const listMemberIds = listMembersData?.map(m => m.user_id) || [];

          if (listMemberIds.length === 0) {
            // リストにメンバーがいない場合
            setPosts([]);
            return;
          }

          // リストメンバーの投稿を取得（非表示を除外）
          const { data: listPosts, error: listError } = await supabase
            .from('posts')
            .select('id, content, created_at, user_id, is_hidden')
            .in('user_id', listMemberIds)
            .is('parent_post_id', null)
            .eq('is_hidden', false)
            .order('created_at', { ascending: false })
            .limit(50);

          // ミュートユーザーの投稿を除外
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

          // 自分の投稿（非表示を含む）
          const { data: myPosts } = await supabase
            .from('posts')
            .select('id, content, created_at, user_id, is_hidden')
            .eq('user_id', user.id)
            .is('parent_post_id', null)
            .order('created_at', { ascending: false })
            .limit(50);

          // フォローしている人の投稿（非表示を除外）
          const { data: followingPosts, error: followingError } = await supabase
            .from('posts')
            .select('id, content, created_at, user_id, is_hidden')
            .in('user_id', followingIds)
            .is('parent_post_id', null)
            .eq('is_hidden', false)
            .order('created_at', { ascending: false })
            .limit(50);

          // マージして時系列順にソート
          const allPosts = [...(myPosts || []), ...(followingPosts || [])];
          // ミュートユーザーの投稿を除外（自分の投稿は除外しない）
          const filteredPosts = allPosts.filter(p =>
            p.user_id === user.id || !mutedIds.includes(p.user_id)
          );
          postsData = filteredPosts.sort((a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          ).slice(0, 50);
          postsError = followingError;
        }
      } else {
        // 未ログイン: すべての投稿を取得（非表示を除外）
        const result = await supabase
          .from('posts')
          .select('id, content, created_at, user_id, is_hidden')
          .is('parent_post_id', null)
          .eq('is_hidden', false)
          .order('created_at', { ascending: false })
          .limit(50);

        postsData = result.data;
        postsError = result.error;
      }

      if (postsError) throw postsError;

      if (!postsData || postsData.length === 0) {
        setPosts([]);
        return;
      }

      // 投稿者のユーザー情報を取得
      const postUserIds = [...new Set(postsData.map(p => p.user_id))];
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('user_id, display_name, avatar_url')
        .in('user_id', postUserIds);

      if (usersError) throw usersError;

      // ユーザー情報をマップに変換
      const usersMap = new Map(
        (usersData || []).map(u => [u.user_id, { display_name: u.display_name, avatar_url: u.avatar_url }])
      );

      // 投稿IDを取得
      const postIds = postsData.map(p => p.id);

      // 診断名を取得
      const { data: diagnosesData } = await supabase
        .from('post_diagnoses')
        .select('post_id, user_diagnoses(diagnoses(name))')
        .in('post_id', postIds);

      // 治療法を取得
      const { data: treatmentsData } = await supabase
        .from('post_treatments')
        .select('post_id, user_treatments(treatments(name))')
        .in('post_id', postIds);

      // 服薬を取得
      const { data: medicationsData } = await supabase
        .from('post_medications')
        .select('post_id, user_medications(ingredients(name), products(name))')
        .in('post_id', postIds);

      // 投稿ごとのタグをマップに変換
      const diagnosesMap = new Map<string, string[]>();
      diagnosesData?.forEach((d: any) => {
        const name = d.user_diagnoses?.diagnoses?.name;
        if (name) {
          if (!diagnosesMap.has(d.post_id)) {
            diagnosesMap.set(d.post_id, []);
          }
          diagnosesMap.get(d.post_id)?.push(name);
        }
      });

      const treatmentsMap = new Map<string, string[]>();
      treatmentsData?.forEach((t: any) => {
        const name = t.user_treatments?.treatments?.name;
        if (name) {
          if (!treatmentsMap.has(t.post_id)) {
            treatmentsMap.set(t.post_id, []);
          }
          treatmentsMap.get(t.post_id)?.push(name);
        }
      });

      const medicationsMap = new Map<string, string[]>();
      medicationsData?.forEach((m: any) => {
        const name = m.user_medications?.ingredients?.name;
        if (name) {
          if (!medicationsMap.has(m.post_id)) {
            medicationsMap.set(m.post_id, []);
          }
          const medications = medicationsMap.get(m.post_id)!;
          // 重複を避ける
          if (!medications.includes(name)) {
            medications.push(name);
          }
        }
      });

      const formattedPosts: Post[] = postsData.map((post: any) => ({
        id: post.id,
        content: post.content,
        created_at: post.created_at,
        is_hidden: post.is_hidden || false,
        user: {
          display_name: usersMap.get(post.user_id)?.display_name || 'Unknown',
          user_id: post.user_id,
          avatar_url: usersMap.get(post.user_id)?.avatar_url || null,
        },
        diagnoses: diagnosesMap.get(post.id) || [],
        treatments: treatmentsMap.get(post.id) || [],
        medications: medicationsMap.get(post.id) || [],
      }));

      setPosts(formattedPosts);
    } catch (error) {
      console.error('投稿取得エラー:', error);
    } finally {
      setLoadingPosts(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPosts();
    setRefreshing(false);
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

      {/* 投稿ボタンはログイン時のみ表示 */}
      {isLoggedIn && (
        <Button
          className="absolute right-5 bottom-5 rounded-full shadow-lg h-16 w-16 bg-primary-400"
          variant="solid"
          size="md"
          onPress={() => router.push('/create-post')}
        >
          <ButtonIcon as={AddIcon} size="lg" className="text-white" />
        </Button>
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
