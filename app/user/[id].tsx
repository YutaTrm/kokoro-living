import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, ScrollView as RNScrollView } from 'react-native';

import PostItem from '@/components/PostItem';
import { Text } from '@/components/Themed';
import { Avatar, AvatarFallbackText, AvatarImage } from '@/components/ui/avatar';
import { Box } from '@/components/ui/box';
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
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [diagnoses, setDiagnoses] = useState<MedicalRecord[]>([]);
  const [treatments, setTreatments] = useState<MedicalRecord[]>([]);
  const [medications, setMedications] = useState<MedicalRecord[]>([]);
  const [statuses, setStatuses] = useState<MedicalRecord[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);

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
    try {
      // 診断名を取得
      const { data: diagnosesData } = await supabase
        .from('user_diagnoses')
        .select('id, diagnoses(name), start_date, end_date')
        .eq('user_id', id);

      if (diagnosesData) {
        setDiagnoses(
          diagnosesData.map((d: any) => ({
            id: d.id,
            name: d.diagnoses?.name || '',
            startDate: d.start_date,
            endDate: d.end_date,
          }))
        );
      }

      // 治療を取得
      const { data: treatmentsData } = await supabase
        .from('user_treatments')
        .select('id, treatments(name), start_date, end_date')
        .eq('user_id', id);

      if (treatmentsData) {
        setTreatments(
          treatmentsData.map((t: any) => ({
            id: t.id,
            name: t.treatments?.name || '',
            startDate: t.start_date,
            endDate: t.end_date,
          }))
        );
      }

      // 服薬を取得
      const { data: medicationsData } = await supabase
        .from('user_medications')
        .select('id, ingredients(name), products(name), start_date, end_date')
        .eq('user_id', id);

      if (medicationsData) {
        setMedications(
          medicationsData.map((m: any) => ({
            id: m.id,
            name: m.products?.name || m.ingredients?.name || '',
            startDate: m.start_date,
            endDate: m.end_date,
          }))
        );
      }

      // ステータスを取得
      const { data: statusesData } = await supabase
        .from('user_statuses')
        .select('id, statuses(name), start_date, end_date')
        .eq('user_id', id);

      if (statusesData) {
        setStatuses(
          statusesData.map((s: any) => ({
            id: s.id,
            name: s.statuses?.name || '',
            startDate: s.start_date,
            endDate: s.end_date,
          }))
        );
      }
    } catch (error) {
      console.error('医療情報取得エラー:', error);
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
      medicationsData?.forEach((m: any) => {
        const name = m.user_medications?.ingredients?.name;
        if (name) {
          if (!medicationsMap.has(m.post_id)) {
            medicationsMap.set(m.post_id, []);
          }
          const medications = medicationsMap.get(m.post_id)!;
          // 重複を避ける
          if (!medications.includes(name)) {
            medications.push(name);
          }
        }
      });

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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' });
  };

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
      <RNScrollView className="flex-1 bg-background-0">
        {/* プロフィールヘッダー */}
        <Box className="px-4 py-4 border-b border-outline-200">
          <HStack space="md" className="items-center mb-3">
            <Avatar size="lg">
              {profile.avatar_url ? (
                <AvatarImage source={{ uri: profile.avatar_url }} />
              ) : (
                <AvatarFallbackText>{profile.display_name}</AvatarFallbackText>
              )}
            </Avatar>
            <VStack className="flex-1">
              <Text className="font-bold text-xl">{profile.display_name}</Text>
              <Text className="text-sm text-typography-500">
                登録日: {formatDate(profile.created_at)}
              </Text>
            </VStack>
          </HStack>

          {/* Bio */}
          {profile.bio && (
            <Box className="mb-3">
              <Text className="text-base">{profile.bio}</Text>
            </Box>
          )}

          {/* 医療情報 */}
          <VStack space="sm">
            {/* 診断名 */}
            {diagnoses.length > 0 && (
              <Box>
                <Text className="text-xs text-typography-500 mb-1">診断名</Text>
                <Box className="flex-row flex-wrap gap-1">
                  {diagnoses.map((d) => {
                    const isEnded = d.endDate !== null;
                    return (
                      <>
                        {/* <Icon className="text-xs" as={FileCheck} /> */}
                        <Box key={d.id} className="text-center rounded py-1 px-2 bg-fuchsia-400">
                          <Text className="text-xs">{d.name}</Text>
                        </Box>
                      </>
                    );
                  })}
                </Box>
              </Box>
            )}

            {/* 治療 */}
            {treatments.length > 0 && (
              <Box>
                <Text className="text-xs text-typography-500 mb-1">治療</Text>
                <Box className="flex-row flex-wrap gap-1">
                  {treatments.map((t) => {
                    // const isEnded = t.endDate !== null;
                    return (
                      <Box key={t.id} className="text-center rounded py-1 px-2 bg-green-400">
                        <Text className="text-xs">{t.name}</Text>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            )}

            {/* 服薬 */}
            {medications.length > 0 && (
              <Box>
                <Text className="text-xs text-typography-500 mb-1">服薬</Text>
                <Box className="flex-row flex-wrap gap-1">
                  {medications.map((m) => {
                    const isEnded = m.endDate !== null;
                    return (
                      <Box key={m.id} className="text-center rounded py-1 px-2 bg-cyan-400">
                        <Text className="text-xs">{m.name}</Text>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            )}

            {/* ステータス */}
            {statuses.length > 0 && (
              <Box>
                <Text className="text-xs text-typography-500 mb-1">ステータス</Text>
                <Box className="flex-row flex-wrap gap-1">
                  {statuses.map((s) => {
                    const isEnded = s.endDate !== null;
                    return (
                      <Box key={s.id} className="text-center rounded py-1 px-2 bg-amber-400">
                        <Text className="text-xs">{s.name}</Text>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            )}
          </VStack>
        </Box>

        {/* 投稿一覧 */}
        <Box className="pt-3">
          <Text className="px-4 font-semibold text-base mb-2">投稿</Text>
          {posts.length === 0 ? (
            <Box className="px-4 py-8">
              <Text className="text-base text-center opacity-50">まだ投稿がありません</Text>
            </Box>
          ) : (
            <FlatList
              data={posts}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <PostItem post={item} disableAvatarTap={true} />}
              scrollEnabled={false}
            />
          )}
        </Box>
      </RNScrollView>
    </>
  );
}
