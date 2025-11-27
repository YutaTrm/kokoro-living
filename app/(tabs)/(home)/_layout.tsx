import { Stack } from 'expo-router';

export default function HomeStackLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'ホーム' }} />
      <Stack.Screen name="post/[id]/index" options={{ title: 'ポスト' }} />
      <Stack.Screen name="post/[id]/likes" options={{ title: 'いいね' }} />
      <Stack.Screen name="user/[id]/index" options={{ title: 'プロフィール' }} />
      <Stack.Screen name="user/[id]/following" options={{ title: 'フォロー中' }} />
      <Stack.Screen name="user/[id]/followers" options={{ title: 'フォロワー' }} />
    </Stack>
  );
}
