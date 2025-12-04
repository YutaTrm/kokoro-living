import { supabase } from '@/src/lib/supabase';

export interface PostStats {
  repliesCount: number;
  likesCount: number;
  isLikedByCurrentUser: boolean;
  hasRepliedByCurrentUser: boolean;
}

/**
 * 複数の投稿の統計情報を一括取得
 */
export const fetchPostsStats = async (
  postIds: string[],
  currentUserId: string | null
): Promise<Map<string, PostStats>> => {
  if (postIds.length === 0) {
    return new Map();
  }

  // 返信数を取得
  const { data: repliesData } = await supabase
    .from('posts')
    .select('parent_post_id')
    .in('parent_post_id', postIds)
    .not('parent_post_id', 'is', null);

  // いいね数を取得
  const { data: likesData } = await supabase
    .from('likes')
    .select('post_id')
    .in('post_id', postIds);

  // 現在のユーザーがいいねした投稿を取得
  let userLikedPostIds: string[] = [];
  if (currentUserId) {
    const { data: userLikesData } = await supabase
      .from('likes')
      .select('post_id')
      .in('post_id', postIds)
      .eq('user_id', currentUserId);

    userLikedPostIds = userLikesData?.map(l => l.post_id) || [];
  }

  // 現在のユーザーが返信した投稿を取得
  let userRepliedPostIds: string[] = [];
  if (currentUserId) {
    const { data: userRepliesData } = await supabase
      .from('posts')
      .select('parent_post_id')
      .in('parent_post_id', postIds)
      .eq('user_id', currentUserId)
      .not('parent_post_id', 'is', null);

    userRepliedPostIds = userRepliesData?.map(r => r.parent_post_id) || [];
  }

  // 統計情報をマップに格納
  const statsMap = new Map<string, PostStats>();

  postIds.forEach((postId) => {
    const repliesCount = repliesData?.filter(r => r.parent_post_id === postId).length || 0;
    const likesCount = likesData?.filter(l => l.post_id === postId).length || 0;
    const isLikedByCurrentUser = userLikedPostIds.includes(postId);
    const hasRepliedByCurrentUser = userRepliedPostIds.includes(postId);

    statsMap.set(postId, {
      repliesCount,
      likesCount,
      isLikedByCurrentUser,
      hasRepliedByCurrentUser,
    });
  });

  return statsMap;
};
