import { Stack } from 'expo-router';

export default function ProfileLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'マイページ',
        }}
      />
      <Stack.Screen
        name="user/[id]/index"
        options={{
          title: 'ユーザー',
        }}
      />
      <Stack.Screen
        name="post/[id]/index"
        options={{
          title: 'ポスト',
        }}
      />
    </Stack>
  );
}
