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

interface DiagnosisModalProps {
  isOpen: boolean;
  onClose: () => void;
  diagnosisMasters: MasterData[];
  existingDiagnoses: { name: string }[];
  onSelect: (diagnosisId: string) => void;
}

export default function DiagnosisModal({
  isOpen,
  onClose,
  diagnosisMasters,
  existingDiagnoses,
  onSelect,
}: DiagnosisModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalBackdrop />
      <ModalContent className="max-h-[80%]">
        <ModalHeader>
          <Heading size="lg">診断名を選択</Heading>
          <ModalCloseButton>
            <Icon as={CloseIcon} size="md" />
          </ModalCloseButton>
        </ModalHeader>
        <ModalBody>
          <VStack space="sm">
            {diagnosisMasters
              .filter((master) => !existingDiagnoses.some((d) => d.name === master.name))
              .map((item) => (
                <Button key={item.id} onPress={() => onSelect(item.id)} variant="outline">
                  <ButtonText>{item.name}</ButtonText>
                </Button>
              ))}
            {diagnosisMasters.filter(
              (master) => !existingDiagnoses.some((d) => d.name === master.name)
            ).length === 0 && (
              <Text className="text-sm opacity-50 text-center py-2">
                追加可能な診断名がありません
              </Text>
            )}
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
