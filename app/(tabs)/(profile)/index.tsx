import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { useFocusEffect, useRouter } from 'expo-router';
import { Bot, Pencil, Sparkles } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Pressable, TouchableOpacity } from 'react-native';

import ConfirmModal from '@/components/ConfirmModal';
import LoginPrompt from '@/components/LoginPrompt';
import PostItem from '@/components/PostItem';
import DatePickerModal from '@/components/profile/DatePickerModal';
import MedicalSection from '@/components/profile/MedicalSection';
import ProfileHeader from '@/components/profile/ProfileHeader';
import ProfileTabBar, { TabType } from '@/components/profile/ProfileTabBar';
import TextEditModal from '@/components/profile/TextEditModal';
import MultiSelectModal from '@/components/search/MultiSelectModal';
import { Box } from '@/components/ui/box';
import { Button, ButtonIcon, ButtonSpinner, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useMasterData } from '@/src/contexts/MasterDataContext';
import { useFollow } from '@/src/hooks/useFollow';
import { useMedicationMasters } from '@/src/hooks/useMedicationMasters';
import { usePostsData } from '@/src/hooks/usePostsData';
import { usePurchase } from '@/src/hooks/usePurchase';
import { supabase } from '@/src/lib/supabase';
import { showError } from '@/src/utils/errorHandler';
import { pickAndCompressImage } from '@/src/utils/imageCompression';
import { checkNGWords } from '@/src/utils/ngWordFilter';
import { sortByStartDate } from '@/src/utils/sortByStartDate';

interface UserProfile {
  avatarUrl: string | null;
  userName: string | null;
  xUserName: string | null;
  accountName: string | null;
  createdAt: string | null;
  provider: string | null;
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
  const { data: masterData } = useMasterData();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { counts: followCounts, refetch: refetchFollowCounts } = useFollow(currentUserId);
  const isMenuOpenRef = useRef(false);
  const ticketInfoLoadedRef = useRef(false);
  const reflectionsLoadedRef = useRef(false);
  const initialLoadCompleteRef = useRef(false);
  const [aiReflections, setAiReflections] = useState<any[]>([]);
  const [loadingReflections, setLoadingReflections] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [ticketCount, setTicketCount] = useState(0);
  const [hasFreeQuota, setHasFreeQuota] = useState(false);
  const [loadingTicketInfo, setLoadingTicketInfo] = useState(false);
  const [showGenerateConfirmModal, setShowGenerateConfirmModal] = useState(false);
  const { purchasing, handlePurchase } = usePurchase();

  const [diagnoses, setDiagnoses] = useState<MedicalRecord[]>([]);
  const [medications, setMedications] = useState<MedicalRecord[]>([]);
  const [treatments, setTreatments] = useState<MedicalRecord[]>([]);
  const [statuses, setStatuses] = useState<MedicalRecord[]>([]);

  const [bio, setBio] = useState('');

  const {
    userPosts,
    userReplies,
    loadingPosts,
    loadingReplies,
    loadUserPosts,
    loadUserReplies,
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
    loadFromCache(); // まずキャッシュを表示
    loadInitialData(); // 1回のgetUser()で全データを並列取得
    loadMasterData();

    // ログイン状態の変更を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // ログイン成功時に一括リロード
        loadInitialData();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (activeTab === 'posts') {
      loadUserPosts();
    } else if (activeTab === 'replies') {
      loadUserReplies();
    } else if (activeTab === 'ai-reflection') {
      loadAiReflections();
    }
  }, [activeTab]);

  const loadAiReflections = useCallback(async () => {
    // 初回のみスピナーを表示（2回目以降はバックグラウンド更新）
    if (!reflectionsLoadedRef.current) {
      setLoadingReflections(true);
    }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('ai_reflections')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setAiReflections(data || []);
      reflectionsLoadedRef.current = true;
    } catch (error) {
      console.error('振り返り取得エラー:', error);
    } finally {
      setLoadingReflections(false);
    }
  }, []);

  // チケット情報を取得
  const loadTicketInfo = useCallback(async () => {
    // 初回のみスピナーを表示（2回目以降はバックグラウンド更新）
    if (!ticketInfoLoadedRef.current) {
      setLoadingTicketInfo(true);
    }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // チケット数を取得
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('ai_reflection_tickets')
        .eq('user_id', user.id)
        .single();

      if (userError) throw userError;

      setTicketCount(userData?.ai_reflection_tickets || 0);

      // 無料枠をチェック
      const { data: hasFreeQuotaData, error: quotaError } = await supabase.rpc(
        'check_free_reflection_quota',
        { p_user_id: user.id }
      );

      if (quotaError) {
        console.error('無料枠チェックエラー:', JSON.stringify(quotaError, null, 2));
      }

      setHasFreeQuota(hasFreeQuotaData || false);
      ticketInfoLoadedRef.current = true;
    } catch (error) {
      console.error('チケット情報取得エラー:', error);
    } finally {
      setLoadingTicketInfo(false);
    }
  }, []);

  // 画面フォーカス時にフォロー数を更新（初回ロード完了後、メニューが閉じている時のみ）
  useFocusEffect(
    useCallback(() => {
      // 初回ロードが完了していない場合はスキップ
      if (!initialLoadCompleteRef.current) return;

      const timer = setTimeout(() => {
        if (currentUserId && !isMenuOpenRef.current) {
          refetchFollowCounts();
        }
      }, 500);
      return () => clearTimeout(timer);
    }, [currentUserId, refetchFollowCounts])
  );

  // AI振り返りタブにフォーカスが当たった時にリロード
  useFocusEffect(
    useCallback(() => {
      if (activeTab === 'ai-reflection') {
        loadAiReflections();
        loadTicketInfo();
      }
    }, [activeTab, loadAiReflections, loadTicketInfo])
  );

  // メニューの開閉状態を更新
  const handleMenuOpenChange = useCallback((isOpen: boolean) => {
    isMenuOpenRef.current = isOpen;
  }, []);

  // AI振り返りを生成（実際の処理）
  const executeGenerateReflection = async () => {
    setGenerating(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('エラー', 'ログインしてください');
        return;
      }

      // 生成前の最新の振り返りIDを取得
      const { data: beforeReflections } = await supabase
        .from('ai_reflections')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);
      const beforeLatestId = beforeReflections?.[0]?.id;

      // Supabase Functionを呼び出し
      const { data, error } = await supabase.functions.invoke('generate-ai-reflection', {
        body: { userId: user.id },
      });

      console.log('Function response:', { data, error });

      // 成功チェックを先に行う（errorがあってもdataに成功データが含まれる場合がある）
      if (data?.success) {
        // refをリセットして次回スピナー表示
        reflectionsLoadedRef.current = false;
        ticketInfoLoadedRef.current = false;
        await loadAiReflections();
        await loadTicketInfo();
        Alert.alert('成功', 'AI振り返りが生成されました！');
        return;
      }

      // データにエラーがある場合（明確なビジネスロジックエラー）
      if (data?.error) {
        Alert.alert('エラー', data.error);
        return;
      }

      // ネットワークエラー等の場合、実際に生成されたかを確認
      if (error) {
        console.log('Function returned error, checking if reflection was created...', error);

        // 少し待ってから最新の振り返りを確認
        await new Promise(resolve => setTimeout(resolve, 1000));

        const { data: afterReflections } = await supabase
          .from('ai_reflections')
          .select('id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);
        const afterLatestId = afterReflections?.[0]?.id;

        // 新しい振り返りが作成されていれば成功
        if (afterLatestId && afterLatestId !== beforeLatestId) {
          console.log('New reflection was created despite error');
          reflectionsLoadedRef.current = false;
          ticketInfoLoadedRef.current = false;
          await loadAiReflections();
          await loadTicketInfo();
          Alert.alert('成功', 'AI振り返りが生成されました！');
          return;
        }

        // 本当にエラーの場合
        console.error('Function error:', error);
        Alert.alert('エラー', error.message || '生成に失敗しました');
        return;
      }

      // 予期しないレスポンス
      Alert.alert('エラー', '予期しないエラーが発生しました');
    } catch (error: unknown) {
      console.error('生成エラー:', error);
      const errorMessage = error instanceof Error ? error.message : '生成に失敗しました';
      Alert.alert('エラー', errorMessage);
    } finally {
      setGenerating(false);
    }
  };

  // AI振り返りを生成（確認ダイアログ付き）
  const handleGenerateReflection = () => {
    setShowGenerateConfirmModal(true);
  };

  // 確認モーダルで「生成する」を押した時
  const handleConfirmGenerate = () => {
    setShowGenerateConfirmModal(false);
    executeGenerateReflection();
  };

  // 確認モーダルのメッセージ
  const generateConfirmMessage = hasFreeQuota
    ? '今月の無料枠（1回）を使用します。\nよろしいですか？'
    : `チケットを1回分消費します。\n（残り${ticketCount}回）\nよろしいですか？`;

  const generateConfirmNote = '・生成には約15秒〜1分程度かかります。画面を切り替えても生成は継続され、完了するとウィンドウでお知らせします。\n・AIによる分析のため、生成結果が正確でない場合があります。';

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

  // 初期データを一括ロード（getUser()は1回だけ）
  const loadInitialData = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        setLoading(false);
        setCurrentUserId(null);
        return;
      }

      setCurrentUserId(user.id);

      // プロフィール情報と医療情報を並列取得
      const [userData] = await Promise.all([
        supabase
          .from('users')
          .select('display_name, created_at, bio, provider, avatar_url')
          .eq('user_id', user.id)
          .single()
          .then(res => res.data),
        // 医療情報4種を並列ロード
        loadDiagnoses(user.id),
        loadMedications(user.id),
        loadTreatments(user.id),
        loadStatuses(user.id),
      ]);

      const xName = user.user_metadata?.name || null;
      const userProfile: UserProfile = {
        avatarUrl: userData ? userData.avatar_url : (user.user_metadata?.avatar_url || null),
        userName: userData?.display_name || xName,
        xUserName: xName,
        accountName: user.user_metadata?.user_name || null,
        createdAt: userData?.created_at || user.created_at || null,
        provider: userData?.provider || null,
        bio: userData?.bio || null,
      };

      setProfile(userProfile);
      setBio(userData?.bio || '');
    } catch (error) {
      console.error('プロフィール読み込みエラー:', error);
    } finally {
      setLoading(false);
      initialLoadCompleteRef.current = true;
    }
  };

  // プロフィール情報のみ再読み込み（アバター変更時など）
  const loadUserProfile = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        setLoading(false);
        setCurrentUserId(null);
        return;
      }

      const { data: userData } = await supabase
        .from('users')
        .select('display_name, created_at, bio, provider, avatar_url')
        .eq('user_id', user.id)
        .single();

      const xName = user.user_metadata?.name || null;
      const userProfile: UserProfile = {
        avatarUrl: userData ? userData.avatar_url : (user.user_metadata?.avatar_url || null),
        userName: userData?.display_name || xName,
        xUserName: xName,
        accountName: user.user_metadata?.user_name || null,
        createdAt: userData?.created_at || user.created_at || null,
        provider: userData?.provider || null,
        bio: userData?.bio || null,
      };

      setProfile(userProfile);
      setBio(userData?.bio || '');
    } catch (error) {
      console.error('プロフィール読み込みエラー:', error);
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

  // アバター変更
  const handleAvatarChange = async () => {
    try {
      const compressedUri = await pickAndCompressImage();
      if (!compressedUri) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('未ログイン');

      // 古いアバターを削除（存在する場合）
      if (profile?.avatarUrl && profile.avatarUrl.includes('/avatars/')) {
        const oldPath = profile.avatarUrl.split('/avatars/')[1];
        if (oldPath) {
          console.log('古い画像を削除:', oldPath);
          const { error: deleteError } = await supabase.storage.from('avatars').remove([oldPath]);
          if (deleteError) {
            console.error('古い画像の削除エラー:', deleteError);
          }
        }
      }

      // ファイル名を生成
      const fileExt = 'jpg';
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      // Supabase Storageにアップロード
      const base64 = await FileSystem.readAsStringAsync(compressedUri, {
        encoding: 'base64',
      });

      // Base64をUint8Arrayに変換
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, byteArray, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // 公開URLを取得
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);

      // usersテーブルのavatar_urlを更新
      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: publicUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      Alert.alert('成功', 'プロフィール画像を更新しました');
      loadUserProfile();
    } catch (error) {
      console.error('画像アップロードエラー:', error);
      Alert.alert('エラー', '画像のアップロードに失敗しました');
    }
  };

  // アバター削除
  const handleAvatarDelete = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('未ログイン');

      // Storageから削除
      if (profile?.avatarUrl && profile.avatarUrl.includes('/avatars/')) {
        const oldPath = profile.avatarUrl.split('/avatars/')[1];
        if (oldPath) {
          console.log('削除するファイルパス:', oldPath);
          const { error: deleteError } = await supabase.storage.from('avatars').remove([oldPath]);
          if (deleteError) {
            console.error('Storage削除エラー:', deleteError);
          } else {
            console.log('Storageから削除成功');
          }
        }
      }

      // usersテーブルのavatar_urlをnullに更新
      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: null })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      Alert.alert('成功', 'プロフィール画像を削除しました');
      loadUserProfile();
    } catch (error) {
      console.error('画像削除エラー:', error);
      Alert.alert('エラー', '画像の削除に失敗しました');
    }
  };

  // プロバイダーのアバターに戻す
  const handleAvatarReset = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('未ログイン');

      const oauthAvatarUrl = user.user_metadata?.avatar_url;
      if (!oauthAvatarUrl) {
        Alert.alert('エラー', 'プロバイダーのアバター画像が見つかりません');
        return;
      }

      // カスタムアバターをStorageから削除
      if (profile?.avatarUrl && profile.avatarUrl.includes('/avatars/')) {
        const oldPath = profile.avatarUrl.split('/avatars/')[1];
        if (oldPath) {
          console.log('削除するファイルパス:', oldPath);
          const { error: deleteError } = await supabase.storage.from('avatars').remove([oldPath]);
          if (deleteError) {
            console.error('Storage削除エラー:', deleteError);
          } else {
            console.log('Storageから削除成功');
          }
        }
      }

      // usersテーブルのavatar_urlをOAuthアバターに更新
      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: oauthAvatarUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      Alert.alert('成功', 'プロバイダーのアバター画像に戻しました');
      loadUserProfile();
    } catch (error) {
      console.error('アバターリセットエラー:', error);
      Alert.alert('エラー', 'アバターのリセットに失敗しました');
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
        onAvatarChange={handleAvatarChange}
        onAvatarDelete={handleAvatarDelete}
        onAvatarReset={handleAvatarReset}
        followCounts={followCounts}
        onFollowingPress={handleFollowingPress}
        onFollowersPress={handleFollowersPress}
        onMenuOpenChange={handleMenuOpenChange}
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
                <Icon as={Pencil} size="md" className="text-typography-500" />
              </TouchableOpacity>
            </HStack>
            {bio ? (
              <Text className="text-lg p-2 bg-background-50 rounded-lg">{bio}</Text>
            ) : (
              <Text className="text-lg text-typography-400 text-center py-2">まだ登録がありません</Text>
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

      {/* AI振り返りタブの内容 */}
      {activeTab === 'ai-reflection' && (
        <Box className="p-4">
          <VStack space="sm">
            {/* 説明 */}
            <HStack space="md" className="items-start">
              <Card className="flex-1 bg-background-0">
                <HStack>
                  <Box className="w-12 h-12 rounded-full bg-secondary-400 items-center justify-center flex-shrink-0">
                    <Icon as={Bot} size="xl" className="text-white" />
                  </Box>
                  <VStack space="sm" className="ml-3 flex-1 flex-shrink gap-1">
                    <Text className="text-sm text-typography-600">
                      あなたのアプリ内のアクション(投稿/返信/チェックイン等)を元にAIが振り返りを生成します。
                    </Text>
                    <Text className="text-sm text-typography-600 font-semibold">
                      前回の生成から3日以上経過し、新しいデータが十分に溜まっている必要があります。
                    </Text>
                  </VStack>
                </HStack>
              </Card>
            </HStack>

            {/* チケット情報 */}
            {loadingTicketInfo ? (
              <Box className="p-4 items-center">
                <Spinner />
              </Box>
            ) : (
              <Card className="bg-background-10">
                <VStack space="sm">
                  <Heading size="sm">利用可能回数</Heading>
                  <HStack space="md" className="items-center">
                    <VStack space="xs" className="flex-1">
                      <Text className="text-xs text-typography-500">今月の無料枠</Text>
                      <Text className="text-lg font-semibold">
                        {hasFreeQuota ? '残り1回' : '使用済み'}
                      </Text>
                    </VStack>
                    <VStack space="xs" className="flex-1">
                      <Text className="text-xs text-typography-500">チケット残数</Text>
                      <Text className="text-lg font-semibold">
                        {ticketCount}回
                      </Text>
                    </VStack>
                  </HStack>
                </VStack>
              </Card>
            )}

            {/* 生成ボタン or 購入ボタン */}
            {loadingTicketInfo ? null : hasFreeQuota || ticketCount > 0 ? (
              <Button
                onPress={handleGenerateReflection}
                isDisabled={generating}
                size="lg"
                className="w-full"
              >
                {generating ? (
                  <>
                    <ButtonSpinner />
                    <ButtonText>生成中...</ButtonText>
                  </>
                ) : (
                  <>
                    <ButtonIcon as={Sparkles} />
                    <ButtonText>AI振り返りを生成</ButtonText>
                  </>
                )}
              </Button>
            ) : (
              <VStack space="md">
                <Button
                  onPress={async () => {
                    await handlePurchase();
                    await loadTicketInfo();
                  }}
                  isDisabled={purchasing}
                  size="lg"
                  className="w-full"
                  variant="solid"
                >
                  {purchasing ? (
                    <>
                      <ButtonSpinner />
                      <ButtonText>購入処理中...</ButtonText>
                    </>
                  ) : (
                    <ButtonText>2回分を100円で購入</ButtonText>
                  )}
                </Button>
              </VStack>
            )}

            {/* 振り返り一覧 */}
            {loadingReflections ? (
              <Box className="py-8 items-center">
                <Spinner size="large" />
              </Box>
            ) : aiReflections.length > 0 ? (
              <VStack space="md" className="mt-4">
                <Heading size="md">生成された振り返り</Heading>
                {aiReflections.map((reflection) => (
                  <Pressable
                    key={reflection.id}
                    onPress={() => router.push(`/(tabs)/(profile)/ai-reflection/${reflection.id}`)}
                  >
                    <Card className="p-4">
                      <VStack space="sm">
                        <Text className="text-base text-semibold text-typography-600">
                          {new Date(reflection.created_at).toLocaleString('ja-JP')}
                        </Text>
                        <Text className="text-sm text-typography-600 line-clamp-3">
                          {reflection.content}
                        </Text>
                      </VStack>
                    </Card>
                  </Pressable>
                  <Pressable
                    key={reflection.id}
                    onPress={() => router.push(`/(tabs)/(profile)/ai-reflection/${reflection.id}`)}
                  >
                    <Card className="p-4">
                      <VStack space="sm">
                        <Text className="text-base text-semibold text-typography-600">
                          {new Date(reflection.created_at).toLocaleString('ja-JP')}
                        </Text>
                        <Text className="text-sm text-typography-600 line-clamp-3">
                          {reflection.content}
                        </Text>
                      </VStack>
                    </Card>
                  </Pressable>
                ))}
              </VStack>
            ) : (
              <Card className="p-8">
                <VStack space="sm" className="items-center">
                  <Text className="text-center text-typography-500">
                    まだ振り返りがありません
                  </Text>
                </VStack>
              </Card>
            )}
          </VStack>
        </Box>
      )}
    </>
  );

  const getCurrentData = () => {
    switch (activeTab) {
      case 'posts':
        return userPosts;
      case 'replies':
        return userReplies;
      default:
        return [];
    }
  };

  const renderEmptyComponent = () => {
    if (activeTab === 'profile' || activeTab === 'ai-reflection') return null;

    // ローディング中はスピナーを表示
    const isLoading =
      (activeTab === 'posts' && loadingPosts) ||
      (activeTab === 'replies' && loadingReplies);

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
      replies: 'まだ返信がありません',
    };

    return (
      <Box className="px-5">
        <Text className="text-lg opacity-50 text-center py-8">
          {messages[activeTab as keyof typeof messages]}
        </Text>
      </Box>
    );
  };


  // プロフィール読み込み中のヘッダー
  const renderLoadingHeader = () => (
    <>
      <Box className="p-4">
        <HStack className="mt-2" space="md">
          <Box className="w-16 h-16 bg-background-200 rounded-full" />
          <VStack className="flex-1 justify-center" space="xs">
            <Box className="h-6 w-32 bg-background-200 rounded" />
            <Box className="h-4 w-48 bg-background-200 rounded" />
          </VStack>
        </HStack>
      </Box>
      <ProfileTabBar activeTab={activeTab} onTabChange={setActiveTab} />
    </>
  );

  return (
    <LoginPrompt>
      <Box className="flex-1">
        <FlatList
          data={getCurrentData()}
          renderItem={({ item }) => <PostItem post={item} />}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={!profile ? renderLoadingHeader : renderHeader}
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
        selectedIds={currentSelectedIds}
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

      {/* AI振り返り生成確認モーダル */}
      <ConfirmModal
        isOpen={showGenerateConfirmModal}
        onClose={() => setShowGenerateConfirmModal(false)}
        onConfirm={handleConfirmGenerate}
        title="AI振り返りを生成"
        message={generateConfirmMessage}
        confirmText="生成する"
        confirmAction="primary"
        note={generateConfirmNote}
      />
    </LoginPrompt>
  );
}
