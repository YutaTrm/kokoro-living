import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { Checkbox, CheckboxIcon, CheckboxIndicator, CheckboxLabel } from '@/components/ui/checkbox';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { CheckIcon } from '@/components/ui/icon';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { supabase } from '@/src/lib/supabase';
import { checkNGWords } from '@/src/utils/ngWordFilter';

interface MedicalTag {
  id: string;
  name: string;
  type: 'diagnosis' | 'treatment' | 'medication';
  ingredientId?: string; // 服薬用: 同じ成分のタグをグループ化
  relatedIds?: string[]; // 服薬用: 同じ成分の全てのuser_medication ID
}

const SELECTED_TAGS_KEY = 'last_selected_tags';

export default function CreatePostScreen() {
  const router = useRouter();
  const { postId } = useLocalSearchParams<{ postId?: string }>();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingTags, setLoadingTags] = useState(true);
  const [loadingPost, setLoadingPost] = useState(!!postId);

  const [availableTags, setAvailableTags] = useState<MedicalTag[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isReply, setIsReply] = useState(false);

  // experienced_at用の状態管理
  const currentDate = new Date();
  const [experiencedYear, setExperiencedYear] = useState(currentDate.getFullYear().toString());
  const [experiencedMonth, setExperiencedMonth] = useState((currentDate.getMonth() + 1).toString());
  const [isExperiencedAtUnset, setIsExperiencedAtUnset] = useState(false);

  const maxLength = 140;
  const remainingChars = maxLength - content.length;
  const isEditMode = !!postId;

  useEffect(() => {
    const initializeData = async () => {
      await loadUserMedicalData();

      if (postId) {
        // 編集モードの場合は既存の投稿を読み込む
        loadExistingPost();
      } else {
        // 新規投稿の場合は前回選択したタグを読み込む
        try {
          const savedTags = await AsyncStorage.getItem(SELECTED_TAGS_KEY);
          if (savedTags) {
            setSelectedTags(JSON.parse(savedTags));
          }
        } catch (error) {
          console.error('タグ読み込みエラー:', error);
        }
      }
    };

    initializeData();
  }, [postId]);

  // selectedTagsが変更されたらAsyncStorageに保存（編集モード以外）
  useEffect(() => {
    if (!postId && selectedTags.length > 0) {
      AsyncStorage.setItem(SELECTED_TAGS_KEY, JSON.stringify(selectedTags)).catch((error) => {
        console.error('タグ保存エラー:', error);
      });
    }
  }, [selectedTags, postId]);

  const loadUserMedicalData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const tags: MedicalTag[] = [];

      // 診断名を取得
      const { data: diagnoses } = await supabase
        .from('user_diagnoses')
        .select('id, diagnoses(name)')
        .eq('user_id', user.id);

      if (diagnoses) {
        diagnoses.forEach((d: any) => {
          if (d.diagnoses?.name) {
            tags.push({
              id: d.id,
              name: d.diagnoses.name,
              type: 'diagnosis',
            });
          }
        });
      }

      // 治療法を取得
      const { data: treatments } = await supabase
        .from('user_treatments')
        .select('id, treatments(name)')
        .eq('user_id', user.id);

      if (treatments) {
        treatments.forEach((t: any) => {
          if (t.treatments?.name) {
            tags.push({
              id: t.id,
              name: t.treatments.name,
              type: 'treatment',
            });
          }
        });
      }

      // 服薬を取得（成分でグループ化）
      const { data: medications } = await supabase
        .from('user_medications')
        .select('id, ingredient_id, ingredients(name), products(name)')
        .eq('user_id', user.id);

      // 全製品マスターを取得（成分IDごとの製品名リスト用）
      const { data: allProducts } = await supabase
        .from('products')
        .select('ingredient_id, name');

      if (medications) {
        // 成分IDごとの製品名をマップ化
        const productsByIngredient = new Map<string, string[]>();
        if (allProducts) {
          allProducts.forEach((p: { ingredient_id: string; name: string }) => {
            const existing = productsByIngredient.get(p.ingredient_id);
            if (existing) {
              existing.push(p.name);
            } else {
              productsByIngredient.set(p.ingredient_id, [p.name]);
            }
          });
        }

        // 成分IDでグループ化
        const ingredientMap = new Map<string, {
          ids: string[];
          ingredientId: string;
          ingredientName: string;
        }>();

        medications.forEach((m: any) => {
          const ingredientId = m.ingredient_id;
          const ingredientName = m.ingredients?.name || '';

          if (ingredientName && ingredientId) {
            const existing = ingredientMap.get(ingredientId);
            if (existing) {
              existing.ids.push(m.id);
            } else {
              ingredientMap.set(ingredientId, {
                ids: [m.id],
                ingredientId,
                ingredientName,
              });
            }
          }
        });

        // 「成分名(製品名1、製品名2)」形式でタグを追加
        ingredientMap.forEach((item) => {
          const productNames = productsByIngredient.get(item.ingredientId) || [];
          const displayName = productNames.length > 0
            ? `${item.ingredientName}(${productNames.join('、')})`
            : item.ingredientName;

          tags.push({
            id: item.ids[0], // 代表ID
            name: displayName,
            type: 'medication',
            ingredientId: item.ingredientId,
            relatedIds: item.ids, // 同じ成分の全てのID
          });
        });
      }

      setAvailableTags(tags);
    } catch (error) {
      console.error('医療情報取得エラー:', error);
    } finally {
      setLoadingTags(false);
    }
  };

  const loadExistingPost = async () => {
    try {
      if (!postId) return;

      // 投稿内容を取得
      const { data: post, error: postError } = await supabase
        .from('posts')
        .select('content, experienced_at, parent_post_id')
        .eq('id', postId)
        .single();

      if (postError || !post) {
        Alert.alert('エラー', '投稿の取得に失敗しました');
        router.back();
        return;
      }

      setContent(post.content);
      setIsReply(!!post.parent_post_id);

      // experienced_atを設定
      if (post.experienced_at) {
        const date = new Date(post.experienced_at);
        setExperiencedYear(date.getFullYear().toString());
        setExperiencedMonth((date.getMonth() + 1).toString());
        setIsExperiencedAtUnset(false);
      } else {
        setIsExperiencedAtUnset(true);
      }

      // 既存のタグを取得
      const tagIds: string[] = [];

      // 診断名タグ
      const { data: diagnosesData } = await supabase
        .from('post_diagnoses')
        .select('user_diagnosis_id')
        .eq('post_id', postId);
      if (diagnosesData) {
        tagIds.push(...diagnosesData.map(d => d.user_diagnosis_id));
      }

      // 治療法タグ
      const { data: treatmentsData } = await supabase
        .from('post_treatments')
        .select('user_treatment_id')
        .eq('post_id', postId);
      if (treatmentsData) {
        tagIds.push(...treatmentsData.map(t => t.user_treatment_id));
      }

      // 服薬タグ
      const { data: medicationsData } = await supabase
        .from('post_medications')
        .select('user_medication_id')
        .eq('post_id', postId);
      if (medicationsData) {
        tagIds.push(...medicationsData.map(m => m.user_medication_id));
      }

      setSelectedTags(tagIds);
    } catch (error) {
      console.error('投稿読み込みエラー:', error);
      Alert.alert('エラー', '投稿の読み込みに失敗しました');
    } finally {
      setLoadingPost(false);
    }
  };

  const toggleTag = (tagId: string) => {
    const tag = availableTags.find(t => t.id === tagId);

    // 服薬の場合は関連する全てのIDを選択/解除
    if (tag?.type === 'medication' && tag.relatedIds) {
      setSelectedTags((prev) => {
        const isSelected = prev.includes(tagId);
        if (isSelected) {
          // 解除: 関連する全てのIDを削除
          return prev.filter((id) => !tag.relatedIds!.includes(id));
        } else {
          // 選択: 関連する全てのIDを追加
          return [...new Set([...prev, ...tag.relatedIds!])];
        }
      });
    } else {
      setSelectedTags((prev) =>
        prev.includes(tagId)
          ? prev.filter((id) => id !== tagId)
          : [...prev, tagId]
      );
    }
  };

  const handlePost = async () => {
    if (!content.trim()) {
      Alert.alert('エラー', '投稿内容を入力してください');
      return;
    }

    if (content.length > maxLength) {
      Alert.alert('エラー', `投稿は${maxLength}文字以内で入力してください`);
      return;
    }

    // NGワードチェック
    const ngWordCheck = checkNGWords(content);
    if (!ngWordCheck.isValid) {
      Alert.alert('投稿できません', ngWordCheck.message);
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('エラー', 'ログインしてください');
        return;
      }

      let finalPostId: string;

      // experienced_atを計算
      const experiencedAt = isExperiencedAtUnset
        ? null
        : `${experiencedYear}-${experiencedMonth.padStart(2, '0')}-01`;

      if (isEditMode && postId) {
        // 編集モード：投稿を更新
        const { error: updateError } = await supabase
          .from('posts')
          .update({
            content: content.trim(),
            experienced_at: experiencedAt,
          })
          .eq('id', postId);

        if (updateError) {
          throw updateError;
        }

        // 既存のタグをすべて削除
        await Promise.all([
          supabase.from('post_diagnoses').delete().eq('post_id', postId),
          supabase.from('post_treatments').delete().eq('post_id', postId),
          supabase.from('post_medications').delete().eq('post_id', postId),
        ]);

        finalPostId = postId;
      } else {
        // 新規作成モード：投稿を作成
        const { data: post, error: postError } = await supabase
          .from('posts')
          .insert({
            user_id: user.id,
            content: content.trim(),
            experienced_at: experiencedAt,
          })
          .select()
          .single();

        if (postError || !post) {
          throw postError;
        }

        finalPostId = post.id;
      }

      // タグを関連付け
      const tagPromises = selectedTags.map((tagId) => {
        const tag = availableTags.find((t) => t.id === tagId);
        if (!tag) return null;

        const tableName =
          tag.type === 'diagnosis'
            ? 'post_diagnoses'
            : tag.type === 'treatment'
            ? 'post_treatments'
            : 'post_medications';

        const columnName =
          tag.type === 'diagnosis'
            ? 'user_diagnosis_id'
            : tag.type === 'treatment'
            ? 'user_treatment_id'
            : 'user_medication_id';

        return supabase.from(tableName).insert({
          post_id: finalPostId,
          [columnName]: tagId,
        });
      });

      await Promise.all(tagPromises.filter((p) => p !== null));

      if (isEditMode) {
        // 編集モード: 元の画面に戻る（投稿詳細ページでリロードされる）
        router.back();
      } else {
        // 新規作成: タイムラインにリダイレクト
        router.replace('/(tabs)/(home)');
      }
    } catch (error) {
      console.error('投稿エラー:', error);
      Alert.alert('エラー', isEditMode ? '更新に失敗しました' : '投稿に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  if (loadingPost) {
    return (
      <Box className="flex-1 items-center justify-center">
        <Spinner size="large" />
      </Box>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background-0" edges={['top']}>
      {/* ヘッダー */}
      <HStack className="justify-between items-center px-4 py-3 border-b border-outline-200">
        <Button variant="link" onPress={() => router.back()}>
          <ButtonText>キャンセル</ButtonText>
        </Button>
        <Button
          onPress={handlePost}
          disabled={loading || !content.trim()}
          size="sm"
        >
          <ButtonText>{loading ? (isEditMode ? '更新中...' : '投稿中...') : (isEditMode ? '更新' : '投稿')}</ButtonText>
        </Button>
      </HStack>

      <ScrollView className="flex-1">
        <VStack className="p-4" space="lg">
          {/* テキスト入力 */}
          <Box>
            <TextInput
              className="min-h-[120px] text-typography-900 text-lg"
              placeholder="状態や感情など自由に記述してください"
              placeholderTextColor="#999"
              multiline
              value={content}
              onChangeText={setContent}
              maxLength={maxLength}
              autoFocus
            />
            <Text
              className={`text-sm text-right mt-2 ${
                remainingChars < 0 ? 'text-error-500' : 'text-typography-500'
              }`}
            >
              {remainingChars}
            </Text>
          </Box>

          {/* 体験日時選択（返信の場合は非表示） */}
          {!isReply && (
          <Box>
            <Heading size="sm" className="mb-3">
              体験日時（任意）
            </Heading>
            <HStack space="sm">
              <Box className="flex-1 border border-outline-200 rounded-lg">
                <ScrollView className="max-h-40">
                  <Pressable
                    onPress={() => setIsExperiencedAtUnset(true)}
                    className={`p-3 border-b border-outline-100 ${isExperiencedAtUnset ? 'bg-primary-500' : ''}`}
                  >
                    <Text
                      className={`text-center ${isExperiencedAtUnset ? 'font-semibold text-typography-100' : ''}`}
                    >
                      未設定
                    </Text>
                  </Pressable>
                  {Array.from({ length: 50 }, (_, i) => (currentDate.getFullYear() - i).toString()).map((year) => (
                    <Pressable
                      key={year}
                      onPress={() => {
                        setExperiencedYear(year);
                        setIsExperiencedAtUnset(false);
                      }}
                      className={`p-3 border-b border-outline-100 ${experiencedYear === year && !isExperiencedAtUnset ? 'bg-primary-500' : ''}`}
                    >
                      <Text
                        className={`text-center ${experiencedYear === year && !isExperiencedAtUnset ? 'font-semibold text-typography-100' : ''}`}
                      >
                        {year}年
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </Box>
              <Box className="flex-1 border border-outline-200 rounded-lg">
                <ScrollView className="max-h-40">
                  {Array.from({ length: 12 }, (_, i) => (i + 1).toString()).map((month) => (
                    <Pressable
                      key={month}
                      onPress={() => {
                        setExperiencedMonth(month);
                        setIsExperiencedAtUnset(false);
                      }}
                      className={`p-3 border-b border-outline-100 ${experiencedMonth === month && !isExperiencedAtUnset ? 'bg-primary-500' : ''}`}
                      disabled={isExperiencedAtUnset}
                    >
                      <Text
                        className={`text-center ${experiencedMonth === month && !isExperiencedAtUnset ? 'font-semibold text-typography-100' : ''} ${isExperiencedAtUnset ? 'text-typography-400' : ''}`}
                      >
                        {month}月
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </Box>
            </HStack>
          </Box>
          )}

          {/* タグ選択（返信の場合は非表示） */}
          {!isReply && (
            <Box>
              <Heading size="sm" className="mb-3">
                タグを選択（任意）
              </Heading>
              {loadingTags ? (
                <Spinner size="large" />
              ) : availableTags.length > 0 ? (
                <VStack space="lg">
                  {/* 診断名グループ */}
                  {availableTags.filter(t => t.type === 'diagnosis').length > 0 && (
                    <Box>
                      <Text className="text-sm font-semibold mb-2 text-typography-700">診断名</Text>
                      <VStack space="sm">
                        {availableTags
                          .filter(t => t.type === 'diagnosis')
                          .map((tag) => (
                            <Pressable key={tag.id} onPress={() => toggleTag(tag.id)}>
                              <Checkbox
                                value={tag.id}
                                isChecked={selectedTags.includes(tag.id)}
                                onChange={() => toggleTag(tag.id)}
                                size="md"
                              >
                                <CheckboxIndicator>
                                  <CheckboxIcon as={CheckIcon} />
                                </CheckboxIndicator>
                                <CheckboxLabel>{tag.name}</CheckboxLabel>
                              </Checkbox>
                            </Pressable>
                          ))}
                      </VStack>
                    </Box>
                  )}

                  {/* 治療法グループ */}
                  {availableTags.filter(t => t.type === 'treatment').length > 0 && (
                    <Box>
                      <Text className="text-sm font-semibold mb-2 text-typography-700">治療法</Text>
                      <VStack space="sm">
                        {availableTags
                          .filter(t => t.type === 'treatment')
                          .map((tag) => (
                            <Pressable key={tag.id} onPress={() => toggleTag(tag.id)}>
                              <Checkbox
                                value={tag.id}
                                isChecked={selectedTags.includes(tag.id)}
                                onChange={() => toggleTag(tag.id)}
                                size="md"
                              >
                                <CheckboxIndicator>
                                  <CheckboxIcon as={CheckIcon} />
                                </CheckboxIndicator>
                                <CheckboxLabel>{tag.name}</CheckboxLabel>
                              </Checkbox>
                            </Pressable>
                          ))}
                      </VStack>
                    </Box>
                  )}

                  {/* 服薬グループ */}
                  {availableTags.filter(t => t.type === 'medication').length > 0 && (
                    <Box>
                      <Text className="text-sm font-semibold mb-2 text-typography-700">服薬</Text>
                      <VStack space="sm">
                        {availableTags
                          .filter(t => t.type === 'medication')
                          .map((tag) => {
                            // 関連IDのいずれかが選択されていればチェック状態
                            const isChecked = tag.relatedIds
                              ? tag.relatedIds.some(id => selectedTags.includes(id))
                              : selectedTags.includes(tag.id);
                            return (
                              <Pressable key={tag.id} onPress={() => toggleTag(tag.id)}>
                                <Checkbox
                                  value={tag.id}
                                  isChecked={isChecked}
                                  onChange={() => toggleTag(tag.id)}
                                  size="md"
                                >
                                  <CheckboxIndicator>
                                    <CheckboxIcon as={CheckIcon} />
                                  </CheckboxIndicator>
                                  <CheckboxLabel>{tag.name}</CheckboxLabel>
                                </Checkbox>
                              </Pressable>
                            );
                          })}
                      </VStack>
                    </Box>
                  )}
                </VStack>
              ) : (
                <Text className="text-sm text-typography-500">
                  タグを追加するには、プロフィールで情報を登録してください
                </Text>
              )}
            </Box>
          )}
        </VStack>
      </ScrollView>
    </SafeAreaView>
  );
}
