import { Text } from '@/components/Themed';
import { Button, ButtonText } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import {
  Modal,
  ModalBackdrop,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from '@/components/ui/modal';
import { Spinner } from '@/components/ui/spinner';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText: string;
  isLoading?: boolean;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  isLoading = false,
}: ConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={() => !isLoading && onClose()} size="sm">
      <ModalBackdrop />
      <ModalContent>
        <ModalHeader>
          <Heading size="lg">{title}</Heading>
        </ModalHeader>
        <ModalBody>
          <Text>{message}</Text>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onPress={onClose} isDisabled={isLoading} className="mr-2">
            <ButtonText>キャンセル</ButtonText>
          </Button>
          <Button action="negative" onPress={onConfirm} isDisabled={isLoading}>
            {isLoading ? <Spinner size="small" /> : <ButtonText>{confirmText}</ButtonText>}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
