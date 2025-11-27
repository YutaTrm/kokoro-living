import { Stack } from 'expo-router';

export default function SearchLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: '検索',
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
