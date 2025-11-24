import { Stack } from 'expo-router';

export default function NotificationsStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerBackVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: '通知' }} />
      <Stack.Screen name="post/[id]" options={{ title: 'ポスト' }} />
    </Stack>
  );
}
