INSERT INTO products (name, ingredient_id) VALUES
-- SSRI
('ルボックス', (SELECT id FROM ingredients WHERE name = 'フルボキサミン')),
('デプロメール', (SELECT id FROM ingredients WHERE name = 'フルボキサミン')),
('パキシル', (SELECT id FROM ingredients WHERE name = 'パロキセチン')),
('ジェイゾロフト', (SELECT id FROM ingredients WHERE name = 'セルトラリン')),
('レクサプロ', (SELECT id FROM ingredients WHERE name = 'エスシタロプラム')),

-- SNRI
('トレドミン', (SELECT id FROM ingredients WHERE name = 'ミルナシプラン')),
('サインバルタ', (SELECT id FROM ingredients WHERE name = 'デュロキセチン')),
('イフェクサー', (SELECT id FROM ingredients WHERE name = 'ベンラファキシン')),

-- NaSSA
('リフレックス', (SELECT id FROM ingredients WHERE name = 'ミルタザピン')),
('レメロン', (SELECT id FROM ingredients WHERE name = 'ミルタザピン')),

-- 三環系抗うつ薬
('トリプタノール', (SELECT id FROM ingredients WHERE name = 'アミトリプチリン')),
('トフラニール', (SELECT id FROM ingredients WHERE name = 'イミプラミン')),
('アナフラニール', (SELECT id FROM ingredients WHERE name = 'クロミプラミン')),
('ノリトレン', (SELECT id FROM ingredients WHERE name = 'ノルトリプチリン')),

-- 四環系抗うつ薬
('ルジオミール', (SELECT id FROM ingredients WHERE name = 'マプロチリン')),
('テトラミド', (SELECT id FROM ingredients WHERE name = 'ミアンセリン')),

-- その他の抗うつ薬
('デジレル', (SELECT id FROM ingredients WHERE name = 'トラゾドン')),
('レスリン', (SELECT id FROM ingredients WHERE name = 'トラゾドン')),
('ドグマチール', (SELECT id FROM ingredients WHERE name = 'スルピリド')),
('トリンテリックス', (SELECT id FROM ingredients WHERE name = 'ボルチオキセチン')),

-- ベンゾジアゼピン系抗不安薬
('ソラナックス', (SELECT id FROM ingredients WHERE name = 'アルプラゾラム')),
('コンスタン', (SELECT id FROM ingredients WHERE name = 'アルプラゾラム')),
('ワイパックス', (SELECT id FROM ingredients WHERE name = 'ロラゼパム')),
('セルシン', (SELECT id FROM ingredients WHERE name = 'ジアゼパム')),
('ホリゾン', (SELECT id FROM ingredients WHERE name = 'ジアゼパム')),
('リボトリール', (SELECT id FROM ingredients WHERE name = 'クロナゼパム')),
('ランドセン', (SELECT id FROM ingredients WHERE name = 'クロナゼパム')),
('デパス', (SELECT id FROM ingredients WHERE name = 'エチゾラム')),
('レキソタン', (SELECT id FROM ingredients WHERE name = 'ブロマゼパム')),
('セニラン', (SELECT id FROM ingredients WHERE name = 'ブロマゼパム')),
('メイラックス', (SELECT id FROM ingredients WHERE name = 'ロフラゼプ酸エチル')),

-- ベンゾジアゼピン系睡眠薬
('ハルシオン', (SELECT id FROM ingredients WHERE name = 'トリアゾラム')),
('ベンザリン', (SELECT id FROM ingredients WHERE name = 'ニトラゼパム')),
('ネルボン', (SELECT id FROM ingredients WHERE name = 'ニトラゼパム')),
('サイレース', (SELECT id FROM ingredients WHERE name = 'フルニトラゼパム')),
('ロヒプノール', (SELECT id FROM ingredients WHERE name = 'フルニトラゼパム')),
('レンドルミン', (SELECT id FROM ingredients WHERE name = 'ブロチゾラム')),

-- 非ベンゾジアゼピン系睡眠薬
('マイスリー', (SELECT id FROM ingredients WHERE name = 'ゾルピデム')),
('アモバン', (SELECT id FROM ingredients WHERE name = 'ゾピクロン')),
('ルネスタ', (SELECT id FROM ingredients WHERE name = 'エスゾピクロン')),

-- その他の睡眠薬
('ロゼレム', (SELECT id FROM ingredients WHERE name = 'ラメルテオン')),
('ベルソムラ', (SELECT id FROM ingredients WHERE name = 'スボレキサント')),
('デエビゴ', (SELECT id FROM ingredients WHERE name = 'レンボレキサント')),

-- 定型抗精神病薬
('セレネース', (SELECT id FROM ingredients WHERE name = 'ハロペリドール')),
('コントミン', (SELECT id FROM ingredients WHERE name = 'クロルプロマジン')),
('ウインタミン', (SELECT id FROM ingredients WHERE name = 'クロルプロマジン')),
('ヒルナミン', (SELECT id FROM ingredients WHERE name = 'レボメプロマジン')),
('レボトミン', (SELECT id FROM ingredients WHERE name = 'レボメプロマジン')),

-- 非定型抗精神病薬
('リスパダール', (SELECT id FROM ingredients WHERE name = 'リスペリドン')),
('ジプレキサ', (SELECT id FROM ingredients WHERE name = 'オランザピン')),
('セロクエル', (SELECT id FROM ingredients WHERE name = 'クエチアピン')),
('エビリファイ', (SELECT id FROM ingredients WHERE name = 'アリピプラゾール')),
('インヴェガ', (SELECT id FROM ingredients WHERE name = 'パリペリドン')),
('ロナセン', (SELECT id FROM ingredients WHERE name = 'ブロナンセリン')),
('ルーラン', (SELECT id FROM ingredients WHERE name = 'ペロスピロン')),
('ラツーダ', (SELECT id FROM ingredients WHERE name = 'ルラシドン')),
('シクレスト', (SELECT id FROM ingredients WHERE name = 'アセナピン')),

-- 気分安定薬
('リーマス', (SELECT id FROM ingredients WHERE name = '炭酸リチウム')),
('デパケン', (SELECT id FROM ingredients WHERE name = 'バルプロ酸ナトリウム')),
('テグレトール', (SELECT id FROM ingredients WHERE name = 'カルバマゼピン')),
('ラミクタール', (SELECT id FROM ingredients WHERE name = 'ラモトリギン')),

-- ADHD治療薬
('コンサータ', (SELECT id FROM ingredients WHERE name = 'メチルフェニデート')),
('ストラテラ', (SELECT id FROM ingredients WHERE name = 'アトモキセチン')),
('インチュニブ', (SELECT id FROM ingredients WHERE name = 'グアンファシン')),
('ビバンセ', (SELECT id FROM ingredients WHERE name = 'リスデキサンフェタミン')),

-- 認知症治療薬
('アリセプト', (SELECT id FROM ingredients WHERE name = 'ドネペジル')),
('レミニール', (SELECT id FROM ingredients WHERE name = 'ガランタミン')),
('イクセロン', (SELECT id FROM ingredients WHERE name = 'リバスチグミン')),
('リバスタッチ', (SELECT id FROM ingredients WHERE name = 'リバスチグミン')),
('メマリー', (SELECT id FROM ingredients WHERE name = 'メマンチン'));