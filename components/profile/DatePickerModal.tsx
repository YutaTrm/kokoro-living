import { useState } from 'react';
import { Alert, Pressable, ScrollView } from 'react-native';

import { Text } from '@/components/Themed';
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
                <Box className="flex-1 border border-outline-200 rounded-lg">
                  <ScrollView className="max-h-40">
                    {years.map((year) => (
                      <Pressable
                        key={year}
                        onPress={() => setStartYear(year)}
                        className={`p-3 border-b border-outline-100 ${startYear === year ? 'bg-secondary-300' : ''}`}
                      >
                        <Text
                          className={`text-center ${startYear === year ? 'font-semibold text-primary-600' : ''}`}
                        >
                          {year}年
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </Box>
                <Box className="flex-1 border border-outline-200 rounded-lg">
                  <ScrollView className="max-h-40">
                    {months.map((month) => (
                      <Pressable
                        key={month}
                        onPress={() => setStartMonth(month)}
                        className={`p-3 border-b border-outline-100 ${startMonth === month ? 'bg-secondary-300' : ''}`}
                      >
                        <Text
                          className={`text-center ${startMonth === month ? 'font-semibold text-primary-600' : ''}`}
                        >
                          {month}月
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
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
                <Box className="flex-1 border border-outline-200 rounded-lg">
                  <ScrollView className="max-h-40">
                    <Pressable
                      onPress={() => setEndYear('')}
                      className={`p-3 border-b border-outline-100 ${endYear === '' ? 'bg-secondary-300' : ''}`}
                    >
                      <Text
                        className={`text-center ${endYear === '' ? 'font-semibold text-primary-600' : ''}`}
                      >
                        未設定
                      </Text>
                    </Pressable>
                    {years.map((year) => (
                      <Pressable
                        key={year}
                        onPress={() => setEndYear(year)}
                        className={`p-3 border-b border-outline-100 ${endYear === year ? 'bg-secondary-300' : ''}`}
                      >
                        <Text
                          className={`text-center ${endYear === year ? 'font-semibold text-primary-600' : ''}`}
                        >
                          {year}年
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </Box>
                <Box className="flex-1 border border-outline-200 rounded-lg">
                  <ScrollView className="max-h-40">
                    <Pressable
                      onPress={() => setEndMonth('')}
                      className={`p-3 border-b border-outline-100 ${endMonth === '' ? 'bg-secondary-300' : ''}`}
                    >
                      <Text
                        className={`text-center ${endMonth === '' ? 'font-semibold text-primary-600' : ''}`}
                      >
                        未設定
                      </Text>
                    </Pressable>
                    {months.map((month) => (
                      <Pressable
                        key={month}
                        onPress={() => setEndMonth(month)}
                        className={`p-3 border-b border-outline-100 ${endMonth === month ? 'bg-secondary-300' : ''}`}
                      >
                        <Text
                          className={`text-center ${endMonth === month ? 'font-semibold text-primary-600' : ''}`}
                        >
                          {month}月
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
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
