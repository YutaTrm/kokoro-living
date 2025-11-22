import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, FlatList } from 'react-native';

import LoginPrompt from '@/components/LoginPrompt';
import PostItem from '@/components/PostItem';
import DatePickerModal from '@/components/profile/DatePickerModal';
import MedicalSection from '@/components/profile/MedicalSection';
import ProfileHeader from '@/components/profile/ProfileHeader';
import SelectModal from '@/components/profile/SelectModal';
import { Text } from '@/components/Themed';
import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Spinner } from '@/components/ui/spinner';
import { Textarea, TextareaInput } from '@/components/ui/textarea';
import { VStack } from '@/components/ui/vstack';
import { supabase } from '@/src/lib/supabase';

interface UserProfile {
  avatarUrl: string | null;
  userName: string | null;
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

interface StatusData {
  statuses: { name: string } | null;
  start_date: string;
  end_date: string | null;
}

interface MasterData {
  id: string;
  name: string;
}

interface Post {
  id: string;
  content: string;
  created_at: string;
  user: {
    display_name: string;
    user_id: string;
    avatar_url?: string | null;
  };
  diagnoses: string[];
  treatments: string[];
  medications: string[];
}

type TabType = 'profile' | 'posts' | 'likes' | 'bookmarks';

export default function ProfileScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('profile');

  const [diagnoses, setDiagnoses] = useState<MedicalRecord[]>([]);
  const [medications, setMedications] = useState<MedicalRecord[]>([]);
  const [treatments, setTreatments] = useState<MedicalRecord[]>([]);
  const [statuses, setStatuses] = useState<MedicalRecord[]>([]);

  const [bio, setBio] = useState('');

  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [likedPosts, setLikedPosts] = useState<Post[]>([]);
  const [bookmarkedPosts, setBookmarkedPosts] = useState<Post[]>([]);

  const [loadingPosts, setLoadingPosts] = useState(false);
  const [loadingLikes, setLoadingLikes] = useState(false);
  const [loadingBookmarks, setLoadingBookmarks] = useState(false);
  const [loadingMedical, setLoadingMedical] = useState(true);

  const [showSelectModal, setShowSelectModal] = useState(false);
  const [selectModalType, setSelectModalType] = useState<'diagnosis' | 'medication' | 'treatment' | 'status'>('diagnosis');

  const [diagnosisMasters, setDiagnosisMasters] = useState<MasterData[]>([]);
  const [medicationMasters, setMedicationMasters] = useState<MasterData[]>([]);
  const [treatmentMasters, setTreatmentMasters] = useState<MasterData[]>([]);
  const [statusMasters, setStatusMasters] = useState<MasterData[]>([]);

  // 日付選択用のstate（年月選択）
  const [selectedDiagnosisId, setSelectedDiagnosisId] = useState<string | null>(null);
  const [selectedStatusId, setSelectedStatusId] = useState<string | null>(null);
  const [selectedTreatmentId, setSelectedTreatmentId] = useState<string | null>(null);
  const [selectedMedicationId, setSelectedMedicationId] = useState<string | null>(null);
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

    // ログイン状態の変更を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // ログイン成功時にリロード
        loadUserProfile();
        loadMedicalRecords();
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
      // 診断名マスター
      const { data: diagData } = await supabase.from('diagnoses').select('id, name');
      if (diagData) setDiagnosisMasters(diagData);

      // 製品マスター（製品名（成分名）の形式で表示）
      const { data: prodData } = await supabase
        .from('products')
        .select('id, name, ingredient_id, ingredients(name)')
        .order('name');

      if (prodData) {
        setMedicationMasters(prodData.map((p: any) => ({
          id: p.id,
          name: `${p.name}（${p.ingredients?.name || ''}）`,
        })));
      }

      // 治療法マスター
      const { data: treatData } = await supabase.from('treatments').select('id, name');
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

  const openSelectModal = (type: 'diagnosis' | 'medication' | 'treatment' | 'status') => {
    setSelectModalType(type);
    setShowSelectModal(true);
  };

  const handleSelectItem = (itemId: string, type: 'diagnosis' | 'medication' | 'treatment' | 'status') => {
    // 選択したIDを保存
    switch (type) {
      case 'diagnosis':
        setSelectedDiagnosisId(itemId);
        break;
      case 'medication':
        setSelectedMedicationId(itemId);
        break;
      case 'treatment':
        setSelectedTreatmentId(itemId);
        break;
      case 'status':
        setSelectedStatusId(itemId);
        break;
    }

    // 他の選択をクリア
    if (type !== 'diagnosis') setSelectedDiagnosisId(null);
    if (type !== 'medication') setSelectedMedicationId(null);
    if (type !== 'treatment') setSelectedTreatmentId(null);
    if (type !== 'status') setSelectedStatusId(null);

    setShowSelectModal(false);

    // 日付選択モーダルを表示
    const now = new Date();
    setStartYear(now.getFullYear().toString());
    setStartMonth((now.getMonth() + 1).toString());
    setEndYear('');
    setEndMonth('');
    setShowDateModal(true);
  };

  const saveDiagnosisWithDate = async (startDate: string, endDate: string | null) => {
    try {
      if (!selectedDiagnosisId) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

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


  const saveStatusWithDate = async (startDate: string, endDate: string | null) => {
    try {
      if (!selectedStatusId) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from('user_statuses').insert({
        user_id: user.id,
        status_id: selectedStatusId,
        start_date: startDate,
        end_date: endDate,
      });

      if (error) {
        Alert.alert('エラー', '追加に失敗しました');
        return;
      }

      setShowDateModal(false);
      setSelectedStatusId(null);
      loadMedicalRecords();
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

      loadMedicalRecords();
    } catch (error) {
      Alert.alert('エラー', '予期しないエラーが発生しました');
    }
  };


  const saveTreatmentWithDate = async (startDate: string, endDate: string | null) => {
    try {
      if (!selectedTreatmentId) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from('user_treatments').insert({
        user_id: user.id,
        treatment_id: selectedTreatmentId,
        start_date: startDate,
        end_date: endDate,
      });

      if (error) {
        Alert.alert('エラー', '追加に失敗しました');
        return;
      }

      setShowDateModal(false);
      setSelectedTreatmentId(null);
      loadMedicalRecords();
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

      loadMedicalRecords();
    } catch (error) {
      Alert.alert('エラー', '予期しないエラーが発生しました');
    }
  };


  const saveMedicationWithDate = async (startDate: string, endDate: string | null) => {
    try {
      if (!selectedMedicationId) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 選んだproduct_idからingredient_idを取得
      const { data: productData } = await supabase
        .from('products')
        .select('ingredient_id')
        .eq('id', selectedMedicationId)
        .single();

      if (!productData) {
        Alert.alert('エラー', '製品情報の取得に失敗しました');
        return;
      }

      const { error } = await supabase.from('user_medications').insert({
        user_id: user.id,
        ingredient_id: productData.ingredient_id,
        product_id: selectedMedicationId,
        start_date: startDate,
        end_date: endDate,
      });

      if (error) {
        Alert.alert('エラー', '追加に失敗しました');
        return;
      }

      setShowDateModal(false);
      setSelectedMedicationId(null);
      loadMedicalRecords();
    } catch (error) {
      Alert.alert('エラー', '予期しないエラーが発生しました');
    }
  };

  const deleteMedication = async (id: string) => {
    try {
      const { error } = await supabase
        .from('user_medications')
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
    setLoadingMedical(true);
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
        // 成分名でグループ化（同じ成分の複数製品をまとめる）
        const ingredientMap = new Map<string, MedicalRecord>();
        medicationsData.forEach((m: MedicationData & { id: string }) => {
          const ingredientName = m.ingredients?.name || '';
          if (ingredientName) {
            // 既に存在しない場合のみ追加（重複除去）
            if (!ingredientMap.has(ingredientName)) {
              ingredientMap.set(ingredientName, {
                id: m.id,
                name: ingredientName,
                startDate: m.start_date,
                endDate: m.end_date,
              });
            }
          }
        });
        setMedications(Array.from(ingredientMap.values()));
      }

      if (treatmentsData) {
        setTreatments(treatmentsData.map((t: TreatmentData & { id: string }) => ({
          id: t.id,
          name: t.treatments?.name || '',
          startDate: t.start_date,
          endDate: t.end_date,
        })));
      }

      // ステータスを取得
      const { data: statusesData } = await supabase
        .from('user_statuses')
        .select('id, statuses(name), start_date, end_date')
        .eq('user_id', user.id);

      if (statusesData) {
        setStatuses(statusesData.map((s: StatusData & { id: string }) => ({
          id: s.id,
          name: s.statuses?.name || '',
          startDate: s.start_date,
          endDate: s.end_date,
        })));
      }
    } catch (error) {
      console.error('医療情報読み込みエラー:', error);
    } finally {
      setLoadingMedical(false);
    }
  };

  const loadUserPosts = async () => {
    setLoadingPosts(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('id, content, created_at, user_id')
        .eq('user_id', user.id)
        .is('parent_post_id', null)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

      if (!postsData || postsData.length === 0) {
        setUserPosts([]);
        return;
      }

      // ユーザー情報を取得
      const { data: userData } = await supabase
        .from('users')
        .select('user_id, display_name, avatar_url')
        .eq('user_id', user.id)
        .single();

      // タグを一括取得
      const postIds = postsData.map(p => p.id);
      const tagsMap = await fetchTagsForPosts(postIds);

      const formattedPosts: Post[] = postsData.map((post: any) => {
        const tags = tagsMap.get(post.id) || { diagnoses: [], treatments: [], medications: [] };
        return {
          id: post.id,
          content: post.content,
          created_at: post.created_at,
          user: {
            display_name: userData?.display_name || 'Unknown',
            user_id: post.user_id,
            avatar_url: userData?.avatar_url || null,
          },
          diagnoses: tags.diagnoses,
          treatments: tags.treatments,
          medications: tags.medications,
        };
      });

      setUserPosts(formattedPosts);
    } catch (error) {
      console.error('投稿取得エラー:', error);
    } finally {
      setLoadingPosts(false);
    }
  };

  const loadLikedPosts = async () => {
    setLoadingLikes(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: likesData, error: likesError } = await supabase
        .from('likes')
        .select('post_id, posts!inner(id, content, created_at, user_id)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (likesError) throw likesError;

      if (!likesData || likesData.length === 0) {
        setLikedPosts([]);
        return;
      }

      // 投稿者のユーザー情報を取得
      const postUserIds = [...new Set(likesData.map((like: any) => like.posts.user_id))];
      const { data: usersData } = await supabase
        .from('users')
        .select('user_id, display_name, avatar_url')
        .in('user_id', postUserIds);

      // ユーザー情報をマップに変換
      const usersMap = new Map(
        (usersData || []).map(u => [u.user_id, { display_name: u.display_name, avatar_url: u.avatar_url }])
      );

      // タグを一括取得
      const postIds = likesData.map((like: any) => like.posts.id);
      const tagsMap = await fetchTagsForPosts(postIds);

      const formattedPosts: Post[] = likesData.map((like: any) => {
        const tags = tagsMap.get(like.posts.id) || { diagnoses: [], treatments: [], medications: [] };
        return {
          id: like.posts.id,
          content: like.posts.content,
          created_at: like.posts.created_at,
          user: {
            display_name: usersMap.get(like.posts.user_id)?.display_name || 'Unknown',
            user_id: like.posts.user_id,
            avatar_url: usersMap.get(like.posts.user_id)?.avatar_url || null,
          },
          diagnoses: tags.diagnoses,
          treatments: tags.treatments,
          medications: tags.medications,
        };
      });

      setLikedPosts(formattedPosts);
    } catch (error) {
      console.error('いいね取得エラー:', error);
    } finally {
      setLoadingLikes(false);
    }
  };

  const loadBookmarkedPosts = async () => {
    setLoadingBookmarks(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: bookmarksData, error: bookmarksError } = await supabase
        .from('bookmarks')
        .select('post_id, posts!inner(id, content, created_at, user_id)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (bookmarksError) throw bookmarksError;

      if (!bookmarksData || bookmarksData.length === 0) {
        setBookmarkedPosts([]);
        return;
      }

      // 投稿者のユーザー情報を取得
      const postUserIds = [...new Set(bookmarksData.map((bookmark: any) => bookmark.posts.user_id))];
      const { data: usersData } = await supabase
        .from('users')
        .select('user_id, display_name, avatar_url')
        .in('user_id', postUserIds);

      // ユーザー情報をマップに変換
      const usersMap = new Map(
        (usersData || []).map(u => [u.user_id, { display_name: u.display_name, avatar_url: u.avatar_url }])
      );

      // タグを一括取得
      const postIds = bookmarksData.map((bookmark: any) => bookmark.posts.id);
      const tagsMap = await fetchTagsForPosts(postIds);

      const formattedPosts: Post[] = bookmarksData.map((bookmark: any) => {
        const tags = tagsMap.get(bookmark.posts.id) || { diagnoses: [], treatments: [], medications: [] };
        return {
          id: bookmark.posts.id,
          content: bookmark.posts.content,
          created_at: bookmark.posts.created_at,
          user: {
            display_name: usersMap.get(bookmark.posts.user_id)?.display_name || 'Unknown',
            user_id: bookmark.posts.user_id,
            avatar_url: usersMap.get(bookmark.posts.user_id)?.avatar_url || null,
          },
          diagnoses: tags.diagnoses,
          treatments: tags.treatments,
          medications: tags.medications,
        };
      });

      setBookmarkedPosts(formattedPosts);
    } catch (error) {
      console.error('ブックマーク取得エラー:', error);
    } finally {
      setLoadingBookmarks(false);
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
        .select('display_name, created_at, bio')
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

  const fetchTagsForPosts = async (postIds: string[]): Promise<Map<string, { diagnoses: string[]; treatments: string[]; medications: string[] }>> => {
    const { data: diagnosesTagsData } = await supabase
      .from('post_diagnoses')
      .select('post_id, user_diagnoses(diagnoses(name))')
      .in('post_id', postIds);

    const { data: treatmentsTagsData } = await supabase
      .from('post_treatments')
      .select('post_id, user_treatments(treatments(name))')
      .in('post_id', postIds);

    const { data: medicationsTagsData } = await supabase
      .from('post_medications')
      .select('post_id, user_medications(ingredients(name), products(name))')
      .in('post_id', postIds);

    const tagsMap = new Map<string, { diagnoses: string[]; treatments: string[]; medications: string[] }>();
    postIds.forEach(postId => {
      const diagnoses: string[] = [];
      const treatments: string[] = [];
      const medications: string[] = [];

      diagnosesTagsData?.forEach((d: any) => {
        if (d.post_id === postId && d.user_diagnoses?.diagnoses?.name) {
          diagnoses.push(d.user_diagnoses.diagnoses.name);
        }
      });

      treatmentsTagsData?.forEach((t: any) => {
        if (t.post_id === postId && t.user_treatments?.treatments?.name) {
          treatments.push(t.user_treatments.treatments.name);
        }
      });

      medicationsTagsData?.forEach((m: any) => {
        if (m.post_id === postId) {
          const name = m.user_medications?.ingredients?.name;
          // 重複を避ける
          if (name && !medications.includes(name)) {
            medications.push(name);
          }
        }
      });

      tagsMap.set(postId, { diagnoses, treatments, medications });
    });

    return tagsMap;
  };

  const handleSaveBio = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('users')
        .update({ bio })
        .eq('user_id', user.id);

      if (error) {
        Alert.alert('エラー', '自由記述の保存に失敗しました');
        return;
      }

      Alert.alert('成功', '自由記述を保存しました');
      loadUserProfile();
    } catch (error) {
      Alert.alert('エラー', '予期しないエラーが発生しました');
    }
  };


  const renderHeader = () => (
    <>
      <ProfileHeader profile={profile!} onLogout={handleLogout} />

      {/* タブバー */}
      <HStack className="border-b border-outline-200">
        <Button
          onPress={() => setActiveTab('profile')}
          variant="link"
          className={`flex-1 rounded-none ${activeTab === 'profile' ? 'border-b-2 border-primary-500' : ''}`}
        >
          <ButtonText className={activeTab === 'profile' ? 'text-primary-600 font-semibold' : 'text-typography-500'}>
            プロフィール
          </ButtonText>
        </Button>
        <Button
          onPress={() => setActiveTab('posts')}
          variant="link"
          className={`flex-1 rounded-none ${activeTab === 'posts' ? 'border-b-2 border-primary-500' : ''}`}
        >
          <ButtonText className={activeTab === 'posts' ? 'text-primary-600 font-semibold' : 'text-typography-500'}>
            投稿
          </ButtonText>
        </Button>
        <Button
          onPress={() => setActiveTab('likes')}
          variant="link"
          className={`flex-1 rounded-none ${activeTab === 'likes' ? 'border-b-2 border-primary-500' : ''}`}
        >
          <ButtonText className={activeTab === 'likes' ? 'text-primary-600 font-semibold' : 'text-typography-500'}>
            いいね
          </ButtonText>
        </Button>
        <Button
          onPress={() => setActiveTab('bookmarks')}
          variant="link"
          className={`flex-1 rounded-none ${activeTab === 'bookmarks' ? 'border-b-2 border-primary-500' : ''}`}
        >
          <ButtonText className={activeTab === 'bookmarks' ? 'text-primary-600 font-semibold' : 'text-typography-500'}>
            ブックマーク
          </ButtonText>
        </Button>
      </HStack>

      {/* プロフィールタブの内容 */}
      {activeTab === 'profile' && (
        <>
          <MedicalSection
            title="診断名"
            records={diagnoses}
            onAdd={() => openSelectModal('diagnosis')}
            onDelete={deleteDiagnosis}
            loading={loadingMedical}
          />
          <MedicalSection
            title="服薬"
            records={medications}
            onAdd={() => openSelectModal('medication')}
            onDelete={deleteMedication}
            loading={loadingMedical}
          />
          <MedicalSection
            title="治療"
            records={treatments}
            onAdd={() => openSelectModal('treatment')}
            onDelete={deleteTreatment}
            loading={loadingMedical}
          />
          <MedicalSection
            title="ステータス"
            records={statuses}
            onAdd={() => openSelectModal('status')}
            onDelete={deleteStatus}
            loading={loadingMedical}
          />

          {/* Bio編集 */}
          <Box className="px-5 py-4">
            <VStack space="sm">
              <Text className="text-base font-semibold">自由記述</Text>
              <Textarea size="md" className="min-h-32">
                <TextareaInput
                  placeholder="自己紹介など"
                  value={bio}
                  onChangeText={setBio}
                  maxLength={500}
                />
              </Textarea>
              <Button onPress={handleSaveBio} size="sm" className="self-end">
                <ButtonText>保存</ButtonText>
              </Button>
            </VStack>
          </Box>

          {/* 自分のプロフィールを表示 */}
          <Box className="px-5 py-4 border-t border-outline-200">
            <Button
              onPress={async () => {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                  router.push(`/user/${user.id}`);
                }
              }}
              variant="outline"
              className="w-full"
            >
              <ButtonText>自分のプロフィール</ButtonText>
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

      {/* 選択モーダル */}
      <SelectModal
        isOpen={showSelectModal}
        onClose={() => setShowSelectModal(false)}
        title={
          selectModalType === 'diagnosis' ? '診断名を選択' :
          selectModalType === 'medication' ? '服薬を選択' :
          selectModalType === 'treatment' ? '治療を選択' :
          'ステータスを選択'
        }
        masters={
          selectModalType === 'diagnosis' ? diagnosisMasters :
          selectModalType === 'medication' ? medicationMasters :
          selectModalType === 'treatment' ? treatmentMasters :
          statusMasters
        }
        existingItems={
          selectModalType === 'diagnosis' ? diagnoses :
          selectModalType === 'medication' ? medications :
          selectModalType === 'treatment' ? treatments :
          statuses
        }
        onSelect={(id) => handleSelectItem(id, selectModalType)}
        emptyMessage={
          selectModalType === 'diagnosis' ? '追加可能な診断名がありません' :
          selectModalType === 'medication' ? '追加可能な服薬がありません' :
          selectModalType === 'treatment' ? '追加可能な治療がありません' :
          '追加可能なステータスがありません'
        }
      />

      {/* 日付選択モーダル（年月選択） */}
      <DatePickerModal
        isOpen={showDateModal}
        onClose={() => setShowDateModal(false)}
        onSave={
          selectedDiagnosisId
            ? saveDiagnosisWithDate
            : selectedStatusId
            ? saveStatusWithDate
            : selectedTreatmentId
            ? saveTreatmentWithDate
            : saveMedicationWithDate
        }
        initialStartYear={startYear}
        initialStartMonth={startMonth}
        initialEndYear={endYear}
        initialEndMonth={endMonth}
      />
    </LoginPrompt>
  );
}
