import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // CORSプリフライトリクエスト対応
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();

    if (!userId) {
      throw new Error('userIdが必要です');
    }

    // Supabaseクライアント作成（SERVICE_ROLE_KEYを使用してRLSをバイパス）
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Claude APIキーを取得
    const claudeApiKey = Deno.env.get('CLAUDE_API_KEY');
    if (!claudeApiKey) {
      throw new Error('CLAUDE_API_KEYが設定されていません');
    }

    // 最後の振り返り生成日時と内容を取得
    const { data: lastReflection } = await supabase
      .from('ai_reflections')
      .select('created_at, content')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const now = new Date();
    let dataStartDate = new Date();

    // 最後の生成がある場合
    if (lastReflection) {
      const lastReflectionDate = new Date(lastReflection.created_at);
      const daysSinceLastReflection = (now.getTime() - lastReflectionDate.getTime()) / (1000 * 60 * 60 * 24);

      // 3日未満の場合はエラー
      if (daysSinceLastReflection < 3) {
        return new Response(
          JSON.stringify({
            error: '前回の振り返りからまだ十分な期間が経過していません'
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // 最後の生成日時以降のデータのみを対象にする
      dataStartDate = lastReflectionDate;
    } else {
      // 初回生成の場合は過去7日間
      dataStartDate.setDate(dataStartDate.getDate() - 7);
    }

    // 1. 投稿・返信を取得（最大15件）
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('content, created_at, parent_post_id, experienced_at')
      .eq('user_id', userId)
      .gte('created_at', dataStartDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(15);

    if (postsError) throw postsError;

    // 2. アクション統計を取得
    // いいね数
    const { count: likesCount } = await supabase
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', dataStartDate.toISOString());

    // フォロー数
    const { count: followsCount } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', userId)
      .gte('created_at', dataStartDate.toISOString());

    // 返信数（parent_post_id != null）
    const repliesCount = posts?.filter(p => p.parent_post_id !== null).length || 0;

    // チェックインデータを取得
    const { data: checkins } = await supabase
      .from('mood_checkins')
      .select('mood, created_at')
      .eq('user_id', userId)
      .gte('created_at', dataStartDate.toISOString())
      .order('created_at', { ascending: false });

    // データ数チェック（投稿+チェックインの合計が5件以上必要）
    const totalDataCount = (posts?.length || 0) + (checkins?.length || 0);
    if (totalDataCount < 5) {
      return new Response(
        JSON.stringify({
          error: 'まだ分析データが十分に溜まっていません'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // チケットチェック：無料枠またはチケットが必要
    // 1. 今月の無料枠をチェック
    const { data: hasFreeQuota, error: quotaError } = await supabase.rpc(
      'check_free_reflection_quota',
      { p_user_id: userId }
    );

    if (quotaError) {
      console.error('無料枠チェックエラー:', quotaError);
    }

    let useFree = false;

    if (hasFreeQuota) {
      // 無料枠がある
      useFree = true;
    } else {
      // 無料枠がない → チケットをチェック
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('ai_reflection_tickets')
        .eq('user_id', userId)
        .single();

      if (userError) throw userError;

      const ticketCount = userData?.ai_reflection_tickets || 0;

      if (ticketCount < 1) {
        // チケットも無い
        return new Response(
          JSON.stringify({
            error: 'チケットが不足しています。購入してください。'
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // チケットがある
      useFree = false;
    }

    // ユーザーの表示名を取得
    const { data: userProfile } = await supabase
      .from('users')
      .select('display_name')
      .eq('user_id', userId)
      .single();
    const userName = userProfile?.display_name || 'あなた';

    // ユーザーの医療情報を取得
    // 診断名
    const { data: userDiagnoses } = await supabase
      .from('user_diagnoses')
      .select('diagnoses(name), start_date, end_date')
      .eq('user_id', userId);

    // 服薬
    const { data: userMedications } = await supabase
      .from('user_medications')
      .select('ingredients(name), products(name), start_date, end_date')
      .eq('user_id', userId);

    // 治療
    const { data: userTreatments } = await supabase
      .from('user_treatments')
      .select('treatments(name), start_date, end_date')
      .eq('user_id', userId);

    // 3. プロンプトを組み立て
    // JST（日本標準時）でフォーマット
    const jstOptions = { timeZone: 'Asia/Tokyo' };
    const postsText = posts && posts.length > 0
      ? posts.map((post, index) => {
          const createdAt = new Date(post.created_at);
          const createdDate = createdAt.toLocaleDateString('ja-JP', jstOptions);
          const createdTime = createdAt.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', ...jstOptions });
          const type = post.parent_post_id ? '返信' : '投稿';

          // experienced_atがある場合は過去の出来事として表示
          if (post.experienced_at) {
            const experiencedDate = new Date(post.experienced_at).toLocaleDateString('ja-JP', jstOptions);
            return `${index + 1}. [${type}] "${post.content}" (${experiencedDate}の出来事について ${createdDate} ${createdTime}に投稿)`;
          }

          return `${index + 1}. [${type}] "${post.content}" (${createdDate} ${createdTime})`;
        }).join('\n')
      : 'なし';

    // チェックインテキストを作成
    const MOOD_EMOJIS = { 1: '😞', 2: '😔', 3: '😐', 4: '🙂', 5: '😊' };
    const MOOD_LABELS = { 1: 'とても良くない', 2: '良くない', 3: '普通', 4: '良い', 5: 'とても良い' };
    const checkinsText = checkins && checkins.length > 0
      ? checkins.map((checkin, index) => {
          const createdAt = new Date(checkin.created_at);
          const date = createdAt.toLocaleDateString('ja-JP', jstOptions);
          const time = createdAt.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', ...jstOptions });
          const emoji = MOOD_EMOJIS[checkin.mood as keyof typeof MOOD_EMOJIS];
          const label = MOOD_LABELS[checkin.mood as keyof typeof MOOD_LABELS];
          return `${index + 1}. ${emoji} ${label} (${date} ${time})`;
        }).join('\n')
      : 'なし';

    // 医療情報テキストを作成（end_dateの有無で現在/過去を区別）
    const formatMedicalItems = (items: any[], nameKey: string, altNameKey?: string) => {
      if (!items || items.length === 0) return 'なし';

      const current: string[] = [];
      const past: string[] = [];

      items.forEach(item => {
        const name = (item as any)[nameKey]?.name || (altNameKey ? (item as any)[altNameKey]?.name : null);
        if (!name) return;

        if (item.end_date) {
          past.push(name);
        } else {
          current.push(name);
        }
      });

      const parts: string[] = [];
      if (current.length > 0) {
        parts.push(`【現在】${current.join(', ')}`);
      }
      if (past.length > 0) {
        parts.push(`【過去】${past.join(', ')}`);
      }

      return parts.length > 0 ? parts.join(' / ') : 'なし';
    };

    const diagnosesText = formatMedicalItems(userDiagnoses || [], 'diagnoses');
    const medicationsText = formatMedicalItems(userMedications || [], 'ingredients', 'products');
    const treatmentsText = formatMedicalItems(userTreatments || [], 'treatments');

    // 前回の振り返り内容
    const lastReflectionText = lastReflection?.content || null;

    // 期間の計算
    const endDate = now;
    const startDate = dataStartDate;
    const dateRangeText = `${startDate.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', ...jstOptions })}〜${endDate.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', ...jstOptions })}`;

    // 前回の振り返りセクション
    const lastReflectionSection = lastReflectionText
      ? `【前回の振り返り内容】
${lastReflectionText}

`
      : '';

    const userPrompt = `以下は、${userName}さんの最近の行動データと医療情報です。

【ユーザー名】
${userName}さん

【ユーザーの医療情報】
- 診断名: ${diagnosesText}
- 服薬: ${medicationsText}
- 治療: ${treatmentsText}
※【現在】は現在進行中、【過去】は終了済みを示します

${lastReflectionSection}【投稿・返信】
${postsText}
※「〇〇の出来事について △△に投稿」と記載がある投稿は、過去の出来事を振り返って投稿したものです。出来事の日付に注目して分析してください。ただし日時はシステム上のものなので触れず、年と月にだけ触れてください。

【気分チェックイン】
${checkinsText}

【アクション統計】
- いいね数: ${likesCount || 0}回
- 返信数: ${repliesCount}回
- フォロー数: ${followsCount || 0}人

この情報をもとに、ユーザーのこの期間を振り返り、前向きで共感的な感想を800文字程度で生成してください。

投稿内容だけでなく、気分チェックインの変化、いいねや返信などの他のユーザーとの交流についても前向きに言及してください。医療情報（診断名・服薬・治療）も踏まえて、ユーザーの状況に寄り添った言葉をかけてください。

過去の出来事について投稿している場合は、その時期の出来事として分析に含めてください。

振り返りの最後に、以下のような統計情報を含めてください：
---
📊 この期間の記録
期間: ${dateRangeText}
投稿・返信: ${posts?.length || 0}件
気分チェックイン: ${checkins?.length || 0}回
いいね: ${likesCount || 0}回
フォロー: ${followsCount || 0}人`;

    const systemPrompt = `あなたはメンタルヘルスケアSNSの優しいAIアシスタントです。

ユーザーの最近の行動を分析し、前向きで共感的な振り返りを生成してください。

【分析対象】
- ユーザーの医療情報（診断名、服薬、治療）
- 前回の振り返り内容（ある場合）
- 投稿・返信の内容（テキスト）と投稿時間
- 気分チェックインの記録と変化
- いいね数、返信数、フォロー数

【振り返りの方針】
- 前向きな感想を述べる
- 頑張りや変化を褒める
- 投稿内容だけでなく、気分チェックインの変化、いいねや返信などのアクションにも言及する
- 他のユーザーとの交流（いいね、返信、フォロー）を前向きに評価する
- ユーザーの医療情報を踏まえて、その状況に寄り添った言葉をかける
- アドバイスや指示はしない
- 800文字程度で生成

【前回の振り返りへの言及】
- 前回の振り返り内容がある場合は、それを踏まえて今回の振り返りを作成する
- 前回からの変化や成長があれば、それを自然に褒める（例：「前回は〜だったけど、今回は〜」）
- 前回と同じような状況でも、継続していることを肯定的に捉える
- 前回の内容を丸ごと繰り返さない。あくまで今回の振り返りがメイン
- 前回の振り返りがない場合（初回）は、この項目は無視する

【医療情報への言及】
- 【現在】と記載されている項目は現在進行中のもの。日々向き合っていることを労い、寄り添う
- 【過去】と記載されている項目は終了済みのもの。乗り越えてきた経験として敬意を払う
- 現在進行中の治療や服薬がある場合は、続けていることの大変さに共感する
- 過去の診断や治療がある場合は、その経験を経て今があることを肯定的に捉える

【投稿時間への言及】
- 深夜（0時〜4時頃）の投稿が多い場合：眠れない夜があったのかな、と優しく気にかける。責めたり批判したりせず、そういう夜もあるよね、と共感する
- 早朝（5時〜7時頃）の投稿がある場合：早起きできたことを素直に褒める
- 時間帯への言及は、該当する場合のみ自然に触れる程度でOK

【気分チェックインへの言及】
- チェックインの時間帯が毎日同じような時間（例：毎朝、毎晩など）で規則的な場合：習慣化できていることを褒める
- チェックインと過去の出来事（投稿の「〇〇の出来事について」の部分）は関連付けない。チェックインはあくまでその日の気分を記録したもの

【トーン】
- 友達のように親しみやすく、でも馴れ馴れしすぎない
- 文頭は「◯◯さんは、」「◯◯さんの」のようにユーザー名から始める
- 自然な語り口で、読んでいて心地よい文章
- 温かく、共感的に
- 押し付けがましくない
- ユーザーの感情を尊重する
- 「〜しましょう」「〜すべき」などの指示的な表現は避ける

【禁止事項】
- 次の行動を指示しない
- アドバイスをしない
- 批判的な表現を使わない
- 「大切な仲間へ」「親愛なる〜」のような硬い・大げさな書き出し`;

    // 4. Claude APIを呼び出し
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': claudeApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: userPrompt,
        }],
      }),
    });

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text();
      throw new Error(`Claude API error: ${errorText}`);
    }

    const claudeData = await claudeResponse.json();
    const reflectionText = claudeData.content[0].text;
    const tokensUsed = claudeData.usage.input_tokens + claudeData.usage.output_tokens;

    // 5. チケット消費（無料でない場合）
    if (!useFree) {
      const { error: consumeError } = await supabase.rpc(
        'consume_ai_reflection_ticket',
        { p_user_id: userId }
      );

      if (consumeError) {
        console.error('チケット消費エラー:', consumeError);
        throw new Error('チケット消費に失敗しました');
      }
    }

    // 6. Supabaseに保存
    const { data: savedReflection, error: saveError } = await supabase
      .from('ai_reflections')
      .insert({
        user_id: userId,
        content: reflectionText,
        tokens_used: tokensUsed,
        is_free: useFree,
      })
      .select()
      .single();

    if (saveError) throw saveError;

    return new Response(
      JSON.stringify({
        success: true,
        reflection: savedReflection,
        stats: {
          postsCount: posts?.length || 0,
          checkinsCount: checkins?.length || 0,
          likesCount: likesCount || 0,
          repliesCount,
          followsCount: followsCount || 0,
          tokensUsed,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
