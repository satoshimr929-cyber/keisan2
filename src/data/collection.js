/**
 * かがやきストーン コレクション定義
 * stage: ステージIDでクリア時に自動付与
 * special: true = バトル中の条件で付与
 */
export const STONES = [
  // ── ステージクリア石 (12個) ──
  { id:'st01', name:'草原の石',  desc:'草原ステージを クリア',    stage:'st01', c1:'#58d048', c2:'#1a6818', bd:'#88ff66', glow:'#44ff22' },
  { id:'st02', name:'森の石',    desc:'森ステージを クリア',      stage:'st02', c1:'#28904a', c2:'#0c4020', bd:'#44dd66', glow:'#22cc44' },
  { id:'st03', name:'霧石',      desc:'霧谷ステージを クリア',    stage:'st03', c1:'#9878cc', c2:'#4a2888', bd:'#ccaaff', glow:'#aa66ff' },
  { id:'st04', name:'水の石',    desc:'泉ステージを クリア',      stage:'st04', c1:'#44c0f0', c2:'#0c60b0', bd:'#88e8ff', glow:'#44ccff' },
  { id:'st05', name:'湖の石',    desc:'湖ステージを クリア',      stage:'st05', c1:'#2868e0', c2:'#0828a8', bd:'#6699ff', glow:'#4488ff' },
  { id:'st06', name:'氷の石',    desc:'氷洞ステージを クリア',    stage:'st06', c1:'#c8f0ff', c2:'#4488c0', bd:'#eeffff', glow:'#88eeff' },
  { id:'st07', name:'霜の石',    desc:'霜廊ステージを クリア',    stage:'st07', c1:'#e8eeff', c2:'#6888d8', bd:'#ffffff', glow:'#ccddff' },
  { id:'st08', name:'炎の石',    desc:'火山ステージを クリア',    stage:'st08', c1:'#f86020', c2:'#a01800', bd:'#ffaa40', glow:'#ff6600' },
  { id:'st09', name:'溶岩の石',  desc:'溶岩ステージを クリア',    stage:'st09', c1:'#cc2800', c2:'#680800', bd:'#ff5020', glow:'#ff2200' },
  { id:'st10', name:'闇の石',    desc:'暗殿ステージを クリア',    stage:'st10', c1:'#7828cc', c2:'#280868', bd:'#bb66ff', glow:'#8833ff' },
  { id:'st11', name:'祭の石',    desc:'祭壇ステージを クリア',    stage:'st11', c1:'#cc40cc', c2:'#680068', bd:'#ff88ff', glow:'#ee44ee' },
  { id:'st12', name:'王の石',    desc:'玉座ステージを クリア',    stage:'st12', c1:'#f0c000', c2:'#806000', bd:'#ffe860', glow:'#ffcc00' },
  // ── アチーブメント石 (5個) ──
  { id:'no_miss_gem',   name:'白の輝石',  desc:'バトルで 全問正解',        special:true, c1:'#f0f4ff', c2:'#8090c0', bd:'#ffffff', glow:'#ddeeff' },
  { id:'streak5_gem',   name:'炎の輝石',  desc:'5問 れんぞく 正解',        special:true, c1:'#ff9820', c2:'#a04000', bd:'#ffcc44', glow:'#ff8800' },
  { id:'lv10_gem',      name:'雷の輝石',  desc:'レベル 10 に なった',      special:true, c1:'#ffe040', c2:'#807000', bd:'#ffff88', glow:'#ffee00' },
  { id:'lv20_gem',      name:'星の輝石',  desc:'レベル 20 に なった',      special:true, c1:'#4488ff', c2:'#082898', bd:'#88ccff', glow:'#4488ff' },
  { id:'all_clear_gem', name:'伝説の石',  desc:'ぜんステージ クリア！',    special:true, c1:'#ff88ff', c2:'#881888', bd:'#ffccff', glow:'#ff44ff' },
];

export const STONE_MAP = Object.fromEntries(STONES.map(s => [s.id, s]));
