import { useEffect, useState } from 'react';

import { supabase } from '@/src/lib/supabase';

/**
 * 現在ログイン中のユーザーIDを取得するカスタムフック
 */
export const useCurrentUser = () => {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const getCurrentUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUserId(user?.id ?? null);
      setIsLoading(false);
    };
    getCurrentUser();
  }, []);

  return { currentUserId, isLoading };
};
