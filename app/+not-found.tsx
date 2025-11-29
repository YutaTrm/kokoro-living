import { Link, Stack } from 'expo-router';

import { Text } from '@/components/Themed';
import { Box } from '@/components/ui/box';
import { Heading } from '@/components/ui/heading';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <Box className="flex-1 items-center justify-center p-5">
        <Heading size="xl" className="mb-4">This screen doesn't exist.</Heading>

        <Link href="/" className="mt-4 py-4">
          <Text className="text-sm text-typography-500">Go to home screen!</Text>
        </Link>
      </Box>
    </>
  );
}
