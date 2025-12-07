import { Stack, useLocalSearchParams, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, FlatList, Pressable } from 'react-native';

import AddToListModal from '@/components/AddToListModal';
import ConfirmModal from '@/components/ConfirmModal';
import FollowButton from '@/components/FollowButton';
import DefaultAvatar from '@/components/icons/DefaultAvatar';
import PostItem from '@/components/PostItem';
import MedicalSection from '@/components/profile/MedicalSection';
import ProfileTabBar, { TabType } from '@/components/profile/ProfileTabBar';
import { Avatar, AvatarImage } from '@/components/ui/avatar';
import { Box } from '@/components/ui/box';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Menu, MenuItem, MenuItemLabel } from '@/components/ui/menu';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useMasterData } from '@/src/contexts/MasterDataContext';
import { useBlock } from '@/src/hooks/useBlock';
import { useFollow } from '@/src/hooks/useFollow';
import { useMute } from '@/src/hooks/useMute';
import { supabase } from '@/src/lib/supabase';
import { fetchParentPostInfo, fetchPostMetadata, fetchPostTags } from '@/src/utils/postUtils';
import { sortByStartDate } from '@/src/utils/sortByStartDate';
import { ListPlus, MessageCircleOff, MoreVertical, ShieldBan } from 'lucide-react-native';

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
  is_hidden?: boolean;
  parent_post_id?: string | null;
  parentContent?: string;
  parentAvatarUrl?: string | null;
  user: {
    display_name: string;
    user_id: string;
    avatar_url?: string | null;
  };
  diagnoses: string[];
  treatments: string[];
  medications: string[];
  repliesCount?: number;
  likesCount?: number;
  isLikedByCurrentUser?: boolean;
  hasRepliedByCurrentUser?: boolean;
}

export default function UserDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const segments = useSegments();
  const { data: masterData } = useMasterData();
  const { isFollowing, isLoading: followLoading, toggleFollow, counts, isOwnProfile, currentUserId } = useFollow(id ?? null);
  const { isBlocked, isLoading: blockLoading, toggleBlock } = useBlock(id ?? null);
  const { isMuted, isLoading: muteLoading, toggleMute } = useMute(id ?? null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [isBlockProcessing, setIsBlockProcessing] = useState(false);
  const [showMuteModal, setShowMuteModal] = useState(false);
  const [isMuteProcessing, setIsMuteProcessing] = useState(false);
  const [isAddToListModalOpen, setIsAddToListModalOpen] = useState(false);
  const [diagnoses, setDiagnoses] = useState<MedicalRecord[]>([]);
  const [treatments, setTreatments] = useState<MedicalRecord[]>([]);
  const [medications, setMedications] = useState<MedicalRecord[]>([]);
  const [statuses, setStatuses] = useState<MedicalRecord[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [replies, setReplies] = useState<Post[]>([]);
  const [loadingMedical, setLoadingMedical] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [loadingMorePosts, setLoadingMorePosts] = useState(false);
  const [loadingMoreReplies, setLoadingMoreReplies] = useState(false);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [hasMoreReplies, setHasMoreReplies] = useState(true);

  const POSTS_LIMIT = 20;

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
    } else if (activeTab === 'replies' && replies.length === 0) {
      loadUserReplies();
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
      // 4つのクエリを並列実行
      const [diagnosesRes, treatmentsRes, medicationsRes, statusesRes] = await Promise.all([
        supabase
          .from('user_diagnoses')
          .select('id, diagnoses(name, display_flag, display_order), start_date, end_date')
          .eq('user_id', id),
        supabase
          .from('user_treatments')
          .select('id, treatments(name, display_flag, display_order), start_date, end_date')
          .eq('user_id', id),
        supabase
          .from('user_medications')
          .select('id, ingredient_id, ingredients(id, name, display_flag, display_order), products(name), start_date, end_date')
          .eq('user_id', id),
        supabase
          .from('user_statuses')
          .select('id, statuses(name, display_flag, display_order), start_date, end_date')
          .eq('user_id', id),
      ]);

      // 診断名を処理
      if (diagnosesRes.data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const filtered = diagnosesRes.data.filter((d: any) => d.diagnoses?.display_flag !== false);
        const formatted = filtered.map((d: any) => ({
          id: d.id,
          name: d.diagnoses?.name || '',
          startDate: d.start_date,
          endDate: d.end_date,
        }));
        setDiagnoses(sortByStartDate(formatted));
      }

      // 治療を処理
      if (treatmentsRes.data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const filtered = treatmentsRes.data.filter((t: any) => t.treatments?.display_flag !== false);
        const formatted = filtered.map((t: any) => ({
          id: t.id,
          name: t.treatments?.name || '',
          startDate: t.start_date,
          endDate: t.end_date,
        }));
        setTreatments(sortByStartDate(formatted));
      }

      // 服薬を処理
      if (medicationsRes.data) {
        const productsByIngredient = new Map<string, string[]>();
        masterData.products.forEach((p) => {
          const existing = productsByIngredient.get(p.ingredient_id);
          if (existing) {
            existing.push(p.name);
          } else {
            productsByIngredient.set(p.ingredient_id, [p.name]);
          }
        });

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
        medicationsRes.data.forEach((m: any) => {
          const ingredientId = m.ingredient_id;
          const ingredientName = m.ingredients?.name || '';
          const displayFlag = m.ingredients?.display_flag;
          const displayOrder = m.ingredients?.display_order || 0;

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

      // ステータスを処理
      if (statusesRes.data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const filtered = statusesRes.data.filter((s: any) => s.statuses?.display_flag !== false);
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

  const loadUserPosts = async (loadMore = false) => {
    if (loadMore) {
      setLoadingMorePosts(true);
    } else {
      setLoadingPosts(true);
    }
    try {
      const currentOffset = loadMore ? posts.length : 0;
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('id, content, created_at, user_id')
        .eq('user_id', id)
        .is('parent_post_id', null)
        .eq('is_hidden', false)
        .order('created_at', { ascending: false })
        .range(currentOffset, currentOffset + POSTS_LIMIT - 1);

      if (postsError) throw postsError;

      if (!postsData || postsData.length === 0) {
        if (!loadMore) setPosts([]);
        setHasMorePosts(false);
        return;
      }

      setHasMorePosts(postsData.length === POSTS_LIMIT);

      const postIds = postsData.map((p) => p.id);

      // ユーザー情報・タグ・メタデータを並列取得
      const [userRes, tagsResult, metadataResult] = await Promise.all([
        supabase
          .from('users')
          .select('user_id, display_name, avatar_url')
          .eq('user_id', id)
          .single(),
        fetchPostTags(postIds),
        fetchPostMetadata(postIds, currentUserId),
      ]);

      const userData = userRes.data;
      const { diagnosesMap, treatmentsMap, medicationsMap } = tagsResult;
      const { repliesMap, likesMap, myLikesMap, myRepliesMap } = metadataResult;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formattedPosts: Post[] = postsData.map((post: any) => ({
        id: post.id,
        content: post.content,
        created_at: post.created_at,
        is_hidden: false,
        user: {
          display_name: userData?.display_name || 'Unknown',
          user_id: post.user_id,
          avatar_url: userData?.avatar_url || null,
        },
        diagnoses: diagnosesMap.get(post.id) || [],
        treatments: treatmentsMap.get(post.id) || [],
        medications: medicationsMap.get(post.id) || [],
        repliesCount: repliesMap.get(post.id) || 0,
        likesCount: likesMap.get(post.id) || 0,
        isLikedByCurrentUser: myLikesMap.get(post.id) || false,
        hasRepliedByCurrentUser: myRepliesMap.get(post.id) || false,
      }));

      if (loadMore) {
        setPosts((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const newPosts = formattedPosts.filter((p) => !existingIds.has(p.id));
          return [...prev, ...newPosts];
        });
      } else {
        setPosts(formattedPosts);
      }
    } catch (error) {
      console.error('投稿取得エラー:', error);
    } finally {
      setLoadingPosts(false);
      setLoadingMorePosts(false);
    }
  };

  const loadUserReplies = async (loadMore = false) => {
    if (loadMore) {
      setLoadingMoreReplies(true);
    } else {
      setLoadingReplies(true);
    }
    try {
      const currentOffset = loadMore ? replies.length : 0;
      const { data: repliesData, error: repliesError } = await supabase
        .from('posts')
        .select('id, content, created_at, user_id, parent_post_id')
        .eq('user_id', id)
        .not('parent_post_id', 'is', null)
        .eq('is_hidden', false)
        .order('created_at', { ascending: false })
        .range(currentOffset, currentOffset + POSTS_LIMIT - 1);

      if (repliesError) throw repliesError;

      if (!repliesData || repliesData.length === 0) {
        if (!loadMore) setReplies([]);
        setHasMoreReplies(false);
        return;
      }

      setHasMoreReplies(repliesData.length === POSTS_LIMIT);

      const replyIds = repliesData.map((r) => r.id);
      const parentPostIds = [...new Set(repliesData.map((r) => r.parent_post_id).filter((id): id is string => id !== null))];

      // ユーザー情報・親投稿情報・メタデータを並列取得
      const [userRes, parentInfoMap, metadataResult] = await Promise.all([
        supabase
          .from('users')
          .select('user_id, display_name, avatar_url')
          .eq('user_id', id)
          .single(),
        fetchParentPostInfo(parentPostIds),
        fetchPostMetadata(replyIds, currentUserId),
      ]);

      const userData = userRes.data;
      const { repliesMap, likesMap, myLikesMap, myRepliesMap } = metadataResult;

      const formattedReplies: Post[] = repliesData.map((reply) => {
        const parentInfo = reply.parent_post_id ? parentInfoMap.get(reply.parent_post_id) : undefined;
        return {
          id: reply.id,
          content: reply.content,
          created_at: reply.created_at,
          is_hidden: false,
          parent_post_id: reply.parent_post_id,
          parentContent: parentInfo?.content,
          parentAvatarUrl: parentInfo?.avatarUrl,
          user: {
            display_name: userData?.display_name || 'Unknown',
            user_id: reply.user_id,
            avatar_url: userData?.avatar_url || null,
          },
          diagnoses: [],
          treatments: [],
          medications: [],
          repliesCount: repliesMap.get(reply.id) || 0,
          likesCount: likesMap.get(reply.id) || 0,
          isLikedByCurrentUser: myLikesMap.get(reply.id) || false,
          hasRepliedByCurrentUser: myRepliesMap.get(reply.id) || false,
        };
      });

      if (loadMore) {
        setReplies((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const newReplies = formattedReplies.filter((p) => !existingIds.has(p.id));
          return [...prev, ...newReplies];
        });
      } else {
        setReplies(formattedReplies);
      }
    } catch (error) {
      console.error('返信取得エラー:', error);
    } finally {
      setLoadingReplies(false);
      setLoadingMoreReplies(false);
    }
  };

  const handleLoadMore = () => {
    if (activeTab === 'posts' && hasMorePosts && !loadingMorePosts) {
      loadUserPosts(true);
    } else if (activeTab === 'replies' && hasMoreReplies && !loadingMoreReplies) {
      loadUserReplies(true);
    }
  };

  const handleFollowCountPress = (type: 'following' | 'followers') => {
    if (!id) return;

    // 現在のタブを判定（segments[1]が (home), (notifications), (search), (profile) のいずれか）
    const currentTab = segments[1] || '(home)';
    const path = `/(tabs)/${currentTab}/user/${id}/${type}`;
    router.push(path as `/(tabs)/(home)/user/${string}/following`);
  };

  const renderHeader = () => {
    if (!profile) return null;

    return (
      <>
        {/* プロフィールヘッダー */}
        <Box className="p-4">
          <HStack className="mt-2 items-start" space="md">
            <Avatar size="lg">
              {profile.avatar_url ? (
                <AvatarImage source={{ uri: profile.avatar_url }} />
              ) : (
                <DefaultAvatar size={64} />
              )}
            </Avatar>
            <VStack className="flex-1" space="xs">
              <HStack className="justify-between items-start">
                <VStack>
                  <HStack space="xs" className="items-center">
                    <Heading size="xl" className="text-primary-500">
                      {profile.display_name}
                    </Heading>
                    {isOwnProfile && (
                      <Text className="text-xl text-typography-500">(あなた)</Text>
                    )}
                  </HStack>
                  <Text className="text-sm text-typography-400">
                    登録日: {new Date(profile.created_at).toLocaleDateString('ja-JP')}
                  </Text>
                </VStack>
                {!isOwnProfile && currentUserId && (
                  <Menu
                    placement="bottom right"
                    offset={5}
                    trigger={({ ...triggerProps }) => {
                      return (
                        <Pressable {...triggerProps} className="p-2">
                          <Icon as={MoreVertical} size="md" className="text-typography-700" />
                        </Pressable>
                      );
                    }}
                  >
                    <MenuItem key="addToList" textValue="リストに追加" onPress={() => setIsAddToListModalOpen(true)}>
                      <Icon as={ListPlus} size="md" className="text-typography-700" />
                      <MenuItemLabel className="ml-2">リストに追加</MenuItemLabel>
                    </MenuItem>
                    <MenuItem key="mute" textValue={isMuted ? 'ミュート解除' : 'ミュート'} onPress={handleMutePress}>
                      <Icon as={MessageCircleOff} size="md" className="text-typography-700" />
                      <MenuItemLabel className="ml-2">{isMuted ? 'ミュート解除' : 'ミュート'}</MenuItemLabel>
                    </MenuItem>
                    <MenuItem key="block" textValue={`items-center ${isBlocked ? 'ブロック解除' : 'ブロック'}`} onPress={handleBlockPress}>
                      <Icon as={ShieldBan} size="md" className="text-error-500" />
                      <MenuItemLabel className="ml-2 text-error-500">{isBlocked ? 'ブロック解除' : 'ブロック'}</MenuItemLabel>
                    </MenuItem>
                  </Menu>
                )}
              </HStack>
              {/* フォロー数 */}
              <HStack space="md" className="items-center">
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
        <ProfileTabBar activeTab={activeTab} onTabChange={setActiveTab} hiddenTabs={['ai-reflection']} />

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

    const isLoading =
      activeTab === 'posts' ? loadingPosts :
      activeTab === 'replies' ? loadingReplies :
      false;

    if (isLoading) {
      return (
        <Box className="px-5 py-8 items-center">
          <Spinner size="small" />
        </Box>
      );
    }

    const message =
      activeTab === 'posts' ? 'まだ投稿がありません' :
      activeTab === 'replies' ? 'まだ返信がありません' :
      '';

    return (
      <Box className="px-5 py-8">
        <Text className="text-base text-center text-typography-400">{message}</Text>
      </Box>
    );
  };

  const getListData = () => {
    if (activeTab === 'profile') return [];
    if (activeTab === 'posts') return posts;
    if (activeTab === 'replies') return replies;
    return [];
  };

  if (loading) {
    return (
      <Box className="flex-1 items-center justify-center">
        <Spinner size="large" />
      </Box>
    );
  }

  const handleBlockPress = () => {
    setShowBlockModal(true);
  };

  const handleBlockConfirm = async () => {
    setIsBlockProcessing(true);
    try {
      await toggleBlock();
      setShowBlockModal(false);
      Alert.alert('成功', isBlocked ? 'ブロックを解除しました' : 'ブロックしました');
    } catch (error) {
      Alert.alert('エラー', '操作に失敗しました');
    } finally {
      setIsBlockProcessing(false);
    }
  };

  const handleMutePress = () => {
    setShowMuteModal(true);
  };

  const handleMuteConfirm = async () => {
    setIsMuteProcessing(true);
    try {
      await toggleMute();
      setShowMuteModal(false);
      Alert.alert('成功', isMuted ? 'ミュートを解除しました' : 'ミュートしました');
    } catch (error) {
      Alert.alert('エラー', '操作に失敗しました');
    } finally {
      setIsMuteProcessing(false);
    }
  };

  if (!profile) {
    return (
      <Box className="flex-1 items-center justify-center p-5">
        <Text className="text-base opacity-70">ユーザーが見つかりませんでした</Text>
      </Box>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: profile.display_name ?? '' }} />
      <Box className="flex-1 bg-background-0">
        <FlatList
          data={getListData()}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <PostItem post={item} disableAvatarTap />}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmptyContent}
          ListFooterComponent={
            (loadingMorePosts || loadingMoreReplies) ? (
              <Box className="py-4 items-center">
                <Spinner size="small" />
              </Box>
            ) : null
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
        />
      </Box>

      {/* ブロック確認モーダル */}
      <ConfirmModal
        isOpen={showBlockModal}
        onClose={() => setShowBlockModal(false)}
        onConfirm={handleBlockConfirm}
        title={isBlocked ? 'ブロック解除' : 'ブロック'}
        message={
          isBlocked
            ? 'このユーザーのブロックを解除しますか？'
            : 'このユーザーをブロックしますか？ブロックすると、相互フォローが解除され、お互いの投稿が見えなくなります。'
        }
        confirmText={isBlocked ? 'ブロック解除' : 'ブロック'}
        isLoading={isBlockProcessing}
      />

      {/* ミュート確認モーダル */}
      <ConfirmModal
        isOpen={showMuteModal}
        onClose={() => setShowMuteModal(false)}
        onConfirm={handleMuteConfirm}
        title={isMuted ? 'ミュート解除' : 'ミュート'}
        message={
          isMuted
            ? 'このユーザーのミュートを解除しますか？'
            : 'このユーザーをミュートしますか？ミュートすると、このユーザーの投稿がタイムラインに表示されなくなります。フォロー関係は維持されます。'
        }
        confirmText={isMuted ? 'ミュート解除' : 'ミュート'}
        isLoading={isMuteProcessing}
      />

      {/* リストに追加モーダル */}
      {id && (
        <AddToListModal
          isOpen={isAddToListModalOpen}
          onClose={() => setIsAddToListModalOpen(false)}
          userId={id}
        />
      )}
    </>
  );
}
