import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, useColorScheme } from 'react-native';
import { Picker } from '@react-native-picker/picker';

// テーマカラー定義
const themeColors = {
  light: {
    primary: '#45a393',
    error: '#f08080',
  },
  dark: {
    primary: '#5ec4b0',
    error: '#ff9999',
  },
};

import { Text } from '@/components/Themed';
import {
  Avatar,
  AvatarFallbackText,
  AvatarImage,
} from '@/components/ui/avatar';
import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { Modal, ModalBackdrop, ModalBody, ModalCloseButton, ModalContent, ModalFooter, ModalHeader } from '@/components/ui/modal';
import { VStack } from '@/components/ui/vstack';
import { supabase } from '@/src/lib/supabase';

interface UserProfile {
  avatarUrl: string | null;
  userName: string | null;
  accountName: string | null;
  createdAt: string | null;
}

interface MedicalRecord {
  id: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
}

interface DiagnosisData {
  diagnoses: { name: string } | null;
  start_date: string;
  end_date: string | null;
}

interface MedicationData {
  ingredients: { name: string } | null;
  products: { name: string } | null;
  start_date: string;
  end_date: string | null;
}

interface TreatmentData {
  treatments: { name: string } | null;
  start_date: string;
  end_date: string | null;
}

interface MasterData {
  id: string;
  name: string;
}

export default function ProfileScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = themeColors[colorScheme === 'dark' ? 'dark' : 'light'];
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const [diagnoses, setDiagnoses] = useState<MedicalRecord[]>([]);
  const [medications, setMedications] = useState<MedicalRecord[]>([]);
  const [treatments, setTreatments] = useState<MedicalRecord[]>([]);

  const [showDiagnosisModal, setShowDiagnosisModal] = useState(false);
  const [showMedicationModal, setShowMedicationModal] = useState(false);
  const [showTreatmentModal, setShowTreatmentModal] = useState(false);

  const [diagnosisMasters, setDiagnosisMasters] = useState<MasterData[]>([]);
  const [medicationMasters, setMedicationMasters] = useState<MasterData[]>([]);
  const [treatmentMasters, setTreatmentMasters] = useState<MasterData[]>([]);

  // 日付選択用のstate（年月選択）
  const [selectedDiagnosisId, setSelectedDiagnosisId] = useState<string | null>(null);
  const [showDateModal, setShowDateModal] = useState(false);
  const [startYear, setStartYear] = useState<string>(new Date().getFullYear().toString());
  const [startMonth, setStartMonth] = useState<string>((new Date().getMonth() + 1).toString());
  const [endYear, setEndYear] = useState<string>('');
  const [endMonth, setEndMonth] = useState<string>('');

  // 年と月の選択肢を生成（過去80年分）
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 80 }, (_, i) => (currentYear - i).toString());
  const months = Array.from({ length: 12 }, (_, i) => (i + 1).toString());

  useEffect(() => {
    loadUserProfile();
    loadMedicalRecords();
    loadMasterData();
  }, []);

  const loadMasterData = async () => {
    try {
      // 診断名マスター
      const { data: diagData } = await supabase.from('diagnoses').select('id, name');
      if (diagData) setDiagnosisMasters(diagData);

      // 有効成分と製品マスター
      const { data: ingData } = await supabase.from('ingredients').select('id, name');
      const { data: prodData } = await supabase.from('products').select('id, name');
      const combined = [...(ingData || []), ...(prodData || [])];
      setMedicationMasters(combined);

      // 治療法マスター
      const { data: treatData } = await supabase.from('treatments').select('id, name');
      if (treatData) setTreatmentMasters(treatData);
    } catch (error) {
      console.error('マスターデータ読み込みエラー:', error);
    }
  };

  const selectDiagnosisForDate = (diagnosisId: string) => {
    setSelectedDiagnosisId(diagnosisId);
    setShowDiagnosisModal(false);
    // リセット
    const now = new Date();
    setStartYear(now.getFullYear().toString());
    setStartMonth((now.getMonth() + 1).toString());
    setEndYear('');
    setEndMonth('');
    setShowDateModal(true);
  };

  const saveDiagnosisWithDate = async () => {
    try {
      if (!selectedDiagnosisId) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // YYYY-MM-01形式で保存
      const startDate = `${startYear}-${startMonth.padStart(2, '0')}-01`;
      const endDate = endYear && endMonth ? `${endYear}-${endMonth.padStart(2, '0')}-01` : null;

      // バリデーション: 終了日が開始日より前でないかチェック
      if (endDate && endDate < startDate) {
        Alert.alert('エラー', '終了日は開始日以降を選択してください');
        return;
      }

      const { error } = await supabase.from('user_diagnoses').insert({
        user_id: user.id,
        diagnosis_id: selectedDiagnosisId,
        start_date: startDate,
        end_date: endDate,
      });

      if (error) {
        Alert.alert('エラー', '追加に失敗しました');
        return;
      }

      setShowDateModal(false);
      setSelectedDiagnosisId(null);
      loadMedicalRecords();
    } catch (error) {
      Alert.alert('エラー', '予期しないエラーが発生しました');
    }
  };

  const deleteDiagnosis = async (id: string) => {
    try {
      const { error } = await supabase
        .from('user_diagnoses')
        .delete()
        .eq('id', id);

      if (error) {
        Alert.alert('エラー', '削除に失敗しました');
        return;
      }

      loadMedicalRecords();
    } catch (error) {
      Alert.alert('エラー', '予期しないエラーが発生しました');
    }
  };

  const loadMedicalRecords = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 診断名を取得
      const { data: diagnosesData } = await supabase
        .from('user_diagnoses')
        .select('id, diagnoses(name), start_date, end_date')
        .eq('user_id', user.id);

      // 服薬を取得
      const { data: medicationsData } = await supabase
        .from('user_medications')
        .select('id, ingredients(name), products(name), start_date, end_date')
        .eq('user_id', user.id);

      // 治療を取得
      const { data: treatmentsData } = await supabase
        .from('user_treatments')
        .select('id, treatments(name), start_date, end_date')
        .eq('user_id', user.id);

      if (diagnosesData) {
        setDiagnoses(diagnosesData.map((d: DiagnosisData & { id: string }) => ({
          id: d.id,
          name: d.diagnoses?.name || '',
          startDate: d.start_date,
          endDate: d.end_date,
        })));
      }

      if (medicationsData) {
        setMedications(medicationsData.map((m: MedicationData & { id: string }) => ({
          id: m.id,
          name: m.products?.name || m.ingredients?.name || '',
          startDate: m.start_date,
          endDate: m.end_date,
        })));
      }

      if (treatmentsData) {
        setTreatments(treatmentsData.map((t: TreatmentData & { id: string }) => ({
          id: t.id,
          name: t.treatments?.name || '',
          startDate: t.start_date,
          endDate: t.end_date,
        })));
      }
    } catch (error) {
      console.error('医療情報読み込みエラー:', error);
    }
  };

  const loadUserProfile = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        setLoading(false);
        return;
      }

      // usersテーブルからプロフィール情報を取得
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('display_name, created_at')
        .eq('user_id', user.id)
        .single();

      if (userError) {
        console.error('ユーザー情報取得エラー:', userError);
      }

      const userProfile: UserProfile = {
        avatarUrl: user.user_metadata?.avatar_url || null,
        userName: user.user_metadata?.name || userData?.display_name || null,
        accountName: user.user_metadata?.user_name || null,
        createdAt: userData?.created_at || user.created_at || null,
      };

      setProfile(userProfile);
    } catch (error) {
      console.error('プロフィール読み込みエラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        Alert.alert('エラー', 'ログアウトに失敗しました');
        return;
      }
      setProfile(null);
      // ホームタブにリダイレクト
      router.push('/(tabs)');
    } catch (error) {
      Alert.alert('エラー', '予期しないエラーが発生しました');
    }
  };

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

  const renderMedicalSection = (
    title: string,
    records: MedicalRecord[],
    onAdd: () => void,
    onDelete: (id: string) => void
  ) => (
    <Box className="px-5 py-4 border-t border-outline-200">
      <HStack className="justify-between items-center mb-3">
        <Heading size="lg">{title}</Heading>
        <Button onPress={onAdd} size="sm" variant="link" className="p-1">
          <FontAwesome name="plus" size={20} color={colors.primary} />
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
            <Button onPress={() => onDelete(record.id)} size="sm" variant="link" className="p-2">
              <FontAwesome name="trash-o" size={18} color={colors.error} />
            </Button>
          </HStack>
        </Box>
      ))}
      {records.length === 0 && (
        <Text className="text-sm opacity-50 text-center py-2">まだ登録がありません</Text>
      )}
    </Box>
  );

  if (loading) {
    return (
      <Box className="flex-1 items-center justify-center p-5">
        <ActivityIndicator size="large" />
      </Box>
    );
  }

  if (!profile) {
    return (
      <Box className="flex-1 items-center justify-center p-5">
        <Text className="text-base opacity-70">ログインしていません</Text>
      </Box>
    );
  }

  return (
    <ScrollView className="flex-1 mt-12">
      <HStack className="py-6 px-5" space="md">
        {profile.avatarUrl && (
          <Avatar size="xl">
            <AvatarFallbackText>{profile.userName || 'User'}</AvatarFallbackText>
            <AvatarImage source={{ uri: profile.avatarUrl }} />
          </Avatar>
        )}
        <VStack className="flex-1 justify-center" space="xs">
          {profile.userName && (
            <Heading size="xl">{profile.userName}</Heading>
          )}
          {profile.accountName && (
            <Text className="text-sm opacity-60">@{profile.accountName}</Text>
          )}
          {profile.createdAt && (
            <Text className="text-xs opacity-50">
              登録日時: {new Date(profile.createdAt).toLocaleDateString('ja-JP')}
            </Text>
          )}
        </VStack>
      </HStack>

      <Box className="px-5 mb-8">
        <Button onPress={handleLogout} action="negative" className="w-full">
          <ButtonText>ログアウト</ButtonText>
        </Button>
      </Box>

      {renderMedicalSection('診断名', diagnoses, () => setShowDiagnosisModal(true), deleteDiagnosis)}
      {renderMedicalSection('服薬', medications, () => setShowMedicationModal(true), () => {})}
      {renderMedicalSection('治療', treatments, () => setShowTreatmentModal(true), () => {})}

      {/* 診断名追加モーダル */}
      <Modal isOpen={showDiagnosisModal} onClose={() => setShowDiagnosisModal(false)}>
        <ModalBackdrop />
        <ModalContent className="max-h-[80%]">
          <ModalHeader>
            <Heading size="lg">診断名を選択</Heading>
            <ModalCloseButton>
              <FontAwesome name="close" size={20} />
            </ModalCloseButton>
          </ModalHeader>
          <ModalBody>
            <VStack space="sm">
              {diagnosisMasters
                .filter((master) => !diagnoses.some((d) => d.name === master.name))
                .map((item) => (
                  <Button
                    key={item.id}
                    onPress={() => selectDiagnosisForDate(item.id)}
                    variant="outline"
                  >
                    <ButtonText>{item.name}</ButtonText>
                  </Button>
                ))}
              {diagnosisMasters.filter(
                (master) => !diagnoses.some((d) => d.name === master.name)
              ).length === 0 && (
                <Text className="text-sm opacity-50 text-center py-2">追加可能な診断名がありません</Text>
              )}
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* 日付選択モーダル（年月選択） */}
      <Modal isOpen={showDateModal} onClose={() => setShowDateModal(false)}>
        <ModalBackdrop />
        <ModalContent>
          <ModalHeader>
            <Heading size="lg">期間を選択</Heading>
            <ModalCloseButton>
              <FontAwesome name="close" size={20} />
            </ModalCloseButton>
          </ModalHeader>
          <ModalBody>
            <VStack space="lg" className="py-4">
              {/* 開始日 */}
              <Box>
                <Text className="text-base font-semibold mb-2 text-primary-600">開始年月</Text>
                <HStack space="sm">
                  <Box className="flex-1 border border-outline-200 rounded-lg overflow-hidden">
                    <Picker
                      selectedValue={startYear}
                      onValueChange={(value) => setStartYear(value)}
                    >
                      {years.map((year) => (
                        <Picker.Item key={year} label={`${year}年`} value={year} />
                      ))}
                    </Picker>
                  </Box>
                  <Box className="flex-1 border border-outline-200 rounded-lg overflow-hidden">
                    <Picker
                      selectedValue={startMonth}
                      onValueChange={(value) => setStartMonth(value)}
                    >
                      {months.map((month) => (
                        <Picker.Item key={month} label={`${month}月`} value={month} />
                      ))}
                    </Picker>
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
                  <Box className="flex-1 border border-outline-200 rounded-lg overflow-hidden">
                    <Picker
                      selectedValue={endYear}
                      onValueChange={(value) => setEndYear(value)}
                    >
                      <Picker.Item label="未設定" value="" />
                      {years.map((year) => (
                        <Picker.Item key={year} label={`${year}年`} value={year} />
                      ))}
                    </Picker>
                  </Box>
                  <Box className="flex-1 border border-outline-200 rounded-lg overflow-hidden">
                    <Picker
                      selectedValue={endMonth}
                      onValueChange={(value) => setEndMonth(value)}
                    >
                      <Picker.Item label="未設定" value="" />
                      {months.map((month) => (
                        <Picker.Item key={month} label={`${month}月`} value={month} />
                      ))}
                    </Picker>
                  </Box>
                </HStack>
              </Box>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <VStack space="sm" className="w-full">
              <Button onPress={saveDiagnosisWithDate} className="w-full">
                <ButtonText>保存</ButtonText>
              </Button>
              <Button
                variant="outline"
                onPress={() => {
                  setShowDateModal(false);
                  setSelectedDiagnosisId(null);
                }}
                className="w-full"
              >
                <ButtonText>キャンセル</ButtonText>
              </Button>
            </VStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </ScrollView>
  );
}
