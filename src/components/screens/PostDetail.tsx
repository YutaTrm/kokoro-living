import { useFocusEffect } from '@react-navigation/native';
import { Href, Stack, useLocalSearchParams, useRouter, useSegments } from 'expo-router';
import { CalendarDays, ChevronDown, Copy, Edit, Flag, MoreVertical, Trash2 } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView as RNScrollView } from 'react-native';
import * as Clipboard from 'expo-clipboard';

import ConfirmModal from '@/components/ConfirmModal';
import PostActionButtons from '@/components/PostActionButtons';
import ReplyIndicator from '@/components/ReplyIndicator';
import ReplyItem from '@/components/ReplyItem';
import Tag from '@/components/Tag';
import DefaultAvatar from '@/components/icons/DefaultAvatar';
import { Avatar, AvatarImage } from '@/components/ui/avatar';
import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Menu, MenuItem, MenuItemLabel } from '@/components/ui/menu';
import { Modal, ModalBackdrop, ModalBody, ModalContent, ModalFooter, ModalHeader } from '@/components/ui/modal';
import { Radio, RadioGroup, RadioIcon, RadioIndicator, RadioLabel } from '@/components/ui/radio';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { Textarea, TextareaInput } from '@/components/ui/textarea';
import { VStack } from '@/components/ui/vstack';
import { supabase } from '@/src/lib/supabase';
import { formatExperiencedAt } from '@/src/utils/dateUtils';
import { getCurrentTab } from '@/src/utils/getCurrentTab';

interface Post {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  parent_post_id?: string | null;
  experienced_at?: string | null;
  is_hidden?: boolean;
  hidden_reason?: string | null;
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
  parent_post_id: string | null;
  user: {
    display_name: string;
    user_id: string;
    avatar_url?: string | null;
  };
  childReplies?: Reply[];
  hasMoreReplies?: boolean;
  deeperRepliesCount?: number;
  isMuted?: boolean;
}

export default function PostDetailScreen() {
  const router = useRouter();
  const segments = useSegments();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [post, setPost] = useState<Post | null>(null);
  const [parentPost, setParentPost] = useState<Post | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [likesCount, setLikesCount] = useState(0);
  const [repliesCount, setRepliesCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [tags, setTags] = useState<{ diagnoses: string[]; treatments: string[]; medications: string[]; statuses: string[] }>({
    diagnoses: [],
    treatments: [],
    statuses: [],
    medications: [],
  });
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [loadingDeeperReplies, setLoadingDeeperReplies] = useState<Set<string>>(new Set());
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState<string>('harassment');
  const [reportDescription, setReportDescription] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // 認証状態の監視
  useEffect(() => {
    checkLoginStatus();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
      setCurrentUserId(session?.user?.id || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 画面フォーカス時にデータをリロード（編集後の更新反映）
  useFocusEffect(
    useCallback(() => {
      if (id) {
        loadPostDetail();
        loadReplies();
        loadLikesCount();
        checkIfLiked();
        checkIfBookmarked();
        loadTags();
      }
    }, [id])
  );

  const checkLoginStatus = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setIsLoggedIn(!!session);
    setCurrentUserId(session?.user?.id || null);
  };

  const loadPostDetail = async () => {
    try {
      const { data: postData, error: postError } = await supabase
        .from('posts')
        .select('id, content, created_at, user_id, experienced_at, parent_post_id, is_hidden, hidden_reason')
        .eq('id', id)
        .single();

      if (postError) throw postError;

      // ユーザー情報と親投稿を並列取得
      const [userRes, parentRes] = await Promise.all([
        supabase
          .from('users')
          .select('user_id, display_name, avatar_url')
          .eq('user_id', postData.user_id)
          .single(),
        postData.parent_post_id
          ? supabase
              .from('posts')
              .select('id, content, created_at, user_id')
              .eq('id', postData.parent_post_id)
              .single()
          : Promise.resolve({ data: null }),
      ]);

      setPost({
        ...postData,
        user: {
          display_name: userRes.data?.display_name || 'Unknown',
          user_id: postData.user_id,
          avatar_url: userRes.data?.avatar_url || null,
        },
      });

      // 親投稿がある場合はユーザー情報を取得
      if (parentRes.data) {
        const { data: parentUserData } = await supabase
          .from('users')
          .select('user_id, display_name, avatar_url')
          .eq('user_id', parentRes.data.user_id)
          .single();

        setParentPost({
          ...parentRes.data,
          user: {
            display_name: parentUserData?.display_name || 'Unknown',
            user_id: parentRes.data.user_id,
            avatar_url: parentUserData?.avatar_url || null,
          },
        });
      }
    } catch (error) {
      console.error('投稿取得エラー:', error);
      Alert.alert('エラー', '投稿の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const loadReplies = async () => {
    try {
      // ブロックしているユーザーとミュートしているユーザーのIDを取得
      const { data: { user } } = await supabase.auth.getUser();
      let blockedUserIds: string[] = [];
      let mutedUserIds: string[] = [];

      if (user) {
        // blocks/mutes を並列取得
        const [blocksRes, mutesRes] = await Promise.all([
          supabase
            .from('blocks')
            .select('blocked_id')
            .eq('blocker_id', user.id),
          supabase
            .from('mutes')
            .select('muted_id')
            .eq('muter_id', user.id),
        ]);

        blockedUserIds = blocksRes.data?.map(b => b.blocked_id) || [];
        mutedUserIds = mutesRes.data?.map(m => m.muted_id) || [];
      }

      // 直接の返信（1階層目）を取得
      let repliesQuery = supabase
        .from('posts')
        .select('id, content, created_at, user_id, parent_post_id')
        .eq('parent_post_id', id);

      // ブロックしているユーザーの返信を除外
      if (blockedUserIds.length > 0) {
        repliesQuery = repliesQuery.not('user_id', 'in', `(${blockedUserIds.join(',')})`);
      }

      const { data: repliesData, error: repliesError } = await repliesQuery.order('created_at', { ascending: true });

      if (repliesError) throw repliesError;

      if (!repliesData || repliesData.length === 0) {
        setReplies([]);
        setRepliesCount(0);
        return;
      }

      // 返信への返信（2階層目）を取得
      const replyIds = repliesData.map(r => r.id);
      let childRepliesQuery = supabase
        .from('posts')
        .select('id, content, created_at, user_id, parent_post_id')
        .in('parent_post_id', replyIds);

      // ブロックしているユーザーの返信を除外
      if (blockedUserIds.length > 0) {
        childRepliesQuery = childRepliesQuery.not('user_id', 'in', `(${blockedUserIds.join(',')})`);
      }

      const { data: childRepliesData } = await childRepliesQuery.order('created_at', { ascending: true });

      // 2階層目の返信IDを収集して、3階層目の存在確認
      const childReplyIds = (childRepliesData || []).map(r => r.id);
      let deeperRepliesCounts = new Map<string, number>();

      if (childReplyIds.length > 0) {
        // 3階層目の返信数をカウント
        const { data: deeperCounts } = await supabase
          .from('posts')
          .select('parent_post_id')
          .in('parent_post_id', childReplyIds);

        (deeperCounts || []).forEach((item: { parent_post_id: string }) => {
          const count = deeperRepliesCounts.get(item.parent_post_id) || 0;
          deeperRepliesCounts.set(item.parent_post_id, count + 1);
        });
      }

      // すべてのユーザーIDを収集
      const allUserIds = [
        ...new Set([
          ...repliesData.map(r => r.user_id),
          ...(childRepliesData || []).map(r => r.user_id),
        ]),
      ];

      const { data: usersData } = await supabase
        .from('users')
        .select('user_id, display_name, avatar_url')
        .in('user_id', allUserIds);

      const usersMap = new Map(
        (usersData || []).map(u => [u.user_id, { display_name: u.display_name, avatar_url: u.avatar_url }])
      );

      // 子返信をマップ化
      const childRepliesMap = new Map<string, Reply[]>();
      (childRepliesData || []).forEach((reply: { id: string; content: string; created_at: string; user_id: string; parent_post_id: string }) => {
        const parentId = reply.parent_post_id;
        if (!childRepliesMap.has(parentId)) {
          childRepliesMap.set(parentId, []);
        }
        const deeperCount = deeperRepliesCounts.get(reply.id) || 0;
        childRepliesMap.get(parentId)?.push({
          id: reply.id,
          content: reply.content,
          created_at: reply.created_at,
          parent_post_id: reply.parent_post_id,
          user: {
            display_name: usersMap.get(reply.user_id)?.display_name || 'Unknown',
            user_id: reply.user_id,
            avatar_url: usersMap.get(reply.user_id)?.avatar_url || null,
          },
          hasMoreReplies: deeperCount > 0,
          deeperRepliesCount: deeperCount,
          isMuted: mutedUserIds.includes(reply.user_id),
        });
      });

      const formattedReplies: Reply[] = repliesData.map((reply: { id: string; content: string; created_at: string; user_id: string; parent_post_id: string }) => ({
        id: reply.id,
        content: reply.content,
        created_at: reply.created_at,
        parent_post_id: reply.parent_post_id,
        user: {
          display_name: usersMap.get(reply.user_id)?.display_name || 'Unknown',
          user_id: reply.user_id,
          avatar_url: usersMap.get(reply.user_id)?.avatar_url || null,
        },
        childReplies: childRepliesMap.get(reply.id) || [],
        isMuted: mutedUserIds.includes(reply.user_id),
      }));

      setReplies(formattedReplies);
      setRepliesCount(formattedReplies.length);
    } catch (error) {
      console.error('返信取得エラー:', error);
    }
  };

  const loadDeeperReplies = async (parentReplyId: string, parentContent: string) => {
    setLoadingDeeperReplies(prev => new Set(prev).add(parentReplyId));

    try {
      // ブロックしているユーザーとミュートしているユーザーのIDを取得
      const { data: { user } } = await supabase.auth.getUser();
      let blockedUserIds: string[] = [];
      let mutedUserIds: string[] = [];

      if (user) {
        // blocks/mutes を並列取得
        const [blocksRes, mutesRes] = await Promise.all([
          supabase
            .from('blocks')
            .select('blocked_id')
            .eq('blocker_id', user.id),
          supabase
            .from('mutes')
            .select('muted_id')
            .eq('muter_id', user.id),
        ]);

        blockedUserIds = blocksRes.data?.map(b => b.blocked_id) || [];
        mutedUserIds = mutesRes.data?.map(m => m.muted_id) || [];
      }

      let deeperRepliesQuery = supabase
        .from('posts')
        .select('id, content, created_at, user_id, parent_post_id')
        .eq('parent_post_id', parentReplyId);

      // ブロックしているユーザーの返信を除外
      if (blockedUserIds.length > 0) {
        deeperRepliesQuery = deeperRepliesQuery.not('user_id', 'in', `(${blockedUserIds.join(',')})`);
      }

      const { data: deeperRepliesData } = await deeperRepliesQuery.order('created_at', { ascending: true });

      if (!deeperRepliesData || deeperRepliesData.length === 0) return;

      const userIds = deeperRepliesData.map(r => r.user_id);
      const { data: usersData } = await supabase
        .from('users')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds);

      const usersMap = new Map(
        (usersData || []).map(u => [u.user_id, { display_name: u.display_name, avatar_url: u.avatar_url }])
      );

      // 4階層目以降の存在確認
      const deeperIds = deeperRepliesData.map(r => r.id);
      const { data: evenDeeperCounts } = await supabase
        .from('posts')
        .select('parent_post_id')
        .in('parent_post_id', deeperIds);

      const evenDeeperCountsMap = new Map<string, number>();
      (evenDeeperCounts || []).forEach((item: { parent_post_id: string }) => {
        const count = evenDeeperCountsMap.get(item.parent_post_id) || 0;
        evenDeeperCountsMap.set(item.parent_post_id, count + 1);
      });

      const newDeeperReplies: Reply[] = deeperRepliesData.map((reply: { id: string; content: string; created_at: string; user_id: string; parent_post_id: string }) => ({
        id: reply.id,
        content: reply.content,
        created_at: reply.created_at,
        parent_post_id: reply.parent_post_id,
        user: {
          display_name: usersMap.get(reply.user_id)?.display_name || 'Unknown',
          user_id: reply.user_id,
          avatar_url: usersMap.get(reply.user_id)?.avatar_url || null,
        },
        hasMoreReplies: (evenDeeperCountsMap.get(reply.id) || 0) > 0,
        deeperRepliesCount: evenDeeperCountsMap.get(reply.id) || 0,
        isMuted: mutedUserIds.includes(reply.user_id),
      }));

      // repliesを更新して、該当の2階層目返信にchildRepliesを追加
      setReplies(prev => prev.map(reply => ({
        ...reply,
        childReplies: reply.childReplies?.map(child =>
          child.id === parentReplyId
            ? { ...child, childReplies: newDeeperReplies }
            : child
        ),
      })));

      setExpandedReplies(prev => new Set(prev).add(parentReplyId));
    } catch (error) {
      console.error('深い返信取得エラー:', error);
    } finally {
      setLoadingDeeperReplies(prev => {
        const newSet = new Set(prev);
        newSet.delete(parentReplyId);
        return newSet;
      });
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
      // 4つのタグクエリを並列実行
      const [diagnosesRes, treatmentsRes, medicationsRes, statusesRes] = await Promise.all([
        supabase
          .from('post_diagnoses')
          .select('user_diagnoses(diagnoses(name))')
          .eq('post_id', id),
        supabase
          .from('post_treatments')
          .select('user_treatments(treatments(name))')
          .eq('post_id', id),
        supabase
          .from('post_medications')
          .select('user_medications(ingredients(name), products(name))')
          .eq('post_id', id),
        supabase
          .from('post_statuses')
          .select('user_statuses(statuses(name))')
          .eq('post_id', id),
      ]);

      type DiagnosisRow = { user_diagnoses: { diagnoses: { name: string } } | null };
      const diagnoses = (diagnosesRes.data as DiagnosisRow[] | null)?.map(d => d.user_diagnoses?.diagnoses?.name).filter(Boolean) as string[] || [];

      type TreatmentRow = { user_treatments: { treatments: { name: string } } | null };
      const treatments = (treatmentsRes.data as TreatmentRow[] | null)?.map(t => t.user_treatments?.treatments?.name).filter(Boolean) as string[] || [];

      type MedicationRow = { user_medications: { ingredients: { name: string } } | null };
      const medicationsWithDuplicates = (medicationsRes.data as MedicationRow[] | null)?.map(m =>
        m.user_medications?.ingredients?.name
      ).filter(Boolean) as string[] || [];
      const medications = [...new Set(medicationsWithDuplicates)];

      type StatusRow = { user_statuses: { statuses: { name: string } } | null };
      const statuses = (statusesRes.data as StatusRow[] | null)?.map(s => s.user_statuses?.statuses?.name).filter(Boolean) as string[] || [];

      setTags({ diagnoses, treatments, medications, statuses });
    } catch (error) {
      console.error('タグ取得エラー:', error);
    }
  };

  const checkIfLiked = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('likes')
        .select('id')
        .eq('post_id', id)
        .eq('user_id', user.id)
        .single();

      setIsLiked(!!data);
    } catch (error) {
      // エラーは無視
    }
  };

  const checkIfBookmarked = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('bookmarks')
        .select('id')
        .eq('post_id', id)
        .eq('user_id', user.id)
        .single();

      setIsBookmarked(!!data);
    } catch (error) {
      // エラーは無視
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
        const { error } = await supabase
          .from('bookmarks')
          .delete()
          .eq('post_id', id)
          .eq('user_id', user.id);

        if (!error) {
          setIsBookmarked(false);
        }
      } else {
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

  const handleReport = () => {
    setShowReportModal(true);
  };

  const handleDeletePress = () => {
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setShowDeleteModal(false);
      Alert.alert('削除完了', '投稿を削除しました', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('削除エラー:', error);
      Alert.alert('エラー', '投稿の削除に失敗しました');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmitReport = async () => {
    if (!reportReason) {
      Alert.alert('エラー', '通報理由を選択してください');
      return;
    }

    setIsSubmittingReport(true);

    try {
      const { data, error } = await supabase.rpc('report_post', {
        p_post_id: id,
        p_reason: reportReason,
        p_description: reportDescription || null,
      });

      if (error) throw error;

      const result = data as { success: boolean; report_count: number; threshold: number; hidden: boolean };

      setShowReportModal(false);
      setReportReason('harassment');
      setReportDescription('');

      if (result.hidden) {
        Alert.alert(
          '通報完了',
          '通報を受け付けました。この投稿は非表示になりました。',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else {
        Alert.alert('通報完了', '通報を受け付けました。ご協力ありがとうございます。');
      }
    } catch (error) {
      console.error('通報エラー:', error);
      Alert.alert('エラー', '通報の送信に失敗しました');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const handleUserPress = (userId: string) => {
    // 現在のタブ内のユーザー詳細に遷移（自分でも他人でも同じ）
    const currentTab = getCurrentTab(segments);
    router.push(`/(tabs)/${currentTab}/user/${userId}` as Href);
  };

  const handleParentPress = () => {
    if (post?.parent_post_id) {
      const currentTab = getCurrentTab(segments);
      router.push(`/(tabs)/${currentTab}/post/${post.parent_post_id}` as Href);
    }
  };

  const isOwnPost = currentUserId && post && currentUserId === post.user_id;
  const isReply = post?.parent_post_id;

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

  // 非表示投稿の場合（他人の投稿のみブロック、自分の投稿は警告バナー付きで表示）
  if (post.is_hidden && !isOwnPost) {
    return (
      <>
        <Stack.Screen options={{ title: 'ポスト' }} />
        <Box className="flex-1 items-center justify-center p-5">
          <VStack space="md" className="items-center">
            <Icon as={Flag} size="xl" className="text-typography-500" />
            <Text className="text-base text-center text-typography-500">
              この投稿は通報により非表示になりました
            </Text>
            <Button onPress={() => router.back()} className="mt-4">
              <ButtonText>戻る</ButtonText>
            </Button>
          </VStack>
        </Box>
      </>
    );
  }

  // 再帰的に深い返信をレンダリングする関数
  const renderDeeperReplies = (childReplies: Reply[], parentContent: string, depth: number) => {
    return childReplies.map((deepReply, index) => {
      const isLastInGroup = index === childReplies.length - 1;
      const hasChildren = (deepReply.childReplies?.length ?? 0) > 0 || deepReply.hasMoreReplies;

      return (
        <Box key={deepReply.id}>
          <ReplyItem
            reply={deepReply}
            showVerticalLine={!isLastInGroup || hasChildren}
            depth={depth}
            onReplyCreated={loadReplies}
          />
          {/* さらに深い返信がある場合 */}
          {deepReply.hasMoreReplies && !expandedReplies.has(deepReply.id) && (
            <Pressable
              onPress={() => loadDeeperReplies(deepReply.id, deepReply.content)}
              className="px-4 py-2 ml-10"
            >
              <HStack space="xs" className="items-center">
                {loadingDeeperReplies.has(deepReply.id) ? (
                  <Spinner size="small" />
                ) : (
                  <>
                    <Icon as={ChevronDown} size="sm" className="text-typography-700" />
                    <Text className="text-sm text-primary-500">
                      さらに表示する（{deepReply.deeperRepliesCount}件）
                    </Text>
                  </>
                )}
              </HStack>
            </Pressable>
          )}
          {/* 展開された深い返信 */}
          {deepReply.childReplies && expandedReplies.has(deepReply.id) && (
            renderDeeperReplies(deepReply.childReplies, deepReply.content, depth + 1)
          )}
        </Box>
      );
    });
  };

  return (
    <>
      <Stack.Screen options={{ title: 'ポスト' }} />
      <RNScrollView className="flex-1 bg-background-0">
        {/* 投稿詳細 */}
        <Box className="px-4 py-4 border-b border-outline-200">
          {/* 返信インジケーター（返信詳細ページの場合） */}
          {isReply && parentPost && (
            <Box className="mb-3">
              <ReplyIndicator
                parentContent={parentPost.content}
                parentAvatarUrl={parentPost.user.avatar_url}
                onPress={handleParentPress}
              />
            </Box>
          )}

          {/* ヘッダー：ユーザー情報とメニューボタン */}
          <HStack className="justify-between items-start mb-3">
            <Pressable onPress={() => handleUserPress(post.user_id)} className="flex-1">
              <HStack space="sm">
                <Avatar size="md">
                  {post.user.avatar_url ? (
                    <AvatarImage source={{ uri: post.user.avatar_url }} />
                  ) : (
                    <DefaultAvatar size="md" />
                  )}
                </Avatar>
                <VStack>
                  <Text className="font-semibold text-base">{post.user.display_name}</Text>
                  <Text className="text-sm text-typography-500">{formatDate(post.created_at)}</Text>
                </VStack>
              </HStack>
            </Pressable>
            {isLoggedIn && (
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
                {isOwnPost ? (
                  <>
                    <MenuItem key="copy" textValue="コピー" onPress={() => {
                      Clipboard.setStringAsync(post.content);
                      Alert.alert('コピーしました');
                    }}>
                      <Icon as={Copy} size="md" className="text-typography-700" />
                      <MenuItemLabel className="ml-2">投稿をコピー</MenuItemLabel>
                    </MenuItem>
                    <MenuItem key="edit" textValue="編集" onPress={handleEdit}>
                      <Icon as={Edit} size="md" className="text-typography-700" />
                      <MenuItemLabel className="ml-2">投稿を編集</MenuItemLabel>
                    </MenuItem>
                    <MenuItem key="delete" textValue="削除" onPress={handleDeletePress}>
                      <Icon as={Trash2} size="md" className="text-error-500" />
                      <MenuItemLabel className="ml-2 text-error-500">投稿を削除</MenuItemLabel>
                    </MenuItem>
                  </>
                ) : (
                  <MenuItem key="report" textValue="通報" onPress={handleReport}>
                    <Icon as={Flag} size="sm" className="text-typography-700" />
                    <MenuItemLabel className="ml-2">投稿を通報</MenuItemLabel>
                  </MenuItem>
                )}
              </Menu>
            )}
          </HStack>

          {/* 非表示警告バナー（自分の投稿のみ） */}
          {post.is_hidden && isOwnPost && (
            <Box className="bg-error-50 border border-error-200 rounded-md p-3 mb-3">
              <HStack space="sm" className="items-center">
                <Icon as={Flag} size="sm" className="text-error-500" />
                <Text className="text-sm text-error-500 flex-1">
                  この投稿は通報により非表示になりました（あなた以外には表示されません）
                </Text>
              </HStack>
            </Box>
          )}

          <Text className="text-lg leading-6 mb-2">{post.content}</Text>

          {post.experienced_at && (
            <HStack space="xs" className="items-center mb-2">
              <Icon as={CalendarDays} size="sm" className="text-typography-500" />
              <Text className="text-sm text-typography-500">{formatExperiencedAt(post.experienced_at)}</Text>
            </HStack>
          )}

          {/* タグ表示（返信でない場合のみ） */}
          {!isReply && (tags.diagnoses.length > 0 || tags.treatments.length > 0 || tags.medications.length > 0 || tags.statuses.length > 0) && (
            <Box className="mb-2 flex-row flex-wrap gap-2">
              {tags.diagnoses.map((tag, index) => (
                <Tag key={`d-${index}`} name={tag} color="fuchsia-400" size="xs" />
              ))}
              {tags.treatments.map((tag, index) => (
                <Tag key={`t-${index}`} name={tag} color="green-400" size="xs" />
              ))}
              {tags.medications.map((tag, index) => (
                <Tag key={`m-${index}`} name={tag} color="cyan-400" size="xs" />
              ))}
              {tags.statuses.map((tag, index) => (
                <Tag key={`s-${index}`} name={tag} color="orange-400" size="xs" />
              ))}
            </Box>
          )}

          <PostActionButtons
            repliesCount={repliesCount}
            likesCount={likesCount}
            isLiked={isLiked}
            isBookmarked={isBookmarked}
            onReply={handleReply}
            onLike={handleLike}
            onBookmark={handleBookmark}
            onLikesCountPress={() => {
              const currentTab = getCurrentTab(segments);
              router.push(`/(tabs)/${currentTab}/post/${id}/likes` as Href);
            }}
            size="md"
          />
        </Box>

        {/* 返信一覧（1階層目のみ表示） */}
        {replies.length > 0 && (
          <Box>
            {replies.map((reply) => (
              <ReplyItem
                key={reply.id}
                reply={reply}
                showVerticalLine={false}
                depth={0}
                onReplyCreated={loadReplies}
              />
            ))}
          </Box>
        )}
      </RNScrollView>

      {/* 通報モーダル */}
      <Modal isOpen={showReportModal} onClose={() => setShowReportModal(false)} size="md">
        <ModalBackdrop />
        <ModalContent>
          <ModalHeader>
            <Text className="text-lg font-semibold">投稿を通報</Text>
          </ModalHeader>
          <ModalBody>
            <VStack space="md">
              <Text className="text-sm text-typography-500">
                通報理由を選択してください
              </Text>
              <RadioGroup value={reportReason} onChange={setReportReason}>
                <VStack space="md">
                  <Radio value="self_harm">
                    <RadioIndicator>
                      <RadioIcon as={ChevronDown} />
                    </RadioIndicator>
                    <RadioLabel>自傷・自殺の誘発</RadioLabel>
                  </Radio>
                  <Radio value="harassment">
                    <RadioIndicator>
                      <RadioIcon as={ChevronDown} />
                    </RadioIndicator>
                    <RadioLabel>ハラスメント・攻撃的な内容</RadioLabel>
                  </Radio>
                  <Radio value="spam">
                    <RadioIndicator>
                      <RadioIcon as={ChevronDown} />
                    </RadioIndicator>
                    <RadioLabel>スパム・宣伝</RadioLabel>
                  </Radio>
                  <Radio value="privacy">
                    <RadioIndicator>
                      <RadioIcon as={ChevronDown} />
                    </RadioIndicator>
                    <RadioLabel>個人情報の漏洩</RadioLabel>
                  </Radio>
                  <Radio value="other">
                    <RadioIndicator>
                      <RadioIcon as={ChevronDown} />
                    </RadioIndicator>
                    <RadioLabel>その他</RadioLabel>
                  </Radio>
                </VStack>
              </RadioGroup>
              <VStack space="xs">
                <Text className="text-sm text-typography-500">
                  詳細説明（任意）
                </Text>
                <Textarea>
                  <TextareaInput
                    placeholder="詳しい説明があれば記入してください"
                    value={reportDescription}
                    onChangeText={setReportDescription}
                    className="min-h-[80px]"
                  />
                </Textarea>
              </VStack>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <HStack space="sm" className="flex-1">
              <Button
                variant="outline"
                onPress={() => setShowReportModal(false)}
                className="flex-1"
                disabled={isSubmittingReport}
              >
                <ButtonText>キャンセル</ButtonText>
              </Button>
              <Button
                onPress={handleSubmitReport}
                className="flex-1"
                disabled={isSubmittingReport}
              >
                {isSubmittingReport ? (
                  <Spinner size="small" color="white" />
                ) : (
                  <ButtonText>送信</ButtonText>
                )}
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* 削除確認モーダル */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        title="投稿を削除"
        message="この投稿を削除しますか？この操作は取り消せません。"
        confirmText="削除"
        isLoading={isDeleting}
      />
    </>
  );
}
