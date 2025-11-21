import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';

import XLogo from '@/components/icons/XLogo';
import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Spinner } from '@/components/ui/spinner';
import { supabase } from '@/src/lib/supabase';

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
      console.log('[LoginPrompt] 認証開始');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'twitter',
        options: {
          redirectTo: 'kokoroliving://auth/callback',
          skipBrowserRedirect: false,
        },
      });

      if (error) {
        console.error('[LoginPrompt] ログインエラー:', error);
        Alert.alert('ログインエラー', error.message);
        return;
      }

      console.log('[LoginPrompt] 認証URL取得:', data?.url);
      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          'kokoroliving://'
        );

        console.log('[LoginPrompt] WebBrowser結果:', JSON.stringify(result));

        if (result.type === 'success' && result.url) {
          const url = result.url;
          console.log('[LoginPrompt] コールバックURL:', url);

          // エラーチェック
          if (url.includes('error=')) {
            const errorMatch = url.match(/error_description=([^&]+)/);
            const errorDesc = errorMatch ? decodeURIComponent(errorMatch[1]) : 'Unknown error';
            console.error('[LoginPrompt] 認証エラー:', errorDesc);
            Alert.alert('認証エラー', errorDesc);
            return;
          }

          // トークン取得
          const params = new URL(url).searchParams;
          const hashParams = new URLSearchParams(url.split('#')[1] || '');

          const accessToken = params.get('access_token') || hashParams.get('access_token');
          const refreshToken = params.get('refresh_token') || hashParams.get('refresh_token');

          console.log('[LoginPrompt] トークン取得:', { accessToken: !!accessToken, refreshToken: !!refreshToken });

          if (accessToken && refreshToken) {
            console.log('[LoginPrompt] セッション設定中...');
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (sessionError) {
              console.error('[LoginPrompt] セッションエラー:', sessionError);
              Alert.alert('エラー', 'ログインに失敗しました: ' + sessionError.message);
            } else {
              console.log('[LoginPrompt] ログイン成功');
              Alert.alert('成功', 'ログインしました');
            }
          } else {
            console.error('[LoginPrompt] トークンが見つかりません');
            console.error('[LoginPrompt] URL全体:', url);
            Alert.alert('エラー', 'トークンを取得できませんでした');
          }
        } else if (result.type === 'cancel') {
          console.log('[LoginPrompt] ユーザーがキャンセル');
        } else {
          console.log('[LoginPrompt] その他の結果:', result.type);
        }
      }
    } catch (error) {
      console.error('[LoginPrompt] エラー:', error);
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
