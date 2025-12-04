import { ScrollView } from 'react-native';

import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';

type TabType = 'profile' | 'posts' | 'replies';

interface ProfileTabBarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export default function ProfileTabBar({
  activeTab,
  onTabChange,
}: ProfileTabBarProps) {
  const tabs: { key: TabType; label: string }[] = [
    { key: 'profile', label: 'プロフィール' },
    { key: 'posts', label: '投稿' },
    { key: 'replies', label: '返信' },
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="border-b border-outline-200"
    >
      <HStack>
        {tabs.map((tab) => (
          <Button
            key={tab.key}
            onPress={() => onTabChange(tab.key)}
            variant="link"
            className={`rounded-none px-4 ${activeTab === tab.key ? 'border-b-2 border-primary-500' : ''}`}
          >
            <ButtonText
              className={activeTab === tab.key ? 'text-primary-600 font-semibold' : 'text-typography-500'}
            >
              {tab.label}
            </ButtonText>
          </Button>
        ))}
      </HStack>
    </ScrollView>
  );
}

export type { TabType };
