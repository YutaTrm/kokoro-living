import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/src/lib/supabase';

export function useMute(targetUserId: string | null) {
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserId(session?.user?.id ?? null);
    });
  }, []);

  const loadMuteStatus = useCallback(async () => {
    if (!targetUserId || !currentUserId) {
      setIsMuted(false);
      return;
    }

    try {
      const { data } = await supabase
        .from('mutes')
        .select('id')
        .eq('muter_id', currentUserId)
        .eq('muted_id', targetUserId)
        .single();

      setIsMuted(!!data);
    } catch {
      setIsMuted(false);
    }
  }, [targetUserId, currentUserId]);

  useEffect(() => {
    loadMuteStatus();
  }, [loadMuteStatus]);

  const toggleMute = async () => {
    if (!targetUserId || !currentUserId || isLoading) return;

    setIsLoading(true);

    try {
      if (isMuted) {
        // ミュート解除
        await supabase
          .from('mutes')
          .delete()
          .eq('muter_id', currentUserId)
          .eq('muted_id', targetUserId);

        setIsMuted(false);
      } else {
        // ミュート
        const { error: muteError } = await supabase.from('mutes').insert({
          muter_id: currentUserId,
          muted_id: targetUserId,
        });

        if (muteError) {
          console.error('ミュート挿入エラー:', muteError);
          throw muteError;
        }

        // ミュート時はフォロー関係を維持（ブロックとの違い）

        setIsMuted(true);
      }
    } catch (error) {
      console.error('ミュート操作エラー:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const isOwnProfile = currentUserId === targetUserId;

  return {
    isMuted,
    isLoading,
    toggleMute,
    isOwnProfile,
    currentUserId,
  };
}
