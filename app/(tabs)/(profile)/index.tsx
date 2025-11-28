import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, FlatList, TouchableOpacity } from 'react-native';

import { Pencil } from 'lucide-react-native';

import ConfirmModal from '@/components/ConfirmModal';
import LoginPrompt from '@/components/LoginPrompt';
import PostItem from '@/components/PostItem';
import DatePickerModal from '@/components/profile/DatePickerModal';
import MedicalSection from '@/components/profile/MedicalSection';
import ProfileHeader from '@/components/profile/ProfileHeader';
import ProfileTabBar, { TabType } from '@/components/profile/ProfileTabBar';
import TextEditModal from '@/components/profile/TextEditModal';
import MultiSelectModal from '@/components/search/MultiSelectModal';
import { Text } from '@/components/Themed';
import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Spinner } from '@/components/ui/spinner';
import { useFollow } from '@/src/hooks/useFollow';
import { useMedicationMasters } from '@/src/hooks/useMedicationMasters';
import { usePostsData } from '@/src/hooks/usePostsData';
import { supabase } from '@/src/lib/supabase';
import { checkNGWords } from '@/src/utils/ngWordFilter';
import { sortByStartDate } from '@/src/utils/sortByStartDate';

interface UserProfile {
  avatarUrl: string | null;
  userName: string | null;
  xUserName: string | null;
  accountName: string | null;
  createdAt: string | null;
  bio: string | null;
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
  ingredient_id: string;
  ingredients: { id: string; name: string } | null;
  products: { name: string } | null;
  start_date: string | null;
  end_date: string | null;
}

interface TreatmentData {
  treatments: { name: string } | null;
  start_date: string;
  end_date: string | null;
}

interface StatusData {
  statuses: { name: string } | null;
  start_date: string;
  end_date: string | null;
}

interface MasterData {
  id: string;
  name: string;
  ingredientId?: string; // 服薬マスター用: 成分ID
}

export default function ProfileScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { counts: followCounts } = useFollow(currentUserId);

  const [diagnoses, setDiagnoses] = useState<MedicalRecord[]>([]);
  const [medications, setMedications] = useState<MedicalRecord[]>([]);
  const [treatments, setTreatments] = useState<MedicalRecord[]>([]);
  const [statuses, setStatuses] = useState<MedicalRecord[]>([]);

  const [bio, setBio] = useState('');

  const {
    userPosts,
    likedPosts,
    bookmarkedPosts,
    loadingPosts,
    loadingLikes,
    loadingBookmarks,
    loadUserPosts,
    loadLikedPosts,
    loadBookmarkedPosts,
  } = usePostsData();

  const [loadingDiagnoses, setLoadingDiagnoses] = useState(true);
  const [loadingMedications, setLoadingMedications] = useState(true);
  const [loadingTreatments, setLoadingTreatments] = useState(true);
  const [loadingStatuses, setLoadingStatuses] = useState(true);

  const [showMultiSelectModal, setShowMultiSelectModal] = useState(false);
  const [selectModalType, setSelectModalType] = useState<'diagnosis' | 'medication' | 'treatment' | 'status'>('diagnosis');

  const [diagnosisMasters, setDiagnosisMasters] = useState<MasterData[]>([]);
  const { medications: medicationMasters } = useMedicationMasters();
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

  // テキスト編集モーダル用のstate
  const [showNameEditModal, setShowNameEditModal] = useState(false);
  const [showBioEditModal, setShowBioEditModal] = useState(false);

  // キャッシュキー
  const CACHE_KEYS = {
    diagnoses: 'cache_diagnoses',
    medications: 'cache_medications',
    treatments: 'cache_treatments',
    statuses: 'cache_statuses',
  };

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

  useEffect(() => {
    loadUserProfile();
    loadFromCache(); // まずキャッシュを表示
    loadDiagnoses();
    loadMedications();
    loadTreatments();
    loadStatuses();
    loadMasterData();

    // ログイン状態の変更を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // ログイン成功時にリロード
        loadUserProfile();
        loadDiagnoses();
        loadMedications();
        loadTreatments();
        loadStatuses();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (activeTab === 'posts') {
      loadUserPosts();
    } else if (activeTab === 'likes') {
      loadLikedPosts();
    } else if (activeTab === 'bookmarks') {
      loadBookmarkedPosts();
    }
  }, [activeTab]);

  const loadMasterData = async () => {
    try {
      // 診断名マスター（display_flag=trueのみ、display_order順）
      const { data: diagData } = await supabase
        .from('diagnoses')
        .select('id, name')
        .eq('display_flag', true)
        .order('display_order', { ascending: true });
      if (diagData) setDiagnosisMasters(diagData);

      // 服薬マスターはuseMedicationMastersフックで取得

      // 治療法マスター（display_flag=trueのみ、display_order順）
      const { data: treatData } = await supabase
        .from('treatments')
        .select('id, name')
        .eq('display_flag', true)
        .order('display_order', { ascending: true });
      if (treatData) setTreatmentMasters(treatData);

      // ステータスマスター（display_order > 0のみ、display_order順）
      const { data: statusData, error: statusError } = await supabase
        .from('statuses')
        .select('id, name')
        .gt('display_order', 0)
        .order('display_order', { ascending: true });

      if (statusError) {
        console.error('ステータス読み込みエラー:', statusError);
      }

      if (statusData) setStatusMasters(statusData);
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

  // 既存の選択済みマスターIDを取得
  const getSelectedIds = (type: 'diagnosis' | 'medication' | 'treatment' | 'status'): string[] => {
    switch (type) {
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
  };

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
        Alert.alert('エラー', '更新に失敗しました');
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
      const existingMasterIds = getSelectedIds(selectModalType);

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

  // 診断名を取得
  const loadDiagnoses = async () => {
    setLoadingDiagnoses(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: diagnosesData } = await supabase
        .from('user_diagnoses')
        .select('id, diagnoses(name), start_date, end_date')
        .eq('user_id', user.id);

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
  const loadMedications = async () => {
    setLoadingMedications(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: medicationsData } = await supabase
        .from('user_medications')
        .select('id, ingredient_id, ingredients(id, name), products(name), start_date, end_date')
        .eq('user_id', user.id);

      const { data: allProducts } = await supabase
        .from('products')
        .select('ingredient_id, name');

      if (medicationsData) {
        const productsByIngredient = new Map<string, string[]>();
        if (allProducts) {
          allProducts.forEach((p: { ingredient_id: string; name: string }) => {
            const existing = productsByIngredient.get(p.ingredient_id);
            if (existing) {
              existing.push(p.name);
            } else {
              productsByIngredient.set(p.ingredient_id, [p.name]);
            }
          });
        }

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
  const loadTreatments = async () => {
    setLoadingTreatments(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: treatmentsData } = await supabase
        .from('user_treatments')
        .select('id, treatments(name), start_date, end_date')
        .eq('user_id', user.id);

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
  const loadStatuses = async () => {
    setLoadingStatuses(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: statusesData } = await supabase
        .from('user_statuses')
        .select('id, statuses(name), start_date, end_date')
        .eq('user_id', user.id);

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

  const loadUserProfile = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        setLoading(false);
        setCurrentUserId(null);
        return;
      }

      setCurrentUserId(user.id);

      // usersテーブルからプロフィール情報を取得
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('display_name, created_at, bio')
        .eq('user_id', user.id)
        .single();

      if (userError) {
        console.error('ユーザー情報取得エラー:', userError);
      }

      const xName = user.user_metadata?.name || null;
      const userProfile: UserProfile = {
        avatarUrl: user.user_metadata?.avatar_url || null,
        userName: userData?.display_name || xName,
        xUserName: xName,
        accountName: user.user_metadata?.user_name || null,
        createdAt: userData?.created_at || user.created_at || null,
        bio: userData?.bio || null,
      };

      setProfile(userProfile);
      setBio(userData?.bio || '');
    } catch (error) {
      console.error('プロフィール読み込みエラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDisplayName = async (newName: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 空文字列の場合はXアカウントの名前を使用
      const nameToSave = newName.trim() || profile?.xUserName || 'ユーザー';

      // NGワードチェック
      const ngWordCheck = checkNGWords(nameToSave);
      if (!ngWordCheck.isValid) {
        Alert.alert('保存できません', ngWordCheck.message);
        return;
      }

      const { error } = await supabase
        .from('users')
        .update({ display_name: nameToSave })
        .eq('user_id', user.id);

      if (error) {
        Alert.alert('エラー', '名前の保存に失敗しました');
        return;
      }

      loadUserProfile();
    } catch (error) {
      Alert.alert('エラー', '予期しないエラーが発生しました');
    }
  };

  const handleSaveBio = async (newBio: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // NGワードチェック
      const ngWordCheck = checkNGWords(newBio);
      if (!ngWordCheck.isValid) {
        Alert.alert('保存できません', ngWordCheck.message);
        return;
      }

      const { error } = await supabase
        .from('users')
        .update({ bio: newBio })
        .eq('user_id', user.id);

      if (error) {
        Alert.alert('エラー', '自由記述の保存に失敗しました');
        return;
      }

      setBio(newBio);
      loadUserProfile();
    } catch (error) {
      Alert.alert('エラー', '予期しないエラーが発生しました');
    }
  };


  const handleFollowingPress = () => {
    if (currentUserId) {
      router.push(`/(tabs)/(profile)/user/${currentUserId}/following`);
    }
  };

  const handleFollowersPress = () => {
    if (currentUserId) {
      router.push(`/(tabs)/(profile)/user/${currentUserId}/followers`);
    }
  };

  const renderHeader = () => (
    <>
      <ProfileHeader
        profile={profile!}
        onEditName={() => setShowNameEditModal(true)}
        followCounts={followCounts}
        onFollowingPress={handleFollowingPress}
        onFollowersPress={handleFollowersPress}
      />

      {/* タブバー */}
      <ProfileTabBar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* プロフィールタブの内容 */}
      {activeTab === 'profile' && (
        <>
          <MedicalSection
            title="診断名"
            records={diagnoses}
            onAdd={() => openMultiSelectModal('diagnosis')}
            onDelete={deleteDiagnosis}
            onEdit={(id) => openDateEditModal(id, 'diagnosis')}
            loading={loadingDiagnoses}
          />
          <MedicalSection
            title="服薬"
            records={medications}
            onAdd={() => openMultiSelectModal('medication')}
            onDelete={deleteMedication}
            onEdit={(id) => openDateEditModal(id, 'medication')}
            loading={loadingMedications}
          />
          <MedicalSection
            title="治療"
            records={treatments}
            onAdd={() => openMultiSelectModal('treatment')}
            onDelete={deleteTreatment}
            onEdit={(id) => openDateEditModal(id, 'treatment')}
            loading={loadingTreatments}
          />
          <MedicalSection
            title="ステータス"
            records={statuses}
            onAdd={() => openMultiSelectModal('status')}
            onDelete={deleteStatus}
            onEdit={(id) => openDateEditModal(id, 'status')}
            loading={loadingStatuses}
          />

          {/* Bio表示・編集 */}
          <Box className="p-4 border-t border-outline-200">
            <HStack className="justify-between items-center mb-2">
              <Heading size="lg">自由記述</Heading>
              <TouchableOpacity onPress={() => setShowBioEditModal(true)} className="p-1">
                <Icon as={Pencil} size="sm" className="text-typography-500" />
              </TouchableOpacity>
            </HStack>
            {bio ? (
              <Text className="text-base">{bio}</Text>
            ) : (
              <Text className="text-sm opacity-50">まだ登録がありません</Text>
            )}
          </Box>

          {/* 自分のプロフィールを表示 */}
          <Box className="p-4 border-t border-outline-200">
            <Button
              onPress={async () => {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                  router.push(`/(tabs)/(profile)/user/${user.id}`);
                }
              }}
              variant="outline"
              className="w-full"
            >
              <ButtonText>自分のプロフィール画面</ButtonText>
            </Button>
          </Box>
        </>
      )}
    </>
  );

  const getCurrentData = () => {
    switch (activeTab) {
      case 'posts':
        return userPosts;
      case 'likes':
        return likedPosts;
      case 'bookmarks':
        return bookmarkedPosts;
      default:
        return [];
    }
  };

  const renderEmptyComponent = () => {
    if (activeTab === 'profile') return null;

    // ローディング中はスピナーを表示
    const isLoading =
      (activeTab === 'posts' && loadingPosts) ||
      (activeTab === 'likes' && loadingLikes) ||
      (activeTab === 'bookmarks' && loadingBookmarks);

    if (isLoading) {
      return (
        <Box className="py-8 items-center">
          <Spinner size="large" />
        </Box>
      );
    }

    // ローディング完了後、データがない場合はメッセージを表示
    const messages = {
      posts: 'まだ投稿がありません',
      likes: 'まだいいねがありません',
      bookmarks: 'まだブックマークがありません',
    };

    return (
      <Box className="px-5">
        <Text className="text-base opacity-50 text-center py-8">
          {messages[activeTab as keyof typeof messages]}
        </Text>
      </Box>
    );
  };

  // ローディング中またはプロフィール未取得
  if (loading || !profile) {
    return (
      <LoginPrompt>
        <Box className="flex-1 items-center justify-center p-5">
          <Spinner size="large" />
        </Box>
      </LoginPrompt>
    );
  }

  return (
    <LoginPrompt>
      <Box className="flex-1">
        <FlatList
          data={getCurrentData()}
          renderItem={({ item }) => <PostItem post={item} />}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmptyComponent}
        />
      </Box>

      {/* 複数選択モーダル */}
      <MultiSelectModal
        isOpen={showMultiSelectModal}
        onClose={() => setShowMultiSelectModal(false)}
        title={
          selectModalType === 'diagnosis' ? '診断名を選択' :
          selectModalType === 'medication' ? '服薬を選択' :
          selectModalType === 'treatment' ? '治療を選択' :
          'ステータスを選択'
        }
        subtitle={selectModalType === 'medication' ? '同じ成分の薬は同時に選択されます' : undefined}
        options={
          selectModalType === 'diagnosis' ? diagnosisMasters.map(d => ({ id: d.id, name: d.name })) :
          selectModalType === 'medication' ? medicationMasters.map(m => ({ id: m.id, name: m.name })) :
          selectModalType === 'treatment' ? treatmentMasters.map(t => ({ id: t.id, name: t.name })) :
          statusMasters.map(s => ({ id: s.id, name: s.name }))
        }
        selectedIds={getSelectedIds(selectModalType)}
        onSave={handleMultiSelectSave}
        onToggle={selectModalType === 'medication' ? handleMedicationToggle : undefined}
      />

      {/* 日付編集モーダル（年月選択） */}
      <DatePickerModal
        isOpen={showDateModal}
        onClose={() => {
          setShowDateModal(false);
          setEditingRecordId(null);
          setEditingRecordType(null);
        }}
        onSave={updateRecordDate}
        initialStartYear={startYear}
        initialStartMonth={startMonth}
        initialEndYear={endYear}
        initialEndMonth={endMonth}
      />

      {/* 名前編集モーダル */}
      <TextEditModal
        isOpen={showNameEditModal}
        onClose={() => setShowNameEditModal(false)}
        onSave={handleSaveDisplayName}
        title="名前を編集"
        placeholder="表示名を入力"
        initialValue={profile?.userName || ''}
        maxLength={50}
        multiline={false}
      />

      {/* 自由記述編集モーダル */}
      <TextEditModal
        isOpen={showBioEditModal}
        onClose={() => setShowBioEditModal(false)}
        onSave={handleSaveBio}
        title="自由記述を編集"
        placeholder="自己紹介など"
        initialValue={bio}
        maxLength={500}
        multiline
      />
    </LoginPrompt>
  );
}
