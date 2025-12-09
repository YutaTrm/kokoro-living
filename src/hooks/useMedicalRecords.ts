import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';

import { useMasterData } from '@/src/contexts/MasterDataContext';
import { useMedicationMasters } from '@/src/hooks/useMedicationMasters';
import { supabase } from '@/src/lib/supabase';
import { MasterData, MedicalRecord } from '@/src/types/profile';
import { showError } from '@/src/utils/errorHandler';
import { sortByStartDate } from '@/src/utils/sortByStartDate';

// キャッシュキー
const CACHE_KEYS = {
  diagnoses: 'cache_diagnoses',
  medications: 'cache_medications',
  treatments: 'cache_treatments',
  statuses: 'cache_statuses',
};

export const useMedicalRecords = (currentUserId: string | null) => {
  const { data: masterData } = useMasterData();
  const { medications: medicationMasters } = useMedicationMasters();

  const [diagnoses, setDiagnoses] = useState<MedicalRecord[]>([]);
  const [medications, setMedications] = useState<MedicalRecord[]>([]);
  const [treatments, setTreatments] = useState<MedicalRecord[]>([]);
  const [statuses, setStatuses] = useState<MedicalRecord[]>([]);

  const [loadingDiagnoses, setLoadingDiagnoses] = useState(true);
  const [loadingMedications, setLoadingMedications] = useState(true);
  const [loadingTreatments, setLoadingTreatments] = useState(true);
  const [loadingStatuses, setLoadingStatuses] = useState(true);

  const [showMultiSelectModal, setShowMultiSelectModal] = useState(false);
  const [selectModalType, setSelectModalType] = useState<'diagnosis' | 'medication' | 'treatment' | 'status'>('diagnosis');

  const [diagnosisMasters, setDiagnosisMasters] = useState<MasterData[]>([]);
  const [treatmentMasters, setTreatmentMasters] = useState<MasterData[]>([]);
  const [statusMasters, setStatusMasters] = useState<MasterData[]>([]);

  // 日付編集用のstate
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editingRecordType, setEditingRecordType] = useState<'diagnosis' | 'medication' | 'treatment' | 'status' | null>(null);
  const [showDateModal, setShowDateModal] = useState(false);
  const [startYear, setStartYear] = useState<string>(new Date().getFullYear().toString());
  const [startMonth, setStartMonth] = useState<string>((new Date().getMonth() + 1).toString());
  const [endYear, setEndYear] = useState<string>('');
  const [endMonth, setEndMonth] = useState<string>('');

  // キャッシュから読み込み
  const loadFromCache = async () => {
    try {
      const [diagCache, medCache, treatCache, statusCache] = await Promise.all([
        AsyncStorage.getItem(CACHE_KEYS.diagnoses),
        AsyncStorage.getItem(CACHE_KEYS.medications),
        AsyncStorage.getItem(CACHE_KEYS.treatments),
        AsyncStorage.getItem(CACHE_KEYS.statuses),
      ]);

      if (diagCache) setDiagnoses(JSON.parse(diagCache));
      if (medCache) setMedications(JSON.parse(medCache));
      if (treatCache) setTreatments(JSON.parse(treatCache));
      if (statusCache) setStatuses(JSON.parse(statusCache));
    } catch (error) {
      console.error('キャッシュ読み込みエラー:', error);
    }
  };

  const loadMasterData = () => {
    try {
      // 診断名マスター（display_flag=falseを除外、display_order順）
      const diagData = masterData.diagnoses
        .filter((d) => d.display_flag !== false)
        .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
      setDiagnosisMasters(diagData.map((d) => ({ id: d.id, name: d.name })));

      // 服薬マスターはuseMedicationMastersフックで取得

      // 治療法マスター（display_flag=falseを除外、display_order順）
      const treatData = masterData.treatments
        .filter((t) => t.display_flag !== false)
        .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
      setTreatmentMasters(treatData.map((t) => ({ id: t.id, name: t.name })));

      // ステータスマスター（display_order > 0のみ、display_order順）
      const statusData = masterData.statuses
        .filter((s) => (s.display_order ?? 0) > 0)
        .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
      setStatusMasters(statusData.map((s) => ({ id: s.id, name: s.name })));
    } catch (error) {
      console.error('マスターデータ読み込みエラー:', error);
    }
  };

  const openMultiSelectModal = (type: 'diagnosis' | 'medication' | 'treatment' | 'status') => {
    setSelectModalType(type);
    setShowMultiSelectModal(true);
  };

  // 服薬の連動選択ハンドラ（同じ成分の薬を全て選択/解除）
  const handleMedicationToggle = (toggledId: string, newSelectedIds: string[]): string[] => {
    const toggledItem = medicationMasters.find(m => m.id === toggledId);
    console.log('handleMedicationToggle:', { toggledId, toggledItem, newSelectedIds });

    if (!toggledItem?.ingredientId) {
      console.log('ingredientId not found');
      return newSelectedIds;
    }

    const isSelected = newSelectedIds.includes(toggledId);
    const sameIngredientIds = medicationMasters
      .filter(m => m.ingredientId === toggledItem.ingredientId)
      .map(m => m.id);

    console.log('sameIngredientIds:', sameIngredientIds);

    if (isSelected) {
      // 選択時: 同じ成分の薬を全て追加
      const combinedIds = [...new Set([...newSelectedIds, ...sameIngredientIds])];
      console.log('combinedIds:', combinedIds);
      return combinedIds;
    } else {
      // 解除時: 同じ成分の薬を全て削除
      return newSelectedIds.filter(id => !sameIngredientIds.includes(id));
    }
  };

  // 既存の選択済みマスターIDを取得（メモ化して参照の安定性を保つ）
  const currentSelectedIds = useMemo(() => {
    switch (selectModalType) {
      case 'diagnosis':
        return diagnosisMasters
          .filter(m => diagnoses.some(d => d.name === m.name))
          .map(m => m.id);
      case 'medication':
        // 服薬は成分名でマッチング（表示名から成分名を抽出）
        return medicationMasters
          .filter(m => medications.some(med => {
            // med.nameは「成分名」または「成分名(製品名1、製品名2)」形式
            const medIngredientName = med.name.split('(')[0];
            // m.ingredientIdを使って成分名を取得
            const masterIngredient = medicationMasters.find(
              master => master.id === `ingredient-${m.ingredientId}`
            );
            const masterIngredientName = masterIngredient?.name || '';
            return medIngredientName === masterIngredientName;
          }))
          .map(m => m.id);
      case 'treatment':
        return treatmentMasters
          .filter(m => treatments.some(t => t.name === m.name))
          .map(m => m.id);
      case 'status':
        return statusMasters
          .filter(m => statuses.some(s => s.name === m.name))
          .map(m => m.id);
      default:
        return [];
    }
  }, [selectModalType, diagnosisMasters, diagnoses, medicationMasters, medications, treatmentMasters, treatments, statusMasters, statuses]);

  // 日付編集モーダルを開く
  const openDateEditModal = (recordId: string, type: 'diagnosis' | 'medication' | 'treatment' | 'status') => {
    let record: MedicalRecord | undefined;
    switch (type) {
      case 'diagnosis':
        record = diagnoses.find(d => d.id === recordId);
        break;
      case 'medication':
        record = medications.find(m => m.id === recordId);
        break;
      case 'treatment':
        record = treatments.find(t => t.id === recordId);
        break;
      case 'status':
        record = statuses.find(s => s.id === recordId);
        break;
    }

    if (record) {
      setEditingRecordId(recordId);
      setEditingRecordType(type);

      if (record.startDate) {
        const [year, month] = record.startDate.split('-');
        setStartYear(year);
        setStartMonth(parseInt(month).toString());
      } else {
        const now = new Date();
        setStartYear(now.getFullYear().toString());
        setStartMonth((now.getMonth() + 1).toString());
      }

      if (record.endDate) {
        const [year, month] = record.endDate.split('-');
        setEndYear(year);
        setEndMonth(parseInt(month).toString());
      } else {
        setEndYear('');
        setEndMonth('');
      }

      setShowDateModal(true);
    }
  };

  // 診断名を取得
  const loadDiagnoses = async (userId?: string) => {
    setLoadingDiagnoses(true);
    try {
      const uid = userId || currentUserId;
      if (!uid) return;

      const { data: diagnosesData } = await supabase
        .from('user_diagnoses')
        .select('id, diagnoses(name), start_date, end_date')
        .eq('user_id', uid);

      if (diagnosesData) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const formatted = diagnosesData.map((d: any) => ({
          id: d.id,
          name: d.diagnoses?.name || '',
          startDate: d.start_date,
          endDate: d.end_date,
        }));
        const sorted = sortByStartDate(formatted);
        setDiagnoses(sorted);
        await AsyncStorage.setItem(CACHE_KEYS.diagnoses, JSON.stringify(sorted));
      }
    } catch (error) {
      console.error('診断名読み込みエラー:', error);
    } finally {
      setLoadingDiagnoses(false);
    }
  };

  // 服薬を取得
  const loadMedications = async (userId?: string) => {
    setLoadingMedications(true);
    try {
      const uid = userId || currentUserId;
      if (!uid) return;

      const { data: medicationsData } = await supabase
        .from('user_medications')
        .select('id, ingredient_id, ingredients(id, name), products(name), start_date, end_date')
        .eq('user_id', uid);

      // productsはマスターデータから取得（DBクエリ削減）
      const allProducts = masterData.products;

      if (medicationsData) {
        const productsByIngredient = new Map<string, string[]>();
        allProducts.forEach((p) => {
          const existing = productsByIngredient.get(p.ingredient_id);
          if (existing) {
            existing.push(p.name);
          } else {
            productsByIngredient.set(p.ingredient_id, [p.name]);
          }
        });

        const ingredientMap = new Map<string, {
          id: string;
          ingredientName: string;
          ingredientId: string;
          startDate: string | null;
          endDate: string | null;
        }>();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        medicationsData.forEach((m: any) => {
          const ingredientId = m.ingredient_id;
          const ingredientName = m.ingredients?.name || '';

          if (ingredientName && ingredientId && !ingredientMap.has(ingredientId)) {
            ingredientMap.set(ingredientId, {
              id: m.id,
              ingredientName,
              ingredientId,
              startDate: m.start_date,
              endDate: m.end_date,
            });
          }
        });

        const formatted: MedicalRecord[] = Array.from(ingredientMap.values()).map(item => {
          const productNames = productsByIngredient.get(item.ingredientId) || [];
          return {
            id: item.id,
            name: productNames.length > 0
              ? `${item.ingredientName}(${productNames.join('、')})`
              : item.ingredientName,
            startDate: item.startDate,
            endDate: item.endDate,
          };
        });

        const sorted = sortByStartDate(formatted);
        setMedications(sorted);
        await AsyncStorage.setItem(CACHE_KEYS.medications, JSON.stringify(sorted));
      }
    } catch (error) {
      console.error('服薬読み込みエラー:', error);
    } finally {
      setLoadingMedications(false);
    }
  };

  // 治療を取得
  const loadTreatments = async (userId?: string) => {
    setLoadingTreatments(true);
    try {
      const uid = userId || currentUserId;
      if (!uid) return;

      const { data: treatmentsData } = await supabase
        .from('user_treatments')
        .select('id, treatments(name), start_date, end_date')
        .eq('user_id', uid);

      if (treatmentsData) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const formatted = treatmentsData.map((t: any) => ({
          id: t.id,
          name: t.treatments?.name || '',
          startDate: t.start_date,
          endDate: t.end_date,
        }));
        const sorted = sortByStartDate(formatted);
        setTreatments(sorted);
        await AsyncStorage.setItem(CACHE_KEYS.treatments, JSON.stringify(sorted));
      }
    } catch (error) {
      console.error('治療読み込みエラー:', error);
    } finally {
      setLoadingTreatments(false);
    }
  };

  // ステータスを取得
  const loadStatuses = async (userId?: string) => {
    setLoadingStatuses(true);
    try {
      const uid = userId || currentUserId;
      if (!uid) return;

      const { data: statusesData } = await supabase
        .from('user_statuses')
        .select('id, statuses(name), start_date, end_date')
        .eq('user_id', uid);

      if (statusesData) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const formatted = statusesData.map((s: any) => ({
          id: s.id,
          name: s.statuses?.name || '',
          startDate: s.start_date,
          endDate: s.end_date,
        }));
        const sorted = sortByStartDate(formatted);
        setStatuses(sorted);
        await AsyncStorage.setItem(CACHE_KEYS.statuses, JSON.stringify(sorted));
      }
    } catch (error) {
      console.error('ステータス読み込みエラー:', error);
    } finally {
      setLoadingStatuses(false);
    }
  };

  // 日付更新用（編集モーダルから呼ばれる）
  const updateRecordDate = async (startDate: string, endDate: string | null) => {
    try {
      if (!editingRecordId || !editingRecordType) return;

      let tableName = '';
      switch (editingRecordType) {
        case 'diagnosis':
          tableName = 'user_diagnoses';
          break;
        case 'medication':
          tableName = 'user_medications';
          break;
        case 'treatment':
          tableName = 'user_treatments';
          break;
        case 'status':
          tableName = 'user_statuses';
          break;
      }

      const { error } = await supabase
        .from(tableName)
        .update({
          start_date: startDate,
          end_date: endDate,
        })
        .eq('id', editingRecordId);

      if (error) {
        showError('更新に失敗しました');
        return;
      }

      setShowDateModal(false);
      const typeToReload = editingRecordType;
      setEditingRecordId(null);
      setEditingRecordType(null);
      // 編集したタイプのみリロード
      switch (typeToReload) {
        case 'diagnosis': loadDiagnoses(); break;
        case 'medication': loadMedications(); break;
        case 'treatment': loadTreatments(); break;
        case 'status': loadStatuses(); break;
      }
    } catch (error) {
      Alert.alert('エラー', '予期しないエラーが発生しました');
    }
  };

  // 複数選択時の一括保存（日付はnull）
  const handleMultiSelectSave = async (selectedIds: string[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 既に選択されているマスターIDを取得
      const existingMasterIds = currentSelectedIds;

      // 新しく追加されたIDのみ抽出
      const newIds = selectedIds.filter(id => !existingMasterIds.includes(id));

      console.log('handleMultiSelectSave:', { selectModalType, selectedIds, existingMasterIds, newIds });

      if (newIds.length === 0) {
        setShowMultiSelectModal(false);
        return;
      }

      if (selectModalType === 'medication') {
        // 服薬の特別処理
        for (const id of newIds) {
          let ingredientId: string;
          let productId: string | null = null;

          if (id.startsWith('ingredient-')) {
            ingredientId = id.replace('ingredient-', '');
          } else if (id.startsWith('product-')) {
            const actualProductId = id.replace('product-', '');
            const { data: productData } = await supabase
              .from('products')
              .select('ingredient_id')
              .eq('id', actualProductId)
              .single();

            if (!productData) continue;
            ingredientId = productData.ingredient_id;
            productId = actualProductId;
          } else {
            continue;
          }

          const { error } = await supabase.from('user_medications').insert({
            user_id: user.id,
            ingredient_id: ingredientId,
            product_id: productId,
            start_date: null,
            end_date: null,
          });

          if (error) {
            console.error('服薬保存エラー:', error);
          }
        }
      } else {
        let tableName = '';
        let idColumn = '';

        switch (selectModalType) {
          case 'diagnosis':
            tableName = 'user_diagnoses';
            idColumn = 'diagnosis_id';
            break;
          case 'treatment':
            tableName = 'user_treatments';
            idColumn = 'treatment_id';
            break;
          case 'status':
            tableName = 'user_statuses';
            idColumn = 'status_id';
            break;
        }

        for (const id of newIds) {
          const { error } = await supabase.from(tableName).insert({
            user_id: user.id,
            [idColumn]: id,
            start_date: null,
            end_date: null,
          });

          if (error) {
            console.error(`${tableName}保存エラー:`, error);
          }
        }
      }

      setShowMultiSelectModal(false);
      // 追加したタイプのみリロード
      switch (selectModalType) {
        case 'diagnosis': loadDiagnoses(); break;
        case 'medication': loadMedications(); break;
        case 'treatment': loadTreatments(); break;
        case 'status': loadStatuses(); break;
      }
    } catch (error) {
      console.error('保存エラー:', error);
      Alert.alert('エラー', '保存に失敗しました');
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

      loadDiagnoses();
    } catch (error) {
      Alert.alert('エラー', '予期しないエラーが発生しました');
    }
  };


  const deleteStatus = async (id: string) => {
    try {
      const { error } = await supabase
        .from('user_statuses')
        .delete()
        .eq('id', id);

      if (error) {
        Alert.alert('エラー', '削除に失敗しました');
        return;
      }

      loadStatuses();
    } catch (error) {
      Alert.alert('エラー', '予期しないエラーが発生しました');
    }
  };


  const deleteTreatment = async (id: string) => {
    try {
      const { error } = await supabase
        .from('user_treatments')
        .delete()
        .eq('id', id);

      if (error) {
        Alert.alert('エラー', '削除に失敗しました');
        return;
      }

      loadTreatments();
    } catch (error) {
      Alert.alert('エラー', '予期しないエラーが発生しました');
    }
  };


  const deleteMedication = async (id: string) => {
    try {
      // まず削除対象のレコードからingredient_idを取得
      const { data: targetRecord } = await supabase
        .from('user_medications')
        .select('ingredient_id')
        .eq('id', id)
        .single();

      if (!targetRecord?.ingredient_id) {
        Alert.alert('エラー', '削除対象が見つかりません');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 同じ成分の全レコードを削除
      const { error } = await supabase
        .from('user_medications')
        .delete()
        .eq('user_id', user.id)
        .eq('ingredient_id', targetRecord.ingredient_id);

      if (error) {
        Alert.alert('エラー', '削除に失敗しました');
        return;
      }

      loadMedications();
    } catch (error) {
      Alert.alert('エラー', '予期しないエラーが発生しました');
    }
  };

  // 全医療データを並列ロード
  const loadAllMedicalData = async (userId: string) => {
    await Promise.all([
      loadDiagnoses(userId),
      loadMedications(userId),
      loadTreatments(userId),
      loadStatuses(userId),
    ]);
  };

  // 初期化時にマスターデータをロード
  useEffect(() => {
    loadMasterData();
  }, [masterData]);

  return {
    // State
    diagnoses,
    medications,
    treatments,
    statuses,
    loadingDiagnoses,
    loadingMedications,
    loadingTreatments,
    loadingStatuses,
    showMultiSelectModal,
    setShowMultiSelectModal,
    selectModalType,
    diagnosisMasters,
    medicationMasters,
    treatmentMasters,
    statusMasters,
    editingRecordId,
    editingRecordType,
    showDateModal,
    setShowDateModal,
    startYear,
    startMonth,
    endYear,
    endMonth,
    currentSelectedIds,

    // Functions
    loadFromCache,
    loadMasterData,
    openMultiSelectModal,
    handleMedicationToggle,
    openDateEditModal,
    loadDiagnoses,
    loadMedications,
    loadTreatments,
    loadStatuses,
    loadAllMedicalData,
    updateRecordDate,
    handleMultiSelectSave,
    deleteDiagnosis,
    deleteStatus,
    deleteTreatment,
    deleteMedication,
    closeDateModal: () => {
      setShowDateModal(false);
      setEditingRecordId(null);
      setEditingRecordType(null);
    },
  };
};
