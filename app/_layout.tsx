import AsyncStorage from '@react-native-async-storage/async-storage';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { useColorScheme } from '@/components/useColorScheme';
import '@/global.css';

const TERMS_AGREEMENT_KEY = 'terms_agreement_accepted';

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

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const segments = useSegments();
  const router = useRouter();
  const [termsAccepted, setTermsAccepted] = useState<boolean | null>(null);

  // 利用規約同意状態をチェック
  useEffect(() => {
    const checkTermsAgreement = async () => {
      try {
        const accepted = await AsyncStorage.getItem(TERMS_AGREEMENT_KEY);
        setTermsAccepted(accepted === 'true');
      } catch (error) {
        console.error('同意状態の確認エラー:', error);
        setTermsAccepted(false);
      }
    };
    checkTermsAgreement();
  }, []);

  // 同意状態に基づいてリダイレクト
  useEffect(() => {
    if (termsAccepted === null) return; // まだチェック中

    const inTermsAgreement = segments[0] === 'terms-agreement';
    const inAuthCallback = segments[0] === 'auth';

    // 未同意で、同意画面や認証コールバックにいない場合は同意画面へ
    if (!termsAccepted && !inTermsAgreement && !inAuthCallback) {
      router.replace('/terms-agreement');
    }
  }, [termsAccepted, segments]);

  return (
    <GluestackUIProvider mode={colorScheme === 'dark' ? 'dark' : 'light'}>
      <QueryClientProvider client={queryClient}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="terms-agreement" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
          <Stack.Screen name="create-post" options={{ presentation: 'modal', headerShown: false, gestureEnabled: false }} />
          <Stack.Screen name="reply/[id]" options={{ presentation: 'modal', headerShown: false, gestureEnabled: false }} />
        </Stack>
      </ThemeProvider>
    </QueryClientProvider>
    </GluestackUIProvider>
  );
}
