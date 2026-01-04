import { ListPlus, Pencil, Trash2, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable } from 'react-native';

import ConfirmModal from '@/components/ConfirmModal';
import { Button, ButtonIcon, ButtonText } from '@/components/ui/button';
import { Divider } from '@/components/ui/divider';
import {
  Drawer,
  DrawerBackdrop,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
} from '@/components/ui/drawer';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { supabase } from '@/src/lib/supabase';

interface List {
  id: string;
  name: string;
  created_at: string;
}

interface HomeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedListId: string | null;
  onSelectList: (listId: string | null) => void;
  onCreateList: () => void;
  onEditList: (list: List) => void;
}

export default function HomeDrawer({
  isOpen,
  onClose,
  selectedListId,
  onSelectList,
  onCreateList,
  onEditList,
}: HomeDrawerProps) {
  const [lists, setLists] = useState<List[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTargetList, setDeleteTargetList] = useState<List | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadLists();
    }
  }, [isOpen]);

  const loadLists = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('lists')
        .select('id, name, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLists(data || []);
    } catch (error) {
      console.error('リスト取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTimeline = () => {
    onSelectList(null);
    onClose();
  };

  const handleSelectList = (listId: string) => {
    onSelectList(listId);
    onClose();
  };

  const handleDeleteConfirm = (list: List) => {
    setDeleteTargetList(list);
  };

  const handleDelete = async () => {
    if (!deleteTargetList) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase.from('lists').delete().eq('id', deleteTargetList.id);

      if (error) throw error;

      // リストを削除したら、選択中だった場合はタイムラインに戻す
      if (selectedListId === deleteTargetList.id) {
        onSelectList(null);
      }

      // リストを再読み込み
      await loadLists();
      setDeleteTargetList(null);
    } catch (error) {
      console.error('リスト削除エラー:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Drawer isOpen={isOpen} onClose={onClose} size="lg" anchor="right">
        <DrawerBackdrop />
        <DrawerContent className="pt-safe">
          <DrawerHeader>
            <Heading size="md"></Heading>
            <DrawerCloseButton>
              <Icon as={X} size="lg" />
            </DrawerCloseButton>
          </DrawerHeader>
          <DrawerBody>
            <VStack space="md">
              {/* タイムライン */}
              <Pressable onPress={handleSelectTimeline}>
                <HStack space="md" className="items-center">
                  <Text
                    className={`text-lg ${selectedListId === null ? 'text-primary-500 font-semibold' : ''}`}
                  >
                    タイムライン
                  </Text>
                </HStack>
              </Pressable>

              {/* すべての投稿 */}
              <Pressable onPress={() => { onSelectList('all'); onClose(); }}>
                <HStack space="md" className="items-center">
                  <Text
                    className={`text-lg ${selectedListId === 'all' ? 'text-primary-500 font-semibold' : ''}`}
                  >
                    すべての投稿
                  </Text>
                </HStack>
              </Pressable>

              {lists.length > 0 && <Divider className="my-2" />}

              {/* リスト */}
              {lists.length > 0 && <Text className="text-sm text-typography-500 mb-2">リスト</Text>}

              {/* ローディング */}
              {loading && (
                <HStack className="items-center justify-center py-4">
                  <Spinner size="small" />
                </HStack>
              )}

              {/* リスト一覧 */}
              {!loading &&
                lists.map((list) => (
                  <HStack key={list.id} space="sm" className="items-center">
                    <Pressable onPress={() => handleSelectList(list.id)} className="flex-1">
                      <Text
                        className={`text-lg ${selectedListId === list.id ? 'text-primary-500 font-semibold' : ''}`}
                        numberOfLines={1}
                      >
                        {list.name}
                      </Text>
                    </Pressable>

                    {/* 編集ボタン */}
                    <Pressable onPress={() => onEditList(list)} className="p-2">
                      <Icon as={Pencil} size="sm" className="text-typography-500" />
                    </Pressable>

                    {/* 削除ボタン */}
                    <Pressable onPress={() => handleDeleteConfirm(list)} className="p-2">
                      <Icon as={Trash2} size="sm" className="text-error-500" />
                    </Pressable>
                  </HStack>
                ))}
            </VStack>
          </DrawerBody>
          <DrawerFooter className="pb-safe">
            <VStack className="w-full gap-2">
              {lists.length >= 5 && (
                <Text className="text-xs text-error-500 text-center">
                  リスト作成は最大5個までです
                </Text>
              )}
              <Button
                onPress={onCreateList}
                variant="outline"
                className="w-full"
                isDisabled={lists.length >= 5}
              >
                <ButtonIcon as={ListPlus} />
                <ButtonText>リストを作成</ButtonText>
              </Button>
            </VStack>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* 削除確認モーダル */}
      <ConfirmModal
        isOpen={!!deleteTargetList}
        onClose={() => setDeleteTargetList(null)}
        onConfirm={handleDelete}
        title="リストを削除"
        message={`「${deleteTargetList?.name}」を削除しますか？\nこの操作は取り消せません。`}
        confirmText={isDeleting ? '削除中...' : '削除'}
        isLoading={isDeleting}
      />
    </>
  );
}
