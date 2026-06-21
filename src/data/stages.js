/**
 * ステージ定義（12ステージ）
 * 既存データを完全保持しつつ story フレーバーテキストを追加
 */
export const STAGES = [
  {
    id: 'st01', name: 'はじまりの草原', grade: '4年', ico: '🌱', uc: '#5aa0ff', tier: 1,
    pool: ['tasi', 'hiki'],
    weapon: { name: 'どうのつるぎ', atk: 2, ico: '🗡️' },
    keyName: 'もりの かぎ', keyIco: '🗝️',
    story: '草原の かなたで モンスターが うごめいている！\nたし算と ひき算の ちからで たおそう！',
  },
  {
    id: 'st02', name: 'ざわめきの森', grade: '4年', ico: '🌲', uc: '#46d36a', tier: 2,
    pool: ['kake', 'wari'],
    weapon: { name: 'てつのつるぎ', atk: 4, ico: '⚔️' },
    keyName: 'きりの かぎ', keyIco: '🗝️',
    story: '森の おくには かけ算と わり算の まじゅつしが ひそんでいる。\nかけ算の ちからで みちを ひらけ！',
  },
  {
    id: 'st03', name: 'きりの谷', grade: '4年', ico: '🌫️', uc: '#7f8cff', tier: 3,
    pool: ['gaisu', 'junjo'],
    weapon: { name: 'はがねのつるぎ', atk: 6, ico: '⚔️' },
    keyName: 'しずくの かぎ', keyIco: '🗝️',
    story: '霧の中に がいすうと じゅんじょの なぞが かくれている。\n数字の ならびを みやぶれ！',
  },
  {
    id: 'st04', name: 'しずくの泉', grade: '4年', ico: '💧', uc: '#46d3c0', tier: 4,
    pool: ['decas'],
    weapon: { name: 'みずのやり', atk: 8, ico: '🔱' },
    keyName: 'みずうみの かぎ', keyIco: '🗝️',
    story: '泉のほとりで 小数の せいれいが まっている。\n小数点の ちからを つかって まえに すすめ！',
  },
  {
    id: 'st05', name: 'みずうみの里', grade: '4年', ico: '🏞️', uc: '#5ad0ff', tier: 5,
    pool: ['decmul', 'decdiv', 'frac'],
    weapon: { name: 'こおりのつるぎ', atk: 10, ico: '❄️' },
    keyName: 'こおりの かぎ', keyIco: '🗝️',
    story: '里の みんなが 分数と 小数の バケモノに おびえている！\nゆうしゃよ、たすけてくれ！',
  },
  {
    id: 'st06', name: 'こおりの洞くつ', grade: '5年', ico: '🧊', uc: '#7fd0ff', tier: 6,
    pool: ['koubai', 'kouyaku'],
    weapon: { name: 'クリスタルメイス', atk: 12, ico: '🔨' },
    keyName: 'つららの かぎ', keyIco: '🗝️',
    story: '氷の 洞くつには こうばいすうと こうやくすうの かたまりが！\n数の つながりを みぬけ！',
  },
  {
    id: 'st07', name: 'つらら回廊', grade: '5年', ico: '🌬️', uc: '#9ad8ff', tier: 7,
    pool: ['idenbun'],
    weapon: { name: 'ひかりのつるぎ', atk: 14, ico: '✨' },
    keyName: 'ほのおの かぎ', keyIco: '🗝️',
    story: 'つらら回廊の おくには 異分母の 魔法陣が きざまれている。\n通分の わざで とつきやぶれ！',
  },
  {
    id: 'st08', name: 'ほのおの山道', grade: '5年', ico: '🔥', uc: '#ff7a4a', tier: 8,
    pool: ['decmul2', 'decdiv2'],
    weapon: { name: 'ほのおのつるぎ', atk: 16, ico: '🔥' },
    keyName: 'ようがんの かぎ', keyIco: '🗝️',
    story: '小数どうしの かけ算・わり算が あなたを まちうける。\n小数点の いどうを わすれるな！',
  },
  {
    id: 'st09', name: 'ようがんの間', grade: '5年', ico: '🌋', uc: '#ff5a55', tier: 9,
    pool: ['heikin', 'wariai'],
    weapon: { name: 'マグマアックス', atk: 18, ico: '🪓' },
    keyName: 'やみの かぎ', keyIco: '🗝️',
    story: 'ようがんの 間では 平均と 割合の おにが すみつく。\n数の かんけいを とらえろ！',
  },
  {
    id: 'st10', name: 'やみの神殿', grade: '6年', ico: '🌑', uc: '#a07bff', tier: 10,
    pool: ['fracmul'],
    weapon: { name: 'やみのつるぎ', atk: 20, ico: '🗡️' },
    keyName: 'しんえんの かぎ', keyIco: '🗝️',
    story: '暗黒の 神殿には 分数の かけ算の 悪霊が！\n分子・分母 それぞれ かけろ！',
  },
  {
    id: 'st11', name: 'しんえんの祭壇', grade: '6年', ico: '🔮', uc: '#c77bff', tier: 11,
    pool: ['fracdiv'],
    weapon: { name: 'せいなるつるぎ', atk: 22, ico: '⚔️' },
    keyName: 'おうの かぎ', keyIco: '🗝️',
    story: '最後の 祭壇で 分数の わり算の 試練が まっている！\nひっくり返して かけるのが カギだ！',
  },
  {
    id: 'st12', name: 'けいさん王の玉座', grade: '6年', ico: '👑', uc: '#ffcf3f', tier: 12,
    pool: ['tasi','hiki','kake','wari','gaisu','junjo','decas','decmul','decdiv',
           'frac','koubai','kouyaku','idenbun','decmul2','decdiv2','heikin','wariai','fracmul','fracdiv'],
    weapon: { name: 'でんせつのつるぎ', atk: 25, ico: '🌟' },
    keyName: '', keyIco: '👑', last: true,
    story: 'ついに けいさん王の 玉座に たどりついた！\nすべての 算数の ちからを あわせて たおせ！\nいざ、ラストバトルへ！',
  },
];

/** ステージ間の座標マップ（ワールドマップ用）*/
export const STAGE_MAP_POS = [
  { x: 10, y: 80 },  // st01
  { x: 22, y: 66 },  // st02
  { x: 36, y: 55 },  // st03
  { x: 48, y: 44 },  // st04
  { x: 40, y: 30 },  // st05
  { x: 26, y: 20 },  // st06
  { x: 38, y: 12 },  // st07
  { x: 52, y: 20 },  // st08
  { x: 64, y: 30 },  // st09
  { x: 72, y: 44 },  // st10
  { x: 60, y: 56 },  // st11
  { x: 50, y: 66 },  // st12
];

export const STARTWEAPON = { name: 'きのぼう', atk: 0, ico: '🪵' };
