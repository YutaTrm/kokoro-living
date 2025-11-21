-- diagnosesテーブルにorderカラムを追加
ALTER TABLE diagnoses ADD COLUMN "order" INT DEFAULT 0;

-- グループごとにorder番号を設定
UPDATE diagnoses SET "order" = 101 WHERE name = 'うつ病';
UPDATE diagnoses SET "order" = 102 WHERE name = '双極性障害';
UPDATE diagnoses SET "order" = 103 WHERE name = '気分変調症';
UPDATE diagnoses SET "order" = 104 WHERE name = '適応障害';

UPDATE diagnoses SET "order" = 201 WHERE name = '全般性不安障害';
UPDATE diagnoses SET "order" = 202 WHERE name = 'パニック障害';
UPDATE diagnoses SET "order" = 203 WHERE name = '社交不安障害';
UPDATE diagnoses SET "order" = 204 WHERE name = '強迫性障害';
UPDATE diagnoses SET "order" = 205 WHERE name = '心的外傷後ストレス障害';
UPDATE diagnoses SET "order" = 206 WHERE name = '急性ストレス障害';

UPDATE diagnoses SET "order" = 301 WHERE name = '統合失調症';
UPDATE diagnoses SET "order" = 302 WHERE name = '統合失調感情障害';
UPDATE diagnoses SET "order" = 303 WHERE name = '妄想性障害';

UPDATE diagnoses SET "order" = 401 WHERE name = '注意欠如・多動症';
UPDATE diagnoses SET "order" = 402 WHERE name = '自閉スペクトラム症';
UPDATE diagnoses SET "order" = 403 WHERE name = '学習障害';

UPDATE diagnoses SET "order" = 501 WHERE name = '身体症状症';
UPDATE diagnoses SET "order" = 502 WHERE name = '病気不安症';

UPDATE diagnoses SET "order" = 601 WHERE name = '不眠症';
UPDATE diagnoses SET "order" = 602 WHERE name = '過眠症';
UPDATE diagnoses SET "order" = 603 WHERE name = '睡眠時無呼吸症候群';

UPDATE diagnoses SET "order" = 701 WHERE name = '神経性やせ症';
UPDATE diagnoses SET "order" = 702 WHERE name = '神経性過食症';

UPDATE diagnoses SET "order" = 801 WHERE name = 'アルコール使用障害';
UPDATE diagnoses SET "order" = 802 WHERE name = '薬物依存';
UPDATE diagnoses SET "order" = 803 WHERE name = 'ギャンブル障害';

UPDATE diagnoses SET "order" = 901 WHERE name = '境界性パーソナリティ障害';
UPDATE diagnoses SET "order" = 902 WHERE name = '回避性パーソナリティ障害';
UPDATE diagnoses SET "order" = 903 WHERE name = '解離性障害';
UPDATE diagnoses SET "order" = 904 WHERE name = '認知症';
UPDATE diagnoses SET "order" = 905 WHERE name = 'せん妄';

-- treatmentsテーブルにorderカラムを追加
ALTER TABLE treatments ADD COLUMN "order" INT DEFAULT 0;

-- グループごとにorder番号を設定
UPDATE treatments SET "order" = 101 WHERE name = 'カウンセリング';
UPDATE treatments SET "order" = 102 WHERE name = '認知行動療法';
UPDATE treatments SET "order" = 103 WHERE name = '精神分析療法';
UPDATE treatments SET "order" = 104 WHERE name = '対人関係療法';
UPDATE treatments SET "order" = 105 WHERE name = '弁証法的行動療法';
UPDATE treatments SET "order" = 106 WHERE name = 'アクセプタンス&コミットメント・セラピー';
UPDATE treatments SET "order" = 107 WHERE name = 'マインドフルネス認知療法';
UPDATE treatments SET "order" = 108 WHERE name = '暴露療法';
UPDATE treatments SET "order" = 109 WHERE name = 'EMDR';
UPDATE treatments SET "order" = 110 WHERE name = '森田療法';
UPDATE treatments SET "order" = 111 WHERE name = '内観療法';

UPDATE treatments SET "order" = 201 WHERE name = '集団精神療法';
UPDATE treatments SET "order" = 202 WHERE name = '家族療法';
UPDATE treatments SET "order" = 203 WHERE name = '自助グループ';

UPDATE treatments SET "order" = 301 WHERE name = '作業療法';
UPDATE treatments SET "order" = 302 WHERE name = '社会生活技能訓練';
UPDATE treatments SET "order" = 303 WHERE name = '認知機能リハビリテーション';
UPDATE treatments SET "order" = 304 WHERE name = 'デイケア';
UPDATE treatments SET "order" = 305 WHERE name = 'ナイトケア';

UPDATE treatments SET "order" = 401 WHERE name = '自律訓練法';
UPDATE treatments SET "order" = 402 WHERE name = 'リラクゼーション訓練';
UPDATE treatments SET "order" = 403 WHERE name = '呼吸法';
UPDATE treatments SET "order" = 404 WHERE name = '漸進的筋弛緩法';

UPDATE treatments SET "order" = 501 WHERE name = '心理教育';
UPDATE treatments SET "order" = 502 WHERE name = '就労支援';
UPDATE treatments SET "order" = 503 WHERE name = '訪問看護';
UPDATE treatments SET "order" = 504 WHERE name = '精神科訪問看護';
UPDATE treatments SET "order" = 505 WHERE name = '生活技能訓練';

UPDATE treatments SET "order" = 601 WHERE name = '電気けいれん療法';
UPDATE treatments SET "order" = 602 WHERE name = '経頭蓋磁気刺激療法';
UPDATE treatments SET "order" = 603 WHERE name = '光療法';

UPDATE treatments SET "order" = 701 WHERE name = '行動活性化療法';
UPDATE treatments SET "order" = 702 WHERE name = 'アサーショントレーニング';
UPDATE treatments SET "order" = 703 WHERE name = 'ストレスマネジメント';
UPDATE treatments SET "order" = 704 WHERE name = '睡眠衛生指導';
UPDATE treatments SET "order" = 705 WHERE name = '環境調整';
UPDATE treatments SET "order" = 706 WHERE name = '休養・休息';

-- ingredientsテーブルにorderカラムを追加
ALTER TABLE ingredients ADD COLUMN "order" INT DEFAULT 0;

-- グループごとにorder番号を設定
UPDATE ingredients SET "order" = 101 WHERE name = 'フルボキサミン';
UPDATE ingredients SET "order" = 102 WHERE name = 'パロキセチン';
UPDATE ingredients SET "order" = 103 WHERE name = 'セルトラリン';
UPDATE ingredients SET "order" = 104 WHERE name = 'エスシタロプラム';

UPDATE ingredients SET "order" = 201 WHERE name = 'ミルナシプラン';
UPDATE ingredients SET "order" = 202 WHERE name = 'デュロキセチン';
UPDATE ingredients SET "order" = 203 WHERE name = 'ベンラファキシン';

UPDATE ingredients SET "order" = 301 WHERE name = 'ミルタザピン';

UPDATE ingredients SET "order" = 401 WHERE name = 'アミトリプチリン';
UPDATE ingredients SET "order" = 402 WHERE name = 'イミプラミン';
UPDATE ingredients SET "order" = 403 WHERE name = 'クロミプラミン';
UPDATE ingredients SET "order" = 404 WHERE name = 'ノルトリプチリン';

UPDATE ingredients SET "order" = 501 WHERE name = 'マプロチリン';
UPDATE ingredients SET "order" = 502 WHERE name = 'ミアンセリン';

UPDATE ingredients SET "order" = 601 WHERE name = 'トラゾドン';
UPDATE ingredients SET "order" = 602 WHERE name = 'スルピリド';
UPDATE ingredients SET "order" = 603 WHERE name = 'ボルチオキセチン';

UPDATE ingredients SET "order" = 701 WHERE name = 'アルプラゾラム';
UPDATE ingredients SET "order" = 702 WHERE name = 'ロラゼパム';
UPDATE ingredients SET "order" = 703 WHERE name = 'ジアゼパム';
UPDATE ingredients SET "order" = 704 WHERE name = 'クロナゼパム';
UPDATE ingredients SET "order" = 705 WHERE name = 'エチゾラム';
UPDATE ingredients SET "order" = 706 WHERE name = 'ブロマゼパム';
UPDATE ingredients SET "order" = 707 WHERE name = 'ロフラゼプ酸エチル';

UPDATE ingredients SET "order" = 801 WHERE name = 'トリアゾラム';
UPDATE ingredients SET "order" = 802 WHERE name = 'ニトラゼパム';
UPDATE ingredients SET "order" = 803 WHERE name = 'フルニトラゼパム';
UPDATE ingredients SET "order" = 804 WHERE name = 'ブロチゾラム';

UPDATE ingredients SET "order" = 901 WHERE name = 'ゾルピデム';
UPDATE ingredients SET "order" = 902 WHERE name = 'ゾピクロン';
UPDATE ingredients SET "order" = 903 WHERE name = 'エスゾピクロン';

UPDATE ingredients SET "order" = 1001 WHERE name = 'ラメルテオン';
UPDATE ingredients SET "order" = 1002 WHERE name = 'スボレキサント';
UPDATE ingredients SET "order" = 1003 WHERE name = 'レンボレキサント';

UPDATE ingredients SET "order" = 1101 WHERE name = 'ハロペリドール';
UPDATE ingredients SET "order" = 1102 WHERE name = 'クロルプロマジン';
UPDATE ingredients SET "order" = 1103 WHERE name = 'レボメプロマジン';

UPDATE ingredients SET "order" = 1201 WHERE name = 'リスペリドン';
UPDATE ingredients SET "order" = 1202 WHERE name = 'オランザピン';
UPDATE ingredients SET "order" = 1203 WHERE name = 'クエチアピン';
UPDATE ingredients SET "order" = 1204 WHERE name = 'アリピプラゾール';
UPDATE ingredients SET "order" = 1205 WHERE name = 'パリペリドン';
UPDATE ingredients SET "order" = 1206 WHERE name = 'ブロナンセリン';
UPDATE ingredients SET "order" = 1207 WHERE name = 'ペロスピロン';
UPDATE ingredients SET "order" = 1208 WHERE name = 'ルラシドン';
UPDATE ingredients SET "order" = 1209 WHERE name = 'アセナピン';

UPDATE ingredients SET "order" = 1301 WHERE name = '炭酸リチウム';
UPDATE ingredients SET "order" = 1302 WHERE name = 'バルプロ酸ナトリウム';
UPDATE ingredients SET "order" = 1303 WHERE name = 'カルバマゼピン';
UPDATE ingredients SET "order" = 1304 WHERE name = 'ラモトリギン';

UPDATE ingredients SET "order" = 1401 WHERE name = 'メチルフェニデート';
UPDATE ingredients SET "order" = 1402 WHERE name = 'アトモキセチン';
UPDATE ingredients SET "order" = 1403 WHERE name = 'グアンファシン';
UPDATE ingredients SET "order" = 1404 WHERE name = 'リスデキサンフェタミン';

UPDATE ingredients SET "order" = 1501 WHERE name = 'ドネペジル';
UPDATE ingredients SET "order" = 1502 WHERE name = 'ガランタミン';
UPDATE ingredients SET "order" = 1503 WHERE name = 'リバスチグミン';
UPDATE ingredients SET "order" = 1504 WHERE name = 'メマンチン';