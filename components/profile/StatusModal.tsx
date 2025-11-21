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

interface StatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  statusMasters: MasterData[];
  existingStatuses: { name: string }[];
  onSelect: (statusId: string) => void;
}

export default function StatusModal({
  isOpen,
  onClose,
  statusMasters,
  existingStatuses,
  onSelect,
}: StatusModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalBackdrop />
      <ModalContent className="max-h-[80%]">
        <ModalHeader>
          <Heading size="lg">ステータスを選択</Heading>
          <ModalCloseButton>
            <Icon as={CloseIcon} size="md" />
          </ModalCloseButton>
        </ModalHeader>
        <ModalBody>
          <VStack space="sm">
            {statusMasters
              .filter((master) => !existingStatuses.some((s) => s.name === master.name))
              .map((item) => (
                <Button key={item.id} onPress={() => onSelect(item.id)} variant="outline">
                  <ButtonText>{item.name}</ButtonText>
                </Button>
              ))}
            {statusMasters.filter(
              (master) => !existingStatuses.some((s) => s.name === master.name)
            ).length === 0 && (
              <Text className="text-sm opacity-50 text-center py-2">
                追加可能なステータスがありません
              </Text>
            )}
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
