import { Button, ButtonText } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { CloseIcon, Icon } from '@/components/ui/icon';
import { Modal, ModalBackdrop, ModalBody, ModalContent } from '@/components/ui/modal';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { GoodThing } from '@/src/hooks/useGoodThings';
import { useRouter } from 'expo-router';
import { Plus, Trash2 } from 'lucide-react-native';
import React, { useCallback, useRef, useState } from 'react';
import { Alert, Pressable, TextInput } from 'react-native';

interface GoodThingsModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (contents: string[]) => Promise<GoodThing[]>;
  submitting: boolean;
  todayItems: GoodThing[];
}

type ModalStep = 'input' | 'complete';

export function GoodThingsModal({
  visible,
  onClose,
  onSubmit,
  submitting,
  todayItems,
}: GoodThingsModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<ModalStep>('input');
  const [inputCount, setInputCount] = useState(1);
  const [savedItems, setSavedItems] = useState<GoodThing[]>([]);

  // 日本語IME対応: useRef + defaultValue
  const inputRefs = useRef<(TextInput | null)[]>([null, null, null]);
  const textRefs = useRef<string[]>(['', '', '']);

  const handleClose = useCallback(() => {
    // リセット
    setStep('input');
    setInputCount(1);
    setSavedItems([]);
    textRefs.current = ['', '', ''];
    onClose();
  }, [onClose]);

  const handleAddMore = useCallback(() => {
    if (inputCount < 3) {
      setInputCount(prev => prev + 1);
    }
  }, [inputCount]);

  const handleRemoveInput = useCallback((index: number) => {
    if (inputCount > 1) {
      // テキストを詰める
      const newTexts = [...textRefs.current];
      newTexts.splice(index, 1);
      newTexts.push('');
      textRefs.current = newTexts;

      // 入力欄のdefaultValueを更新するために、refをクリア
      setInputCount(prev => prev - 1);
    }
  }, [inputCount]);

  const handleSubmit = useCallback(async () => {
    const contents = textRefs.current
      .slice(0, inputCount)
      .map(t => t.trim())
      .filter(t => t.length > 0);

    if (contents.length === 0) {
      Alert.alert('エラー', '少なくとも1つは入力してください');
      return;
    }

    try {
      const items = await onSubmit(contents);
      setSavedItems(items);
      setStep('complete');
    } catch (error) {
      Alert.alert('エラー', '保存に失敗しました');
    }
  }, [inputCount, onSubmit]);

  const handlePostToTimeline = useCallback(() => {
    // 投稿作成画面に遷移し、良かったリストの内容をプリセット
    const contents = savedItems.map(item => item.content);
    const postContent = `今日良かったこと\n${contents.map(c => `・${c}`).join('\n')}`;

    handleClose();
    router.push({
      pathname: '/create-post',
      params: { prefill: postContent },
    });
  }, [savedItems, handleClose, router]);

  // 既に今日記録済みの場合の表示
  const hasRecordedToday = todayItems.length > 0;

  return (
    <Modal isOpen={visible} onClose={handleClose}>
      <ModalBackdrop />
      <ModalContent className="max-w-md mx-4">
        <ModalBody>
          {step === 'input' ? (
            <VStack space="lg" className="">
              <HStack className="items-center justify-between">
                <Heading size="lg">良かったリスト</Heading>
                <Pressable onPress={handleClose} className="p-2">
                  <Icon as={CloseIcon} size="md" className="text-typography-500" />
                </Pressable>
              </HStack>

              {hasRecordedToday ? (
                <VStack space="md">
                  <Text className="text-typography-600">
                    今日は既に記録済みです
                  </Text>
                  {todayItems.map((item) => (
                    <HStack key={item.id} space="sm" className="items-center">
                      <Text className="flex-1">・{item.content}</Text>
                    </HStack>
                  ))}
                  <Button onPress={handleClose} variant="outline" className="mt-4">
                    <ButtonText>閉じる</ButtonText>
                  </Button>
                </VStack>
              ) : submitting ? (
                <VStack className="items-center py-8">
                  <Spinner size="large" />
                  <Text className="mt-4 text-typography-500">保存中...</Text>
                </VStack>
              ) : (
                <VStack space="md">
                  <Text className="text-typography-600">
                    今日の良かったことを3つ記録しよう
                  </Text>

                  {Array.from({ length: inputCount }).map((_, index) => (
                    <HStack key={index} space="sm" className="items-center">
                      <TextInput
                        ref={el => { inputRefs.current[index] = el; }}
                        defaultValue={textRefs.current[index]}
                        onChangeText={text => { textRefs.current[index] = text; }}
                        placeholder="良かったことを入力..."
                        className="flex-1 bg-background-50 rounded-lg p-3 border border-outline-200 text-typography-900"
                        maxLength={100}
                      />
                      {inputCount > 1 && (
                        <Pressable
                          onPress={() => handleRemoveInput(index)}
                          className="p-2"
                        >
                          <Icon as={Trash2} size="sm" className="text-error-500" />
                        </Pressable>
                      )}
                    </HStack>
                  ))}

                  {inputCount < 3 && (
                    <Pressable
                      onPress={handleAddMore}
                      className="flex-row items-center justify-center py-2 border border-dashed border-outline-300 rounded-lg"
                    >
                      <Icon as={Plus} size="sm" className="text-primary-500 mr-2" />
                      <Text className="text-primary-500">追加</Text>
                    </Pressable>
                  )}

                  <VStack space="sm" className="mt-4">
                    <Button onPress={handleSubmit}>
                      <ButtonText>記録する</ButtonText>
                    </Button>
                    <Button onPress={handleClose} variant="outline">
                      <ButtonText>キャンセル</ButtonText>
                    </Button>
                  </VStack>
                </VStack>
              )}
            </VStack>
          ) : (
            <VStack space="lg" className="">
              <Heading size="lg" className="text-center">
                記録しました！
              </Heading>

              <VStack space="sm" className="bg-background-50 rounded-lg p-4">
                {savedItems.map((item) => (
                  <HStack key={item.id} space="sm" className="items-center">
                    <Text className="flex-1">・{item.content}</Text>
                  </HStack>
                ))}
              </VStack>

              <VStack space="sm">
                <Button onPress={handlePostToTimeline} variant="outline">
                  <ButtonText>この内容を投稿する</ButtonText>
                </Button>
                <Button onPress={handleClose}>
                  <ButtonText>閉じる</ButtonText>
                </Button>
              </VStack>
            </VStack>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
