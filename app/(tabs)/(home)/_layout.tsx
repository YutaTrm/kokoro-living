import { Stack } from 'expo-router';

export default function HomeStackLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'ホーム' }} />
      <Stack.Screen name="post/[id]" options={{ title: 'ポスト', headerBackTitle: '' }} />
      <Stack.Screen name="user/[id]" options={{ title: 'プロフィール', headerBackTitle: '' }} />
    </Stack>
  );
}
