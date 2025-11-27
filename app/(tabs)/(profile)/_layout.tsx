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
        name="user/[id]/following"
        options={{
          title: 'フォロー中',
        }}
      />
      <Stack.Screen
        name="user/[id]/followers"
        options={{
          title: 'フォロワー',
        }}
      />
      <Stack.Screen
        name="post/[id]/index"
        options={{
          title: 'ポスト',
        }}
      />
      <Stack.Screen
        name="post/[id]/likes"
        options={{
          title: 'いいね',
        }}
      />
    </Stack>
  );
}
