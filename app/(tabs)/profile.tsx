import FontAwesome from '@expo/vector-icons/FontAwesome';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Modal, Platform, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';

import { Text, View } from '@/components/Themed';
import { supabase } from '@/src/lib/supabase';

interface UserProfile {
  avatarUrl: string | null;
  userName: string | null;
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

  // 日付選択用のstate
  const [selectedDiagnosisId, setSelectedDiagnosisId] = useState<string | null>(null);
  const [showDateModal, setShowDateModal] = useState(false);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

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
    setStartDate(new Date());
    setEndDate(null);
    setShowDateModal(true);
  };

  const saveDiagnosisWithDate = async () => {
    try {
      if (!selectedDiagnosisId) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from('user_diagnoses').insert({
        user_id: user.id,
        diagnosis_id: selectedDiagnosisId,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate ? endDate.toISOString().split('T')[0] : null,
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
        .select('ingredients(name), products(name), start_date, end_date')
        .eq('user_id', user.id);

      // 治療を取得
      const { data: treatmentsData } = await supabase
        .from('user_treatments')
        .select('treatments(name), start_date, end_date')
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
        setMedications(medicationsData.map((m: MedicationData) => ({
          name: m.products?.name || m.ingredients?.name || '',
          startDate: m.start_date,
          endDate: m.end_date,
        })));
      }

      if (treatmentsData) {
        setTreatments(treatmentsData.map((t: TreatmentData) => ({
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
        userName: userData?.display_name || user.user_metadata?.user_name || user.user_metadata?.full_name || null,
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

  const formatDate = (date: Date): string => {
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  };

  const formatDateRange = (startDate: string | null, endDate: string | null): string => {
    if (!startDate) return '期間未設定';
    const start = startDate;
    const end = endDate || '現在';
    return `${start} 〜 ${end}`;
  };

  const renderMedicalSection = (
    title: string,
    records: MedicalRecord[],
    onAdd: () => void,
    onDelete: (id: string) => void
  ) => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <TouchableOpacity onPress={onAdd} style={styles.addButton}>
          <FontAwesome name="plus" size={20} color="#45a393" />
        </TouchableOpacity>
      </View>
      {records.map((record) => (
        <View key={record.id} style={styles.recordItem}>
          <View style={styles.recordContent}>
            <View>
              <Text style={styles.recordName}>{record.name}</Text>
              <Text style={styles.recordDate}>
                {formatDateRange(record.startDate, record.endDate)}
              </Text>
            </View>
            <TouchableOpacity onPress={() => onDelete(record.id)} style={styles.deleteButton}>
              <FontAwesome name="trash-o" size={18} color="#f08080" />
            </TouchableOpacity>
          </View>
        </View>
      ))}
      {records.length === 0 && (
        <Text style={styles.emptyText}>まだ登録がありません</Text>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>ログインしていません</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scrollView}>
      <View style={styles.profileHeader}>
        {profile.avatarUrl && (
          <Image
            source={{ uri: profile.avatarUrl }}
            style={styles.avatar}
          />
        )}
        {profile.userName && (
          <Text style={styles.userName}>{profile.userName}</Text>
        )}
        {profile.createdAt && (
          <Text style={styles.createdAt}>
            登録日時: {new Date(profile.createdAt).toLocaleDateString('ja-JP')}
          </Text>
        )}
      </View>

      {renderMedicalSection('診断名', diagnoses, () => setShowDiagnosisModal(true), deleteDiagnosis)}
      {renderMedicalSection('服薬', medications, () => setShowMedicationModal(true), () => {})}
      {renderMedicalSection('治療', treatments, () => setShowTreatmentModal(true), () => {})}

      {/* 診断名追加モーダル */}
      <Modal visible={showDiagnosisModal} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>診断名を選択</Text>
            <FlatList
              data={diagnosisMasters.filter(
                (master) => !diagnoses.some((d) => d.name === master.name)
              )}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => selectDiagnosisForDate(item.id)}
                >
                  <Text style={styles.modalItemText}>{item.name}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyText}>追加可能な診断名がありません</Text>
              }
            />
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowDiagnosisModal(false)}
            >
              <Text style={styles.modalCloseText}>キャンセル</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 日付選択モーダル */}
      <Modal visible={showDateModal} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>期間を選択</Text>

            <View style={styles.dateInputSection}>
              <Text style={styles.dateLabel}>開始日</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => {
                  setShowStartPicker(true);
                  setShowEndPicker(false);
                }}
              >
                <Text style={styles.dateButtonText}>
                  {formatDate(startDate)}
                </Text>
                <FontAwesome name="calendar" size={20} color="#45a393" />
              </TouchableOpacity>
            </View>

            <View style={styles.dateInputSection}>
              <Text style={styles.dateLabel}>終了日（任意）</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => {
                  setShowEndPicker(true);
                  setShowStartPicker(false);
                }}
              >
                <Text style={styles.dateButtonText}>
                  {endDate ? formatDate(endDate) : '未設定'}
                </Text>
                <FontAwesome name="calendar" size={20} color="#45a393" />
              </TouchableOpacity>
              {endDate && (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={() => setEndDate(null)}
                >
                  <Text style={styles.clearButtonText}>クリア</Text>
                </TouchableOpacity>
              )}
            </View>

            {showStartPicker && (
              <DateTimePicker
                value={startDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, date) => {
                  if (Platform.OS === 'android') {
                    setShowStartPicker(false);
                  }
                  if (date) setStartDate(date);
                }}
              />
            )}

            {showEndPicker && (
              <DateTimePicker
                value={endDate || new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minimumDate={startDate}
                onChange={(event, date) => {
                  if (Platform.OS === 'android') {
                    setShowEndPicker(false);
                  }
                  if (date) setEndDate(date);
                }}
              />
            )}

            {Platform.OS === 'ios' && (showStartPicker || showEndPicker) && (
              <TouchableOpacity
                style={styles.datePickerDoneButton}
                onPress={() => {
                  setShowStartPicker(false);
                  setShowEndPicker(false);
                }}
              >
                <Text style={styles.datePickerDoneText}>完了</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.saveButton}
              onPress={saveDiagnosisWithDate}
            >
              <Text style={styles.saveButtonText}>保存</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => {
                setShowDateModal(false);
                setSelectedDiagnosisId(null);
              }}
            >
              <Text style={styles.modalCloseText}>キャンセル</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>ログアウト</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  scrollView: {
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  createdAt: {
    fontSize: 14,
    opacity: 0.7,
  },
  message: {
    fontSize: 16,
    opacity: 0.7,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#d0e8e3',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  addButton: {
    padding: 4,
  },
  emptyText: {
    fontSize: 14,
    opacity: 0.5,
    textAlign: 'center',
    paddingVertical: 8,
  },
  recordItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#e8f5f2',
    borderRadius: 8,
    marginBottom: 8,
  },
  recordContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recordName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  recordDate: {
    fontSize: 14,
    opacity: 0.6,
  },
  deleteButton: {
    padding: 8,
  },
  logoutButton: {
    backgroundColor: '#f08080',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 16,
    marginHorizontal: 20,
    marginBottom: 32,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  modalItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#d0e8e3',
  },
  modalItemText: {
    fontSize: 16,
  },
  modalCloseButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#d0e8e3',
    backgroundColor: '#e8f5f2',
  },
  modalCloseText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#f08080',
    fontWeight: '600',
  },
  dateInputSection: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  dateLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#2d6b5f',
  },
  dateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#e8f5f2',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d0e8e3',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#2d6b5f',
  },
  clearButton: {
    marginTop: 8,
    alignSelf: 'flex-end',
  },
  clearButtonText: {
    fontSize: 14,
    color: '#f08080',
  },
  saveButton: {
    backgroundColor: '#45a393',
    paddingVertical: 16,
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  datePickerDoneButton: {
    backgroundColor: '#45a393',
    paddingVertical: 12,
    marginHorizontal: 20,
    marginTop: 8,
    borderRadius: 8,
  },
  datePickerDoneText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
