import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable } from 'react-native';

import FollowButton from '@/components/FollowButton';
import PostItem from '@/components/PostItem';
import MedicalSection from '@/components/profile/MedicalSection';
import ProfileTabBar, { TabType } from '@/components/profile/ProfileTabBar';
import { Text } from '@/components/Themed';
import { Avatar, AvatarFallbackText, AvatarImage } from '@/components/ui/avatar';
import { Box } from '@/components/ui/box';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { Spinner } from '@/components/ui/spinner';
import { VStack } from '@/components/ui/vstack';
import { useFollow } from '@/src/hooks/useFollow';
import { supabase } from '@/src/lib/supabase';
import { sortByStartDate } from '@/src/utils/sortByStartDate';

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
  const router = useRouter();
  const { isFollowing, isLoading: followLoading, toggleFollow, counts, isOwnProfile, currentUserId } = useFollow(id ?? null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [diagnoses, setDiagnoses] = useState<MedicalRecord[]>([]);
  const [treatments, setTreatments] = useState<MedicalRecord[]>([]);
  const [medications, setMedications] = useState<MedicalRecord[]>([]);
  const [statuses, setStatuses] = useState<MedicalRecord[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [likedPosts, setLikedPosts] = useState<Post[]>([]);
  const [loadingMedical, setLoadingMedical] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [loadingLikes, setLoadingLikes] = useState(false);

  useEffect(() => {
    if (id) {
      loadUserProfile();
      loadMedicalRecords();
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    if (activeTab === 'posts' && posts.length === 0) {
      loadUserPosts();
    } else if (activeTab === 'likes' && likedPosts.length === 0) {
      loadLikedPosts();
    }
  }, [id, activeTab]);

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
          .filter((d: any) => d.diagnoses?.display_flag !== false);
        const formatted = filtered.map((d: any) => ({
          id: d.id,
          name: d.diagnoses?.name || '',
          startDate: d.start_date,
          endDate: d.end_date,
        }));
        setDiagnoses(sortByStartDate(formatted));
      }

      // 治療を取得（display_flag=trueのみ、display_order順）
      const { data: treatmentsData } = await supabase
        .from('user_treatments')
        .select('id, treatments(name, display_flag, display_order), start_date, end_date')
        .eq('user_id', id);

      if (treatmentsData) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const filtered = treatmentsData
          .filter((t: any) => t.treatments?.display_flag !== false);
        const formatted = filtered.map((t: any) => ({
          id: t.id,
          name: t.treatments?.name || '',
          startDate: t.start_date,
          endDate: t.end_date,
        }));
        setTreatments(sortByStartDate(formatted));
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

        const formatted: MedicalRecord[] = Array.from(ingredientMap.values()).map((item) => {
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

        setMedications(sortByStartDate(formatted));
      }

      // ステータスを取得（display_flag=trueのみ、display_order順）
      const { data: statusesData } = await supabase
        .from('user_statuses')
        .select('id, statuses(name, display_flag, display_order), start_date, end_date')
        .eq('user_id', id);

      if (statusesData) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const filtered = statusesData
          .filter((s: any) => s.statuses?.display_flag !== false);
        const formatted = filtered.map((s: any) => ({
          id: s.id,
          name: s.statuses?.name || '',
          startDate: s.start_date,
          endDate: s.end_date,
        }));
        setStatuses(sortByStartDate(formatted));
      }
    } catch (error) {
      console.error('医療情報取得エラー:', error);
    } finally {
      setLoadingMedical(false);
    }
  };

  const loadUserPosts = async () => {
    setLoadingPosts(true);
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
    } finally {
      setLoadingPosts(false);
    }
  };

  const loadLikedPosts = async () => {
    setLoadingLikes(true);
    try {
      // いいねした投稿のIDを取得
      const { data: likesData, error: likesError } = await supabase
        .from('likes')
        .select('post_id')
        .eq('user_id', id)
        .order('created_at', { ascending: false });

      if (likesError) throw likesError;

      if (!likesData || likesData.length === 0) {
        setLikedPosts([]);
        return;
      }

      const postIds = likesData.map((l) => l.post_id);

      // 投稿データを取得
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('id, content, created_at, user_id')
        .in('id', postIds)
        .is('parent_post_id', null);

      if (postsError) throw postsError;

      if (!postsData || postsData.length === 0) {
        setLikedPosts([]);
        return;
      }

      // ユーザー情報を取得
      const userIds = [...new Set(postsData.map((p) => p.user_id))];
      const { data: usersData } = await supabase
        .from('users')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds);

      const usersMap = new Map(usersData?.map((u) => [u.user_id, u]) || []);

      // タグを取得
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
        .select('post_id, user_medications(ingredients(name))')
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

      // いいねの順序を保持するためにpostIdsの順序でソート
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formattedPosts: Post[] = postIds
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((postId) => postsData.find((p: any) => p.id === postId))
        .filter(Boolean)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((post: any) => {
          const user = usersMap.get(post.user_id);
          return {
            id: post.id,
            content: post.content,
            created_at: post.created_at,
            user: {
              display_name: user?.display_name || 'Unknown',
              user_id: post.user_id,
              avatar_url: user?.avatar_url || null,
            },
            diagnoses: diagnosesMap.get(post.id) || [],
            treatments: treatmentsMap.get(post.id) || [],
            medications: medicationsMap.get(post.id) || [],
          };
        });

      setLikedPosts(formattedPosts);
    } catch (error) {
      console.error('いいね取得エラー:', error);
    } finally {
      setLoadingLikes(false);
    }
  };

  const handleFollowCountPress = (type: 'following' | 'followers') => {
    if (!id) return;
    router.push(`/(tabs)/(home)/user/${id}/${type}`);
  };

  const renderHeader = () => {
    if (!profile) return null;

    return (
      <>
        {/* プロフィールヘッダー */}
        <Box className="p-4">
          <HStack className="mt-2 items-start" space="md">
            <Avatar size="lg">
              <AvatarFallbackText>{profile.display_name}</AvatarFallbackText>
              {profile.avatar_url && <AvatarImage source={{ uri: profile.avatar_url }} />}
            </Avatar>
            <VStack className="flex-1" space="xs">
              <HStack className="justify-between items-start">
                <VStack>
                  <Heading size="xl" className="text-primary-300">
                    {profile.display_name}
                  </Heading>
                  <Text className="text-sm text-primary-300">
                    登録日: {new Date(profile.created_at).toLocaleDateString('ja-JP')}
                  </Text>
                </VStack>
              </HStack>
              {/* フォロー数 */}
              <HStack space="md" className="items-center mt-2">
                <Pressable onPress={() => handleFollowCountPress('following')}>
                  <HStack space="xs">
                    <Text className="font-bold">{counts.followingCount}</Text>
                    <Text className="text-typography-500">フォロー</Text>
                  </HStack>
                </Pressable>
                <Pressable onPress={() => handleFollowCountPress('followers')}>
                  <HStack space="xs">
                    <Text className="font-bold">{counts.followersCount}</Text>
                    <Text className="text-typography-500">フォロワー</Text>
                  </HStack>
                </Pressable>
                {!isOwnProfile && currentUserId && (
                  <FollowButton
                    isFollowing={isFollowing}
                    isLoading={followLoading}
                    onToggle={toggleFollow}
                    isLoggedIn={!!currentUserId}
                  />
                )}
              </HStack>
            </VStack>
          </HStack>

          {/* Bio */}
          {profile.bio && (
            <Box className="mt-3">
              <Text className="text-base">{profile.bio}</Text>
            </Box>
          )}
        </Box>

        {/* タブバー */}
        <ProfileTabBar activeTab={activeTab} onTabChange={setActiveTab} showBookmarks={false} />

        {/* プロフィールタブの内容 */}
        {activeTab === 'profile' && (
          <>
            <MedicalSection title="診断名" records={diagnoses} loading={loadingMedical} readonly />
            <MedicalSection title="服薬" records={medications} loading={loadingMedical} readonly />
            <MedicalSection title="治療" records={treatments} loading={loadingMedical} readonly />
            <MedicalSection title="ステータス" records={statuses} loading={loadingMedical} readonly />
          </>
        )}
      </>
    );
  };

  const renderEmptyContent = () => {
    if (activeTab === 'profile') return null;

    const isLoading = activeTab === 'posts' ? loadingPosts : loadingLikes;
    if (isLoading) {
      return (
        <Box className="px-5 py-8 items-center">
          <Spinner size="small" />
        </Box>
      );
    }

    const message = activeTab === 'posts' ? 'まだ投稿がありません' : 'まだいいねがありません';
    return (
      <Box className="px-5 py-8">
        <Text className="text-base text-center opacity-50">{message}</Text>
      </Box>
    );
  };

  const getListData = () => {
    if (activeTab === 'profile') return [];
    if (activeTab === 'posts') return posts;
    if (activeTab === 'likes') return likedPosts;
    return [];
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
      <Box className="flex-1 bg-background-0">
        <FlatList
          data={getListData()}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <PostItem post={item} disableAvatarTap />}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmptyContent}
        />
      </Box>
    </>
  );
}
