import { useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, TextInput, View } from 'react-native';

import PostItem from '@/components/PostItem';
import MultiSelectModal from '@/components/search/MultiSelectModal';
import { Text } from '@/components/Themed';
import { Box } from '@/components/ui/box';
import { Button, ButtonIcon } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Radio, RadioGroup, RadioIcon, RadioIndicator, RadioLabel } from '@/components/ui/radio';
import { Spinner } from '@/components/ui/spinner';
import { VStack } from '@/components/ui/vstack';
import { supabase } from '@/src/lib/supabase';
import {
  CircleIcon,
  PlusIcon,
  XIcon
} from 'lucide-react-native';

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

type SortOption = 'created_at' | 'updated_at' | 'experienced_at';
type TagFilterMode = 'and' | 'or';

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  const [sortBy, setSortBy] = useState<SortOption>('created_at');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<TagOption[]>([]);
  const [loadingTags, setLoadingTags] = useState(true);
  const [tagFilterMode, setTagFilterMode] = useState<TagFilterMode>('and');

  const [showTagModal, setShowTagModal] = useState(false);
  const [currentTagType, setCurrentTagType] = useState<'diagnosis' | 'ingredient' | 'treatment' | 'status'>('diagnosis');

  const LIMIT = 20;

  useEffect(() => {
    loadAllTags();
  }, []);

  useEffect(() => {
    // 検索条件が変わったら最初から検索し直す
    setOffset(0);
    setPosts([]);
    setHasMore(true);
    searchPosts(true);
  }, [searchQuery, selectedTags, sortBy, tagFilterMode]);

  const loadAllTags = async () => {
    try {
      const tags: TagOption[] = [];

      // 診断名を取得（display_flag = true のみ）
      const { data: diagnoses } = await supabase
        .from('diagnoses')
        .select('id, name')
        .eq('display_flag', true)
        .order('name');

      if (diagnoses) {
        diagnoses.forEach((d) => {
          tags.push({
            id: `diagnosis-${d.id}`,
            name: d.name,
            type: 'diagnosis',
          });
        });
      }

      // 服薬（製品名（成分名）の形式で表示）
      const { data: products } = await supabase
        .from('products')
        .select('id, name, ingredients(name)')
        .order('name');

      if (products) {
        products.forEach((product: any) => {
          tags.push({
            id: `ingredient-${product.id}`,
            name: `${product.name}（${product.ingredients?.name || ''}）`,
            type: 'ingredient',
          });
        });
      }

      // 治療法を取得（display_flag = true のみ）
      const { data: treatments } = await supabase
        .from('treatments')
        .select('id, name')
        .eq('display_flag', true)
        .order('name');

      if (treatments) {
        treatments.forEach((t) => {
          tags.push({
            id: `treatment-${t.id}`,
            name: t.name,
            type: 'treatment',
          });
        });
      }

      // ステータスを取得（display_flag = true のみ）
      const { data: statuses } = await supabase
        .from('statuses')
        .select('id, name')
        .eq('display_flag', true)
        .order('name');

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

  const searchPosts = async (reset = false) => {
    if (!reset && (!hasMore || loadingMore)) return;

    const currentOffset = reset ? 0 : offset;

    try {
      if (reset) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      // ソート条件を設定
      let orderColumn = sortBy;
      let ascending = false;

      // experienced_atがnullの場合は最後に表示
      const nullsLast = sortBy === 'experienced_at';

      // 基本クエリ（返信も含む）
      let query = supabase
        .from('posts')
        .select('id, content, created_at, updated_at, experienced_at, user_id, parent_post_id');

      // フリーワード検索
      if (searchQuery.trim()) {
        query = query.ilike('content', `%${searchQuery.trim()}%`);
      }

      // タグフィルター（AND条件）
      if (selectedTags.length > 0) {
        // 各タグタイプごとにフィルター
        const diagnosisIds = selectedTags
          .filter(t => t.startsWith('diagnosis-'))
          .map(t => t.replace('diagnosis-', ''));
        const ingredientIds = selectedTags
          .filter(t => t.startsWith('ingredient-'))
          .map(t => t.replace('ingredient-', ''));
        const treatmentIds = selectedTags
          .filter(t => t.startsWith('treatment-'))
          .map(t => t.replace('treatment-', ''));
        const statusIds = selectedTags
          .filter(t => t.startsWith('status-'))
          .map(t => t.replace('status-', ''));

        // Supabaseのクエリでは複雑なAND条件が難しいため、
        // いったん全件取得してJavaScript側でフィルターする方式を採用
        // （本番環境ではPostgreSQLのRPC関数を使うことを推奨）
      }

      // ソート
      if (nullsLast) {
        query = query.order(orderColumn, { ascending, nullsFirst: false });
      } else {
        query = query.order(orderColumn, { ascending });
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
      const userIds = [...new Set(filteredPosts.map(p => p.user_id))];
      const { data: usersData } = await supabase
        .from('users')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds);

      const usersMap = new Map(
        (usersData || []).map(u => [u.user_id, { display_name: u.display_name, avatar_url: u.avatar_url }])
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

          const diagnoses = diagnosesData.data?.map((d: any) => d.user_diagnoses?.diagnoses?.name).filter(Boolean) || [];
          const treatments = treatmentsData.data?.map((t: any) => t.user_treatments?.treatments?.name).filter(Boolean) || [];
          const medicationsWithDuplicates = medicationsData.data?.map((m: any) =>
            m.user_medications?.ingredients?.name
          ).filter(Boolean) || [];
          // 重複を除去
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
        setPosts(prev => [...prev, ...postsWithData]);
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

  const filterPostsByTags = async (postsData: any[], tags: string[], mode: TagFilterMode) => {
    // AND: 全てのタグ条件を満たす / OR: どれか1つでも満たす
    const diagnosisIds = tags
      .filter(t => t.startsWith('diagnosis-'))
      .map(t => t.replace('diagnosis-', ''));
    const ingredientIds = tags
      .filter(t => t.startsWith('ingredient-'))
      .map(t => t.replace('ingredient-', ''));
    const treatmentIds = tags
      .filter(t => t.startsWith('treatment-'))
      .map(t => t.replace('treatment-', ''));
    const statusIds = tags
      .filter(t => t.startsWith('status-'))
      .map(t => t.replace('status-', ''));

    const filteredPosts = [];

    for (const post of postsData) {
      const matchResults: boolean[] = [];

      // 診断名チェック
      if (diagnosisIds.length > 0) {
        const { data } = await supabase
          .from('post_diagnoses')
          .select('user_diagnoses(diagnosis_id)')
          .eq('post_id', post.id);

        const postDiagnosisIds = data?.map((d: any) => d.user_diagnoses?.diagnosis_id) || [];
        if (mode === 'and') {
          matchResults.push(diagnosisIds.every(id => postDiagnosisIds.includes(id)));
        } else {
          matchResults.push(diagnosisIds.some(id => postDiagnosisIds.includes(id)));
        }
      }

      // 服薬チェック
      if (ingredientIds.length > 0) {
        const { data } = await supabase
          .from('post_medications')
          .select('user_medications(ingredient_id)')
          .eq('post_id', post.id);

        const postIngredientIds = data?.map((m: any) => m.user_medications?.ingredient_id).filter(Boolean) || [];
        if (mode === 'and') {
          matchResults.push(ingredientIds.every(id => postIngredientIds.includes(id)));
        } else {
          matchResults.push(ingredientIds.some(id => postIngredientIds.includes(id)));
        }
      }

      // 治療法チェック
      if (treatmentIds.length > 0) {
        const { data } = await supabase
          .from('post_treatments')
          .select('user_treatments(treatment_id)')
          .eq('post_id', post.id);

        const postTreatmentIds = data?.map((t: any) => t.user_treatments?.treatment_id) || [];
        if (mode === 'and') {
          matchResults.push(treatmentIds.every(id => postTreatmentIds.includes(id)));
        } else {
          matchResults.push(treatmentIds.some(id => postTreatmentIds.includes(id)));
        }
      }

      // ステータスチェック
      if (statusIds.length > 0) {
        const { data } = await supabase
          .from('post_statuses')
          .select('user_statuses(status_id)')
          .eq('post_id', post.id);

        const postStatusIds = data?.map((s: any) => s.user_statuses?.status_id) || [];
        if (mode === 'and') {
          matchResults.push(statusIds.every(id => postStatusIds.includes(id)));
        } else {
          matchResults.push(statusIds.some(id => postStatusIds.includes(id)));
        }
      }

      // AND: 全てtrue / OR: どれか1つでもtrue
      const matches = mode === 'and'
        ? matchResults.every(r => r)
        : matchResults.some(r => r);

      if (matches) {
        filteredPosts.push(post);
      }
    }

    return filteredPosts;
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setOffset(0);
    setPosts([]);
    setHasMore(true);
    searchPosts(true);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      searchPosts(false);
    }
  };

  const openTagModal = (type: 'diagnosis' | 'ingredient' | 'treatment' | 'status') => {
    setCurrentTagType(type);
    setShowTagModal(true);
  };

  const handleTagsUpdate = (type: 'diagnosis' | 'ingredient' | 'treatment' | 'status', selectedIds: string[]) => {
    // 現在のタイプ以外のタグは保持
    const otherTags = selectedTags.filter(tag => {
      if (type === 'diagnosis') return !tag.startsWith('diagnosis-');
      if (type === 'ingredient') return !tag.startsWith('ingredient-');
      if (type === 'treatment') return !tag.startsWith('treatment-');
      if (type === 'status') return !tag.startsWith('status-');
      return true;
    });

    // 新しく選択されたタグと結合
    setSelectedTags([...otherTags, ...selectedIds]);
  };

  const removeTag = (tagId: string) => {
    setSelectedTags((prev) => prev.filter((id) => id !== tagId));
  };

  const getSelectedTagsByType = (type: 'diagnosis' | 'ingredient' | 'treatment' | 'status') => {
    const prefix = `${type}-`;
    return selectedTags.filter(tag => tag.startsWith(prefix));
  };

  const getTagName = (tagId: string) => {
    const tag = availableTags.find(t => t.id === tagId);
    return tag?.name || '';
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
    // ローディング中はスピナーを表示
    if (loading) {
      return (
        <Box className="py-8 items-center">
          <Spinner size="large" />
        </Box>
      );
    }

    // ローディング完了後、データがない場合はメッセージを表示
    return (
      <Box className="py-8 items-center">
        <Text className="text-typography-500">検索結果がありません</Text>
      </Box>
    );
  };

  return (
    <Box className="flex-1 bg-background-0">
      {/* 検索フォーム */}
      <VStack className="px-4 py-3 border-b border-outline-200" space="md">
        {/* フリーワード検索 */}
        <Box>
          <Text className="text-sm font-semibold mb-2 text-typography-700">キーワード</Text>
          <TextInput
            className="border border-outline-200 rounded-lg px-3 py-2 text-base text-typography-900"
            placeholder="投稿内容を検索..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </Box>

        {/* ソート選択 */}
        <Box>
          <Text className="text-sm font-semibold mb-2 text-typography-700">並び順</Text>
          <HStack space="sm">
            {[
              { value: 'created_at', label: '投稿日' },
              { value: 'updated_at', label: '更新日' },
              { value: 'experienced_at', label: '体験日' },
            ].map((option) => (
              <Pressable
                key={option.value}
                onPress={() => setSortBy(option.value as SortOption)}
                className={`flex-1 px-3 py-2 rounded-lg border ${
                  sortBy === option.value
                    ? 'bg-primary-50 border-primary-50'
                    : 'bg-background-0 border-outline-200'
                }`}
              >
                <Text
                  className={`text-center text-sm ${
                    sortBy === option.value ? 'text-white font-semibold' : 'text-typography-700'
                  }`}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </HStack>
        </Box>

        {/* タグフィルター */}
        <Box>
          <Text className="text-sm font-semibold mb-2 text-typography-700">タグで絞り込み</Text>

          {/* AND/OR切り替え */}
          <RadioGroup value={tagFilterMode} onChange={(value) => setTagFilterMode(value as TagFilterMode)} className="mb-3">
            <HStack space="lg">
              <Radio value="and" size="sm">
                <RadioIndicator>
                  <RadioIcon as={CircleIcon} />
                </RadioIndicator>
                <RadioLabel className="text-sm">全て含む</RadioLabel>
              </Radio>
              <Radio value="or" size="sm">
                <RadioIndicator>
                  <RadioIcon as={CircleIcon} />
                </RadioIndicator>
                <RadioLabel className="text-sm">どれか含む</RadioLabel>
              </Radio>
            </HStack>
          </RadioGroup>

          {loadingTags ? (
            <Spinner size="small" />
          ) : (
            <VStack space="md">
              {/* 診断名 */}
              <Box>
                <HStack className="items-center justify-between mb-2">
                  <Text className="text-xs font-semibold text-typography-600">診断名</Text>
                  <Button
                    size="xs"
                    variant="outline"
                    onPress={() => openTagModal('diagnosis')}
                    className="h-6 px-2"
                  >
                    <ButtonIcon as={PlusIcon} size="sm" />
                  </Button>
                </HStack>
                {getSelectedTagsByType('diagnosis').length > 0 && (
                  <View className="flex flex-row flex-wrap gap-2">
                    {getSelectedTagsByType('diagnosis').map((tagId) => (
                      <View
                        key={tagId}
                        className="flex flex-row text-center rounded py-1 px-2 bg-fuchsia-400"
                      >
                        <Pressable onPress={() => removeTag(tagId)} className="flex flex-row items-center text-center">
                          <Text className="text-xs mr-1">{getTagName(tagId)}</Text>
                          <Icon as={XIcon} size="xs" />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                )}
              </Box>

              {/* 服薬 */}
              <Box>
                <HStack className="items-center justify-between mb-2">
                  <Text className="text-xs font-semibold text-typography-600">服薬</Text>
                  <Button
                    size="xs"
                    variant="outline"
                    onPress={() => openTagModal('ingredient')}
                    className="h-6 px-2"
                  >
                    <ButtonIcon as={PlusIcon} size="sm" />
                  </Button>
                </HStack>
                {getSelectedTagsByType('ingredient').length > 0 && (
                  <View className="flex flex-row flex-wrap gap-2">
                    {getSelectedTagsByType('ingredient').map((tagId) => (
                      <View
                        key={tagId}
                        className="flex flex-row text-center rounded py-1 px-2 bg-cyan-400"
                      >
                        <Pressable onPress={() => removeTag(tagId)} className="flex flex-row items-center text-center">
                          <Text className="text-xs mr-1">{getTagName(tagId)}</Text>
                          <Icon as={XIcon} size="xs" />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                )}
              </Box>

              {/* 治療法 */}
              <Box>
                <HStack className="items-center justify-between mb-2">
                  <Text className="text-xs font-semibold text-typography-600">治療法</Text>
                  <Button
                    size="xs"
                    variant="outline"
                    onPress={() => openTagModal('treatment')}
                    className="h-6 px-2"
                  >
                    <ButtonIcon as={PlusIcon} size="sm" />
                  </Button>
                </HStack>
                {getSelectedTagsByType('treatment').length > 0 && (
                  <View className="flex flex-row flex-wrap gap-2">
                    {getSelectedTagsByType('treatment').map((tagId) => (
                      <View
                        key={tagId}
                        className="flex flex-row text-center rounded py-1 px-2 bg-green-400"
                      >
                        <Pressable onPress={() => removeTag(tagId)} className="flex flex-row items-center text-center">
                          <Text className="text-xs mr-1">{getTagName(tagId)}</Text>
                          <Icon as={XIcon} size="xs" />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                )}
              </Box>

              {/* ステータス */}
              <Box>
                <HStack className="items-center justify-between mb-2">
                  <Text className="text-xs font-semibold text-typography-600">ステータス</Text>
                  <Button
                    size="xs"
                    variant="outline"
                    onPress={() => openTagModal('status')}
                    className="h-6 px-2"
                  >
                    <ButtonIcon as={PlusIcon} size="sm" />
                  </Button>
                </HStack>
                {getSelectedTagsByType('status').length > 0 && (
                  <View className="flex flex-row flex-wrap gap-2">
                    {getSelectedTagsByType('status').map((tagId) => (
                      <View
                        key={tagId}
                        className="flex flex-row text-center rounded py-1 px-2 bg-amber-400"
                      >
                        <Pressable onPress={() => removeTag(tagId)} className="flex flex-row items-center text-center">
                          <Text className="text-xs mr-1">{getTagName(tagId)}</Text>
                          <Icon as={XIcon} size="xs" />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                )}
              </Box>
            </VStack>
          )}
        </Box>
      </VStack>

      {/* 検索結果 */}
      <FlatList
        data={posts}
        renderItem={({ item }) => <PostItem post={item} />}
        keyExtractor={(item) => item.id}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
      />

      {/* タグ選択モーダル */}
      <MultiSelectModal
        isOpen={showTagModal}
        onClose={() => setShowTagModal(false)}
        title={
          currentTagType === 'diagnosis' ? '診断名を選択' :
          currentTagType === 'ingredient' ? '服薬を選択' :
          currentTagType === 'treatment' ? '治療法を選択' :
          'ステータスを選択'
        }
        options={availableTags
          .filter(t => t.type === currentTagType)
          .map(t => ({ id: t.id, name: t.name }))}
        selectedIds={getSelectedTagsByType(currentTagType)}
        onSave={(selectedIds) => handleTagsUpdate(currentTagType, selectedIds)}
      />
    </Box>
  );
}
