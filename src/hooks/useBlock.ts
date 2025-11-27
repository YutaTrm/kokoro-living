import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/src/lib/supabase';

export function useBlock(targetUserId: string | null) {
  const [isBlocked, setIsBlocked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserId(session?.user?.id ?? null);
    });
  }, []);

  const loadBlockStatus = useCallback(async () => {
    if (!targetUserId || !currentUserId) {
      setIsBlocked(false);
      return;
    }

    try {
      const { data } = await supabase
        .from('blocks')
        .select('id')
        .eq('blocker_id', currentUserId)
        .eq('blocked_id', targetUserId)
        .single();

      setIsBlocked(!!data);
    } catch {
      setIsBlocked(false);
    }
  }, [targetUserId, currentUserId]);

  useEffect(() => {
    loadBlockStatus();
  }, [loadBlockStatus]);

  const toggleBlock = async () => {
    if (!targetUserId || !currentUserId || isLoading) return;

    setIsLoading(true);

    try {
      if (isBlocked) {
        // ブロック解除
        await supabase
          .from('blocks')
          .delete()
          .eq('blocker_id', currentUserId)
          .eq('blocked_id', targetUserId);

        setIsBlocked(false);
      } else {
        // ブロック
        const { error: blockError } = await supabase.from('blocks').insert({
          blocker_id: currentUserId,
          blocked_id: targetUserId,
        });

        if (blockError) {
          console.error('ブロック挿入エラー:', blockError);
          throw blockError;
        }

        // ブロック時に相互フォローを解除
        const [unfollow1, unfollow2] = await Promise.all([
          // 自分 → 相手のフォローを解除
          supabase
            .from('follows')
            .delete()
            .eq('follower_id', currentUserId)
            .eq('following_id', targetUserId),
          // 相手 → 自分のフォローを解除
          supabase
            .from('follows')
            .delete()
            .eq('follower_id', targetUserId)
            .eq('following_id', currentUserId),
        ]);

        console.log('[useBlock] フォロー解除結果:', {
          unfollow1: unfollow1.error || '成功',
          unfollow2: unfollow2.error || '成功',
        });

        if (unfollow1.error) console.error('自分→相手のフォロー解除エラー:', unfollow1.error);
        if (unfollow2.error) console.error('相手→自分のフォロー解除エラー:', unfollow2.error);

        setIsBlocked(true);
      }
    } catch (error) {
      console.error('ブロック操作エラー:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const isOwnProfile = currentUserId === targetUserId;

  return {
    isBlocked,
    isLoading,
    toggleBlock,
    isOwnProfile,
    currentUserId,
  };
}
