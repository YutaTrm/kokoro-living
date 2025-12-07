import { Alert } from 'react-native';

import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button';

interface FollowButtonProps {
  isFollowing: boolean;
  isFollowedBy: boolean;
  isLoading: boolean;
  onToggle: () => Promise<boolean>;
  isLoggedIn: boolean;
}

export default function FollowButton({
  isFollowing,
  isFollowedBy,
  isLoading,
  onToggle,
  isLoggedIn,
}: FollowButtonProps) {
  const handlePress = async () => {
    if (!isLoggedIn) {
      Alert.alert('エラー', 'ログインしてください');
      return;
    }
    await onToggle();
  };

  // ボタンのラベルを決定
  const getButtonLabel = () => {
    if (isFollowing) return 'フォロー中';
    if (isFollowedBy) return 'フォローバック';
    return 'フォロー';
  };

  return (
    <Button
      size="sm"
      variant={isFollowing ? 'outline' : 'solid'}
      onPress={handlePress}
      disabled={isLoading}
      className={isFollowing ? 'border-outline-300' : 'bg-primary-500'}
    >
      {isLoading ? (
        <ButtonSpinner />
      ) : (
        <ButtonText className={isFollowing ? 'text-typography-700' : ''}>
          {getButtonLabel()}
        </ButtonText>
      )}
    </Button>
  );
}
