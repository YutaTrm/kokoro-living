import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Alert, FlatList, RefreshControl } from 'react-native';

import XLogo from '@/components/icons/XLogo';
import PostItem from '@/components/PostItem';
import { Text } from '@/components/Themed';
import { Box } from '@/components/ui/box';
import { Button, ButtonIcon, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { AddIcon } from '@/components/ui/icon';
import { Spinner } from '@/components/ui/spinner';
import { supabase } from '@/src/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

interface Post {
  id: string;
  content: string;
  created_at: string;
  user: {
    display_name: string;
    user_id: string;
  };
  tags: string[];
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

    if (loggedIn) {
      loadPosts();
    }
  };

  const loadPosts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 自分がフォローしている人のIDを取得
      const { data: followingData } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);

      const followingIds = followingData?.map(f => f.following_id) || [];
      const userIds = [user.id, ...followingIds]; // 自分のIDも追加

      // 自分とフォローしている人の投稿を取得
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('id, content, created_at, user_id')
        .in('user_id', userIds)
        .is('parent_post_id', null)
        .order('created_at', { ascending: false })
        .limit(50);

      if (postsError) throw postsError;

      if (!postsData || postsData.length === 0) {
        setPosts([]);
        return;
      }

      // 投稿者のユーザー情報を取得
      const postUserIds = [...new Set(postsData.map(p => p.user_id))];
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('user_id, display_name')
        .in('user_id', postUserIds);

      if (usersError) throw usersError;

      // ユーザー情報をマップに変換
      const usersMap = new Map(
        (usersData || []).map(u => [u.user_id, u.display_name])
      );

      const formattedPosts: Post[] = postsData.map((post: any) => ({
        id: post.id,
        content: post.content,
        created_at: post.created_at,
        user: {
          display_name: usersMap.get(post.user_id) || 'Unknown',
          user_id: post.user_id,
        },
        tags: [],
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
          redirectTo: 'kokoroliving://',
        },
      });

      if (error) {
        console.error('ログインエラー:', error);
        Alert.alert('ログインエラー', error.message);
        return;
      }

      if (data?.url) {
        console.log('認証URL:', data.url);
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          'kokoroliving://'
        );

        console.log('認証結果:', result);

        if (result.type === 'success') {
          const url = result.url;
          console.log('コールバックURL（完全）:', url);

          // URLからトークンを取得してセッションを確立
          const hashPart = url.split('#')[1];
          const queryPart = url.split('?')[1];
          console.log('ハッシュ部分:', hashPart);
          console.log('クエリ部分:', queryPart);

          const params = new URLSearchParams(hashPart || queryPart);
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');

          console.log('access_token:', accessToken ? '取得成功' : '取得失敗');
          console.log('refresh_token:', refreshToken ? '取得成功' : '取得失敗');

          if (accessToken && refreshToken) {
            console.log('セッション確立を試行中...');
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (sessionError) {
              console.error('セッションエラー:', sessionError);
              Alert.alert('エラー', 'ログインに失敗しました: ' + sessionError.message);
            } else {
              console.log('セッション確立成功！');
              Alert.alert('成功', 'ログインしました');
            }
          } else {
            console.error('トークンが見つかりません');
            Alert.alert('エラー', 'トークンを取得できませんでした');
          }
        } else if (result.type === 'cancel') {
          console.log('ユーザーがキャンセルしました');
        } else {
          console.log('認証結果:', result.type);
        }
      }
    } catch (error) {
      console.error('エラー:', error);
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

  if (!isLoggedIn) {
    return (
      <Box className="flex-1 items-center justify-center">
        <Button
          onPress={handleXLogin}
          className="bg-typography-black rounded-full px-6 py-3"
        >
          <HStack space="sm" className="items-center">
            <XLogo width={20} height={20} />
            <ButtonText className="text-typography-white text-base font-semibold">Xアカウントで登録</ButtonText>
          </HStack>
        </Button>
      </Box>
    );
  }

  // ログイン済み: タイムライン表示
  return (
    <Box className="flex-1">
      <FlatList
        className="mt-12"
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
      <Button
        className="absolute right-5 bottom-5 rounded-full h-16 w-16"
        variant="solid"
        size="md"
        action="primary"
        onPress={() => router.push('/create-post')}
      >
        <ButtonIcon as={AddIcon} size="lg" />
      </Button>
    </Box>
  );
}
