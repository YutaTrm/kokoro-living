import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/src/lib/supabase';

interface FollowCounts {
  followingCount: number;
  followersCount: number;
}

export function useFollow(targetUserId: string | null) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowedBy, setIsFollowedBy] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [counts, setCounts] = useState<FollowCounts>({ followingCount: 0, followersCount: 0 });
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserId(session?.user?.id ?? null);
    });
  }, []);

  const loadFollowStatus = useCallback(async () => {
    if (!targetUserId || !currentUserId) {
      setIsFollowing(false);
      setIsFollowedBy(false);
      return;
    }

    try {
      // 自分が相手をフォローしているか
      const { data: followingData } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', currentUserId)
        .eq('following_id', targetUserId)
        .single();

      setIsFollowing(!!followingData);

      // 相手が自分をフォローしているか
      const { data: followedByData } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', targetUserId)
        .eq('following_id', currentUserId)
        .single();

      setIsFollowedBy(!!followedByData);
    } catch {
      setIsFollowing(false);
      setIsFollowedBy(false);
    }
  }, [targetUserId, currentUserId]);

  const loadCounts = useCallback(async () => {
    if (!targetUserId) return;

    try {
      // フォロー中の数
      const { count: followingCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', targetUserId);

      // フォロワーの数
      const { count: followersCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', targetUserId);

      setCounts({
        followingCount: followingCount ?? 0,
        followersCount: followersCount ?? 0,
      });
    } catch {
      // ignore
    }
  }, [targetUserId]);

  useEffect(() => {
    loadFollowStatus();
    loadCounts();
  }, [loadFollowStatus, loadCounts]);

  const toggleFollow = async (): Promise<boolean> => {
    if (!targetUserId || !currentUserId) return false;
    if (targetUserId === currentUserId) return false;

    setIsLoading(true);
    try {
      if (isFollowing) {
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUserId)
          .eq('following_id', targetUserId);

        if (error) throw error;

        setIsFollowing(false);
        setCounts((prev) => ({ ...prev, followersCount: Math.max(0, prev.followersCount - 1) }));
      } else {
        const { error } = await supabase
          .from('follows')
          .insert({ follower_id: currentUserId, following_id: targetUserId });

        if (error) throw error;

        setIsFollowing(true);
        setCounts((prev) => ({ ...prev, followersCount: prev.followersCount + 1 }));
      }
      return true;
    } catch (error) {
      console.error('フォロー操作エラー:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const isOwnProfile = currentUserId === targetUserId;

  return {
    isFollowing,
    isFollowedBy,
    isLoading,
    toggleFollow,
    counts,
    isOwnProfile,
    currentUserId,
    refetch: () => {
      loadFollowStatus();
      loadCounts();
    },
  };
}
