import { useRouter, useSegments } from 'expo-router';
import { CornerDownRight, Flag } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView } from 'react-native';

import DefaultAvatar from '@/components/icons/DefaultAvatar';
import Tag from '@/components/Tag';
import { Text } from '@/components/Themed';
import { Avatar, AvatarImage } from '@/components/ui/avatar';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { VStack } from '@/components/ui/vstack';
import { supabase } from '@/src/lib/supabase';
import { getCurrentTab } from '@/src/utils/getCurrentTab';

interface PostItemProps {
  post: {
    id: string;
    content: string;
    created_at: string;
    parent_post_id?: string | null;
    is_hidden?: boolean;
    user: {
      display_name: string;
      user_id: string;
      avatar_url?: string | null;
    };
    diagnoses: string[];
    treatments: string[];
    medications: string[];
    isMuted?: boolean;
  };
  disableAvatarTap?: boolean;
}

export default function PostItem({ post, disableAvatarTap = false }: PostItemProps) {
  const router = useRouter();
  const segments = useSegments();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id ?? null);
    };
    getCurrentUser();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'たった今';
    if (minutes < 60) return `${minutes}分前`;
    if (hours < 24) return `${hours}時間前`;
    if (days < 7) return `${days}日前`;
    return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
  };

  const handlePress = () => {
    const currentTab = getCurrentTab(segments);
    router.push(`/(tabs)/${currentTab}/post/${post.id}`);
  };

  const handleAvatarPress = (e: { stopPropagation: () => void }) => {
    if (disableAvatarTap) return;
    e.stopPropagation();
    // 現在のタブ内のユーザー詳細に遷移（自分でも他人でも同じ）
    const currentTab = getCurrentTab(segments);
    router.push(`/(tabs)/${currentTab}/user/${post.user.user_id}`);
  };

  const displayName = post.isMuted ? 'ミュートユーザー' : post.user.display_name;
  const hasAvatar = !post.isMuted && post.user.avatar_url;

  const AvatarComponent = disableAvatarTap || post.isMuted ? (
    <Avatar size="md">
      {hasAvatar ? (
        <AvatarImage source={{ uri: post.user.avatar_url! }} />
      ) : (
        <DefaultAvatar size={48} />
      )}
    </Avatar>
  ) : (
    <Pressable onPress={handleAvatarPress}>
      <Avatar size="md">
        {hasAvatar ? (
          <AvatarImage source={{ uri: post.user.avatar_url! }} />
        ) : (
          <DefaultAvatar size={48} />
        )}
      </Avatar>
    </Pressable>
  );

  return (
    <Pressable onPress={handlePress}>
      <Box className="border-b border-outline-200 px-4 py-3">
        <HStack space="sm" className="items-start">
          {/* アバター */}
          {AvatarComponent}

          {/* 投稿内容 */}
          <VStack className="flex-1" space="xs">
            {/* 返信インジケーター */}
            {post.parent_post_id && (
              <HStack space="xs" className="items-center mb-1">
                <Icon as={CornerDownRight} size={12} className="text-typography-500" />
                <Text className="text-xs text-typography-500">返信</Text>
              </HStack>
            )}

            {/* ユーザー名、時間、タグ */}
            <HStack space="xs" className="items-center flex-1">
              <Text className="font-semibold text-base">{displayName}</Text>
              <Text className="text-sm text-typography-500">{formatDate(post.created_at)}</Text>

              {/* タグ（横スクロール） */}
              {(post.diagnoses.length > 0 || post.treatments.length > 0 || post.medications.length > 0) && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  className="flex-1"
                >
                  <HStack space="xs" className="ml-1">
                    {post.diagnoses.map((tag, index) => (
                      <Tag key={`d-${index}`} name={tag} color="fuchsia-400" size="xs" />
                    ))}
                    {post.treatments.map((tag, index) => (
                      <Tag key={`t-${index}`} name={tag} color="green-400" size="xs" />
                    ))}
                    {post.medications.map((tag, index) => (
                      <Tag key={`m-${index}`} name={tag} color="cyan-400" size="xs" />
                    ))}
                  </HStack>
                </ScrollView>
              )}
            </HStack>

            {/* 投稿テキスト */}
            <Text className="text-base leading-5" numberOfLines={3} ellipsizeMode="tail">
              {post.content}
            </Text>

            {/* 非表示警告バナー（自分の投稿のみ） */}
            {post.is_hidden && currentUserId === post.user.user_id && (
              <Box className="bg-error-50 border border-error-200 rounded-md p-2 mt-2">
                <HStack space="xs" className="items-center">
                  <Icon as={Flag} size={12} className="text-error-500" />
                  <Text className="text-xs text-error-500 flex-1">
                    通報により非表示（あなたのみ表示）
                  </Text>
                </HStack>
              </Box>
            )}
          </VStack>
        </HStack>
      </Box>
    </Pressable>
  );
}
