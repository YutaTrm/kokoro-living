import { useRouter } from 'expo-router';
import { useEffect } from 'react';

import { Box } from '@/components/ui/box';
import { Spinner } from '@/components/ui/spinner';

export default function AuthCallbackScreen() {
  const router = useRouter();

  useEffect(() => {
    // 認証完了後、ホーム画面にリダイレクト
    const timer = setTimeout(() => {
      router.replace('/(tabs)/(home)');
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Box className="flex-1 items-center justify-center bg-background-0">
      <Spinner size="large" />
    </Box>
  );
}
