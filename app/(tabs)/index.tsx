import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, RefreshControl } from 'react-native';

import PostItem from '@/components/PostItem';
import { Text } from '@/components/Themed';
import { Box } from '@/components/ui/box';
import { Button, ButtonIcon } from '@/components/ui/button';
import { AddIcon } from '@/components/ui/icon';
import { Spinner } from '@/components/ui/spinner';
import { supabase } from '@/src/lib/supabase';

interface Post {
  id: string;
  content: string;
  created_at: string;
  user: {
    display_name: string;
    user_id: string;
    avatar_url?: string | null;
  };
  diagnoses: string[];
  treatments: string[];
  medications: string[];
}

export default function TabOneScreen() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);
  const [refreshing, setRefreshing] = useState(false);

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
    try {
      const { data: { user } } = await supabase.auth.getUser();

      let postsData;
      let postsError;

      if (user) {
        // ログイン済み: 自分がフォローしている人のIDを取得
        const { data: followingData } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id);

        const followingIds = followingData?.map(f => f.following_id) || [];
        const userIds = [user.id, ...followingIds]; // 自分のIDも追加

        // 自分とフォローしている人の投稿を取得
        const result = await supabase
          .from('posts')
          .select('id, content, created_at, user_id')
          .in('user_id', userIds)
          .is('parent_post_id', null)
          .order('created_at', { ascending: false })
          .limit(50);

        postsData = result.data;
        postsError = result.error;
      } else {
        // 未ログイン: すべての投稿を取得
        const result = await supabase
          .from('posts')
          .select('id, content, created_at, user_id')
          .is('parent_post_id', null)
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
        const name = m.user_medications?.products?.name || m.user_medications?.ingredients?.name;
        if (name) {
          if (!medicationsMap.has(m.post_id)) {
            medicationsMap.set(m.post_id, []);
          }
          medicationsMap.get(m.post_id)?.push(name);
        }
      });

      const formattedPosts: Post[] = postsData.map((post: any) => ({
        id: post.id,
        content: post.content,
        created_at: post.created_at,
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
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPosts();
    setRefreshing(false);
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
          'kokoroliving://'
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
        ListEmptyComponent={
          <Box className="flex-1 items-center justify-center pt-24">
            <Text className="text-base opacity-50">まだ投稿がありません</Text>
          </Box>
        }
      />
      {/* 投稿ボタンはログイン時のみ表示 */}
      {isLoggedIn && (
        <Button
          className="absolute right-5 bottom-5 rounded-full h-16 w-16"
          variant="solid"
          size="md"
          action="primary"
          onPress={() => router.push('/create-post')}
        >
          <ButtonIcon as={AddIcon} size="lg" />
        </Button>
      )}
    </Box>
  );
}
