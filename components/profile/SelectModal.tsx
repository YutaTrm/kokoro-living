import { Text } from '@/components/Themed';
import { Button, ButtonText } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { CloseIcon, Icon } from '@/components/ui/icon';
import {
  Modal,
  ModalBackdrop,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
} from '@/components/ui/modal';
import { VStack } from '@/components/ui/vstack';

interface MasterData {
  id: string;
  name: string;
}

interface SelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  masters: MasterData[];
  existingItems: { name: string }[];
  onSelect: (id: string) => void;
  emptyMessage: string;
}

export default function SelectModal({
  isOpen,
  onClose,
  title,
  masters,
  existingItems,
  onSelect,
  emptyMessage,
}: SelectModalProps) {
  const availableItems = masters.filter(
    (master) => !existingItems.some((item) => item.name === master.name)
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalBackdrop />
      <ModalContent className="max-h-[80%]">
        <ModalHeader>
          <Heading size="lg">{title}</Heading>
          <ModalCloseButton>
            <Icon as={CloseIcon} size="md" />
          </ModalCloseButton>
        </ModalHeader>
        <ModalBody>
          <VStack space="sm">
            {availableItems.map((item) => (
              <Button key={item.id} onPress={() => onSelect(item.id)} variant="outline">
                <ButtonText>{item.name}</ButtonText>
              </Button>
            ))}
            {availableItems.length === 0 && (
              <Text className="text-sm opacity-50 text-center py-2">{emptyMessage}</Text>
            )}
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
