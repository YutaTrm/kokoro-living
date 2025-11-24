import { ChevronDownIcon, PlusIcon, XIcon } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, TextInput, View } from 'react-native';

import PostItem from '@/components/PostItem';
import TagFilterModal from '@/components/search/TagFilterModal';
import Tag from '@/components/Tag';
import { Text } from '@/components/Themed';
import { Box } from '@/components/ui/box';
import { Button, ButtonIcon, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import {
  Select,
  SelectBackdrop,
  SelectContent,
  SelectDragIndicator,
  SelectDragIndicatorWrapper,
  SelectIcon,
  SelectInput,
  SelectItem,
  SelectPortal,
  SelectTrigger,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import UserListItem from '@/components/UserListItem';
import { useMedicationMasters } from '@/src/hooks/useMedicationMasters';
import { supabase } from '@/src/lib/supabase';

interface Post {
  id: string;
  content: string;
  created_at: string;
  parent_post_id: string | null;
  user: {
    display_name: string;
    user_id: string;
    avatar_url?: string | null;
  };
  diagnoses: string[];
  treatments: string[];
  medications: string[];
}

interface TagOption {
  id: string;
  name: string;
  type: 'diagnosis' | 'ingredient' | 'treatment' | 'status';
}

interface UserResult {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
}

type SearchTab = 'users' | 'posts';
type TagFilterMode = 'and' | 'or';
type SortOption = 'created_at' | 'updated_at' | 'experienced_at';

export default function SearchScreen() {
  const [searchTab, setSearchTab] = useState<SearchTab>('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [posts, setPosts] = useState<Post[]>([]);
  const [users, setUsers] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);

  const [sortBy, setSortBy] = useState<SortOption>('created_at');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<TagOption[]>([]);
  const [loadingTags, setLoadingTags] = useState(true);
  const [tagFilterMode, setTagFilterMode] = useState<TagFilterMode>('and');

  const [showTagModal, setShowTagModal] = useState(false);

  const { medications: medicationMasters, loading: loadingMedications } = useMedicationMasters();

  const LIMIT = 20;

  useEffect(() => {
    if (!loadingMedications) {
      loadAllTags();
    }
  }, [loadingMedications]);

  const loadAllTags = async () => {
    try {
      const tags: TagOption[] = [];

      // 診断名を取得（display_flag = true のみ、display_order順）
      const { data: diagnoses } = await supabase
        .from('diagnoses')
        .select('id, name')
        .eq('display_flag', true)
        .order('display_order', { ascending: true });

      if (diagnoses) {
        diagnoses.forEach((d) => {
          tags.push({
            id: `diagnosis-${d.id}`,
            name: d.name,
            type: 'diagnosis',
          });
        });
      }

      // 服薬（useMedicationMastersフックから取得）
      medicationMasters.forEach((med) => {
        tags.push({
          id: med.id,
          name: med.name,
          type: 'ingredient',
        });
      });

      // 治療法を取得（display_flag = true のみ、display_order順）
      const { data: treatments } = await supabase
        .from('treatments')
        .select('id, name')
        .eq('display_flag', true)
        .order('display_order', { ascending: true });

      if (treatments) {
        treatments.forEach((t) => {
          tags.push({
            id: `treatment-${t.id}`,
            name: t.name,
            type: 'treatment',
          });
        });
      }

      // ステータスを取得（display_flag = true のみ、display_order順）
      const { data: statuses } = await supabase
        .from('statuses')
        .select('id, name')
        .eq('display_flag', true)
        .order('display_order', { ascending: true });

      if (statuses) {
        statuses.forEach((s) => {
          tags.push({
            id: `status-${s.id}`,
            name: s.name,
            type: 'status',
          });
        });
      }

      setAvailableTags(tags);
    } catch (error) {
      console.error('タグ取得エラー:', error);
    } finally {
      setLoadingTags(false);
    }
  };

  const handleSearch = () => {
    // 入力チェック
    if (!searchQuery.trim() && selectedTags.length === 0) {
      setHasSearched(false);
      return;
    }

    setHasSearched(true);
    setOffset(0);
    setPosts([]);
    setUsers([]);
    setHasMore(true);
    if (searchTab === 'posts') {
      searchPosts(true);
    } else {
      searchUsers(true);
    }
  };

  const searchUsers = async (reset = false) => {
    if (!reset && (!hasMore || loadingMore)) return;
    if (reset && loading) return;

    const currentOffset = reset ? 0 : offset;

    try {
      if (reset) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      // 基本クエリ
      let query = supabase
        .from('users')
        .select('user_id, display_name, avatar_url, bio');

      // キーワード検索（bio）
      if (searchQuery.trim()) {
        query = query.ilike('bio', `%${searchQuery.trim()}%`);
      }

      // ページネーション
      query = query.range(currentOffset, currentOffset + LIMIT - 1);

      const { data: usersData, error } = await query;

      if (error) throw error;

      let filteredUsers = usersData || [];

      // タグフィルター
      if (selectedTags.length > 0) {
        filteredUsers = await filterUsersByTags(filteredUsers, selectedTags, tagFilterMode);
      }

      if (reset) {
        // 重複を除去
        const uniqueUsers = filteredUsers.filter(
          (user, index, self) => index === self.findIndex((u) => u.user_id === user.user_id)
        );
        setUsers(uniqueUsers);
        setHasMore(uniqueUsers.length === LIMIT);
      } else {
        setUsers((prev) => {
          const combined = [...prev, ...filteredUsers];
          // 重複を除去
          return combined.filter(
            (user, index, self) => index === self.findIndex((u) => u.user_id === user.user_id)
          );
        });
        setHasMore(filteredUsers.length === LIMIT);
      }
      setOffset(currentOffset + LIMIT);
    } catch (error) {
      console.error('ユーザー検索エラー:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filterUsersByTags = async (usersData: any[], tags: string[], mode: TagFilterMode) => {
    const diagnosisIds = tags
      .filter((t) => t.startsWith('diagnosis-'))
      .map((t) => t.replace('diagnosis-', ''));

    const ingredientIds = tags
      .filter((t) => t.startsWith('ingredient-') || t.startsWith('product-'))
      .map((t) => {
        const med = medicationMasters.find((m) => m.id === t);
        return med?.ingredientId || '';
      })
      .filter(Boolean);

    const treatmentIds = tags
      .filter((t) => t.startsWith('treatment-'))
      .map((t) => t.replace('treatment-', ''));
    const statusIds = tags
      .filter((t) => t.startsWith('status-'))
      .map((t) => t.replace('status-', ''));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filteredUsers: any[] = [];

    for (const user of usersData) {
      const matchResults: boolean[] = [];

      // 診断名チェック
      if (diagnosisIds.length > 0) {
        const { data } = await supabase
          .from('user_diagnoses')
          .select('diagnosis_id')
          .eq('user_id', user.user_id);

        const userDiagnosisIds = data?.map((d) => d.diagnosis_id) || [];
        if (mode === 'and') {
          matchResults.push(diagnosisIds.every((id) => userDiagnosisIds.includes(id)));
        } else {
          matchResults.push(diagnosisIds.some((id) => userDiagnosisIds.includes(id)));
        }
      }

      // 服薬チェック
      if (ingredientIds.length > 0) {
        const { data } = await supabase
          .from('user_medications')
          .select('ingredient_id')
          .eq('user_id', user.user_id);

        const userIngredientIds = data?.map((m) => m.ingredient_id).filter(Boolean) || [];
        if (mode === 'and') {
          matchResults.push(ingredientIds.every((id) => userIngredientIds.includes(id)));
        } else {
          matchResults.push(ingredientIds.some((id) => userIngredientIds.includes(id)));
        }
      }

      // 治療法チェック
      if (treatmentIds.length > 0) {
        const { data } = await supabase
          .from('user_treatments')
          .select('treatment_id')
          .eq('user_id', user.user_id);

        const userTreatmentIds = data?.map((t) => t.treatment_id) || [];
        if (mode === 'and') {
          matchResults.push(treatmentIds.every((id) => userTreatmentIds.includes(id)));
        } else {
          matchResults.push(treatmentIds.some((id) => userTreatmentIds.includes(id)));
        }
      }

      // ステータスチェック
      if (statusIds.length > 0) {
        const { data } = await supabase
          .from('user_statuses')
          .select('status_id')
          .eq('user_id', user.user_id);

        const userStatusIds = data?.map((s) => s.status_id) || [];
        if (mode === 'and') {
          matchResults.push(statusIds.every((id) => userStatusIds.includes(id)));
        } else {
          matchResults.push(statusIds.some((id) => userStatusIds.includes(id)));
        }
      }

      // フィルター結果の判定
      if (matchResults.length === 0) {
        filteredUsers.push(user);
      } else if (mode === 'and') {
        if (matchResults.every((r) => r)) {
          filteredUsers.push(user);
        }
      } else {
        if (matchResults.some((r) => r)) {
          filteredUsers.push(user);
        }
      }
    }

    return filteredUsers;
  };

  const searchPosts = async (reset = false) => {
    if (!reset && (!hasMore || loadingMore)) return;

    const currentOffset = reset ? 0 : offset;

    try {
      if (reset) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      // 基本クエリ
      let query = supabase
        .from('posts')
        .select('id, content, created_at, updated_at, experienced_at, user_id, parent_post_id');

      // フリーワード検索
      if (searchQuery.trim()) {
        query = query.ilike('content', `%${searchQuery.trim()}%`);
      }

      // ソート
      const nullsLast = sortBy === 'experienced_at';
      if (nullsLast) {
        query = query.order(sortBy, { ascending: false, nullsFirst: false });
      } else {
        query = query.order(sortBy, { ascending: false });
      }

      // ページネーション
      query = query.range(currentOffset, currentOffset + LIMIT - 1);

      const { data: postsData, error: postsError } = await query;

      if (postsError) throw postsError;

      if (!postsData || postsData.length === 0) {
        setHasMore(false);
        if (reset) setPosts([]);
        return;
      }

      // タグフィルターがある場合は、さらにフィルタリング
      let filteredPosts = postsData;
      if (selectedTags.length > 0) {
        filteredPosts = await filterPostsByTags(postsData, selectedTags, tagFilterMode);
      }

      // ユーザー情報を取得
      const userIds = [...new Set(filteredPosts.map((p) => p.user_id))];
      const { data: usersData } = await supabase
        .from('users')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds);

      const usersMap = new Map(
        (usersData || []).map((u) => [u.user_id, { display_name: u.display_name, avatar_url: u.avatar_url }])
      );

      // 各投稿のタグを取得
      const postsWithData = await Promise.all(
        filteredPosts.map(async (post) => {
          const [diagnosesData, treatmentsData, medicationsData] = await Promise.all([
            supabase
              .from('post_diagnoses')
              .select('user_diagnoses(diagnoses(name))')
              .eq('post_id', post.id),
            supabase
              .from('post_treatments')
              .select('user_treatments(treatments(name))')
              .eq('post_id', post.id),
            supabase
              .from('post_medications')
              .select('user_medications(ingredients(name), products(name))')
              .eq('post_id', post.id),
          ]);

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const diagnoses = diagnosesData.data?.map((d: any) => d.user_diagnoses?.diagnoses?.name).filter(Boolean) || [];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const treatments = treatmentsData.data?.map((t: any) => t.user_treatments?.treatments?.name).filter(Boolean) || [];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const medicationsWithDuplicates = medicationsData.data?.map((m: any) =>
            m.user_medications?.ingredients?.name
          ).filter(Boolean) || [];
          const medications = [...new Set(medicationsWithDuplicates)];

          return {
            id: post.id,
            content: post.content,
            created_at: post.created_at,
            parent_post_id: post.parent_post_id,
            user: {
              display_name: usersMap.get(post.user_id)?.display_name || 'Unknown',
              user_id: post.user_id,
              avatar_url: usersMap.get(post.user_id)?.avatar_url || null,
            },
            diagnoses,
            treatments,
            medications,
          };
        })
      );

      if (reset) {
        setPosts(postsWithData);
      } else {
        // 重複を除去して追加
        setPosts((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const newPosts = postsWithData.filter((p) => !existingIds.has(p.id));
          return [...prev, ...newPosts];
        });
      }

      setOffset(currentOffset + LIMIT);
      setHasMore(postsWithData.length === LIMIT);
    } catch (error) {
      console.error('検索エラー:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filterPostsByTags = async (postsData: any[], tags: string[], mode: TagFilterMode) => {
    const diagnosisIds = tags
      .filter((t) => t.startsWith('diagnosis-'))
      .map((t) => t.replace('diagnosis-', ''));

    // 服薬タグからingredient_idを取得（ingredient-またはproduct-の両方に対応）
    const ingredientIds = tags
      .filter((t) => t.startsWith('ingredient-') || t.startsWith('product-'))
      .map((t) => {
        const med = medicationMasters.find((m) => m.id === t);
        return med?.ingredientId || '';
      })
      .filter(Boolean);

    const treatmentIds = tags
      .filter((t) => t.startsWith('treatment-'))
      .map((t) => t.replace('treatment-', ''));
    const statusIds = tags
      .filter((t) => t.startsWith('status-'))
      .map((t) => t.replace('status-', ''));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filteredPosts: any[] = [];

    for (const post of postsData) {
      const matchResults: boolean[] = [];

      // 診断名チェック
      if (diagnosisIds.length > 0) {
        const { data } = await supabase
          .from('post_diagnoses')
          .select('user_diagnoses(diagnosis_id)')
          .eq('post_id', post.id);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const postDiagnosisIds = data?.map((d: any) => d.user_diagnoses?.diagnosis_id) || [];
        if (mode === 'and') {
          matchResults.push(diagnosisIds.every((id) => postDiagnosisIds.includes(id)));
        } else {
          matchResults.push(diagnosisIds.some((id) => postDiagnosisIds.includes(id)));
        }
      }

      // 服薬チェック
      if (ingredientIds.length > 0) {
        const { data } = await supabase
          .from('post_medications')
          .select('user_medications(ingredient_id)')
          .eq('post_id', post.id);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const postIngredientIds = data?.map((m: any) => m.user_medications?.ingredient_id).filter(Boolean) || [];
        if (mode === 'and') {
          matchResults.push(ingredientIds.every((id) => postIngredientIds.includes(id)));
        } else {
          matchResults.push(ingredientIds.some((id) => postIngredientIds.includes(id)));
        }
      }

      // 治療法チェック
      if (treatmentIds.length > 0) {
        const { data } = await supabase
          .from('post_treatments')
          .select('user_treatments(treatment_id)')
          .eq('post_id', post.id);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const postTreatmentIds = data?.map((t: any) => t.user_treatments?.treatment_id) || [];
        if (mode === 'and') {
          matchResults.push(treatmentIds.every((id) => postTreatmentIds.includes(id)));
        } else {
          matchResults.push(treatmentIds.some((id) => postTreatmentIds.includes(id)));
        }
      }

      // ステータスチェック
      if (statusIds.length > 0) {
        const { data } = await supabase
          .from('post_statuses')
          .select('user_statuses(status_id)')
          .eq('post_id', post.id);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const postStatusIds = data?.map((s: any) => s.user_statuses?.status_id) || [];
        if (mode === 'and') {
          matchResults.push(statusIds.every((id) => postStatusIds.includes(id)));
        } else {
          matchResults.push(statusIds.some((id) => postStatusIds.includes(id)));
        }
      }

      const matches = mode === 'and'
        ? matchResults.every((r) => r)
        : matchResults.some((r) => r);

      if (matches) {
        filteredPosts.push(post);
      }
    }

    return filteredPosts;
  };

  const handleRefresh = () => {
    if (!hasSearched) return;
    setRefreshing(true);
    setOffset(0);
    setPosts([]);
    setUsers([]);
    setHasMore(true);
    if (searchTab === 'posts') {
      searchPosts(true);
    } else {
      searchUsers(true);
    }
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore && hasSearched) {
      if (searchTab === 'posts') {
        searchPosts(false);
      } else {
        searchUsers(false);
      }
    }
  };

  const handleClear = () => {
    setSearchQuery('');
    setSelectedTags([]);
    setSortBy('created_at');
    setTagFilterMode('and');
    setPosts([]);
    setUsers([]);
    setHasSearched(false);
    setOffset(0);
    setHasMore(true);
  };

  const handleTabChange = (tab: SearchTab) => {
    if (tab === searchTab) return;
    setSearchTab(tab);
    setPosts([]);
    setUsers([]);
    setHasSearched(false);
    setOffset(0);
    setHasMore(true);
  };

  const handleTagFilterSave = (newSelectedIds: string[], newFilterMode: TagFilterMode) => {
    setSelectedTags(newSelectedIds);
    setTagFilterMode(newFilterMode);
  };

  const removeTag = (tagId: string) => {
    setSelectedTags((prev) => prev.filter((id) => id !== tagId));
  };

  const getTagInfo = (tagId: string) => {
    const tag = availableTags.find((t) => t.id === tagId);
    if (!tag) return { name: '', color: 'gray-400' };

    let color = 'gray-400';
    switch (tag.type) {
      case 'diagnosis':
        color = 'fuchsia-400';
        break;
      case 'ingredient':
        color = 'cyan-400';
        break;
      case 'treatment':
        color = 'green-400';
        break;
      case 'status':
        color = 'amber-400';
        break;
    }
    return { name: tag.name, color };
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <Box className="py-4">
        <Spinner size="small" />
      </Box>
    );
  };

  const renderEmpty = () => {
    if (loading) {
      return (
        <Box className="py-8 items-center">
          <Spinner size="large" />
        </Box>
      );
    }

    if (!hasSearched) {
      return (
        <Box className="py-8 items-center">
          <Text className="text-typography-500">キーワードを入力するかタグを選んでください</Text>
        </Box>
      );
    }

    return (
      <Box className="py-8 items-center">
        <Text className="text-typography-500">検索結果がありません</Text>
      </Box>
    );
  };

  return (
    <Box className="flex-1 bg-background-0">
      {/* 検索タブ */}
      <HStack className="border-b border-outline-200">
        <Pressable
          onPress={() => handleTabChange('users')}
          className={`flex-1 py-3 ${searchTab === 'users' ? 'border-b-2 border-primary-500' : ''}`}
        >
          <Text className={`text-center font-semibold ${searchTab === 'users' ? 'text-primary-500' : 'text-typography-500'}`}>
            ユーザー
          </Text>
        </Pressable>
        <Pressable
          onPress={() => handleTabChange('posts')}
          className={`flex-1 py-3 ${searchTab === 'posts' ? 'border-b-2 border-primary-500' : ''}`}
        >
          <Text className={`text-center font-semibold ${searchTab === 'posts' ? 'text-primary-500' : 'text-typography-500'}`}>
            投稿
          </Text>
        </Pressable>
      </HStack>

      {/* 検索フォーム */}
      <Box className="px-4 py-3 border-b border-outline-200">
        {/* タグで絞り込み */}
        <Box>
          <Text className="text-sm font-semibold mb-2 text-typography-700">タグで絞り込み</Text>
          {loadingTags ? (
            <Spinner size="small" />
          ) : (
            <View className="flex-row flex-wrap gap-2">
              {selectedTags.map((tagId) => {
                const { name, color } = getTagInfo(tagId);
                return (
                  <HStack key={tagId} className="items-center">
                    <Tag
                      key={tagId}
                      name={name}
                      color={color}
                      size="xs"
                      onPress={() => removeTag(tagId)}
                    >
                      <Icon as={XIcon} size="xs" />
                    </Tag>

                  </HStack>
                );
              })}
              <Button
                size="xs"
                variant="outline"
                onPress={() => setShowTagModal(true)}
                className="h-6 px-2"
              >
                <ButtonIcon as={PlusIcon} size="sm" />
              </Button>
            </View>
          )}
        </Box>

        {/* キーワード検索 + 検索ボタン */}
        <Text className="text-sm font-semibold my-2 text-typography-700">
          {searchTab === 'posts' ? '投稿内容で検索' : '自己紹介内容で検索'}
        </Text>
        <HStack space="sm" className="mb-3">
          <TextInput
            className="flex-1 border border-outline-200 rounded-lg px-3 py-2 text-base text-typography-900"
            placeholder="キーワード"
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
        </HStack>

        <HStack className="flex justify-between" space="sm">
          {/* ソート選択（投稿タブのみ表示） */}
          {searchTab === 'posts' ? (
            <Box>
              <HStack className="justify-end items-center">
                <Text className="text-sm text-typography-600 mr-2">並び順:</Text>
                <Select
                  selectedValue={sortBy}
                  onValueChange={(value) => setSortBy(value as SortOption)}
                >
                  <SelectTrigger size="sm" className="w-28">
                    <SelectInput
                      placeholder="選択"
                      value={
                        sortBy === 'created_at' ? '投稿日' :
                        sortBy === 'updated_at' ? '更新日' : '体験日'
                      }
                    />
                    <SelectIcon as={ChevronDownIcon} className="mr-2" />
                  </SelectTrigger>
                  <SelectPortal>
                    <SelectBackdrop />
                    <SelectContent>
                      <SelectDragIndicatorWrapper>
                        <SelectDragIndicator />
                      </SelectDragIndicatorWrapper>
                      <SelectItem label="投稿日" value="created_at" />
                      <SelectItem label="更新日" value="updated_at" />
                      <SelectItem label="体験日" value="experienced_at" />
                    </SelectContent>
                  </SelectPortal>
                </Select>
              </HStack>
            </Box>
          ) : (
            <Box />
          )}

          <HStack className="flex grow justify-end gap-2">
            {/* 検索クリアボタン */}
            <Button onPress={handleClear} className="" variant="outline">
              <ButtonText>クリア</ButtonText>
            </Button>
            <Button onPress={handleSearch} className="">
              <ButtonText>検索</ButtonText>
            </Button>
          </HStack>
        </HStack>
      </Box>

      {/* 検索結果 */}
      {searchTab === 'posts' ? (
        <FlatList
          data={posts}
          renderItem={({ item }) => <PostItem post={item} />}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
        />
      ) : (
        <FlatList
          data={users}
          renderItem={({ item }) => (
            <UserListItem
              userId={item.user_id}
              displayName={item.display_name}
              avatarUrl={item.avatar_url}
              bio={item.bio}
            />
          )}
          keyExtractor={(item, index) => `${item.user_id}-${index}`}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
        />
      )}

      {/* タグ選択モーダル */}
      <TagFilterModal
        isOpen={showTagModal}
        onClose={() => setShowTagModal(false)}
        onSave={handleTagFilterSave}
        tags={availableTags}
        selectedIds={selectedTags}
        filterMode={tagFilterMode}
      />
    </Box>
  );
}
