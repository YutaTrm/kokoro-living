import { useCallback, useRef, useState } from 'react';
import { Alert } from 'react-native';

import { supabase } from '@/src/lib/supabase';
import { AIReflection } from '@/src/types/profile';

const REFLECTIONS_LIMIT = 20;

export const useAiReflection = () => {
  const ticketInfoLoadedRef = useRef(false);
  const reflectionsLoadedRef = useRef(false);
  const [aiReflections, setAiReflections] = useState<AIReflection[]>([]);
  const [loadingReflections, setLoadingReflections] = useState(false);
  const [loadingMoreReflections, setLoadingMoreReflections] = useState(false);
  const [hasMoreReflections, setHasMoreReflections] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [ticketCount, setTicketCount] = useState(0);
  const [hasFreeQuota, setHasFreeQuota] = useState(false);
  const [freeQuotaRemaining, setFreeQuotaRemaining] = useState(2);
  const [loadingTicketInfo, setLoadingTicketInfo] = useState(false);
  const [showGenerateConfirmModal, setShowGenerateConfirmModal] = useState(false);

  const loadAiReflections = useCallback(async (reset = false) => {
    if (!reset && (!hasMoreReflections || loadingMoreReflections)) return;

    const currentOffset = reset ? 0 : aiReflections.length;

    // 初回のみスピナーを表示（2回目以降はバックグラウンド更新）
    if (reset) {
      if (!reflectionsLoadedRef.current) {
        setLoadingReflections(true);
      }
      setHasMoreReflections(true);
    } else {
      setLoadingMoreReflections(true);
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('ai_reflections')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(currentOffset, currentOffset + REFLECTIONS_LIMIT - 1);

      if (error) throw error;

      if (!data || data.length === 0) {
        if (reset) setAiReflections([]);
        setHasMoreReflections(false);
        return;
      }

      if (reset) {
        setAiReflections(data);
      } else {
        setAiReflections((prev) => {
          const existingIds = new Set(prev.map((r) => r.id));
          const newReflections = data.filter((r) => !existingIds.has(r.id));
          return [...prev, ...newReflections];
        });
      }
      setHasMoreReflections(data.length === REFLECTIONS_LIMIT);
      reflectionsLoadedRef.current = true;
    } catch (error) {
      console.error('振り返り取得エラー:', error);
    } finally {
      setLoadingReflections(false);
      setLoadingMoreReflections(false);
    }
  }, [aiReflections.length, hasMoreReflections, loadingMoreReflections]);

  // チケット情報を取得
  const loadTicketInfo = useCallback(async () => {
    // 初回のみスピナーを表示（2回目以降はバックグラウンド更新）
    if (!ticketInfoLoadedRef.current) {
      setLoadingTicketInfo(true);
    }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // チケット数を取得
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('ai_reflection_tickets')
        .eq('user_id', user.id)
        .single();

      if (userError) throw userError;

      setTicketCount(userData?.ai_reflection_tickets || 0);

      // 今月の無料使用回数を取得
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count: usedCount, error: countError } = await supabase
        .from('ai_reflections')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_free', true)
        .gte('created_at', startOfMonth.toISOString());

      if (countError) {
        console.error('無料枠カウントエラー:', JSON.stringify(countError, null, 2));
      }

      const remaining = Math.max(0, 2 - (usedCount || 0));
      setFreeQuotaRemaining(remaining);
      setHasFreeQuota(remaining > 0);
      ticketInfoLoadedRef.current = true;
    } catch (error) {
      console.error('チケット情報取得エラー:', error);
    } finally {
      setLoadingTicketInfo(false);
    }
  }, []);

  // AI振り返りを生成（実際の処理）
  const executeGenerateReflection = async () => {
    setGenerating(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('エラー', 'ログインしてください');
        return;
      }

      // 生成前の最新の振り返りIDを取得
      const { data: beforeReflections } = await supabase
        .from('ai_reflections')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);
      const beforeLatestId = beforeReflections?.[0]?.id;

      // Supabase Functionを呼び出し
      const { data, error } = await supabase.functions.invoke('generate-ai-reflection', {
        body: { userId: user.id },
      });

      console.log('Function response:', { data, error });

      // 成功チェックを先に行う（errorがあってもdataに成功データが含まれる場合がある）
      if (data?.success) {
        // refをリセットして次回スピナー表示
        reflectionsLoadedRef.current = false;
        ticketInfoLoadedRef.current = false;
        await loadAiReflections(true);
        await loadTicketInfo();
        Alert.alert('成功', 'AI振り返りが生成されました！');
        return;
      }

      // データにエラーがある場合（明確なビジネスロジックエラー）
      if (data?.error) {
        Alert.alert('生成できません', data.error);
        return;
      }

      // ネットワークエラー等の場合、実際に生成されたかを確認
      if (error) {
        console.log('Function returned error, checking if reflection was created...', error);

        // エラーオブジェクトからメッセージを抽出（Edge Functionが400を返した場合）
        // @ts-ignore - error.contextはSupabase Functions特有のプロパティ
        const errorContext = error.context;
        if (errorContext) {
          try {
            const errorBody = await errorContext.json();
            if (errorBody?.error) {
              Alert.alert('生成できません', errorBody.error);
              return;
            }
          } catch {
            // JSONパースに失敗した場合は続行
          }
        }

        // 少し待ってから最新の振り返りを確認
        await new Promise(resolve => setTimeout(resolve, 1000));

        const { data: afterReflections } = await supabase
          .from('ai_reflections')
          .select('id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);
        const afterLatestId = afterReflections?.[0]?.id;

        // 新しい振り返りが作成されていれば成功
        if (afterLatestId && afterLatestId !== beforeLatestId) {
          console.log('New reflection was created despite error');
          reflectionsLoadedRef.current = false;
          ticketInfoLoadedRef.current = false;
          await loadAiReflections(true);
          await loadTicketInfo();
          Alert.alert('成功', 'AI振り返りが生成されました！');
          return;
        }

        // 本当にエラーの場合
        console.error('Function error:', error);
        Alert.alert('エラー', '生成に失敗しました。しばらく経ってから再度お試しください。');
        return;
      }

      // 予期しないレスポンス
      Alert.alert('エラー', '予期しないエラーが発生しました');
    } catch (error: unknown) {
      console.error('生成エラー:', error);
      const errorMessage = error instanceof Error ? error.message : '生成に失敗しました';
      Alert.alert('エラー', errorMessage);
    } finally {
      setGenerating(false);
    }
  };

  // AI振り返りを生成（確認ダイアログ付き）
  const handleGenerateReflection = () => {
    setShowGenerateConfirmModal(true);
  };

  // 確認モーダルで「生成する」を押した時
  const handleConfirmGenerate = () => {
    setShowGenerateConfirmModal(false);
    executeGenerateReflection();
  };

  // AI振り返りの追加読み込み
  const handleLoadMoreReflections = () => {
    if (!loadingMoreReflections && hasMoreReflections) {
      loadAiReflections(false);
    }
  };

  // 確認モーダルのメッセージ
  const generateConfirmMessage = hasFreeQuota
    ? '無料チケットを使用します。\nよろしいですか？'
    : '有料チケットを1枚使用します。\nよろしいですか？';

  const generateConfirmNote = '・生成には約15秒〜1分程度かかります。画面を切り替えても生成は継続され、完了するとウィンドウでお知らせします。\n・AIによる分析のため、生成結果が正確でない場合があります。';

  // refをリセットする関数（外部から呼び出し可能）
  const resetRefs = () => {
    ticketInfoLoadedRef.current = false;
    reflectionsLoadedRef.current = false;
  };

  return {
    aiReflections,
    loadingReflections,
    loadingMoreReflections,
    hasMoreReflections,
    generating,
    ticketCount,
    hasFreeQuota,
    freeQuotaRemaining,
    loadingTicketInfo,
    showGenerateConfirmModal,
    setShowGenerateConfirmModal,
    loadAiReflections,
    loadTicketInfo,
    handleGenerateReflection,
    handleConfirmGenerate,
    handleLoadMoreReflections,
    generateConfirmMessage,
    generateConfirmNote,
    resetRefs,
  };
};
