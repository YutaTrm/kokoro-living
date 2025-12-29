import { useNavigation } from 'expo-router';
import { useLayoutEffect } from 'react';
import { FlatList, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import PostItem from '@/components/PostItem';
import { Box } from '@/components/ui/box';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { usePostsData } from '@/src/hooks/usePostsData';

export default function BookmarksScreen() {
  const navigation = useNavigation();
  const { bookmarkedPosts, loadingBookmarks, loadBookmarkedPosts } = usePostsData();

  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'ブックマーク一覧',
    });
    loadBookmarkedPosts();
  }, [navigation]);

  if (loadingBookmarks) {
    return (
      <SafeAreaView className="flex-1 bg-background-0" edges={Platform.OS === 'ios' ? ['bottom'] : []}>
        <Box className="flex-1 items-center justify-center">
          <Spinner size="large" />
        </Box>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background-0" edges={Platform.OS === 'ios' ? ['bottom'] : []}>
      <FlatList
        data={bookmarkedPosts}
        renderItem={({ item }) => <PostItem post={item} />}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Box className="px-5 py-8">
            <Text className="text-lg opacity-50 text-center">
              まだブックマークがありません
            </Text>
          </Box>
        }
      />
    </SafeAreaView>
  );
}
