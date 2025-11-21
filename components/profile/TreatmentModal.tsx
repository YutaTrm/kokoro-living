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

interface TreatmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  treatmentMasters: MasterData[];
  existingTreatments: { name: string }[];
  onSelect: (treatmentId: string) => void;
}

export default function TreatmentModal({
  isOpen,
  onClose,
  treatmentMasters,
  existingTreatments,
  onSelect,
}: TreatmentModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalBackdrop />
      <ModalContent className="max-h-[80%]">
        <ModalHeader>
          <Heading size="lg">治療を選択</Heading>
          <ModalCloseButton>
            <Icon as={CloseIcon} size="md" />
          </ModalCloseButton>
        </ModalHeader>
        <ModalBody>
          <VStack space="sm">
            {treatmentMasters
              .filter((master) => !existingTreatments.some((t) => t.name === master.name))
              .map((item) => (
                <Button key={item.id} onPress={() => onSelect(item.id)} variant="outline">
                  <ButtonText>{item.name}</ButtonText>
                </Button>
              ))}
            {treatmentMasters.filter(
              (master) => !existingTreatments.some((t) => t.name === master.name)
            ).length === 0 && (
              <Text className="text-sm opacity-50 text-center py-2">
                追加可能な治療がありません
              </Text>
            )}
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
