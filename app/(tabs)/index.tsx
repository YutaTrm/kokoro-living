import { Alert, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useState, useEffect } from 'react';
import * as WebBrowser from 'expo-web-browser';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { Text, View } from '@/components/Themed';
import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import XLogo from '@/components/icons/XLogo';
import { supabase } from '@/src/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

export default function TabOneScreen() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkLoginStatus();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkLoginStatus = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setIsLoggedIn(!!session);
    setLoading(false);
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
        <ActivityIndicator size="large" />
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
        data={[]}
        renderItem={() => null}
        ListEmptyComponent={
          <Box className="flex-1 items-center justify-center pt-24">
            <Text className="text-base opacity-50">まだ投稿がありません</Text>
          </Box>
        }
      />
      <TouchableOpacity
        className="absolute right-5 bottom-5 w-14 h-14 rounded-full bg-primary-500 items-center justify-center"
        style={{
          shadowColor: 'rgba(0,0,0,0.3)',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 3.84,
          elevation: 5,
        }}
      >
        <FontAwesome name="plus" size={24} color="white" />
      </TouchableOpacity>
    </Box>
  );
}
