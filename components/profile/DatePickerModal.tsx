import { useState } from 'react';
import { Alert } from 'react-native';

import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { CloseIcon, Icon } from '@/components/ui/icon';
import {
  Modal,
  ModalBackdrop,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from '@/components/ui/modal';
import {
  Select,
  SelectTrigger,
  SelectInput,
  SelectIcon,
  SelectPortal,
  SelectBackdrop,
  SelectContent,
  SelectDragIndicator,
  SelectDragIndicatorWrapper,
  SelectItem,
  SelectScrollView,
} from '@/components/ui/select';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';

interface DatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (startDate: string, endDate: string | null) => void;
  initialStartYear?: string;
  initialStartMonth?: string;
  initialEndYear?: string;
  initialEndMonth?: string;
}

export default function DatePickerModal({
  isOpen,
  onClose,
  onSave,
  initialStartYear,
  initialStartMonth,
  initialEndYear,
  initialEndMonth,
}: DatePickerModalProps) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 80 }, (_, i) => (currentYear - i).toString());
  const months = Array.from({ length: 12 }, (_, i) => (i + 1).toString());

  const [startYear, setStartYear] = useState(initialStartYear || currentYear.toString());
  const [startMonth, setStartMonth] = useState(initialStartMonth || '1');
  const [endYear, setEndYear] = useState(initialEndYear || '');
  const [endMonth, setEndMonth] = useState(initialEndMonth || '');

  const handleSave = () => {
    const startDate = `${startYear}-${startMonth.padStart(2, '0')}-01`;
    const endDate = endYear && endMonth ? `${endYear}-${endMonth.padStart(2, '0')}-01` : null;

    // バリデーション: 終了日が開始日より前でないかチェック
    if (endDate && endDate < startDate) {
      Alert.alert('エラー', '終了日は開始日以降を選択してください');
      return;
    }

    onSave(startDate, endDate);
    onClose();
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <ModalBackdrop />
      <ModalContent className="max-h-[65%]">
        <ModalHeader>
          <Heading size="lg">期間を選択</Heading>
          <ModalCloseButton>
            <Icon as={CloseIcon} size="md" />
          </ModalCloseButton>
        </ModalHeader>
        <ModalBody>
          <VStack space="lg" className="py-4">
            {/* 開始日 */}
            <Box>
              <Text className="text-base font-semibold mb-2 text-primary-600">開始年月</Text>
              <HStack space="sm">
                <Box className="flex-1">
                  <Select selectedValue={startYear} onValueChange={(value) => setStartYear(value)}>
                    <SelectTrigger>
                      <SelectInput placeholder="年" value={`${startYear}年`} />
                      <SelectIcon />
                    </SelectTrigger>
                    <SelectPortal>
                      <SelectBackdrop />
                      <SelectContent className="max-h-96">
                        <SelectDragIndicatorWrapper>
                          <SelectDragIndicator />
                        </SelectDragIndicatorWrapper>
                        <SelectScrollView>
                          {years.map((year) => (
                            <SelectItem key={year} label={`${year}年`} value={year} />
                          ))}
                        </SelectScrollView>
                      </SelectContent>
                    </SelectPortal>
                  </Select>
                </Box>
                <Box className="flex-1">
                  <Select selectedValue={startMonth} onValueChange={(value) => setStartMonth(value)}>
                    <SelectTrigger>
                      <SelectInput placeholder="月" value={`${startMonth}月`} />
                      <SelectIcon />
                    </SelectTrigger>
                    <SelectPortal>
                      <SelectBackdrop />
                      <SelectContent className="max-h-96">
                        <SelectDragIndicatorWrapper>
                          <SelectDragIndicator />
                        </SelectDragIndicatorWrapper>
                        <SelectScrollView>
                          {months.map((month) => (
                            <SelectItem key={month} label={`${month}月`} value={month} />
                          ))}
                        </SelectScrollView>
                      </SelectContent>
                    </SelectPortal>
                  </Select>
                </Box>
              </HStack>
            </Box>

            {/* 終了日 */}
            <Box>
              <HStack className="justify-between items-center mb-2">
                <Text className="text-base font-semibold text-primary-600">終了年月（任意）</Text>
                {endYear && endMonth && (
                  <Button
                    size="xs"
                    variant="link"
                    onPress={() => {
                      setEndYear('');
                      setEndMonth('');
                    }}
                  >
                    <ButtonText className="text-error-500">クリア</ButtonText>
                  </Button>
                )}
              </HStack>
              <HStack space="sm">
                <Box className="flex-1">
                  <Select selectedValue={endYear} onValueChange={(value) => setEndYear(value)}>
                    <SelectTrigger>
                      <SelectInput placeholder="年" value={endYear ? `${endYear}年` : '未設定'} />
                      <SelectIcon />
                    </SelectTrigger>
                    <SelectPortal>
                      <SelectBackdrop />
                      <SelectContent className="max-h-96">
                        <SelectDragIndicatorWrapper>
                          <SelectDragIndicator />
                        </SelectDragIndicatorWrapper>
                        <SelectScrollView>
                          <SelectItem label="未設定" value="" />
                          {years.map((year) => (
                            <SelectItem key={year} label={`${year}年`} value={year} />
                          ))}
                        </SelectScrollView>
                      </SelectContent>
                    </SelectPortal>
                  </Select>
                </Box>
                <Box className="flex-1">
                  <Select selectedValue={endMonth} onValueChange={(value) => setEndMonth(value)}>
                    <SelectTrigger>
                      <SelectInput placeholder="月" value={endMonth ? `${endMonth}月` : '未設定'} />
                      <SelectIcon />
                    </SelectTrigger>
                    <SelectPortal>
                      <SelectBackdrop />
                      <SelectContent className="max-h-96">
                        <SelectDragIndicatorWrapper>
                          <SelectDragIndicator />
                        </SelectDragIndicatorWrapper>
                        <SelectScrollView>
                          <SelectItem label="未設定" value="" />
                          {months.map((month) => (
                            <SelectItem key={month} label={`${month}月`} value={month} />
                          ))}
                        </SelectScrollView>
                      </SelectContent>
                    </SelectPortal>
                  </Select>
                </Box>
              </HStack>
            </Box>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <VStack space="sm" className="w-full">
            <Button onPress={handleSave} className="w-full">
              <ButtonText>保存</ButtonText>
            </Button>
            <Button variant="outline" onPress={handleClose} className="w-full">
              <ButtonText>キャンセル</ButtonText>
            </Button>
          </VStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
