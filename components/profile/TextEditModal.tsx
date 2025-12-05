import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, TextInput } from 'react-native';

import { Text } from '@/components/ui/text';
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
  const [charCount, setCharCount] = useState(initialValue.length);
  const valueRef = useRef(initialValue);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (isOpen) {
      valueRef.current = initialValue;
      setCharCount(initialValue.length);
    }
  }, [isOpen, initialValue]);

  const handleChangeText = (text: string) => {
    valueRef.current = text;
    setCharCount(text.length);
  };

  const handleSave = () => {
    onSave(valueRef.current);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalBackdrop />
      <ModalContent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ModalHeader>
            <Heading size="lg">{title}</Heading>
          </ModalHeader>
          <ModalBody>
            {multiline ? (
              <Textarea size="md" className="min-h-32">
                <TextareaInput
                  ref={inputRef}
                  placeholder={placeholder}
                  defaultValue={initialValue}
                  onChangeText={handleChangeText}
                  maxLength={maxLength}
                />
              </Textarea>
            ) : (
              <Input size="md">
                <InputField
                  ref={inputRef}
                  placeholder={placeholder}
                  defaultValue={initialValue}
                  onChangeText={handleChangeText}
                  maxLength={maxLength}
                />
              </Input>
            )}
            <Text className="text-xs text-typography-500 mt-1 text-right">
              {charCount}/{maxLength}
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
        </KeyboardAvoidingView>
      </ModalContent>
    </Modal>
  );
}
