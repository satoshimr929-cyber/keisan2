/**
 * セーブ/ロード（localStorage）
 * キー互換: keisan_rpg_hero / keisan_rpg_progress
 * 追加キー: keisan_rpg_mastery / keisan_rpg_achievements
 */

const KEY_HERO    = 'keisan_rpg_hero';
const KEY_PROG    = 'keisan_rpg_progress';
const KEY_MASTERY = 'keisan_rpg_mastery';
const KEY_ACHIEV  = 'keisan_rpg_achievements';

export function loadHero() {
  try {
    const v = localStorage.getItem(KEY_HERO);
    if (v) {
      const o = JSON.parse(v);
      return { level: o.level || 1, exp: o.exp || 0 };
    }
  } catch (_) {}
  return { level: 1, exp: 0 };
}

export function saveHero(hero) {
  try { localStorage.setItem(KEY_HERO, JSON.stringify({ level: hero.level, exp: hero.exp })); } catch (_) {}
}

export function loadCleared() {
  try { return JSON.parse(localStorage.getItem(KEY_PROG) || '[]'); } catch (_) { return []; }
}

export function markCleared(id) {
  const a = loadCleared();
  if (!a.includes(id)) {
    a.push(id);
    try { localStorage.setItem(KEY_PROG, JSON.stringify(a)); } catch (_) {}
  }
}

/** 習熟度: { [genName]: { total: number, correct: number } } */
export function loadMastery() {
  try { return JSON.parse(localStorage.getItem(KEY_MASTERY) || '{}'); } catch (_) { return {}; }
}

export function saveMastery(mastery) {
  try { localStorage.setItem(KEY_MASTERY, JSON.stringify(mastery)); } catch (_) {}
}

export function recordMasteryResult(genName, correct) {
  const m = loadMastery();
  if (!m[genName]) m[genName] = { total: 0, correct: 0 };
  m[genName].total++;
  if (correct) m[genName].correct++;
  saveMastery(m);
}

/** 習熟度のパーセント（0–100） */
export function masteryPct(genName) {
  const m = loadMastery();
  const e = m[genName];
  if (!e || e.total < 3) return null;  // データ不足
  return Math.round(e.correct / e.total * 100);
}

/** 達成済みアチーブメントのIDセット */
export function loadAchievements() {
  try { return new Set(JSON.parse(localStorage.getItem(KEY_ACHIEV) || '[]')); } catch (_) { return new Set(); }
}

export function saveAchievements(set) {
  try { localStorage.setItem(KEY_ACHIEV, JSON.stringify([...set])); } catch (_) {}
}

export function grantAchievement(id) {
  const a = loadAchievements();
  if (a.has(id)) return false;
  a.add(id);
  saveAchievements(a);
  return true;
}
