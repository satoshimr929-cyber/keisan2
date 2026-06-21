/**
 * ヒーロー成長システム
 * 称号・アチーブメント定義
 */

export function maxHP(lv) { return 20 + (lv - 1) * 6; }
export function atkBase(lv) { return 8 + (lv - 1) * 3; }
export function needExp(lv) { return 12 + (lv - 1) * 10; }

import { STAGES, STARTWEAPON } from '../data/stages.js';
import { loadCleared } from './save.js';

export function equippedWeapon() {
  const c = loadCleared();
  let best = STARTWEAPON;
  for (const s of STAGES) {
    if (c.includes(s.id) && s.weapon.atk > best.atk) best = s.weapon;
  }
  return best;
}

export function ownedWeapons() {
  const c = loadCleared();
  return [STARTWEAPON, ...STAGES.filter(s => c.includes(s.id)).map(s => s.weapon)];
}

export function stageUnlocked(idx) {
  if (idx <= 0) return true;
  return loadCleared().includes(STAGES[idx - 1].id);
}

export function clearPct() {
  const c = loadCleared();
  return Math.round(c.length / STAGES.length * 100);
}

/** 称号定義 */
export const TITLES = [
  { id: 'first_step',   name: 'はじめのいっぽ', desc: 'ステージ1をクリア',      icon: '🌱', condition: c => c.includes('st01') },
  { id: 'half_way',     name: 'ちゅうばんせん',  desc: '6ステージクリア',       icon: '⚔️', condition: c => c.length >= 6 },
  { id: 'conqueror',    name: 'けいさんのゆうしゃ', desc: 'ぜんステージクリア',  icon: '👑', condition: c => c.length >= 12 },
  { id: 'streak3',      name: 'れんぞくせいかい', desc: 'ひとつのバトルで 3問連続正解', icon: '🔥', condition: null },  // バトル中にセット
  { id: 'no_miss',      name: 'まちがいゼロ',   desc: 'バトルで 全問正解',      icon: '💎', condition: null },
  { id: 'lv10',         name: 'つわもの',        desc: 'レベル 10 に なった',   icon: '⚡', condition: null },
  { id: 'lv20',         name: 'でんせつのゆうしゃ', desc: 'レベル 20 に なった', icon: '🌟', condition: null },
];

export function checkProgressTitles(cleared) {
  return TITLES.filter(t => t.condition && t.condition(cleared)).map(t => t.id);
}
