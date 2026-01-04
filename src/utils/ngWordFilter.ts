/**
 * NGワードフィルター
 * 投稿・返信・プロフィール編集時に不適切な表現をチェック
 */

export interface NGWordCheckResult {
  isValid: boolean;
  message?: string;
}

/**
 * ひらがなをカタカナに変換
 */
function hiraganaToKatakana(str: string): string {
  return str.replace(/[\u3041-\u3096]/g, (match) => {
    const chr = match.charCodeAt(0) + 0x60;
    return String.fromCharCode(chr);
  });
}

/**
 * 日本語文字列を正規化（ひらがな→カタカナ、小文字化）
 */
function normalizeText(str: string): string {
  return hiraganaToKatakana(str.toLowerCase());
}

// NGワードリスト（カタカナのみ登録、ひらがなも自動検出）
const NG_WORDS = {
  // 性的表現
  sexual: [
    'セックス',
    'sex',
    'エッチ',
    'チンコ',
    'チンポ',
    'マンコ',
    'オナニー',
    'フェラ',
    'パイズリ',
    'レイプ',
    '強姦',
    '痴漢',
    '中出し',
    '精子'
  ],

  // 攻撃的表現（他者への攻撃）
  offensive: [
    // 「シネ」は「シネマ」「シネコン」と誤検知するため削除
    '死ね',
    // 「コロス」は「コロすけ」と誤検知するため削除
    '殺す',
    'キエロ',
    '消えろ',
    'ウザイ',
    'キモイ',
    'クタバレ',
    'ブッコロ',
    'バーカ',
  ],

  // 差別的表現
  discriminatory: [
    'ガイジ', // 「外字」と誤検知の可能性あるが、差別語として重要なため維持
    'キチガイ',
    '気違い',
    'メンヘラ', // メンタルヘルスSNSでは文脈次第だが一旦NG
    // 「チョン」は「ちょんまげ」「ちょんと」と誤検知するため削除
    'シナジン', // 「シナ」単体は「〜しない」と誤検知するため具体的な表現に変更
    '支那',
    '土人',
    '基地外',
  ],

  // 暴力的表現
  violent: [
    'ナグル',
    // 「サス」は「サスペンス」「サステナブル」と誤検知するため削除
    '刺す',
    'バクハ',
  ],
};

// スパム検出用の正規表現
const SPAM_PATTERNS = {
  // URL（http, https）
  url: /https?:\/\/[^\s]+/gi,

  // 電話番号（日本の形式）
  phone: /0\d{1,4}[-\s]?\d{1,4}[-\s]?\d{4}/g,

  // メールアドレス
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi,

  // LINE ID勧誘
  lineId: /LINE\s*ID|らいん\s*ID|ライン\s*ID|LINE追加|ライン追加/gi,

  // 金銭要求・振込
  money: /振込|ふりこみ|送金|そうきん|お金.*ください|金.*貸して/gi,
};

/**
 * NGワードをチェックする
 * @param text チェック対象のテキスト
 * @returns チェック結果
 */
export function checkNGWords(text: string): NGWordCheckResult {
  if (!text || text.trim() === '') {
    return { isValid: true };
  }

  // テキストを正規化（ひらがな→カタカナ、小文字化）
  const normalizedText = normalizeText(text);

  // カテゴリ別NGワードチェック
  for (const [category, words] of Object.entries(NG_WORDS)) {
    for (const word of words) {
      // NGワードも正規化して比較
      const normalizedWord = normalizeText(word);
      if (normalizedText.includes(normalizedWord)) {
        return {
          isValid: false,
          message: getErrorMessage(category as keyof typeof NG_WORDS),
        };
      }
    }
  }

  // スパムパターンチェック
  if (SPAM_PATTERNS.url.test(text)) {
    return {
      isValid: false,
      message: 'URLを含めることはできません',
    };
  }

  if (SPAM_PATTERNS.phone.test(text)) {
    return {
      isValid: false,
      message: '電話番号を含めることはできません',
    };
  }

  if (SPAM_PATTERNS.email.test(text)) {
    return {
      isValid: false,
      message: 'メールアドレスを含めることはできません',
    };
  }

  if (SPAM_PATTERNS.lineId.test(text)) {
    return {
      isValid: false,
      message: 'LINE IDなどの個人連絡先を含めることはできません',
    };
  }

  if (SPAM_PATTERNS.money.test(text)) {
    return {
      isValid: false,
      message: '金銭に関する要求を含めることはできません',
    };
  }

  return { isValid: true };
}

/**
 * カテゴリに応じたエラーメッセージを取得
 */
function getErrorMessage(category: keyof typeof NG_WORDS): string {
  const messages: Record<keyof typeof NG_WORDS, string> = {
    sexual: '不適切な表現が含まれています',
    offensive: '攻撃的な表現が含まれています',
    discriminatory: '差別的な表現が含まれています',
    violent: '暴力的な表現が含まれています',
  };

  return messages[category] || '不適切な表現が含まれている可能性があります';
}
