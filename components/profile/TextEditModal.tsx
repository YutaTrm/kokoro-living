import { useEffect, useState } from 'react';

import { Text } from '@/components/Themed';
import { Button, ButtonText } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { Input, InputField } from '@/components/ui/input';
import {
  Modal,
  ModalBackdrop,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from '@/components/ui/modal';
import { Textarea, TextareaInput } from '@/components/ui/textarea';

interface TextEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (value: string) => void;
  title: string;
  placeholder?: string;
  initialValue: string;
  maxLength?: number;
  multiline?: boolean;
}

export default function TextEditModal({
  isOpen,
  onClose,
  onSave,
  title,
  placeholder,
  initialValue,
  maxLength = 500,
  multiline = true,
}: TextEditModalProps) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (isOpen) {
      setValue(initialValue);
    }
  }, [isOpen, initialValue]);

  const handleSave = () => {
    onSave(value);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalBackdrop />
      <ModalContent>
        <ModalHeader>
          <Heading size="lg">{title}</Heading>
        </ModalHeader>
        <ModalBody>
          {multiline ? (
            <Textarea size="md" className="min-h-32">
              <TextareaInput
                placeholder={placeholder}
                value={value}
                onChangeText={setValue}
                maxLength={maxLength}
              />
            </Textarea>
          ) : (
            <Input size="md">
              <InputField
                placeholder={placeholder}
                value={value}
                onChangeText={setValue}
                maxLength={maxLength}
              />
            </Input>
          )}
          <Text className="text-xs text-typography-500 mt-1 text-right">
            {value.length}/{maxLength}
          </Text>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onPress={onClose} className="mr-2">
            <ButtonText>キャンセル</ButtonText>
          </Button>
          <Button onPress={handleSave}>
            <ButtonText>保存</ButtonText>
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
