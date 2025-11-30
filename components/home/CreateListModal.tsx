import { useState } from 'react';
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

interface CreateListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateListModal({ isOpen, onClose, onCreated }: CreateListModalProps) {
  const [name, setName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const maxLength = 20;
  const remainingChars = maxLength - name.length;

  const handleClose = () => {
    setName('');
    onClose();
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('エラー', 'リスト名を入力してください');
      return;
    }

    if (name.length > maxLength) {
      Alert.alert('エラー', `リスト名は${maxLength}文字以内で入力してください`);
      return;
    }

    setIsCreating(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('エラー', 'ログインしてください');
        return;
      }

      // リスト数をチェック
      const { count } = await supabase
        .from('lists')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (count !== null && count >= 5) {
        Alert.alert('エラー', 'リスト作成は最大5個までです');
        return;
      }

      const { error } = await supabase.from('lists').insert({
        user_id: user.id,
        name: name.trim(),
      });

      if (error) throw error;

      setName('');
      onCreated();
      onClose();
    } catch (error) {
      console.error('リスト作成エラー:', error);
      Alert.alert('エラー', 'リストの作成に失敗しました');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="md">
      <ModalBackdrop />
      <ModalContent>
        <ModalHeader>
          <Text className="text-lg font-semibold">リストを作成</Text>
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
          <Button onPress={handleCreate} isDisabled={isCreating || !name.trim()}>
            <ButtonText>{isCreating ? '作成中...' : '作成'}</ButtonText>
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
