import { Text } from '@/components/Themed';
import { Box } from '@/components/ui/box';
import { Button, ButtonIcon } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { AddIcon, TrashIcon } from '@/components/ui/icon';
import { VStack } from '@/components/ui/vstack';

interface MedicalRecord {
  id: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
}

interface MedicalSectionProps {
  title: string;
  records: MedicalRecord[];
  onAdd: () => void;
  onDelete: (id: string) => void;
}

const formatYearMonth = (dateStr: string | null): string => {
  if (!dateStr) return '現在';
  const [year, month] = dateStr.split('-');
  return `${year}年${parseInt(month)}月`;
};

const formatDateRange = (startDate: string | null, endDate: string | null): string => {
  if (!startDate) return '期間未設定';
  const start = formatYearMonth(startDate);
  const end = formatYearMonth(endDate);
  return `${start} 〜 ${end}`;
};

export default function MedicalSection({
  title,
  records,
  onAdd,
  onDelete,
}: MedicalSectionProps) {
  return (
    <Box className="px-5 py-4 border-t border-outline-200">
      <HStack className="justify-between items-center mb-3">
        <Heading size="lg">{title}</Heading>
        <Button onPress={onAdd} action="primary" size="sm" variant="solid" className="rounded">
          <ButtonIcon as={AddIcon} size="md" />
        </Button>
      </HStack>
      {records.map((record) => (
        <Box key={record.id} className="py-2 px-3 bg-background-50 rounded-lg mb-2">
          <HStack className="justify-between items-center">
            <VStack>
              <Text className="text-base font-semibold">{record.name}</Text>
              <Text className="text-sm opacity-60">
                {formatDateRange(record.startDate, record.endDate)}
              </Text>
            </VStack>
            <Button
              onPress={() => onDelete(record.id)}
              action="negative"
              size="sm"
              variant="link"
              className="p-2"
            >
              <ButtonIcon as={TrashIcon} size="lg" />
            </Button>
          </HStack>
        </Box>
      ))}
      {records.length === 0 && (
        <Text className="text-sm opacity-50 text-center py-2">まだ登録がありません</Text>
      )}
    </Box>
  );
}
