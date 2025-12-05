import { useEffect, useRef, useState } from 'react';
import { ScrollView, TextInput } from 'react-native';

import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { Checkbox, CheckboxIcon, CheckboxIndicator, CheckboxLabel } from '@/components/ui/checkbox';
import { Heading } from '@/components/ui/heading';
import { CheckIcon, CloseIcon, SearchIcon } from '@/components/ui/icon';
import { Input, InputField, InputIcon, InputSlot } from '@/components/ui/input';
import {
  Modal,
  ModalBackdrop,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from '@/components/ui/modal';
import { Text } from '@/components/ui/text';
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
  const [filterText, setFilterText] = useState('');
  const inputRef = useRef<TextInput>(null);

  // モーダルが開いたとき、または親のselectedIdsが変わったときに初期化
  useEffect(() => {
    if (isOpen) {
      setLocalSelectedIds(selectedIds);
      setFilterText('');
      inputRef.current?.clear();
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

  const handleClear = () => {
    inputRef.current?.clear();
    setFilterText('');
  };

  const getTagsByType = (type: 'diagnosis' | 'ingredient' | 'treatment' | 'status') => {
    const typeTags = tags.filter((t) => t.type === type);
    if (!filterText) return typeTags;
    return typeTags.filter((t) =>
      t.name.toLowerCase().includes(filterText.toLowerCase())
    );
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
          <Input size="md" className="mb-3">
            <InputSlot className="pl-3">
              <InputIcon as={SearchIcon} />
            </InputSlot>
            <InputField
              ref={inputRef}
              placeholder="絞り込み..."
              defaultValue=""
              onChangeText={setFilterText}
            />
            {filterText && (
              <InputSlot className="pr-3" onPress={handleClear}>
                <InputIcon as={CloseIcon} />
              </InputSlot>
            )}
          </Input>
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
