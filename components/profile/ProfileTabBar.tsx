import { ScrollView } from 'react-native';

import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';

type TabType = 'profile' | 'posts' | 'replies' | 'likes' | 'bookmarks';

interface ProfileTabBarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  showBookmarks?: boolean;
}

export default function ProfileTabBar({
  activeTab,
  onTabChange,
  showBookmarks = true,
}: ProfileTabBarProps) {
  const tabs: { key: TabType; label: string; show: boolean }[] = [
    { key: 'profile', label: 'プロフィール', show: true },
    { key: 'posts', label: '投稿', show: true },
    { key: 'replies', label: '返信', show: true },
    { key: 'likes', label: 'いいね', show: true },
    { key: 'bookmarks', label: 'ブックマーク', show: showBookmarks },
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="border-b border-outline-200"
    >
      <HStack>
        {tabs
          .filter((tab) => tab.show)
          .map((tab) => (
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
