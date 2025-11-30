import { useEffect, useState } from 'react';
import { Alert, TextInput } from 'react-native';

import { Button, ButtonText } from '@/components/ui/button';
import {
  Modal,
  ModalBackdrop,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from '@/components/ui/modal';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { supabase } from '@/src/lib/supabase';

interface List {
  id: string;
  name: string;
}

interface EditListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
  list: List | null;
}

export default function EditListModal({ isOpen, onClose, onUpdated, list }: EditListModalProps) {
  const [name, setName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const maxLength = 20;
  const remainingChars = maxLength - name.length;

  useEffect(() => {
    if (list) {
      setName(list.name);
    }
  }, [list]);

  const handleClose = () => {
    setName('');
    onClose();
  };

  const handleUpdate = async () => {
    if (!list) return;

    if (!name.trim()) {
      Alert.alert('エラー', 'リスト名を入力してください');
      return;
    }

    if (name.length > maxLength) {
      Alert.alert('エラー', `リスト名は${maxLength}文字以内で入力してください`);
      return;
    }

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('lists')
        .update({ name: name.trim() })
        .eq('id', list.id);

      if (error) throw error;

      setName('');
      onUpdated();
      onClose();
    } catch (error) {
      console.error('リスト更新エラー:', error);
      Alert.alert('エラー', 'リストの更新に失敗しました');
    } finally {
      setIsUpdating(false);
    }
  };

  if (!list) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="md">
      <ModalBackdrop />
      <ModalContent>
        <ModalHeader>
          <Text className="text-lg font-semibold">リスト名を編集</Text>
          <ModalCloseButton />
        </ModalHeader>
        <ModalBody>
          <VStack space="md">
            <VStack space="xs">
              <Text className="text-sm text-typography-700">リスト名</Text>
              <TextInput
                className="border border-outline-200 rounded-lg px-3 py-2 text-base text-typography-900"
                placeholder="例: お気に入り"
                value={name}
                onChangeText={setName}
                maxLength={maxLength}
                autoFocus
              />
              <Text
                className={`text-sm text-right ${remainingChars < 0 ? 'text-error-500' : 'text-typography-500'}`}
              >
                残り{remainingChars}文字
              </Text>
            </VStack>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onPress={handleClose} className="mr-2">
            <ButtonText>キャンセル</ButtonText>
          </Button>
          <Button onPress={handleUpdate} isDisabled={isUpdating || !name.trim()}>
            <ButtonText>{isUpdating ? '更新中...' : '更新'}</ButtonText>
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
