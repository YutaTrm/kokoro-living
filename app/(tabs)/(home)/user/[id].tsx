import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList } from 'react-native';

import PostItem from '@/components/PostItem';
import MedicalSection from '@/components/profile/MedicalSection';
import { Text } from '@/components/Themed';
import { Avatar, AvatarFallbackText, AvatarImage } from '@/components/ui/avatar';
import { Box } from '@/components/ui/box';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { Spinner } from '@/components/ui/spinner';
import { VStack } from '@/components/ui/vstack';
import { supabase } from '@/src/lib/supabase';

interface UserProfile {
  user_id: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
}

interface MedicalRecord {
  id: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
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

export default function UserDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [diagnoses, setDiagnoses] = useState<MedicalRecord[]>([]);
  const [treatments, setTreatments] = useState<MedicalRecord[]>([]);
  const [medications, setMedications] = useState<MedicalRecord[]>([]);
  const [statuses, setStatuses] = useState<MedicalRecord[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingMedical, setLoadingMedical] = useState(true);

  useEffect(() => {
    if (id) {
      loadUserProfile();
      loadMedicalRecords();
      loadUserPosts();
    }
  }, [id]);

  const loadUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('user_id, display_name, bio, avatar_url, created_at')
        .eq('user_id', id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('プロフィール取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMedicalRecords = async () => {
    setLoadingMedical(true);
    try {
      // 診断名を取得（display_flag=trueのみ、display_order順）
      const { data: diagnosesData } = await supabase
        .from('user_diagnoses')
        .select('id, diagnoses(name, display_flag, display_order), start_date, end_date')
        .eq('user_id', id);

      if (diagnosesData) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const filtered = diagnosesData
          .filter((d: any) => d.diagnoses?.display_flag !== false)
          .sort((a: any, b: any) => (a.diagnoses?.display_order || 0) - (b.diagnoses?.display_order || 0));
        setDiagnoses(
          filtered.map((d: any) => ({
            id: d.id,
            name: d.diagnoses?.name || '',
            startDate: d.start_date,
            endDate: d.end_date,
          }))
        );
      }

      // 治療を取得（display_flag=trueのみ、display_order順）
      const { data: treatmentsData } = await supabase
        .from('user_treatments')
        .select('id, treatments(name, display_flag, display_order), start_date, end_date')
        .eq('user_id', id);

      if (treatmentsData) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const filtered = treatmentsData
          .filter((t: any) => t.treatments?.display_flag !== false)
          .sort((a: any, b: any) => (a.treatments?.display_order || 0) - (b.treatments?.display_order || 0));
        setTreatments(
          filtered.map((t: any) => ({
            id: t.id,
            name: t.treatments?.name || '',
            startDate: t.start_date,
            endDate: t.end_date,
          }))
        );
      }

      // 服薬を取得（display_flag=trueのみ、display_order順）
      const { data: medicationsData } = await supabase
        .from('user_medications')
        .select('id, ingredient_id, ingredients(id, name, display_flag, display_order), products(name), start_date, end_date')
        .eq('user_id', id);

      const { data: allProducts } = await supabase.from('products').select('ingredient_id, name');

      if (medicationsData) {
        const productsByIngredient = new Map<string, string[]>();
        if (allProducts) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          allProducts.forEach((p: any) => {
            const existing = productsByIngredient.get(p.ingredient_id);
            if (existing) {
              existing.push(p.name);
            } else {
              productsByIngredient.set(p.ingredient_id, [p.name]);
            }
          });
        }

        const ingredientMap = new Map<
          string,
          {
            id: string;
            ingredientName: string;
            ingredientId: string;
            displayOrder: number;
            startDate: string | null;
            endDate: string | null;
          }
        >();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        medicationsData.forEach((m: any) => {
          const ingredientId = m.ingredient_id;
          const ingredientName = m.ingredients?.name || '';
          const displayFlag = m.ingredients?.display_flag;
          const displayOrder = m.ingredients?.display_order || 0;

          // display_flag=falseのものは除外
          if (displayFlag === false) return;

          if (ingredientName && ingredientId && !ingredientMap.has(ingredientId)) {
            ingredientMap.set(ingredientId, {
              id: m.id,
              ingredientName,
              ingredientId,
              displayOrder,
              startDate: m.start_date,
              endDate: m.end_date,
            });
          }
        });

        // display_order順にソート
        const sortedItems = Array.from(ingredientMap.values()).sort(
          (a, b) => a.displayOrder - b.displayOrder
        );

        const formatted: MedicalRecord[] = sortedItems.map((item) => {
          const productNames = productsByIngredient.get(item.ingredientId) || [];
          return {
            id: item.id,
            name:
              productNames.length > 0
                ? `${item.ingredientName}(${productNames.join('、')})`
                : item.ingredientName,
            startDate: item.startDate,
            endDate: item.endDate,
          };
        });

        setMedications(formatted);
      }

      // ステータスを取得（display_flag=trueのみ、display_order順）
      const { data: statusesData } = await supabase
        .from('user_statuses')
        .select('id, statuses(name, display_flag, display_order), start_date, end_date')
        .eq('user_id', id);

      if (statusesData) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const filtered = statusesData
          .filter((s: any) => s.statuses?.display_flag !== false)
          .sort((a: any, b: any) => (a.statuses?.display_order || 0) - (b.statuses?.display_order || 0));
        setStatuses(
          filtered.map((s: any) => ({
            id: s.id,
            name: s.statuses?.name || '',
            startDate: s.start_date,
            endDate: s.end_date,
          }))
        );
      }
    } catch (error) {
      console.error('医療情報取得エラー:', error);
    } finally {
      setLoadingMedical(false);
    }
  };

  const loadUserPosts = async () => {
    try {
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('id, content, created_at, user_id')
        .eq('user_id', id)
        .is('parent_post_id', null)
        .order('created_at', { ascending: false })
        .limit(20);

      if (postsError) throw postsError;

      if (!postsData || postsData.length === 0) {
        setPosts([]);
        return;
      }

      // ユーザー情報を取得
      const { data: userData } = await supabase
        .from('users')
        .select('user_id, display_name, avatar_url')
        .eq('user_id', id)
        .single();

      // タグを取得
      const postIds = postsData.map((p) => p.id);

      const { data: diagnosesData } = await supabase
        .from('post_diagnoses')
        .select('post_id, user_diagnoses(diagnoses(name))')
        .in('post_id', postIds);

      const { data: treatmentsData } = await supabase
        .from('post_treatments')
        .select('post_id, user_treatments(treatments(name))')
        .in('post_id', postIds);

      const { data: medicationsData } = await supabase
        .from('post_medications')
        .select('post_id, user_medications(ingredients(name), products(name))')
        .in('post_id', postIds);

      const diagnosesMap = new Map<string, string[]>();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      diagnosesData?.forEach((d: any) => {
        const name = d.user_diagnoses?.diagnoses?.name;
        if (name) {
          if (!diagnosesMap.has(d.post_id)) {
            diagnosesMap.set(d.post_id, []);
          }
          diagnosesMap.get(d.post_id)?.push(name);
        }
      });

      const treatmentsMap = new Map<string, string[]>();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      treatmentsData?.forEach((t: any) => {
        const name = t.user_treatments?.treatments?.name;
        if (name) {
          if (!treatmentsMap.has(t.post_id)) {
            treatmentsMap.set(t.post_id, []);
          }
          treatmentsMap.get(t.post_id)?.push(name);
        }
      });

      const medicationsMap = new Map<string, string[]>();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      medicationsData?.forEach((m: any) => {
        const name = m.user_medications?.ingredients?.name;
        if (name) {
          if (!medicationsMap.has(m.post_id)) {
            medicationsMap.set(m.post_id, []);
          }
          const meds = medicationsMap.get(m.post_id)!;
          if (!meds.includes(name)) {
            meds.push(name);
          }
        }
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formattedPosts: Post[] = postsData.map((post: any) => ({
        id: post.id,
        content: post.content,
        created_at: post.created_at,
        user: {
          display_name: userData?.display_name || 'Unknown',
          user_id: post.user_id,
          avatar_url: userData?.avatar_url || null,
        },
        diagnoses: diagnosesMap.get(post.id) || [],
        treatments: treatmentsMap.get(post.id) || [],
        medications: medicationsMap.get(post.id) || [],
      }));

      setPosts(formattedPosts);
    } catch (error) {
      console.error('投稿取得エラー:', error);
    }
  };

  const renderHeader = () => {
    if (!profile) return null;

    return (
      <>
        {/* プロフィールヘッダー */}
        <Box className="p-4">
          <HStack className="mt-2" space="md">
            <Avatar size="lg">
              <AvatarFallbackText>{profile.display_name}</AvatarFallbackText>
              {profile.avatar_url && <AvatarImage source={{ uri: profile.avatar_url }} />}
            </Avatar>
            <VStack className="flex-1 justify-center" space="xs">
              <Heading size="xl" className="text-primary-300">
                {profile.display_name}
              </Heading>
              <Text className="text-sm text-primary-300">
                登録日: {new Date(profile.created_at).toLocaleDateString('ja-JP')}
              </Text>
            </VStack>
          </HStack>

          {/* Bio */}
          {profile.bio && (
            <Box className="mt-3">
              <Text className="text-base">{profile.bio}</Text>
            </Box>
          )}
        </Box>

        {/* 医療情報 */}
        <MedicalSection title="診断名" records={diagnoses} loading={loadingMedical} readonly />
        <MedicalSection title="服薬" records={medications} loading={loadingMedical} readonly />
        <MedicalSection title="治療" records={treatments} loading={loadingMedical} readonly />
        <MedicalSection title="ステータス" records={statuses} loading={loadingMedical} readonly />

        {/* 投稿セクションヘッダー */}
        <Box className="p-4 border-t border-outline-200">
          <Heading size="lg">投稿</Heading>
        </Box>
      </>
    );
  };

  const renderEmptyPosts = () => (
    <Box className="px-5 py-8">
      <Text className="text-base text-center opacity-50">まだ投稿がありません</Text>
    </Box>
  );

  if (loading) {
    return (
      <Box className="flex-1 items-center justify-center">
        <Spinner size="large" />
      </Box>
    );
  }

  if (!profile) {
    return (
      <Box className="flex-1 items-center justify-center p-5">
        <Text className="text-base opacity-70">ユーザーが見つかりませんでした</Text>
      </Box>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: profile.display_name }} />
      <Box className="flex-1 bg-background-0">
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <PostItem post={item} disableAvatarTap />}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmptyPosts}
        />
      </Box>
    </>
  );
}
