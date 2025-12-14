import { useNavigation } from 'expo-router';
import { Pencil, Trash2 } from 'lucide-react-native';
import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { Alert, FlatList, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ConfirmModal from '@/components/ConfirmModal';
import TextEditModal from '@/components/profile/TextEditModal';
import { Box } from '@/components/ui/box';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { GoodThing, GoodThingsByDate, useGoodThings } from '@/src/hooks/useGoodThings';

// 日付をフォーマット（例：2024年12月13日（金））
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
  const dayOfWeek = dayNames[date.getDay()];
  return `${year}年${month}月${day}日（${dayOfWeek}）`;
}

export default function GoodThingsHistoryScreen() {
  const navigation = useNavigation();
  const { history, hasMore, fetchHistory, deleteItem, updateItem, loading } = useGoodThings();
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [editingItem, setEditingItem] = useState<GoodThing | null>(null);
  const [deletingItem, setDeletingItem] = useState<GoodThing | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: '良かったリスト',
    });
  }, [navigation]);

  useEffect(() => {
    fetchHistory(true);
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchHistory(true);
    setRefreshing(false);
  }, [fetchHistory]);

  const handleLoadMore = useCallback(async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    await fetchHistory(false);
    setLoadingMore(false);
  }, [hasMore, loadingMore, fetchHistory]);

  const handleDelete = useCallback((item: GoodThing) => {
    setDeletingItem(item);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!deletingItem) return;
    setIsDeleting(true);
    try {
      await deleteItem(deletingItem.id);
      setDeletingItem(null);
    } catch {
      Alert.alert('エラー', '削除に失敗しました');
    } finally {
      setIsDeleting(false);
    }
  }, [deletingItem, deleteItem]);

  const handleEdit = useCallback((item: GoodThing) => {
    setEditingItem(item);
  }, []);

  const handleSaveEdit = useCallback(async (newContent: string) => {
    if (!editingItem) return;
    if (!newContent.trim()) {
      Alert.alert('エラー', '内容を入力してください');
      return;
    }
    try {
      await updateItem(editingItem.id, newContent);
      setEditingItem(null);
    } catch {
      Alert.alert('エラー', '更新に失敗しました');
    }
  }, [editingItem, updateItem]);

  const renderItem = useCallback(({ item }: { item: GoodThingsByDate }) => (
    <VStack className="bg-background-50 rounded-lg p-4 mb-4">
      <Heading size="sm" className="mb-3 text-typography-700">
        {formatDate(item.date)}
      </Heading>
      <VStack space="sm">
        {item.items.map((goodThing) => (
          <HStack key={goodThing.id} space="sm" className="items-center">
            <Text className="flex-1">・{goodThing.content}</Text>
            <Pressable
              onPress={() => handleEdit(goodThing)}
              className="p-2"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon as={Pencil} size="sm" className="text-typography-500" />
            </Pressable>
            <Pressable
              onPress={() => handleDelete(goodThing)}
              className="p-2"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon as={Trash2} size="sm" className="text-error-400" />
            </Pressable>
          </HStack>
        ))}
      </VStack>
    </VStack>
  ), [handleDelete, handleEdit]);

  const renderEmpty = useCallback(() => {
    if (loading) {
      return (
        <Box className="items-center py-8">
          <Spinner size="large" />
        </Box>
      );
    }
    return (
      <Box className="items-center py-8">
        <Text className="text-typography-500">
          まだ記録がありません
        </Text>
        <Text className="text-typography-400 text-sm mt-2">
          ホーム画面のボタンから記録してみましょう
        </Text>
      </Box>
    );
  }, [loading]);

  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;
    return (
      <Box className="py-4 items-center">
        <Spinner size="small" />
      </Box>
    );
  }, [loadingMore]);

  return (
    <SafeAreaView className="flex-1 bg-background-0" edges={['bottom']}>
      <FlatList
        data={history}
        keyExtractor={(item) => item.date}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        contentContainerStyle={{ padding: 16 }}
      />

      <TextEditModal
        isOpen={!!editingItem}
        onClose={() => setEditingItem(null)}
        onSave={handleSaveEdit}
        title="編集"
        placeholder="良かったことを入力"
        initialValue={editingItem?.content || ''}
        maxLength={100}
        multiline={false}
      />

      <ConfirmModal
        isOpen={!!deletingItem}
        onClose={() => setDeletingItem(null)}
        onConfirm={handleConfirmDelete}
        title="削除確認"
        message={`「${deletingItem?.content || ''}」を削除しますか？`}
        confirmText="削除"
        isLoading={isDeleting}
        confirmAction="negative"
      />
    </SafeAreaView>
  );
}
