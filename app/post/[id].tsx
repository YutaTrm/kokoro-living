import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Bookmark, Clock, Edit, Heart, MessageCircle } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView as RNScrollView } from 'react-native';

import { Text } from '@/components/Themed';
import { Avatar, AvatarFallbackText, AvatarImage } from '@/components/ui/avatar';
import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Spinner } from '@/components/ui/spinner';
import { VStack } from '@/components/ui/vstack';
import { supabase } from '@/src/lib/supabase';

interface Post {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  experienced_at?: string | null;
  user: {
    display_name: string;
    user_id: string;
    avatar_url?: string | null;
  };
}

interface Reply {
  id: string;
  content: string;
  created_at: string;
  user: {
    display_name: string;
    user_id: string;
    avatar_url?: string | null;
  };
}

export default function PostDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [post, setPost] = useState<Post | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [likesCount, setLikesCount] = useState(0);
  const [repliesCount, setRepliesCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [tags, setTags] = useState<{ diagnoses: string[]; treatments: string[]; medications: string[] }>({
    diagnoses: [],
    treatments: [],
    medications: [],
  });

  useEffect(() => {
    checkLoginStatus();
    if (id) {
      loadPostDetail();
      loadReplies();
      loadLikesCount();
      checkIfLiked();
      checkIfBookmarked();
      loadTags();
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
      setCurrentUserId(session?.user?.id || null);
    });

    return () => subscription.unsubscribe();
  }, [id]);

  const checkLoginStatus = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setIsLoggedIn(!!session);
    setCurrentUserId(session?.user?.id || null);
  };

  const loadPostDetail = async () => {
    try {
      const { data: postData, error: postError } = await supabase
        .from('posts')
        .select('id, content, created_at, user_id, experienced_at')
        .eq('id', id)
        .single();

      if (postError) throw postError;

      // ユーザー情報を取得
      const { data: userData } = await supabase
        .from('users')
        .select('user_id, display_name, avatar_url')
        .eq('user_id', postData.user_id)
        .single();

      setPost({
        ...postData,
        user: {
          display_name: userData?.display_name || 'Unknown',
          user_id: postData.user_id,
          avatar_url: userData?.avatar_url || null,
        },
      });
    } catch (error) {
      console.error('投稿取得エラー:', error);
      Alert.alert('エラー', '投稿の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const loadReplies = async () => {
    try {
      const { data: repliesData, error: repliesError } = await supabase
        .from('posts')
        .select('id, content, created_at, user_id')
        .eq('parent_post_id', id)
        .order('created_at', { ascending: true });

      if (repliesError) throw repliesError;

      if (!repliesData || repliesData.length === 0) {
        setReplies([]);
        setRepliesCount(0);
        return;
      }

      // ユーザー情報を取得
      const userIds = [...new Set(repliesData.map(r => r.user_id))];
      const { data: usersData } = await supabase
        .from('users')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds);

      const usersMap = new Map(
        (usersData || []).map(u => [u.user_id, { display_name: u.display_name, avatar_url: u.avatar_url }])
      );

      const formattedReplies: Reply[] = repliesData.map((reply: any) => ({
        id: reply.id,
        content: reply.content,
        created_at: reply.created_at,
        user: {
          display_name: usersMap.get(reply.user_id)?.display_name || 'Unknown',
          user_id: reply.user_id,
          avatar_url: usersMap.get(reply.user_id)?.avatar_url || null,
        },
      }));

      setReplies(formattedReplies);
      setRepliesCount(formattedReplies.length);
    } catch (error) {
      console.error('返信取得エラー:', error);
    }
  };

  const loadLikesCount = async () => {
    try {
      const { count, error } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', id);

      if (!error && count !== null) {
        setLikesCount(count);
      }
    } catch (error) {
      console.error('いいね数取得エラー:', error);
    }
  };

  const loadTags = async () => {
    try {
      // 診断名を取得
      const { data: diagnosesData } = await supabase
        .from('post_diagnoses')
        .select('user_diagnoses(diagnoses(name))')
        .eq('post_id', id);

      const diagnoses = diagnosesData?.map((d: any) => d.user_diagnoses?.diagnoses?.name).filter(Boolean) || [];

      // 治療法を取得
      const { data: treatmentsData } = await supabase
        .from('post_treatments')
        .select('user_treatments(treatments(name))')
        .eq('post_id', id);

      const treatments = treatmentsData?.map((t: any) => t.user_treatments?.treatments?.name).filter(Boolean) || [];

      // 服薬を取得
      const { data: medicationsData } = await supabase
        .from('post_medications')
        .select('user_medications(ingredients(name), products(name))')
        .eq('post_id', id);

      const medicationsWithDuplicates = medicationsData?.map((m: any) =>
        m.user_medications?.ingredients?.name
      ).filter(Boolean) || [];
      // 重複を除去
      const medications = [...new Set(medicationsWithDuplicates)];

      setTags({ diagnoses, treatments, medications });
    } catch (error) {
      console.error('タグ取得エラー:', error);
    }
  };

  const checkIfLiked = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('likes')
        .select('id')
        .eq('post_id', id)
        .eq('user_id', user.id)
        .single();

      setIsLiked(!!data);
    } catch (error) {
      // エラーは無視（いいねしていない場合）
    }
  };

  const checkIfBookmarked = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('bookmarks')
        .select('id')
        .eq('post_id', id)
        .eq('user_id', user.id)
        .single();

      setIsBookmarked(!!data);
    } catch (error) {
      // エラーは無視（ブックマークしていない場合）
    }
  };

  const handleLike = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('エラー', 'ログインしてください');
        return;
      }

      if (isLiked) {
        // いいねを解除
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('post_id', id)
          .eq('user_id', user.id);

        if (!error) {
          setIsLiked(false);
          setLikesCount(prev => prev - 1);
        }
      } else {
        // いいねを追加
        const { error } = await supabase
          .from('likes')
          .insert({ post_id: id, user_id: user.id });

        if (!error) {
          setIsLiked(true);
          setLikesCount(prev => prev + 1);
        }
      }
    } catch (error) {
      console.error('いいねエラー:', error);
    }
  };

  const handleBookmark = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('エラー', 'ログインしてください');
        return;
      }

      if (isBookmarked) {
        // ブックマークを解除
        const { error } = await supabase
          .from('bookmarks')
          .delete()
          .eq('post_id', id)
          .eq('user_id', user.id);

        if (!error) {
          setIsBookmarked(false);
        }
      } else {
        // ブックマークを追加
        const { error } = await supabase
          .from('bookmarks')
          .insert({ post_id: id, user_id: user.id });

        if (!error) {
          setIsBookmarked(true);
        }
      }
    } catch (error) {
      console.error('ブックマークエラー:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatExperiencedAt = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    return `${year}/${month}当時`;
  };

  const handleReply = () => {
    if (!isLoggedIn) {
      Alert.alert('エラー', 'ログインしてください');
      return;
    }
    router.push(`/reply/${id}`);
  };

  const handleEdit = () => {
    router.push(`/create-post?postId=${id}`);
  };

  const handleUserPress = (userId: string) => {
    router.push(`/user/${userId}`);
  };

  const isOwnPost = currentUserId && post && currentUserId === post.user_id;

  if (loading) {
    return (
      <Box className="flex-1 items-center justify-center">
        <Spinner size="large" />
      </Box>
    );
  }

  if (!post) {
    return (
      <Box className="flex-1 items-center justify-center p-5">
        <Text className="text-base opacity-70">投稿が見つかりませんでした</Text>
        <Button onPress={() => router.back()} className="mt-4">
          <ButtonText>戻る</ButtonText>
        </Button>
      </Box>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'ポスト' }} />
      <RNScrollView className="flex-1 bg-background-0">
        {/* 投稿詳細 */}
      <Box className="px-4 py-4 border-b border-outline-200">
        <HStack space="sm" className="items-start mb-3">
          <Pressable onPress={() => handleUserPress(post.user_id)}>
            <Avatar size="md">
              {post.user.avatar_url ? (
                <AvatarImage source={{ uri: post.user.avatar_url }} />
              ) : (
                <AvatarFallbackText>{post.user.display_name}</AvatarFallbackText>
              )}
            </Avatar>
          </Pressable>
          <VStack>
            <Text className="font-semibold text-base">{post.user.display_name}</Text>
            <Text className="text-sm text-typography-500">{formatDate(post.created_at)}</Text>
          </VStack>
        </HStack>

        <Text className="text-lg leading-6 mb-2">{post.content}</Text>

        {/* 体験日時表示 */}
        {post.experienced_at && (
          <HStack space="xs" className="items-center mb-2">
            <Clock size={16} color="#666" />
            <Text className="text-sm text-typography-500">{formatExperiencedAt(post.experienced_at)}</Text>
          </HStack>
        )}

        {/* タグ表示（改行） */}
        {(tags.diagnoses.length > 0 || tags.treatments.length > 0 || tags.medications.length > 0) && (
          <Box className="mb-2 flex-row flex-wrap gap-2">
            {tags.diagnoses.map((tag, index) => (
              <Box key={`d-${index}`} className="bg-blue-100 px-3 py-1 rounded">
                <Text className="text-xs text-blue-700">{tag}</Text>
              </Box>
            ))}
            {tags.treatments.map((tag, index) => (
              <Box key={`t-${index}`} className="bg-green-100 px-3 py-1 rounded">
                <Text className="text-xs text-green-700">{tag}</Text>
              </Box>
            ))}
            {tags.medications.map((tag, index) => (
              <Box key={`m-${index}`} className="bg-purple-100 px-3 py-1 rounded">
                <Text className="text-xs text-purple-700">{tag}</Text>
              </Box>
            ))}
          </Box>
        )}

        {/* 統計情報 */}
        <HStack space="lg" className="mb-3 justify-between items-center">
          <HStack space="lg">
            <Text className="text-sm text-typography-500">
              <Text className="font-semibold text-typography-900">{repliesCount}</Text> 件の返信
            </Text>
            <Text className="text-sm text-typography-500">
              <Text className="font-semibold text-typography-900">{likesCount}</Text> いいね
            </Text>
          </HStack>

          {/* 編集ボタン（自分の投稿のみ） */}
          {isOwnPost && (
            <Pressable onPress={handleEdit}>
              <Edit size={20} color="#666" />
            </Pressable>
          )}
        </HStack>

        {/* アクションボタン */}
        <HStack space="lg" className="border-t border-outline-200 pt-3">
          <Button variant="link" size="sm" onPress={handleReply} className="flex-1">
            <HStack space="xs" className="items-center">
              <MessageCircle size={20} color="gray" />
              <ButtonText className="text-typography-500">返信</ButtonText>
            </HStack>
          </Button>

          <Button variant="link" size="sm" onPress={handleLike} className="flex-1">
            <HStack space="xs" className="items-center">
              <Heart size={20} color={isLiked ? 'red' : 'gray'} fill={isLiked ? 'red' : 'none'} />
              <ButtonText className={isLiked ? 'text-error-500' : 'text-typography-500'}>
                いいね
              </ButtonText>
            </HStack>
          </Button>

          <Button variant="link" size="sm" onPress={handleBookmark} className="flex-1">
            <HStack space="xs" className="items-center">
              <Bookmark size={20} color={isBookmarked ? 'blue' : 'gray'} fill={isBookmarked ? 'blue' : 'none'} />
              <ButtonText className={isBookmarked ? 'text-primary-500' : 'text-typography-500'}>
                保存
              </ButtonText>
            </HStack>
          </Button>
        </HStack>
      </Box>

      {/* 返信一覧 */}
      {replies.length > 0 && (
        <Box className="pt-3">
          {replies.map((reply) => (
            <Box key={reply.id} className="px-4 py-3 border-b border-outline-200">
              <HStack space="sm" className="items-start">
                <Pressable onPress={() => handleUserPress(reply.user.user_id)}>
                  <Avatar size="sm">
                    {reply.user.avatar_url ? (
                      <AvatarImage source={{ uri: reply.user.avatar_url }} />
                    ) : (
                      <AvatarFallbackText>{reply.user.display_name}</AvatarFallbackText>
                    )}
                  </Avatar>
                </Pressable>
                <VStack className="flex-1" space="xs">
                  <HStack space="xs" className="items-center">
                    <Text className="font-semibold text-sm">{reply.user.display_name}</Text>
                    <Text className="text-xs text-typography-500">·</Text>
                    <Text className="text-xs text-typography-500">{formatDate(reply.created_at)}</Text>
                  </HStack>
                  <Text className="text-base leading-5">{reply.content}</Text>
                </VStack>
              </HStack>
            </Box>
          ))}
        </Box>
      )}
      </RNScrollView>
    </>
  );
}
