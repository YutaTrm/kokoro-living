import { useEffect, useRef, useState } from 'react';
import { Alert, TextInput } from 'react-native';

import { Button, ButtonText } from '@/components/ui/button';
import { Input, InputField } from '@/components/ui/input';
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
  const [charCount, setCharCount] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);
  const nameRef = useRef('');
  const inputRef = useRef<TextInput>(null);

  const maxLength = 20;
  const remainingChars = maxLength - charCount;

  useEffect(() => {
    if (list && isOpen) {
      nameRef.current = list.name;
      setCharCount(list.name.length);
      // TextInputの値をリセット
      if (inputRef.current) {
        inputRef.current.setNativeProps({ text: list.name });
      }
    }
  }, [list, isOpen]);

  const handleChangeText = (text: string) => {
    // 改行を削除（multilineだが1行にする）
    const singleLineText = text.replace(/\n/g, '');
    nameRef.current = singleLineText;
    setCharCount(singleLineText.length);
  };

  const handleClose = () => {
    nameRef.current = '';
    setCharCount(0);
    onClose();
  };

  const handleUpdate = async () => {
    if (!list) return;

    if (!nameRef.current.trim()) {
      Alert.alert('エラー', 'リスト名を入力してください');
      return;
    }

    if (nameRef.current.length > maxLength) {
      Alert.alert('エラー', `リスト名は${maxLength}文字以内で入力してください`);
      return;
    }

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('lists')
        .update({ name: nameRef.current.trim() })
        .eq('id', list.id);

      if (error) throw error;

      nameRef.current = '';
      setCharCount(0);
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
              <Input size="md">
                <InputField
                  ref={inputRef}
                  placeholder="例: お気に入り"
                  defaultValue={list?.name || ''}
                  onChangeText={handleChangeText}
                  maxLength={maxLength}
                  multiline={true}
                  autoComplete="off"
                  keyboardType="default"
                />
              </Input>
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
          <Button onPress={handleUpdate} isDisabled={isUpdating || charCount === 0}>
            <ButtonText>{isUpdating ? '更新中...' : '更新'}</ButtonText>
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
