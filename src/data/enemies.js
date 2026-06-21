/**
 * 敵データ（既存スプライトキーを流用）
 */

export const ZAKO = [
  { name: 'ペブルキン',    sprite: 'pebblekin',   hp: 16, exp: 6,  atk: 4 },
  { name: 'スパイクビートル',sprite: 'beetle',      hp: 20, exp: 8,  atk: 5 },
  { name: 'リーフインプ',   sprite: 'leafimp',     hp: 18, exp: 7,  atk: 4 },
  { name: 'シンダーラット', sprite: 'cinderrat',   hp: 20, exp: 9,  atk: 5 },
  { name: 'ボーンアーチャー',sprite: 'bonearcher',  hp: 22, exp: 10, atk: 6 },
];

export const BOSS = [
  { name: 'ゴーレムロード',          sprite: 'golemlord', hp: 44, exp: 32, atk: 9,  boss: true },
  { name: 'アークメイジ・ウロボロス',  sprite: 'archmage',  hp: 40, exp: 30, atk: 8,  boss: true },
  { name: 'けいさん大王',             sprite: '__final',   hp: 60, exp: 50, atk: 12, boss: true, final: true },
];

export const HEROES = [
  { name: 'ゆうしゃ',      sprite: 'warrior1' },
  { name: 'まほうつかい',   sprite: 'mage1' },
  { name: 'とうし',         sprite: 'priest1' },
];

/** ランダム整数 */
function ri(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }

export function buildDungeon(stage) {
  const tier = (stage && stage.tier) || 1;
  function scale(t) {
    const e = { ...t };
    e.maxHp = Math.round(t.hp * (1 + (tier - 1) * 0.22));
    e.hp    = e.maxHp;
    e.atk   = t.atk + Math.floor((tier - 1) * 0.7);
    e.exp   = Math.round(t.exp * (1 + (tier - 1) * 0.15));
    return e;
  }
  const es = [];
  for (let i = 0; i < 3; i++) es.push(scale(ZAKO[ri(0, ZAKO.length - 1)]));
  if (stage && stage.last) {
    es.push(scale(BOSS[2]));
  } else {
    es.push(scale(BOSS[ri(0, 1)]));
  }
  return es;
}

const DK = '#0a0e1c';

/** ラスボス用インラインSVG */
export function finalBossSVG(size = 150) {
  const body = `
    <path d="M30 42 L20 20 L36 36 Z" fill="#c04040" stroke="${DK}" stroke-width="3"/>
    <path d="M70 42 L80 20 L64 36 Z" fill="#c04040" stroke="${DK}" stroke-width="3"/>
    <path d="M22 54 L2 42 L12 62 L4 74 L28 68 Z" fill="#c04040" stroke="${DK}" stroke-width="3"/>
    <path d="M78 54 L98 42 L88 62 L96 74 L72 68 Z" fill="#c04040" stroke="${DK}" stroke-width="3"/>
    <ellipse cx="50" cy="58" rx="30" ry="28" fill="#c04040" stroke="${DK}" stroke-width="3"/>
    <ellipse cx="40" cy="52" rx="7" ry="8" fill="#fff"/>
    <ellipse cx="60" cy="52" rx="7" ry="8" fill="#fff"/>
    <circle cx="41" cy="53" r="3.5" fill="${DK}"/>
    <circle cx="61" cy="53" r="3.5" fill="${DK}"/>
    <path d="M38 70 L44 64 L50 70 L56 64 L62 70 Z" fill="#fff" stroke="${DK}" stroke-width="2"/>
    <text x="50" y="47" text-anchor="middle" font-size="8" fill="#ffcf3f">👑</text>
  `;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}">${body}</svg>`
  )}`;
}

export function crownSVG() {
  return `<path d="M20 80 L24 38 L42 60 L60 30 L78 60 L96 38 L100 80 Z" fill="#ffcf3f" stroke="${DK}" stroke-width="3"/>
    <rect x="20" y="80" width="80" height="14" rx="3" fill="#e0a91a" stroke="${DK}" stroke-width="3"/>
    <circle cx="60" cy="30" r="6" fill="#ff5a55" stroke="${DK}" stroke-width="2"/>
    <circle cx="24" cy="38" r="5" fill="#5aa0ff" stroke="${DK}" stroke-width="2"/>
    <circle cx="96" cy="38" r="5" fill="#5aa0ff" stroke="${DK}" stroke-width="2"/>`;
}

export function skullSVG() {
  return `<path d="M30 50 C30 26 90 26 90 50 C90 64 84 70 80 74 L80 86 L70 90 L60 84 L50 90 L40 86 L40 74 C36 70 30 64 30 50 Z" fill="#e9edf7" stroke="${DK}" stroke-width="3"/>
    <circle cx="47" cy="54" r="8" fill="${DK}"/>
    <circle cx="73" cy="54" r="8" fill="${DK}"/>
    <path d="M55 70 L60 62 L65 70 Z" fill="${DK}"/>`;
}
