import { useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, TextInput } from 'react-native';

import PostItem from '@/components/PostItem';
import { Text } from '@/components/Themed';
import { Box } from '@/components/ui/box';
import { Checkbox, CheckboxIcon, CheckboxIndicator, CheckboxLabel } from '@/components/ui/checkbox';
import { HStack } from '@/components/ui/hstack';
import { CheckIcon } from '@/components/ui/icon';
import { Spinner } from '@/components/ui/spinner';
import { VStack } from '@/components/ui/vstack';
import { supabase } from '@/src/lib/supabase';

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

interface TagOption {
  id: string;
  name: string;
  type: 'diagnosis' | 'ingredient' | 'treatment' | 'status';
}

type SortOption = 'created_at' | 'updated_at' | 'experienced_at';

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  const [sortBy, setSortBy] = useState<SortOption>('created_at');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<TagOption[]>([]);
  const [loadingTags, setLoadingTags] = useState(true);

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
  }, [searchQuery, selectedTags, sortBy]);

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

      // 成分（ingredients）を取得（display_flag = true のみ）
      const { data: ingredients } = await supabase
        .from('ingredients')
        .select('id, name')
        .eq('display_flag', true)
        .order('name');

      if (ingredients) {
        ingredients.forEach((i) => {
          tags.push({
            id: `ingredient-${i.id}`,
            name: i.name,
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

      // 基本クエリ
      let query = supabase
        .from('posts')
        .select('id, content, created_at, updated_at, experienced_at, user_id')
        .is('parent_post_id', null); // 返信は除外

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
        filteredPosts = await filterPostsByTags(postsData, selectedTags);
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
          const medications = medicationsData.data?.map((m: any) =>
            m.user_medications?.products?.name || m.user_medications?.ingredients?.name
          ).filter(Boolean) || [];

          return {
            id: post.id,
            content: post.content,
            created_at: post.created_at,
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

  const filterPostsByTags = async (postsData: any[], tags: string[]) => {
    // 各投稿がすべてのタグ条件を満たすかチェック（AND条件）
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
      let matches = true;

      // 診断名チェック
      if (diagnosisIds.length > 0) {
        const { data } = await supabase
          .from('post_diagnoses')
          .select('user_diagnoses(diagnosis_id)')
          .eq('post_id', post.id);

        const postDiagnosisIds = data?.map((d: any) => d.user_diagnoses?.diagnosis_id) || [];
        const hasAllDiagnoses = diagnosisIds.every(id => postDiagnosisIds.includes(id));
        if (!hasAllDiagnoses) matches = false;
      }

      // 成分チェック
      if (matches && ingredientIds.length > 0) {
        const { data } = await supabase
          .from('post_medications')
          .select('user_medications(ingredient_id)')
          .eq('post_id', post.id);

        const postIngredientIds = data?.map((m: any) => m.user_medications?.ingredient_id).filter(Boolean) || [];
        const hasAllIngredients = ingredientIds.every(id => postIngredientIds.includes(id));
        if (!hasAllIngredients) matches = false;
      }

      // 治療法チェック
      if (matches && treatmentIds.length > 0) {
        const { data } = await supabase
          .from('post_treatments')
          .select('user_treatments(treatment_id)')
          .eq('post_id', post.id);

        const postTreatmentIds = data?.map((t: any) => t.user_treatments?.treatment_id) || [];
        const hasAllTreatments = treatmentIds.every(id => postTreatmentIds.includes(id));
        if (!hasAllTreatments) matches = false;
      }

      // ステータスチェック
      if (matches && statusIds.length > 0) {
        const { data } = await supabase
          .from('post_statuses')
          .select('user_statuses(status_id)')
          .eq('post_id', post.id);

        const postStatusIds = data?.map((s: any) => s.user_statuses?.status_id) || [];
        const hasAllStatuses = statusIds.every(id => postStatusIds.includes(id));
        if (!hasAllStatuses) matches = false;
      }

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

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
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
    if (loading) return null;
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
          {loadingTags ? (
            <Spinner size="small" />
          ) : (
            <ScrollView className="max-h-48">
              <VStack space="lg">
                {/* 診断名 */}
                {availableTags.filter(t => t.type === 'diagnosis').length > 0 && (
                  <Box>
                    <Text className="text-xs font-semibold mb-2 text-typography-600">診断名</Text>
                    <VStack space="xs">
                      {availableTags
                        .filter(t => t.type === 'diagnosis')
                        .map((tag) => (
                          <Pressable key={tag.id} onPress={() => toggleTag(tag.id)}>
                            <Checkbox
                              value={tag.id}
                              isChecked={selectedTags.includes(tag.id)}
                              onChange={() => toggleTag(tag.id)}
                              size="sm"
                            >
                              <CheckboxIndicator>
                                <CheckboxIcon as={CheckIcon} />
                              </CheckboxIndicator>
                              <CheckboxLabel className="text-sm">{tag.name}</CheckboxLabel>
                            </Checkbox>
                          </Pressable>
                        ))}
                    </VStack>
                  </Box>
                )}

                {/* 成分 */}
                {availableTags.filter(t => t.type === 'ingredient').length > 0 && (
                  <Box>
                    <Text className="text-xs font-semibold mb-2 text-typography-600">成分</Text>
                    <VStack space="xs">
                      {availableTags
                        .filter(t => t.type === 'ingredient')
                        .map((tag) => (
                          <Pressable key={tag.id} onPress={() => toggleTag(tag.id)}>
                            <Checkbox
                              value={tag.id}
                              isChecked={selectedTags.includes(tag.id)}
                              onChange={() => toggleTag(tag.id)}
                              size="sm"
                            >
                              <CheckboxIndicator>
                                <CheckboxIcon as={CheckIcon} />
                              </CheckboxIndicator>
                              <CheckboxLabel className="text-sm">{tag.name}</CheckboxLabel>
                            </Checkbox>
                          </Pressable>
                        ))}
                    </VStack>
                  </Box>
                )}

                {/* 治療法 */}
                {availableTags.filter(t => t.type === 'treatment').length > 0 && (
                  <Box>
                    <Text className="text-xs font-semibold mb-2 text-typography-600">治療法</Text>
                    <VStack space="xs">
                      {availableTags
                        .filter(t => t.type === 'treatment')
                        .map((tag) => (
                          <Pressable key={tag.id} onPress={() => toggleTag(tag.id)}>
                            <Checkbox
                              value={tag.id}
                              isChecked={selectedTags.includes(tag.id)}
                              onChange={() => toggleTag(tag.id)}
                              size="sm"
                            >
                              <CheckboxIndicator>
                                <CheckboxIcon as={CheckIcon} />
                              </CheckboxIndicator>
                              <CheckboxLabel className="text-sm">{tag.name}</CheckboxLabel>
                            </Checkbox>
                          </Pressable>
                        ))}
                    </VStack>
                  </Box>
                )}

                {/* ステータス */}
                {availableTags.filter(t => t.type === 'status').length > 0 && (
                  <Box>
                    <Text className="text-xs font-semibold mb-2 text-typography-600">ステータス</Text>
                    <VStack space="xs">
                      {availableTags
                        .filter(t => t.type === 'status')
                        .map((tag) => (
                          <Pressable key={tag.id} onPress={() => toggleTag(tag.id)}>
                            <Checkbox
                              value={tag.id}
                              isChecked={selectedTags.includes(tag.id)}
                              onChange={() => toggleTag(tag.id)}
                              size="sm"
                            >
                              <CheckboxIndicator>
                                <CheckboxIcon as={CheckIcon} />
                              </CheckboxIndicator>
                              <CheckboxLabel className="text-sm">{tag.name}</CheckboxLabel>
                            </Checkbox>
                          </Pressable>
                        ))}
                    </VStack>
                  </Box>
                )}
              </VStack>
            </ScrollView>
          )}
        </Box>
      </VStack>

      {/* 検索結果 */}
      {loading ? (
        <Box className="flex-1 items-center justify-center">
          <Spinner size="large" />
        </Box>
      ) : (
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
      )}
    </Box>
  );
}
