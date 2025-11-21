import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';

import XLogo from '@/components/icons/XLogo';
import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Spinner } from '@/components/ui/spinner';
import { supabase } from '@/src/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

interface LoginPromptProps {
  children: React.ReactNode;
}

export default function LoginPrompt({ children }: LoginPromptProps) {
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
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          'kokoroliving://'
        );

        if (result.type === 'success') {
          const url = result.url;
          const hashPart = url.split('#')[1];
          const queryPart = url.split('?')[1];
          const params = new URLSearchParams(hashPart || queryPart);
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');

          if (accessToken && refreshToken) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (sessionError) {
              Alert.alert('エラー', 'ログインに失敗しました: ' + sessionError.message);
            } else {
              Alert.alert('成功', 'ログインしました');
            }
          } else {
            Alert.alert('エラー', 'トークンを取得できませんでした');
          }
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
          className="bg-typography-black rounded-full px-6"
        >
          <HStack space="sm" className="items-center">
            <XLogo width={20} height={20} />
            <ButtonText className="text-typography-white text-base font-semibold">アカウントで登録</ButtonText>
          </HStack>
        </Button>
      </Box>
    );
  }

  return <>{children}</>;
}
