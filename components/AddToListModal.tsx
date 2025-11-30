import { useEffect, useState } from 'react';
import { Alert, Pressable } from 'react-native';

import { Button, ButtonText } from '@/components/ui/button';
import { Checkbox, CheckboxIcon, CheckboxIndicator, CheckboxLabel } from '@/components/ui/checkbox';
import { CheckIcon } from '@/components/ui/icon';
import {
  Modal,
  ModalBackdrop,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from '@/components/ui/modal';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { supabase } from '@/src/lib/supabase';

interface List {
  id: string;
  name: string;
}

interface AddToListModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

export default function AddToListModal({ isOpen, onClose, userId }: AddToListModalProps) {
  const [lists, setLists] = useState<List[]>([]);
  const [selectedListIds, setSelectedListIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadLists();
    }
  }, [isOpen, userId]);

  const loadLists = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // ユーザーのリストを取得
      const { data: listsData, error: listsError } = await supabase
        .from('lists')
        .select('id, name')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (listsError) throw listsError;
      setLists(listsData || []);

      // 現在選択されているリストを取得
      const { data: membersData, error: membersError } = await supabase
        .from('list_members')
        .select('list_id')
        .eq('user_id', userId)
        .in(
          'list_id',
          (listsData || []).map((l) => l.id)
        );

      if (membersError) throw membersError;

      const currentListIds = (membersData || []).map((m) => m.list_id);
      setSelectedListIds(currentListIds);
    } catch (error) {
      console.error('リスト取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleList = (listId: string) => {
    setSelectedListIds((prev) =>
      prev.includes(listId) ? prev.filter((id) => id !== listId) : [...prev, listId]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('エラー', 'ログインしてください');
        return;
      }

      // 現在のリストメンバーシップを取得
      const { data: currentMembers } = await supabase
        .from('list_members')
        .select('list_id, id')
        .eq('user_id', userId)
        .in(
          'list_id',
          lists.map((l) => l.id)
        );

      const currentListIds = (currentMembers || []).map((m) => m.list_id);

      // 追加するリスト
      const toAdd = selectedListIds.filter((id) => !currentListIds.includes(id));
      // 削除するリスト
      const toRemove = currentListIds.filter((id) => !selectedListIds.includes(id));

      // 追加
      if (toAdd.length > 0) {
        const { error: addError } = await supabase.from('list_members').insert(
          toAdd.map((listId) => ({
            list_id: listId,
            user_id: userId,
          }))
        );
        if (addError) throw addError;
      }

      // 削除
      if (toRemove.length > 0) {
        const idsToDelete = (currentMembers || [])
          .filter((m) => toRemove.includes(m.list_id))
          .map((m) => m.id);

        const { error: removeError } = await supabase.from('list_members').delete().in('id', idsToDelete);
        if (removeError) throw removeError;
      }

      onClose();
    } catch (error) {
      console.error('リスト更新エラー:', error);
      Alert.alert('エラー', 'リストの更新に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalBackdrop />
      <ModalContent>
        <ModalHeader>
          <Text className="text-lg font-semibold">リストに追加</Text>
          <ModalCloseButton />
        </ModalHeader>
        <ModalBody>
          {loading ? (
            <VStack className="items-center justify-center py-8">
              <Spinner size="large" />
            </VStack>
          ) : lists.length === 0 ? (
            <Text className="text-sm text-typography-500 text-center py-8">
              リストがありません。{'\n'}ホーム画面からリストを作成してください。
            </Text>
          ) : (
            <VStack space="sm">
              {lists.map((list) => (
                <Pressable key={list.id} onPress={() => handleToggleList(list.id)}>
                  <Checkbox
                    value={list.id}
                    isChecked={selectedListIds.includes(list.id)}
                    onChange={() => handleToggleList(list.id)}
                    size="md"
                  >
                    <CheckboxIndicator>
                      <CheckboxIcon as={CheckIcon} />
                    </CheckboxIndicator>
                    <CheckboxLabel>{list.name}</CheckboxLabel>
                  </Checkbox>
                </Pressable>
              ))}
            </VStack>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onPress={onClose} className="mr-2">
            <ButtonText>キャンセル</ButtonText>
          </Button>
          <Button onPress={handleSave} isDisabled={saving || loading || lists.length === 0}>
            <ButtonText>{saving ? '保存中...' : '保存'}</ButtonText>
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
