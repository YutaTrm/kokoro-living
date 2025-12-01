
-- SSRI
UPDATE ingredients SET description = '【抗うつ薬（SSRI）】
日本で最初に発売されたSSRI。セロトニンの再取り込みを選択的に阻害する。うつ病・うつ状態、強迫性障害、社会不安障害に適応。強迫性障害への効果が期待されることが多い。' WHERE name = 'フルボキサミン';

UPDATE ingredients SET description = '【抗うつ薬（SSRI）】
セロトニン再取り込み阻害作用が強く、ノルアドレナリン再取り込み阻害作用も有する。うつ病・うつ状態、パニック障害、強迫性障害、社会不安障害、PTSDに適応。離脱症状が出やすいことが知られている。' WHERE name = 'パロキセチン';

UPDATE ingredients SET description = '【抗うつ薬（SSRI）】
副作用や薬物相互作用が比較的少なく、安全性が高いとされる。うつ病・うつ状態、パニック障害、PTSDに適応。ドパミン濃度を高める作用も報告されている。' WHERE name = 'セルトラリン';

UPDATE ingredients SET description = '【抗うつ薬（SSRI）】
最もピュアなSSRIと称され、セロトニン選択性が非常に高い。1日1回の服用で効果が持続。うつ病・うつ状態、社会不安障害に適応。効果と副作用のバランスが良いとされる。' WHERE name = 'エスシタロプラム';

-- SNRI
UPDATE ingredients SET description = '【抗うつ薬（SNRI）】
日本で最初に発売されたSNRI。セロトニンとノルアドレナリンの再取り込みを阻害し、ノルアドレナリンへの作用がやや優位。うつ病・うつ状態に適応。作用が穏やかで肝障害リスクが低い。' WHERE name = 'ミルナシプラン';

UPDATE ingredients SET description = '【抗うつ薬（SNRI）】
セロトニンとノルアドレナリンの両方に強く作用し、意欲改善効果が高い。うつ病・うつ状態のほか、糖尿病性神経障害、線維筋痛症、慢性腰痛症に伴う疼痛にも適応がある。' WHERE name = 'デュロキセチン';

UPDATE ingredients SET description = '【抗うつ薬（SNRI）】
低用量ではセロトニン作用が中心で、増量するとノルアドレナリン作用が強まる。うつ病・うつ状態に適応。全般性不安障害への効果も報告されている。徐放製剤として使用。' WHERE name = 'ベンラファキシン';

-- NaSSA
UPDATE ingredients SET description = '【抗うつ薬（NaSSA）】
ノルアドレナリン作動性・特異的セロトニン作動性抗うつ薬。セロトニンとノルアドレナリンの遊離を促進する。うつ病・うつ状態に適応。鎮静作用があり、不眠を伴ううつに有効。' WHERE name = 'ミルタザピン';

-- 三環系抗うつ薬
UPDATE ingredients SET description = '【抗うつ薬（三環系）】
古典的な三環系抗うつ薬。セロトニンとノルアドレナリンの再取り込みを阻害。うつ病・うつ状態のほか、夜尿症、末梢神経障害性疼痛にも使用される。抗コリン作用による副作用に注意。' WHERE name = 'アミトリプチリン';

UPDATE ingredients SET description = '【抗うつ薬（三環系）】
三環系抗うつ薬の代表的な薬剤。ノルアドレナリンの再取り込み阻害作用が強い。うつ病・うつ状態、遺尿症に適応。口渇、便秘、眠気などの副作用がある。' WHERE name = 'イミプラミン';

UPDATE ingredients SET description = '【抗うつ薬（三環系）】
セロトニン再取り込み阻害作用が強い三環系抗うつ薬。うつ病・うつ状態のほか、強迫性障害、ナルコレプシーに伴う情動脱力発作にも適応。' WHERE name = 'クロミプラミン';

UPDATE ingredients SET description = '【抗うつ薬（三環系）】
アミトリプチリンの活性代謝物。ノルアドレナリン再取り込み阻害作用が強い。うつ病・うつ状態に適応。比較的副作用が少ないとされる。' WHERE name = 'ノルトリプチリン';

-- 四環系抗うつ薬
UPDATE ingredients SET description = '【抗うつ薬（四環系）】
四環系抗うつ薬。ノルアドレナリンの再取り込みを阻害する。うつ病・うつ状態に適応。三環系に比べて抗コリン作用や心毒性が少ないとされる。' WHERE name = 'マプロチリン';

UPDATE ingredients SET description = '【抗うつ薬（四環系）】
四環系抗うつ薬。ノルアドレナリン遊離を促進し、セロトニン受容体を遮断する。うつ病・うつ状態に適応。鎮静作用があり、睡眠改善効果も期待される。' WHERE name = 'ミアンセリン';

-- その他の抗うつ薬
UPDATE ingredients SET description = '【抗うつ薬（その他）】
セロトニン再取り込み阻害作用とセロトニン受容体拮抗作用を持つ。うつ病・うつ状態に適応。鎮静作用が強く、不眠を伴ううつに使用されることが多い。' WHERE name = 'トラゾドン';

UPDATE ingredients SET description = '【抗うつ薬/抗精神病薬（ベンズアミド系）】
ドパミンD2受容体を遮断する。低用量ではうつ病・うつ状態に、高用量では統合失調症に使用。胃・十二指腸潰瘍にも適応がある。' WHERE name = 'スルピリド';

UPDATE ingredients SET description = '【抗うつ薬（その他）】
セロトニン再取り込み阻害作用に加え、複数のセロトニン受容体に作用する。うつ病・うつ状態に適応。認知機能改善効果も期待される新しいタイプの抗うつ薬。' WHERE name = 'ボルチオキセチン';

-- ベンゾジアゼピン系抗不安薬
UPDATE ingredients SET description = '【抗不安薬（ベンゾジアゼピン系）】
短時間作用型のベンゾジアゼピン系抗不安薬。GABA受容体に作用し、抗不安、鎮静、筋弛緩作用を示す。心身症、不安障害、パニック障害に使用。' WHERE name = 'アルプラゾラム';

UPDATE ingredients SET description = '【抗不安薬（ベンゾジアゼピン系）】
短時間作用型のベンゾジアゼピン系抗不安薬。抗不安作用が強く、神経症、心身症における不安・緊張・抑うつに使用。注射剤は術前の鎮静にも用いられる。' WHERE name = 'ロラゼパム';

UPDATE ingredients SET description = '【抗不安薬（ベンゾジアゼピン系）】
長時間作用型のベンゾジアゼピン系抗不安薬の代表格。抗不安、鎮静、筋弛緩、抗けいれん作用を持つ。神経症、心身症、てんかんの補助療法にも使用。' WHERE name = 'ジアゼパム';

UPDATE ingredients SET description = '【抗不安薬/抗てんかん薬（ベンゾジアゼピン系）】
長時間作用型のベンゾジアゼピン系薬。強力な抗けいれん作用を持ち、てんかんの治療に広く使用される。パニック障害にも効果がある。' WHERE name = 'クロナゼパム';

UPDATE ingredients SET description = '【抗不安薬（チエノジアゼピン系）】
短時間作用型の抗不安薬。ベンゾジアゼピン系に類似した作用を持つ。神経症、心身症、頸椎症、腰痛症における不安・緊張・抑うつ・睡眠障害に使用。' WHERE name = 'エチゾラム';

UPDATE ingredients SET description = '【抗不安薬（ベンゾジアゼピン系）】
中間作用型のベンゾジアゼピン系抗不安薬。神経症、心身症における不安・緊張・抑うつ、睡眠障害に使用。筋弛緩作用は比較的弱い。' WHERE name = 'ブロマゼパム';

UPDATE ingredients SET description = '【抗不安薬（ベンゾジアゼピン系）】
超長時間作用型のベンゾジアゼピン系抗不安薬。1日1回の服用で効果が持続する。神経症、心身症における不安・緊張・抑うつ・睡眠障害に使用。' WHERE name = 'ロフラゼプ酸エチル';

UPDATE ingredients SET description = '【抗不安薬（ベンゾジアゼピン系）】
短時間作用型のベンゾジアゼピン系抗不安薬。作用が穏やかで副作用が比較的少ない。心身症、神経症における不安・緊張・抑うつ・睡眠障害に使用。' WHERE name = 'クロチアゼパム';

-- ベンゾジアゼピン系睡眠薬
UPDATE ingredients SET description = '【睡眠薬（ベンゾジアゼピン系）】
超短時間作用型のベンゾジアゼピン系睡眠薬。入眠障害に有効で、翌朝への持ち越しが少ない。健忘などの副作用に注意が必要。不眠症に使用。' WHERE name = 'トリアゾラム';

UPDATE ingredients SET description = '【睡眠薬（ベンゾジアゼピン系）】
中間作用型のベンゾジアゼピン系睡眠薬。入眠障害と中途覚醒の両方に効果がある。不眠症、麻酔前投薬、異常脳波を伴うてんかんにも使用。' WHERE name = 'ニトラゼパム';

UPDATE ingredients SET description = '【睡眠薬（ベンゾジアゼピン系）】
中間作用型のベンゾジアゼピン系睡眠薬。強力な催眠作用を持ち、入眠障害と中途覚醒に有効。不眠症、麻酔前投薬に使用。' WHERE name = 'フルニトラゼパム';

UPDATE ingredients SET description = '【睡眠薬（ベンゾジアゼピン系）】
短時間作用型のベンゾジアゼピン系睡眠薬。入眠障害に有効で、翌朝への持ち越しが比較的少ない。不眠症、麻酔前投薬に使用。' WHERE name = 'ブロチゾラム';

-- 非ベンゾジアゼピン系睡眠薬
UPDATE ingredients SET description = '【睡眠薬（非ベンゾジアゼピン系）】
Z薬と呼ばれる非ベンゾジアゼピン系睡眠薬。GABA-A受容体に選択的に作用し、筋弛緩作用が弱い。入眠障害に有効。不眠症に使用。' WHERE name = 'ゾルピデム';

UPDATE ingredients SET description = '【睡眠薬（非ベンゾジアゼピン系）】
Z薬の一種。非ベンゾジアゼピン系睡眠薬で、筋弛緩作用が弱く翌朝への持ち越しが少ない。苦味があるのが特徴。不眠症、麻酔前投薬に使用。' WHERE name = 'ゾピクロン';

UPDATE ingredients SET description = '【睡眠薬（非ベンゾジアゼピン系）】
ゾピクロンの光学異性体で、より選択性が高い。入眠障害と中途覚醒の両方に効果がある。苦味が軽減されている。不眠症に使用。' WHERE name = 'エスゾピクロン';

-- その他の睡眠薬
UPDATE ingredients SET description = '【睡眠薬（メラトニン受容体作動薬）】
メラトニン受容体に作用し、体内時計のリズムを調整する。依存性がなく、自然な眠りを促す。入眠困難を伴う不眠症に使用。高齢者にも使いやすい。' WHERE name = 'ラメルテオン';

UPDATE ingredients SET description = '【睡眠薬（オレキシン受容体拮抗薬）】
覚醒を維持するオレキシンの働きを抑制する新しいタイプの睡眠薬。入眠障害と中途覚醒の両方に効果がある。不眠症に使用。依存性が低い。' WHERE name = 'スボレキサント';

UPDATE ingredients SET description = '【睡眠薬（オレキシン受容体拮抗薬）】
オレキシン受容体拮抗薬。スボレキサントより新しく、併用禁忌薬が少ない。入眠障害と中途覚醒に効果がある。不眠症に使用。' WHERE name = 'レンボレキサント';

-- 定型抗精神病薬
UPDATE ingredients SET description = '【抗精神病薬（定型/ブチロフェノン系）】
定型抗精神病薬の代表格。ドパミンD2受容体を強力に遮断する。統合失調症の陽性症状（幻覚・妄想）に有効。注射剤や液剤があり、急性期治療に使用。' WHERE name = 'ハロペリドール';

UPDATE ingredients SET description = '【抗精神病薬（定型/フェノチアジン系）】
最初に開発された抗精神病薬。鎮静作用が強く、興奮や不穏の鎮静に使用される。統合失調症、躁病、神経症における不安・緊張に適応。' WHERE name = 'クロルプロマジン';

UPDATE ingredients SET description = '【抗精神病薬（定型/フェノチアジン系）】
強い鎮静作用を持つフェノチアジン系抗精神病薬。統合失調症、躁病、うつ病における不安・緊張に使用。睡眠薬としても用いられることがある。' WHERE name = 'レボメプロマジン';

-- 非定型抗精神病薬
UPDATE ingredients SET description = '【抗精神病薬（非定型/SDA）】
セロトニン・ドパミン拮抗薬（SDA）の代表格。陽性症状と陰性症状の両方に効果がある。統合失調症、小児の自閉スペクトラム症に伴う易刺激性に適応。' WHERE name = 'リスペリドン';

UPDATE ingredients SET description = '【抗精神病薬（非定型/MARTA）】
多元受容体作用抗精神病薬（MARTA）。統合失調症、双極性障害の躁症状・うつ症状に適応。鎮静作用が強い。体重増加や代謝への影響に注意。糖尿病患者には禁忌。' WHERE name = 'オランザピン';

UPDATE ingredients SET description = '【抗精神病薬（非定型/MARTA）】
多元受容体作用抗精神病薬。鎮静作用と催眠作用が強い。統合失調症に適応。眠気が強く、不眠に対しても使用されることがある。糖尿病患者には禁忌。' WHERE name = 'クエチアピン';

UPDATE ingredients SET description = '【抗精神病薬（非定型/DSS）】
ドパミンシステムスタビライザー（DSS）。ドパミンD2受容体の部分作動薬として作用する。統合失調症、双極性障害、うつ病の補助療法、小児の自閉スペクトラム症に適応。' WHERE name = 'アリピプラゾール';

UPDATE ingredients SET description = '【抗精神病薬（非定型/SDA）】
リスペリドンの活性代謝物。統合失調症に適応。持続性注射剤（ゼプリオン）があり、月1回の投与で維持療法が可能。' WHERE name = 'パリペリドン';

UPDATE ingredients SET description = '【抗精神病薬（非定型/SDA）】
ドパミンD2受容体への親和性が高いSDA。統合失調症に適応。錐体外路症状が比較的少なく、体重増加も少ないとされる。テープ剤（貼り薬）もある。' WHERE name = 'ブロナンセリン';

UPDATE ingredients SET description = '【抗精神病薬（非定型/SDA）】
セロトニン・ドパミン拮抗薬。統合失調症に適応。錐体外路症状や体重増加が比較的少ないとされる。食後投与で吸収が良くなる。' WHERE name = 'ペロスピロン';

UPDATE ingredients SET description = '【抗精神病薬（非定型/SDA）】
新しいタイプのSDA。統合失調症、双極性障害のうつ症状に適応。体重増加や代謝への影響が比較的少ない。食事と一緒に服用する。' WHERE name = 'ルラシドン';

UPDATE ingredients SET description = '【抗精神病薬（非定型/MARTA）】
舌下投与する非定型抗精神病薬。統合失調症に適応。舌下錠のため、飲み込む必要がなく、嚥下困難な患者にも使用しやすい。' WHERE name = 'アセナピン';

-- 気分安定薬
UPDATE ingredients SET description = '【気分安定薬】
気分安定薬の第一選択薬。躁病エピソードとうつ病エピソードの両方に予防効果がある。双極性障害の治療と再発予防に使用。血中濃度のモニタリングが必要。自殺予防効果も報告されている。' WHERE name = '炭酸リチウム';

UPDATE ingredients SET description = '【気分安定薬/抗てんかん薬】
GABAの作用を増強する抗てんかん薬。双極性障害の躁状態に有効で、混合状態や急速交代型にも効果がある。てんかん、片頭痛にも適応。血中濃度のモニタリングが推奨される。' WHERE name = 'バルプロ酸ナトリウム';

UPDATE ingredients SET description = '【気分安定薬/抗てんかん薬】
ナトリウムチャネルを遮断する抗てんかん薬。双極性障害の躁状態、てんかん、三叉神経痛に適応。他剤で効果不十分な場合に使用されることが多い。薬物相互作用に注意。' WHERE name = 'カルバマゼピン';

UPDATE ingredients SET description = '【気分安定薬/抗てんかん薬】
双極性障害における気分エピソードの再発・再燃抑制に唯一適応を持つ薬剤。うつ病相への予防効果が特に高い。重篤な皮膚障害のリスクがあり、ゆっくり増量する必要がある。' WHERE name = 'ラモトリギン';

-- ADHD治療薬
UPDATE ingredients SET description = '【ADHD治療薬（中枢刺激薬）】
ドパミンとノルアドレナリンの再取り込みを阻害する中枢刺激薬。ADHDの不注意、多動性、衝動性を改善する。徐放製剤で1日1回朝の服用で約12時間効果が持続。流通管理制度あり。' WHERE name = 'メチルフェニデート';

UPDATE ingredients SET description = '【ADHD治療薬（非中枢刺激薬）】
ノルアドレナリン再取り込み阻害薬。ADHDの症状を改善する非中枢刺激薬。依存性がなく、効果発現まで2〜8週間かかる。1日1〜2回の服用。うつ症状を併発する患者にも適している。' WHERE name = 'アトモキセチン';

UPDATE ingredients SET description = '【ADHD治療薬（非中枢刺激薬）】
α2Aアドレナリン受容体作動薬。前頭前野の機能を高めてADHDの症状を改善する。衝動性や多動性の改善に効果が高い。眠気や血圧低下の副作用に注意。' WHERE name = 'グアンファシン';

UPDATE ingredients SET description = '【ADHD治療薬（中枢刺激薬）】
体内で徐々にd-アンフェタミンに変換されるプロドラッグ。ADHDの症状を持続的に改善する。小児のみに適応。乱用リスクが低減されている。流通管理制度あり。' WHERE name = 'リスデキサンフェタミン';

-- 認知症治療薬
UPDATE ingredients SET description = '【認知症治療薬（コリンエステラーゼ阻害薬）】
日本で最初に発売された認知症治療薬。アセチルコリンの分解を抑制し、認知機能の低下を遅らせる。軽度から高度のアルツハイマー型認知症、レビー小体型認知症に適応。1日1回の服用。' WHERE name = 'ドネペジル';

UPDATE ingredients SET description = '【認知症治療薬（コリンエステラーゼ阻害薬）】
コリンエステラーゼ阻害作用に加え、ニコチン性受容体への増強作用を持つ。軽度から中等度のアルツハイマー型認知症に適応。液剤があり、固形物の服用が困難な患者に有用。' WHERE name = 'ガランタミン';

UPDATE ingredients SET description = '【認知症治療薬（コリンエステラーゼ阻害薬）】
貼り薬（パッチ剤）という特徴を持つコリンエステラーゼ阻害薬。軽度から中等度のアルツハイマー型認知症に適応。内服困難な患者に有用で、消化器系の副作用が出にくい。' WHERE name = 'リバスチグミン';

UPDATE ingredients SET description = '【認知症治療薬（NMDA受容体拮抗薬）】
グルタミン酸による神経細胞への過剰な刺激を抑える。中等度から高度のアルツハイマー型認知症に適応。コリンエステラーゼ阻害薬との併用が可能。興奮や攻撃性にも効果がある。' WHERE name = 'メマンチン';