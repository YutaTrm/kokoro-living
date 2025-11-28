import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Alert, Image } from 'react-native';

import AppleLogo from '@/components/icons/AppleLogo';
import XLogo from '@/components/icons/XLogo';
import { Text } from '@/components/Themed';
import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { Spinner } from '@/components/ui/spinner';
import { VStack } from '@/components/ui/vstack';
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

  const handleOAuthLogin = async (provider: 'twitter' | 'apple' | 'google', providerName: string) => {
    try {
      console.log(`[LoginPrompt] ${providerName}認証開始`);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: 'kokoroliving://auth/callback',
          skipBrowserRedirect: false,
        },
      });

      if (error) {
        console.error(`[LoginPrompt] ${providerName}ログインエラー:`, error);
        Alert.alert('ログインエラー', error.message);
        return;
      }

      console.log(`[LoginPrompt] ${providerName}認証URL取得:`, data?.url);
      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          'kokoroliving://auth/callback'
        );

        console.log(`[LoginPrompt] ${providerName} WebBrowser結果:`, JSON.stringify(result));

        if (result.type === 'success' && result.url) {
          const url = result.url;
          console.log(`[LoginPrompt] ${providerName}コールバックURL:`, url);

          // エラーチェック
          if (url.includes('error=')) {
            const errorMatch = url.match(/error_description=([^&]+)/);
            const errorDesc = errorMatch ? decodeURIComponent(errorMatch[1]) : 'Unknown error';
            console.error(`[LoginPrompt] ${providerName}認証エラー:`, errorDesc);
            Alert.alert('認証エラー', errorDesc);
            return;
          }

          // トークン取得
          const params = new URL(url).searchParams;
          const hashParams = new URLSearchParams(url.split('#')[1] || '');

          const accessToken = params.get('access_token') || hashParams.get('access_token');
          const refreshToken = params.get('refresh_token') || hashParams.get('refresh_token');

          console.log(`[LoginPrompt] ${providerName}トークン取得:`, { accessToken: !!accessToken, refreshToken: !!refreshToken });

          if (accessToken && refreshToken) {
            console.log(`[LoginPrompt] ${providerName}セッション設定中...`);
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (sessionError) {
              console.error(`[LoginPrompt] ${providerName}セッションエラー:`, sessionError);
              Alert.alert('エラー', 'ログインに失敗しました: ' + sessionError.message);
            } else {
              console.log(`[LoginPrompt] ${providerName}ログイン成功`);
              Alert.alert('成功', 'ログインしました');
            }
          } else {
            console.error(`[LoginPrompt] ${providerName}トークンが見つかりません`);
            console.error(`[LoginPrompt] ${providerName}URL全体:`, url);
            Alert.alert('エラー', 'トークンを取得できませんでした');
          }
        } else if (result.type === 'cancel') {
          console.log(`[LoginPrompt] ${providerName}ユーザーがキャンセル`);
        } else {
          console.log(`[LoginPrompt] ${providerName}その他の結果:`, result.type);
        }
      }
    } catch (error) {
      console.error(`[LoginPrompt] ${providerName}エラー:`, error);
      Alert.alert('エラー', '予期しないエラーが発生しました');
    }
  };

  const handleAppleLogin = () => handleOAuthLogin('apple', 'Apple');
  const handleGoogleLogin = () => handleOAuthLogin('google', 'Google');
  const handleXLogin = () => handleOAuthLogin('twitter', 'X');

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
        <VStack space="2xl" className="w-full max-w-sm items-center">
          {/* アプリアイコンとタイトル */}
          <VStack space="md" className="items-center">
            <Image
              source={require('@/assets/images/paddinless-icon.png')}
              className="w-auto h-36"
              resizeMode="contain"
            />
            <Heading size="xl" className="text-primary-500">
              こころのリビング
            </Heading>
            <Text className="text-center text-base leading-6">
              メンタルヘルスケアに特化したSNS。同じ経験を持つ人と安心してつながり、支え合えるコミュニティ。
            </Text>
          </VStack>

          {/* サインインボタン */}
          <VStack space="md" className="w-full p-6">
            <Text className="text-center text-sm text-typography-500">
              ご利用にはソーシャルサインインが必要です
            </Text>
            {/* Sign in with Apple */}
            <Button
              onPress={handleAppleLogin}
              className="bg-typography-black rounded px-6 w-full"
            >
              <HStack space="sm" className="items-center">
                <AppleLogo width={20} height={20} />
                <ButtonText className="text-typography-white font-semibold">
                  Appleでサインイン
                </ButtonText>
              </HStack>
            </Button>

            {/* Sign in with Google */}
            {/* <Button
              onPress={handleGoogleLogin}
              className="bg-white rounded px-6 w-full border border-outline-300"
            >
              <HStack space="sm" className="items-center">
                <GoogleLogo width={20} height={20} />
                <ButtonText className="text-typography-black text-base font-semibold">
                  Googleでサインイン
                </ButtonText>
              </HStack>
            </Button> */}

            {/* Sign in with X */}
            <Button
              onPress={handleXLogin}
              className="bg-typography-black rounded px-6 w-full"
            >
              <HStack space="sm" className="items-center">
                <XLogo width={20} height={20} />
                <ButtonText className="text-typography-white font-semibold">
                  Xでサインイン
                </ButtonText>
              </HStack>
            </Button>
          </VStack>
        </VStack>
      </Box>
    );
  }

  return <>{children}</>;
}
