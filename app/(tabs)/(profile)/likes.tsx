import { useNavigation } from 'expo-router';
import { useLayoutEffect } from 'react';
import { FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import PostItem from '@/components/PostItem';
import { Box } from '@/components/ui/box';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { usePostsData } from '@/src/hooks/usePostsData';

export default function LikesScreen() {
  const navigation = useNavigation();
  const { likedPosts, loadingLikes, loadLikedPosts } = usePostsData();

  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'いいね一覧',
    });
    loadLikedPosts();
  }, [navigation]);

  if (loadingLikes) {
    return (
      <SafeAreaView className="flex-1 bg-background-0" edges={['bottom']}>
        <Box className="flex-1 items-center justify-center">
          <Spinner size="large" />
        </Box>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background-0" edges={['bottom']}>
      <FlatList
        data={likedPosts}
        renderItem={({ item }) => <PostItem post={item} />}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Box className="px-5 py-8">
            <Text className="text-lg opacity-50 text-center">
              まだいいねがありません
            </Text>
          </Box>
        }
      />
    </SafeAreaView>
  );
}
