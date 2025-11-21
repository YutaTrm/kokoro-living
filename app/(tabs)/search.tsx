import LoginPrompt from '@/components/LoginPrompt';
import { Box } from '@/components/ui/box';
import { Heading } from '@/components/ui/heading';

export default function SearchScreen() {
  return (
    <LoginPrompt>
      <Box className="flex-1 items-center justify-center">
        <Heading size="xl">検索</Heading>
      </Box>
    </LoginPrompt>
  );
}
