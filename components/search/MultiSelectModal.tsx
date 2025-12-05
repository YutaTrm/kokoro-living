import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, TextInput } from 'react-native';

import { Button, ButtonText } from '@/components/ui/button';
import { Checkbox, CheckboxIcon, CheckboxIndicator, CheckboxLabel } from '@/components/ui/checkbox';
import { Heading } from '@/components/ui/heading';
import { CheckIcon, CloseIcon, Icon, SearchIcon } from '@/components/ui/icon';
import { Input, InputField, InputIcon, InputSlot } from '@/components/ui/input';
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

interface TagOption {
  id: string;
  name: string;
}

interface MultiSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  options: TagOption[];
  selectedIds: string[];
  onSave: (selectedIds: string[]) => void;
  onToggle?: (id: string, newSelectedIds: string[]) => string[];
}

export default function MultiSelectModal({
  isOpen,
  onClose,
  title,
  subtitle,
  options,
  selectedIds,
  onSave,
  onToggle,
}: MultiSelectModalProps) {
  const [tempSelectedIds, setTempSelectedIds] = useState<string[]>(selectedIds);
  const [filterText, setFilterText] = useState('');
  const inputRef = useRef<TextInput>(null);

  // モーダルが開いたとき、または親のselectedIdsが変わったときに初期化
  useEffect(() => {
    if (isOpen) {
      setTempSelectedIds(selectedIds);
      setFilterText('');
      inputRef.current?.clear();
    }
  }, [isOpen, selectedIds]);

  // フィルタリングされたオプション
  const filteredOptions = filterText
    ? options.filter((option) =>
        option.name.toLowerCase().includes(filterText.toLowerCase())
      )
    : options;

  const handleClear = () => {
    inputRef.current?.clear();
    setFilterText('');
  };

  const toggleSelection = (id: string) => {
    setTempSelectedIds((prev) => {
      const newIds = prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id];
      // onToggleが指定されている場合は、連動選択を処理
      if (onToggle) {
        return onToggle(id, newIds);
      }
      return newIds;
    });
  };

  const handleSave = () => {
    onSave(tempSelectedIds);
    onClose();
  };

  const handleCancel = () => {
    setTempSelectedIds(selectedIds);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleCancel}>
      <ModalBackdrop />
      <ModalContent className="max-h-[80%]">
        <ModalHeader>
          <VStack space="xs" className="flex-1">
            <Heading size="lg">{title}</Heading>
            {subtitle && (
              <Text className="text-xs text-typography-500">{subtitle}</Text>
            )}
          </VStack>
          <ModalCloseButton>
            <Icon as={CloseIcon} size="md" />
          </ModalCloseButton>
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
          <ScrollView className="max-h-80">
              <VStack space="sm">
                {filteredOptions.map((option) => (
                  <Pressable key={option.id} onPress={() => toggleSelection(option.id)}>
                    <Checkbox
                      value={option.id}
                      isChecked={tempSelectedIds.includes(option.id)}
                      onChange={() => toggleSelection(option.id)}
                      size="md"
                    >
                      <CheckboxIndicator>
                        <CheckboxIcon as={CheckIcon} />
                      </CheckboxIndicator>
                      <CheckboxLabel>{option.name}</CheckboxLabel>
                    </Checkbox>
                  </Pressable>
                ))}
                {options.length === 0 && (
                  <Text className="text-sm opacity-50 text-center py-2">
                    タグがありません
                  </Text>
                )}
                {options.length > 0 && filteredOptions.length === 0 && (
                  <Text className="text-sm opacity-50 text-center py-2">
                    一致するタグがありません
                  </Text>
                )}
              </VStack>
            </ScrollView>
        </ModalBody>
        <ModalFooter>
          <VStack space="sm" className="w-full">
            <Button onPress={handleSave} className="w-full">
              <ButtonText>決定</ButtonText>
            </Button>
            <Button variant="outline" onPress={handleCancel} className="w-full">
              <ButtonText>キャンセル</ButtonText>
            </Button>
          </VStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
