import { Stack } from 'expo-router';

export default function NotificationsStackLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: '通知' }} />
      <Stack.Screen name="post/[id]" options={{ title: 'ポスト' }} />
      <Stack.Screen name="user/[id]/index" options={{ title: 'プロフィール' }} />
    </Stack>
  );
}
