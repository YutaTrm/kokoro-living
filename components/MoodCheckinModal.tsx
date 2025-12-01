import { Button, ButtonText } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { Modal, ModalBackdrop, ModalBody, ModalContent } from '@/components/ui/modal';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { MOOD_EMOJIS, MOOD_LABELS } from '@/src/hooks/useMoodCheckin';
import React from 'react';
import { Alert, Pressable } from 'react-native';

interface MoodCheckinModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (mood: number) => Promise<void>;
  submitting: boolean;
}

export function MoodCheckinModal({
  visible,
  onClose,
  onSubmit,
  submitting,
}: MoodCheckinModalProps) {
  const handleMoodSelect = async (mood: number) => {
    try {
      await onSubmit(mood);
      onClose();
    } catch (error) {
      Alert.alert('エラー', 'チェックインに失敗しました');
    }
  };

  return (
    <Modal isOpen={visible} onClose={onClose}>
      <ModalBackdrop />
      <ModalContent className="max-w-md">
        <ModalBody>
          <VStack space="xl" className="py-4">
            <VStack space="sm" className="items-center">
              <Heading size="lg" className="text-center">
                今日の気分は？
              </Heading>
            </VStack>

            {submitting ? (
              <VStack className="items-center py-8">
                <Spinner size="large" />
              </VStack>
            ) : (
              <VStack space="md">
                {[5, 4, 3, 2, 1].map((mood) => (
                  <Pressable
                    key={mood}
                    onPress={() => handleMoodSelect(mood)}
                    className="bg-background-50 rounded-lg p-2 border border-outline-200 active:bg-background-100"
                  >
                    <HStack space="md" className="items-center">
                      <Text className="text-2xl">{MOOD_EMOJIS[mood as keyof typeof MOOD_EMOJIS]}</Text>
                      <Text size="lg" className="flex-1">
                        {MOOD_LABELS[mood as keyof typeof MOOD_LABELS]}
                      </Text>
                    </HStack>
                  </Pressable>
                ))}
              </VStack>
            )}

            <Button
              onPress={onClose}
              disabled={submitting}
              variant="outline"
              className="w-full"
            >
              <ButtonText>スキップ</ButtonText>
            </Button>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
