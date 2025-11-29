import { useEffect, useState } from 'react';
import { ScrollView } from 'react-native';

import { Text } from '@/components/ui/text';
import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { Checkbox, CheckboxIcon, CheckboxIndicator, CheckboxLabel } from '@/components/ui/checkbox';
import { Heading } from '@/components/ui/heading';
import { CheckIcon } from '@/components/ui/icon';
import {
  Modal,
  ModalBackdrop,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from '@/components/ui/modal';
import { VStack } from '@/components/ui/vstack';

interface TagOption {
  id: string;
  name: string;
  type: 'diagnosis' | 'ingredient' | 'treatment' | 'status';
}

interface TagFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (selectedIds: string[]) => void;
  tags: TagOption[];
  selectedIds: string[];
}

export default function TagFilterModal({
  isOpen,
  onClose,
  onSave,
  tags,
  selectedIds,
}: TagFilterModalProps) {
  const [localSelectedIds, setLocalSelectedIds] = useState<string[]>(selectedIds);

  // モーダルが開くたびに状態をリセット
  useEffect(() => {
    if (isOpen) {
      setLocalSelectedIds(selectedIds);
    }
  }, [isOpen, selectedIds]);

  const handleToggle = (id: string) => {
    setLocalSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSave = () => {
    onSave(localSelectedIds);
    onClose();
  };

  const getTagsByType = (type: 'diagnosis' | 'ingredient' | 'treatment' | 'status') => {
    return tags.filter((t) => t.type === type);
  };

  const renderSection = (
    title: string,
    type: 'diagnosis' | 'ingredient' | 'treatment' | 'status'
  ) => {
    const sectionTags = getTagsByType(type);
    if (sectionTags.length === 0) return null;

    return (
      <Box className="mb-4">
        <Text className="text-sm font-semibold text-typography-600 mb-2">{title}</Text>
        <VStack space="xs">
          {sectionTags.map((tag) => (
            <Checkbox
              key={tag.id}
              value={tag.id}
              isChecked={localSelectedIds.includes(tag.id)}
              onChange={() => handleToggle(tag.id)}
              size="md"
              className="flex items-center"
            >
              <CheckboxIndicator>
                <CheckboxIcon as={CheckIcon} />
              </CheckboxIndicator>
              <CheckboxLabel className="text-md mb-1 pt-[4px]">{tag.name}</CheckboxLabel>
            </Checkbox>
          ))}
        </VStack>
      </Box>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalBackdrop />
      <ModalContent className="max-h-[80%]">
        <ModalHeader>
          <Heading size="lg">タグで絞り込み</Heading>
        </ModalHeader>
        <ModalBody>
          <ScrollView className="flex-1">
            {renderSection('診断名', 'diagnosis')}
            {renderSection('服薬', 'ingredient')}
            {renderSection('治療法', 'treatment')}
            {renderSection('ステータス', 'status')}
          </ScrollView>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onPress={onClose} className="mr-2">
            <ButtonText>キャンセル</ButtonText>
          </Button>
          <Button onPress={handleSave}>
            <ButtonText>適用</ButtonText>
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
