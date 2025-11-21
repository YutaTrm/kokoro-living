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

interface MedicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  medicationMasters: MasterData[];
  existingMedications: { name: string }[];
  onSelect: (medicationId: string) => void;
}

export default function MedicationModal({
  isOpen,
  onClose,
  medicationMasters,
  existingMedications,
  onSelect,
}: MedicationModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalBackdrop />
      <ModalContent className="max-h-[80%]">
        <ModalHeader>
          <Heading size="lg">服薬を選択</Heading>
          <ModalCloseButton>
            <Icon as={CloseIcon} size="md" />
          </ModalCloseButton>
        </ModalHeader>
        <ModalBody>
          <VStack space="sm">
            {medicationMasters
              .filter((master) => !existingMedications.some((m) => m.name === master.name))
              .map((item) => (
                <Button key={item.id} onPress={() => onSelect(item.id)} variant="outline">
                  <ButtonText>{item.name}</ButtonText>
                </Button>
              ))}
            {medicationMasters.filter(
              (master) => !existingMedications.some((m) => m.name === master.name)
            ).length === 0 && (
              <Text className="text-sm opacity-50 text-center py-2">
                追加可能な服薬がありません
              </Text>
            )}
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
