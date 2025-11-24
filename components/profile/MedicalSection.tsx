import { Pencil } from 'lucide-react-native';

import { Text } from '@/components/Themed';
import { Box } from '@/components/ui/box';
import { Button, ButtonIcon } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { AddIcon, Icon, TrashIcon } from '@/components/ui/icon';
import { Spinner } from '@/components/ui/spinner';
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
  onAdd?: () => void;
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
  loading?: boolean;
  readonly?: boolean;
}

const formatYearMonth = (dateStr: string | null): string => {
  if (!dateStr) return '現在';
  const [year, month] = dateStr.split('-');
  return `${year}年${parseInt(month)}月`;
};

const formatDateRange = (startDate: string | null, endDate: string | null): string => {
  if (!startDate) return '年月指定なし';
  const start = formatYearMonth(startDate);
  const end = formatYearMonth(endDate);
  return `${start} 〜 ${end}`;
};

export default function MedicalSection({
  title,
  records,
  onAdd,
  onDelete,
  onEdit,
  loading = false,
  readonly = false,
}: MedicalSectionProps) {
  const renderContent = () => {
    // ローディング中はスピナーを表示
    if (loading) {
      return (
        <Box className="py-4 items-center">
          <Spinner size="small" />
        </Box>
      );
    }

    // ローディング完了後、データがない場合はメッセージを表示
    if (records.length === 0) {
      return (
        <Text className="text-sm opacity-50 text-center py-2">まだ登録がありません</Text>
      );
    }

    // データがある場合は一覧を表示
    return records.map((record) => (
      <Box key={record.id} className="py-2 px-3 bg-background-50 rounded-lg mb-2">
        <HStack className="justify-between items-center">
          <VStack className="flex-1">
            <Text className="text-base font-semibold">{record.name}</Text>
            <HStack space="xs" className="items-center">
              <Text className="text-sm opacity-60">
                {formatDateRange(record.startDate, record.endDate)}
              </Text>
              {!readonly && onEdit && (
                <Button
                  onPress={() => onEdit(record.id)}
                  size="xs"
                  variant="link"
                  className="p-1"
                >
                  <Icon as={Pencil} size="xs" className="text-typography-500" />
                </Button>
              )}
            </HStack>
          </VStack>
          {!readonly && onDelete && (
            <Button
              onPress={() => onDelete(record.id)}
              action="negative"
              size="sm"
              variant="link"
              className="p-2"
            >
              <ButtonIcon as={TrashIcon} size="lg" />
            </Button>
          )}
        </HStack>
      </Box>
    ));
  };

  return (
    <Box className="px-5 py-4 border-t border-outline-200">
      <HStack className="justify-between items-center mb-3">
        <Heading size="lg">{title}</Heading>
        {!readonly && onAdd && (
          <Button onPress={onAdd} action="primary" size="xs" variant="outline" className="rounded">
            <ButtonIcon as={AddIcon} size="sm" />
          </Button>
        )}
      </HStack>
      {renderContent()}
    </Box>
  );
}
