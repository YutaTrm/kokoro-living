import { useRouter } from 'expo-router';
import { CornerDownRight } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView } from 'react-native';

import Tag from '@/components/Tag';
import { supabase } from '@/src/lib/supabase';
import { Text } from '@/components/Themed';
import { Avatar, AvatarFallbackText, AvatarImage } from '@/components/ui/avatar';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';

interface PostItemProps {
  post: {
    id: string;
    content: string;
    created_at: string;
    parent_post_id?: string | null;
    user: {
      display_name: string;
      user_id: string;
      avatar_url?: string | null;
    };
    diagnoses: string[];
    treatments: string[];
    medications: string[];
  };
  disableAvatarTap?: boolean;
}

export default function PostItem({ post, disableAvatarTap = false }: PostItemProps) {
  const router = useRouter();
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
    router.push(`/post/${post.id}`);
  };

  const handleAvatarPress = (e: { stopPropagation: () => void }) => {
    if (disableAvatarTap) return;
    e.stopPropagation();
    // 自分のアバターならマイページへ遷移
    if (currentUserId === post.user.user_id) {
      router.push('/(tabs)/profile');
    } else {
      router.push(`/user/${post.user.user_id}`);
    }
  };

  const AvatarComponent = disableAvatarTap ? (
    <Avatar size="md">
      {post.user.avatar_url ? (
        <AvatarImage source={{ uri: post.user.avatar_url }} />
      ) : (
        <AvatarFallbackText>{post.user.display_name || 'User'}</AvatarFallbackText>
      )}
    </Avatar>
  ) : (
    <Pressable onPress={handleAvatarPress}>
      <Avatar size="md">
        {post.user.avatar_url ? (
          <AvatarImage source={{ uri: post.user.avatar_url }} />
        ) : (
          <AvatarFallbackText>{post.user.display_name || 'User'}</AvatarFallbackText>
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
                <CornerDownRight size={12} color="#666" />
                <Text className="text-xs text-typography-500">返信</Text>
              </HStack>
            )}

            {/* ユーザー名、時間、タグ */}
            <HStack space="xs" className="items-center flex-1">
              <Text className="font-semibold text-base">{post.user.display_name}</Text>
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
          </VStack>
        </HStack>
      </Box>
    </Pressable>
  );
}
