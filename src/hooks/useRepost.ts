import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/src/lib/supabase';

export function useRepost(postId: string | null) {
  const [isReposted, setIsReposted] = useState(false);
  const [repostCount, setRepostCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserId(session?.user?.id ?? null);
    });
  }, []);

  const loadRepostStatus = useCallback(async () => {
    if (!postId) {
      setIsReposted(false);
      setRepostCount(0);
      return;
    }

    try {
      // 自分のリポスト状態とリポスト数を並列取得
      const [myRepostRes, countRes] = await Promise.all([
        currentUserId
          ? supabase
              .from('reposts')
              .select('id')
              .eq('post_id', postId)
              .eq('user_id', currentUserId)
              .single()
          : Promise.resolve({ data: null }),
        supabase
          .from('reposts')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', postId),
      ]);

      setIsReposted(!!myRepostRes.data);
      setRepostCount(countRes.count ?? 0);
    } catch {
      setIsReposted(false);
    }
  }, [postId, currentUserId]);

  useEffect(() => {
    loadRepostStatus();
  }, [loadRepostStatus]);

  const toggleRepost = async (): Promise<boolean> => {
    if (!postId || !currentUserId || isLoading) return isReposted;

    setIsLoading(true);

    try {
      if (isReposted) {
        // リポスト解除
        await supabase
          .from('reposts')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', currentUserId);

        setIsReposted(false);
        setRepostCount((prev) => Math.max(0, prev - 1));
        return false;
      } else {
        // リポスト
        const { error } = await supabase.from('reposts').insert({
          post_id: postId,
          user_id: currentUserId,
        });

        if (error) throw error;

        setIsReposted(true);
        setRepostCount((prev) => prev + 1);
        return true;
      }
    } catch (error) {
      console.error('リポスト操作エラー:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isReposted,
    repostCount,
    isLoading,
    toggleRepost,
    currentUserId,
  };
}
