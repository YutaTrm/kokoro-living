import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { LogBox } from 'react-native';
import 'react-native-reanimated';

// ライブラリ内部の非推奨警告を抑制（gluestack-ui等が原因）
LogBox.ignoreLogs(['SafeAreaView has been deprecated']);

import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { MasterDataProvider } from '@/src/contexts/MasterDataContext';
import { ThemeProvider, useTheme } from '@/src/contexts/ThemeContext';
import { supabase } from '@/src/lib/supabase';
import '@/global.css';

// OAuth認証のリダイレクトを処理
WebBrowser.maybeCompleteAuthSession();

const queryClient = new QueryClient();

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <ThemeProvider>
      <MasterDataProvider>
        <RootLayoutNav />
      </MasterDataProvider>
    </ThemeProvider>
  );
}

function RootLayoutNav() {
  const { theme } = useTheme();
  const segments = useSegments();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [termsAccepted, setTermsAccepted] = useState<boolean | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // 利用規約同意状態をチェック
  useEffect(() => {
    const checkTermsAgreement = async () => {
      try {
        // セッション取得
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          // ログインしていない場合
          setIsAuthenticated(false);
          setTermsAccepted(null);
          setIsLoading(false);
          return;
        }

        setIsAuthenticated(true);

        // ユーザー情報取得
        const { data: user, error } = await supabase
          .from('users')
          .select('terms_accepted_at')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (error) {
          console.error('ユーザー情報取得エラー:', error);
          setTermsAccepted(false);
        } else if (!user) {
          // レコードが存在しない場合は作成
          const { error: insertError } = await supabase
            .from('users')
            .insert({
              user_id: session.user.id,
              display_name: session.user.user_metadata?.name ||
                           session.user.user_metadata?.user_name ||
                           session.user.user_metadata?.full_name ||
                           session.user.email ||
                           'User',
              avatar_url: session.user.user_metadata?.avatar_url || null,
              is_admin: false,
            });

          if (insertError) {
            console.error('ユーザーレコード作成エラー:', insertError);
          }

          // 新規作成なので未同意
          setTermsAccepted(false);
        } else {
          const accepted = user.terms_accepted_at !== null;
          setTermsAccepted(accepted);
        }
      } catch (error) {
        console.error('同意状態の確認エラー:', error);
        setTermsAccepted(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkTermsAgreement();

    // セッション変更を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        checkTermsAgreement();
      } else {
        setIsAuthenticated(false);
        setTermsAccepted(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // 同意状態に基づいてリダイレクト
  useEffect(() => {
    if (isLoading) return; // まだチェック中

    const inTermsAgreement = segments[0] === 'terms-agreement';
    const inAuthCallback = segments[0] === 'auth';

    // 同意画面から他の画面に遷移した場合、状態を再チェック
    if (isAuthenticated && !inTermsAgreement && !inAuthCallback) {
      const recheckTerms = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: user } = await supabase
            .from('users')
            .select('terms_accepted_at')
            .eq('user_id', session.user.id)
            .maybeSingle();

          const accepted = user?.terms_accepted_at !== null;
          setTermsAccepted(accepted);

          // まだ未同意なら同意画面へ
          if (!accepted) {
            router.replace('/terms-agreement');
          }
        }
      };
      recheckTerms();
    }
  }, [isLoading, isAuthenticated, segments]);

  return (
    <GluestackUIProvider mode={theme === 'dark' ? 'dark' : 'light'}>
      <QueryClientProvider client={queryClient}>
      <NavigationThemeProvider value={theme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="terms-agreement" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
          <Stack.Screen name="create-post" options={{ presentation: 'modal', headerShown: false, gestureEnabled: false }} />
          <Stack.Screen name="reply/[id]" options={{ presentation: 'modal', headerShown: false, gestureEnabled: false }} />
          <Stack.Screen name="quote/[id]" options={{ presentation: 'modal', headerShown: false, gestureEnabled: false }} />
        </Stack>
      </NavigationThemeProvider>
    </QueryClientProvider>
    </GluestackUIProvider>
  );
}
