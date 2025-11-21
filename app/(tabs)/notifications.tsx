import LoginPrompt from '@/components/LoginPrompt';
import { Box } from '@/components/ui/box';
import { Heading } from '@/components/ui/heading';

export default function NotificationsScreen() {
  return (
    <LoginPrompt>
      <Box className="flex-1 items-center justify-center">
        <Heading size="xl">通知</Heading>
      </Box>
    </LoginPrompt>
  );
}
