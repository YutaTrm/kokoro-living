import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, FlatList, ScrollView } from 'react-native';

import DatePickerModal from '@/components/profile/DatePickerModal';
import DiagnosisModal from '@/components/profile/DiagnosisModal';
import MedicalSection from '@/components/profile/MedicalSection';
import ProfileHeader from '@/components/profile/ProfileHeader';
import PostItem from '@/components/PostItem';
import { Text } from '@/components/Themed';
import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Spinner } from '@/components/ui/spinner';
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

interface Post {
  id: string;
  content: string;
  created_at: string;
  user: {
    display_name: string;
    user_id: string;
  };
  tags: string[];
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

  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [likedPosts, setLikedPosts] = useState<Post[]>([]);
  const [bookmarkedPosts, setBookmarkedPosts] = useState<Post[]>([]);

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

  const loadUserPosts = async () => {
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
        .select('user_id, display_name')
        .eq('user_id', user.id)
        .single();

      const formattedPosts: Post[] = postsData.map((post: any) => ({
        id: post.id,
        content: post.content,
        created_at: post.created_at,
        user: {
          display_name: userData?.display_name || 'Unknown',
          user_id: post.user_id,
        },
        tags: [],
      }));

      setUserPosts(formattedPosts);
    } catch (error) {
      console.error('投稿取得エラー:', error);
    }
  };

  const loadLikedPosts = async () => {
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
        .select('user_id, display_name')
        .in('user_id', postUserIds);

      // ユーザー情報をマップに変換
      const usersMap = new Map(
        (usersData || []).map(u => [u.user_id, u.display_name])
      );

      const formattedPosts: Post[] = likesData.map((like: any) => ({
        id: like.posts.id,
        content: like.posts.content,
        created_at: like.posts.created_at,
        user: {
          display_name: usersMap.get(like.posts.user_id) || 'Unknown',
          user_id: like.posts.user_id,
        },
        tags: [],
      }));

      setLikedPosts(formattedPosts);
    } catch (error) {
      console.error('いいね取得エラー:', error);
    }
  };

  const loadBookmarkedPosts = async () => {
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
        .select('user_id, display_name')
        .in('user_id', postUserIds);

      // ユーザー情報をマップに変換
      const usersMap = new Map(
        (usersData || []).map(u => [u.user_id, u.display_name])
      );

      const formattedPosts: Post[] = bookmarksData.map((bookmark: any) => ({
        id: bookmark.posts.id,
        content: bookmark.posts.content,
        created_at: bookmark.posts.created_at,
        user: {
          display_name: usersMap.get(bookmark.posts.user_id) || 'Unknown',
          user_id: bookmark.posts.user_id,
        },
        tags: [],
      }));

      setBookmarkedPosts(formattedPosts);
    } catch (error) {
      console.error('ブックマーク取得エラー:', error);
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


  if (loading) {
    return (
      <Box className="flex-1 items-center justify-center p-5">
        <Spinner size="large" />
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
      <ProfileHeader profile={profile} onLogout={handleLogout} />

      {/* タブバー */}
      <HStack className="border-b border-outline-200 mb-4">
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

      {/* タブの内容 */}
      {activeTab === 'profile' && (
        <>
          <MedicalSection
            title="診断名"
            records={diagnoses}
            onAdd={() => setShowDiagnosisModal(true)}
            onDelete={deleteDiagnosis}
          />
          <MedicalSection
            title="服薬"
            records={medications}
            onAdd={() => setShowMedicationModal(true)}
            onDelete={() => {}}
          />
          <MedicalSection
            title="治療"
            records={treatments}
            onAdd={() => setShowTreatmentModal(true)}
            onDelete={() => {}}
          />
        </>
      )}

      {activeTab === 'posts' && (
        <Box className="flex-1">
          {userPosts.length === 0 ? (
            <Box className="px-5">
              <Text className="text-base opacity-50 text-center py-8">まだ投稿がありません</Text>
            </Box>
          ) : (
            <FlatList
              data={userPosts}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <PostItem post={item} />}
            />
          )}
        </Box>
      )}

      {activeTab === 'likes' && (
        <Box className="flex-1">
          {likedPosts.length === 0 ? (
            <Box className="px-5">
              <Text className="text-base opacity-50 text-center py-8">まだいいねがありません</Text>
            </Box>
          ) : (
            <FlatList
              data={likedPosts}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <PostItem post={item} />}
            />
          )}
        </Box>
      )}

      {activeTab === 'bookmarks' && (
        <Box className="flex-1">
          {bookmarkedPosts.length === 0 ? (
            <Box className="px-5">
              <Text className="text-base opacity-50 text-center py-8">まだブックマークがありません</Text>
            </Box>
          ) : (
            <FlatList
              data={bookmarkedPosts}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <PostItem post={item} />}
            />
          )}
        </Box>
      )}

      {/* 診断名追加モーダル */}
      <DiagnosisModal
        isOpen={showDiagnosisModal}
        onClose={() => setShowDiagnosisModal(false)}
        diagnosisMasters={diagnosisMasters}
        existingDiagnoses={diagnoses}
        onSelect={selectDiagnosisForDate}
      />

      {/* 日付選択モーダル（年月選択） */}
      <DatePickerModal
        isOpen={showDateModal}
        onClose={() => setShowDateModal(false)}
        onSave={saveDiagnosisWithDate}
        initialStartYear={startYear}
        initialStartMonth={startMonth}
        initialEndYear={endYear}
        initialEndMonth={endMonth}
      />
    </ScrollView>
  );
}
