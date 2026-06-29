/**
 * けいさんクエスト 2.0 - メインゲームロジック
 */
import { GEN, ri, fracHTML } from './data/generators.js';
import { STAGES, STARTWEAPON } from './data/stages.js';
import { ZAKO, BOSS, HEROES, buildDungeon, finalBossSVG, finalBossImgURL, crownSVG, skullSVG } from './data/enemies.js';
import { maxHP, charMaxHP, atkBase, needExp, equippedWeapon, ownedWeapons, stageUnlocked, clearPct, TITLES, checkProgressTitles } from './engine/progression.js';
import { loadHero, saveHero, loadCleared, markCleared, recordMasteryResult, loadMastery, masteryPct, grantAchievement, loadAchievements, loadCollection, addToCollection } from './engine/save.js';
import { STONES, STONE_MAP } from './data/collection.js';
import {
  GEM_ST01,GEM_ST02,GEM_ST03,GEM_ST04,GEM_ST05,GEM_ST06,
  GEM_ST07,GEM_ST08,GEM_ST09,GEM_ST10,GEM_ST11,GEM_ST12,
  GEM_NO_MISS_GEM,GEM_STREAK5_GEM,GEM_LV10_GEM,GEM_LV20_GEM,GEM_ALL_CLEAR_GEM,
} from './assets-gems.js';

const GEM_IMGS = {
  st01:GEM_ST01, st02:GEM_ST02, st03:GEM_ST03, st04:GEM_ST04,
  st05:GEM_ST05, st06:GEM_ST06, st07:GEM_ST07, st08:GEM_ST08,
  st09:GEM_ST09, st10:GEM_ST10, st11:GEM_ST11, st12:GEM_ST12,
  no_miss_gem:GEM_NO_MISS_GEM, streak5_gem:GEM_STREAK5_GEM,
  lv10_gem:GEM_LV10_GEM, lv20_gem:GEM_LV20_GEM, all_clear_gem:GEM_ALL_CLEAR_GEM,
};
import { Audio } from './fx/audio.js';
import { Particles } from './fx/particles.js';
import { Transitions } from './fx/transitions.js';
import { renderWorldMap } from './ui/worldmap.js';
import { IMG, WIMG, TITLE_BG } from './assets-generated.js';
import { WARRIOR_1, MAGE_1, PRIEST_1 } from './assets-hero-sprites.js';
IMG['warrior1'] = WARRIOR_1;
IMG['mage1']    = MAGE_1;
IMG['priest1']  = PRIEST_1;
import { BG_GRASSLAND, BG_FOREST, BG_SNOW, BG_VOLCANO, BG_TEMPLE, BG_MAKAI, BG_CHURCH } from './assets-battle-bg.js';
import { ENEMY_VORLK, ENEMY_NAAGA } from './assets-enemy-new.js';
import { ENEMY_GOBLIN, ENEMY_MECHA, ENEMY_ICEDRAGON } from './assets-enemy-new2.js';
import { COFFIN_IMG } from './assets-coffin.js';
IMG['vorlk']     = ENEMY_VORLK;
IMG['naaga']     = ENEMY_NAAGA;
IMG['goblin']    = ENEMY_GOBLIN;
IMG['mecha']     = ENEMY_MECHA;
IMG['icedragon'] = ENEMY_ICEDRAGON;
import { BattleBG } from './fx/battle-bg.js';

// tier → バトル背景画像
const BATTLE_BG_MAP = {
  1: BG_GRASSLAND, 2: BG_FOREST,   3: BG_FOREST,
  4: BG_GRASSLAND, 5: BG_GRASSLAND,
  6: BG_SNOW,      7: BG_SNOW,
  8: BG_VOLCANO,   9: BG_VOLCANO,
  10: BG_TEMPLE,  11: BG_MAKAI,  12: BG_MAKAI,
};

function setBattleBG(tier) {
  const area = document.querySelector('.enemy-area');
  if (!area) return;
  const url = BATTLE_BG_MAP[tier] || '';
  if (url) {
    area.style.backgroundImage = `url(${url})`;
    area.style.backgroundSize = 'cover';
    area.style.backgroundPosition = 'center top';
  } else {
    area.style.backgroundImage = '';
  }
}

function clearBattleBG() {
  const area = document.querySelector('.enemy-area');
  if (area) area.style.backgroundImage = '';
}

// ===== パーティ3人管理 =====
function initPartyHP() {
  B.partyMaxHP = HEROES.map((_, i) => charMaxHP(i, hero.level));
  B.partyHP    = [...B.partyMaxHP];
  B.activeSlot = 0;
  B.heroHP     = B.partyHP.reduce((a, b) => a + b, 0);
}

function syncPartyHP() {
  B.heroHP = B.partyHP.reduce((a, b) => a + Math.max(0, b), 0);
}

function advanceActiveSlot() {
  for (let i = 1; i <= 3; i++) {
    const next = (B.activeSlot + i) % 3;
    if (B.partyHP[next] > 0) { B.activeSlot = next; return; }
  }
}

function isAllFainted() {
  return B.partyHP.every(hp => hp <= 0);
}

// ===== ユーティリティ =====
const $ = id => document.getElementById(id);
const q = sel => document.querySelector(sel);

// ===== 状態 =====
let hero = { level: 1, exp: 0 };

/** バトル状態 */
const B = {
  unit: null, enemies: [], idx: 0, heroHP: 0,
  partyHP: [0, 0, 0], partyMaxHP: [0, 0, 0], activeSlot: 0,
  problem: null, fields: [], active: 0,
  locked: false, pending: null,
  runExp: 0, leveled: false,
  mistakes: [],
  recentAnswers: [],   // 直近5問の正否（アダプティブ難易度用）
  streak: 0,           // 連続正解数
  totalCorrect: 0, totalWrong: 0,
  hintShown: false,
  currentGenName: '',
  practiceMode: false,
  churchMode: false,
  revivedCount: 0,
  needsRevival: false,
};

// ===== 画面遷移 =====
let currentScreen = 'screen-title';

async function show(id, dir = 'forward') {
  const from = $(currentScreen);
  const to = $(id);
  currentScreen = id;
  await Transitions.switchScreen(from, to, dir);
}

// ===== スプライト描画 =====
function wIco(w) {
  if (w && WIMG[w.name]) return `<img class="w-ico" src="${WIMG[w.name]}" alt="${w.name}">`;
  return w ? w.ico : '';
}

function keyIco(s) {
  if (s.keyIco === '🗝️' && WIMG['__key']) return `<img class="k-ico" src="${WIMG['__key']}" alt="かぎ">`;
  return s.keyIco;
}

function heroSpriteHTML(h, cls = '') {
  const src = IMG[h.sprite];
  return src ? `<img class="hero-sprite${cls ? ' ' + cls : ''}" src="${src}" alt="${h.name}">` : '';
}

function enemySpriteURL(e) {
  if (e.sprite === '__final') return finalBossImgURL();
  return IMG[e.sprite] || finalBossSVG(100);
}

function renderParty(elId) {
  const el = $(elId);
  if (!el) return;
  const hasBattle = B.partyMaxHP[0] > 0;
  if (!hasBattle) {
    el.innerHTML = HEROES.map(h => heroSpriteHTML(h)).join('');
    return;
  }
  el.innerHTML = HEROES.map((h, i) => {
    const hp    = Math.max(0, B.partyHP[i]);
    const maxHp = B.partyMaxHP[i];
    const pct   = maxHp > 0 ? hp / maxHp * 100 : 0;
    const col   = pct > 50 ? 'var(--hp)' : pct > 25 ? 'var(--exp)' : 'var(--red)';
    const isActive  = B.activeSlot === i && hp > 0;
    const isFainted = hp <= 0;
    const src = IMG[h.sprite];
    const imgEl = isFainted
      ? `<img class="hero-sprite coffin-sprite" src="${COFFIN_IMG}" alt="戦闘不能">`
      : (src ? `<img class="hero-sprite" src="${src}" alt="${h.name}">` : '');
    return `<div class="hero-slot${isActive ? ' hero-slot-active' : ''}${isFainted ? ' hero-slot-fainted' : ''}">
      ${imgEl}
      <div class="slot-hp-wrap"><div class="slot-hp-bar" style="width:${pct}%;background:${col}"></div></div>
      <div class="slot-name">${h.name}</div>
    </div>`;
  }).join('');
}

// ===== タイトル画面初期化 =====
function initTitle() {
  // タイトル背景
  const titleBgEl = $('titleBg');
  if (titleBgEl && TITLE_BG) titleBgEl.src = TITLE_BG;

  // 進捗%
  const pctEl = $('titlePct');
  if (pctEl) {
    const pct = clearPct();
    pctEl.textContent = pct > 0 ? `クリア率 ${pct}%` : '';
  }
}

// ===== ヒーローウィンドウ =====
function renderHeroWin(winId) {
  const el = $(winId);
  if (!el) return;
  if (winId === 'heroWinBattle') { renderPartyStatus(); return; }
  if (winId === 'heroWinMap') { renderMapPartyStatus(); return; }
  const mh = maxHP(hero.level), nd = needExp(hero.level);
  const eq = equippedWeapon();
  el.innerHTML = `
    <div class="hero-line">
      <span class="hero-name">ゆうしゃ</span>
      <span class="hero-lv">Lv ${hero.level}</span>
    </div>
    <div class="bar-row">
      <span class="bar-tag">HP</span>
      <div class="bar hp"><i id="${winId}_hp" style="width:100%"></i></div>
      <span class="bar-num">${mh} / ${mh}</span>
    </div>
    <div class="bar-row">
      <span class="bar-tag">EXP</span>
      <div class="bar exp"><i id="${winId}_exp" style="width:${hero.exp / nd * 100}%"></i></div>
      <span class="bar-num">${hero.exp} / ${nd}</span>
    </div>
    <div class="equip-line">${wIco(eq)} <small>${eq.name}（＋${eq.atk}）</small></div>`;
}

function renderPartyStatus() {
  const el = $('heroWinBattle');
  if (!el) return;
  const eq = equippedWeapon();
  const cols = HEROES.map((h, i) => {
    const hp = Math.max(0, B.partyHP[i]);
    const maxHp = B.partyMaxHP[i];
    const pct = maxHp > 0 ? hp / maxHp * 100 : 0;
    const col = pct > 50 ? 'var(--hp)' : pct > 25 ? 'var(--exp)' : 'var(--red)';
    const dead = hp <= 0;
    return `<div class="party-stat${dead ? ' party-stat-dead' : ''}">
      <div class="party-stat-name">${h.name}</div>
      <div class="party-stat-bar-wrap"><div id="partyHpBar${i}" class="party-stat-bar" style="width:${pct}%;background:${col}"></div></div>
      <div id="partyHpNum${i}" class="party-stat-num">${hp}/${maxHp}</div>
    </div>`;
  }).join('');
  el.innerHTML = `<div class="party-win">${cols}</div>
    <div class="party-stat-foot">Lv ${hero.level} &nbsp;${wIco(eq)}&thinsp;${eq.name}（＋${eq.atk}）</div>`;
}

function renderMapPartyStatus() {
  const el = $('heroWinMap');
  if (!el) return;
  const eq = equippedWeapon();
  const cols = HEROES.map((h, i) => {
    const maxHp = charMaxHP(i, hero.level);
    const hp = B.needsRevival ? Math.max(0, B.partyHP[i]) : maxHp;
    const pct = maxHp > 0 ? hp / maxHp * 100 : 0;
    const col = pct > 50 ? 'var(--hp)' : pct > 25 ? 'var(--exp)' : 'var(--red)';
    const dead = hp <= 0;
    return `<div class="party-stat${dead ? ' party-stat-dead' : ''}">
      <div class="party-stat-name">${h.name}</div>
      <div class="party-stat-bar-wrap"><div class="party-stat-bar" style="width:${pct}%;background:${col}"></div></div>
      <div class="party-stat-num">${hp}/${maxHp}</div>
    </div>`;
  }).join('');
  el.innerHTML = `<div class="party-win">${cols}</div>
    <div class="party-stat-foot">Lv ${hero.level} &nbsp;${wIco(eq)}&thinsp;${eq.name}（＋${eq.atk}）</div>`;
}

function updateBars() {
  HEROES.forEach((_, i) => {
    const bar = $(`partyHpBar${i}`);
    const num = $(`partyHpNum${i}`);
    if (!bar) return;
    const hp = Math.max(0, B.partyHP[i]);
    const maxHp = B.partyMaxHP[i];
    const pct = maxHp > 0 ? hp / maxHp * 100 : 0;
    const col = pct > 50 ? 'var(--hp)' : pct > 25 ? 'var(--exp)' : 'var(--red)';
    bar.style.width = pct + '%';
    bar.style.background = col;
    bar.classList.toggle('warning', hp > 0 && pct < 25);
    if (num) num.textContent = `${hp}/${maxHp}`;
    const slot = bar.closest('.party-stat');
    if (slot) slot.classList.toggle('party-stat-dead', hp <= 0);
  });
  const e = B.enemies[B.idx];
  const ehb = $('enemyHpBar');
  const ehn = $('enemyHpNum');
  if (ehb && e) {
    const pct = Math.max(0, e.hp / e.maxHp * 100);
    ehb.style.width = pct + '%';
    if (ehn) ehn.textContent = e.hp + '/' + e.maxHp;
  }
}

// ===== ワールドマップ =====
function openMap() {
  Audio.stopBGM();
  Audio.startBGM('map');
  renderHeroWin('heroWinMap');
  renderBag();
  const notice = $('churchNotice');
  if (notice) notice.style.display = B.needsRevival ? 'block' : 'none';
  renderWorldMap($('mapContainer'), (stage) => {
    if (B.needsRevival) {
      Audio.play('wrong');
      return;
    }
    startStory(stage);
  });
  show('screen-map');
}

function renderBag() {
  const el = $('bagWin');
  if (!el) return;
  const eq = equippedWeapon(), ws = ownedWeapons();
  el.innerHTML = `<div class="bag-title">⚔️ そうび：<b>${wIco(eq)} ${eq.name}</b>（こうげき＋${eq.atk}）</div>
    <div class="bag-row">${ws.map(w => `<span class="bag-item${w === eq ? ' eq' : ''}">${wIco(w)}</span>`).join('')}</div>`;
}

// ===== ストーリー画面 =====
let _pendingStage = null;

function startStory(stage) {
  _pendingStage = stage;
  $('storyTitle').textContent = stage.name;
  $('storyIco').textContent = stage.ico;
  $('storyText').innerHTML = stage.story.replace(/\n/g, '<br>');
  $('storyGrade').textContent = stage.grade;
  show('screen-story');
}

$('storyStartBtn').addEventListener('click', () => {
  if (_pendingStage) startBattle(_pendingStage);
});
$('storyBackBtn').addEventListener('click', () => {
  _pendingStage = null;
  Audio.play('tap');
  openMap();
});

// ===== バトル =====
function startBattle(unit) {
  B.unit = unit;
  B.enemies = buildDungeon(unit);
  B.idx = 0;
  initPartyHP();
  B.runExp = 0; B.leveled = false; B.locked = false;
  B.mistakes = [];
  B.recentAnswers = []; B.streak = 0;
  B.totalCorrect = 0; B.totalWrong = 0;
  B.hintShown = false;
  B.practiceMode = false;
  B.churchMode = false;
  B.revivedCount = 0;
  B.needsRevival = false;
  $('attackBtn').textContent = '⚔️ こうげき！';
  $('hintBtn').style.display = 'inline-flex';
  $('inputCluster').style.display = '';
  $('continueBtn').style.display = 'none';
  $('churchCompleteBtns').style.display = 'none';
  const sb = $('streakBar'); if (sb) sb.style.display = 'none';
  const ebar = $('enemyHpBar'); if (ebar) ebar.classList.remove('boss-hp');

  $('battleTitle').textContent = unit.name;
  renderHeroWin('heroWinBattle');
  renderParty('battleParty');
  renderEnemy(true);
  show('screen-battle');
  setBattleBG(unit.tier || 1);
  BattleBG.start(unit.tier || 1, true);
  setMessage([`<span class="hint">${B.enemies[0].name}が あらわれた！ こたえて こうげきだ！</span>`]);
  setMode('input');
  loadBattleProblem();
  Audio.startBGM();
}

// ふくしゅうモード
function startPractice() {
  const mastery = loadMastery();
  // 習熟度の低いジェネレーター or 全般
  const weak = Object.entries(mastery)
    .filter(([, v]) => v.total >= 3)
    .sort((a, b) => (a[1].correct / a[1].total) - (b[1].correct / b[1].total))
    .slice(0, 5)
    .map(([k]) => k);
  const pool = weak.length >= 2 ? weak : ['tasi', 'hiki', 'kake', 'wari', 'frac'];

  // 練習用の仮ユニット
  const practiceUnit = {
    id: '__practice', name: 'ふくしゅうモード', grade: '', ico: '📖',
    pool, tier: 1, last: false, story: '',
    weapon: STARTWEAPON, keyName: '', keyIco: '',
  };

  B.unit = practiceUnit;
  B.enemies = [];
  // 練習用は敵なし → 問題だけ解く（正解でHPダメージなし）
  B.idx = 0;
  initPartyHP();
  B.runExp = 0; B.leveled = false; B.locked = false;
  B.mistakes = [];
  B.recentAnswers = []; B.streak = 0;
  B.totalCorrect = 0; B.totalWrong = 0;
  B.hintShown = false;
  B.practiceMode = true;

  // 練習用ダミー敵
  const dummyEnemy = { name: 'れんしゅう', hp: 999, maxHp: 999, atk: 0, boss: false, sprite: 'pebblekin', exp: 0 };
  B.enemies = [dummyEnemy, dummyEnemy, dummyEnemy, { ...dummyEnemy, boss: true }];

  $('battleTitle').textContent = '📖 ふくしゅうモード';
  renderHeroWin('heroWinBattle');
  renderParty('battleParty');
  renderEnemy(true);
  show('screen-battle');
  setBattleBG(1);
  BattleBG.start(1, true);
  setMessage(['<span class="hint">れんしゅうを はじめよう！ たくさん といて 実力アップ！</span>']);
  setMode('input');
  loadBattleProblem();
}

function buildDungeonForStage(stage) {
  return buildDungeon(stage);
}

function renderEnemy(first) {
  const e = B.enemies[B.idx];
  // ドット
  let dots = '';
  for (let i = 0; i < B.enemies.length; i++) {
    const en = B.enemies[i];
    const cls = 'edot' + (en.boss ? ' boss' : '') + (en.hp <= 0 ? ' dead' : '');
    dots += `<span class="${cls}"></span>`;
  }
  $('enemyDots').innerHTML = dots;
  $('enemyName').innerHTML = (e.boss ? '<span class="boss-tag">★ボス</span>' : '') + e.name;

  const stage = $('enemyStage');
  const src = enemySpriteURL(e);
  // canvasを保持しつつ敵スプライトだけ差し替え
  let img = stage.querySelector('#enemySprite');
  if (!img) {
    img = document.createElement('img');
    stage.appendChild(img);
  }
  img.className = `enemy-sprite${e.boss ? ' boss' : ''}${e.final ? ' final-boss' : ''}`;
  img.id = 'enemySprite';
  img.src = src;
  img.alt = e.name;
  img.style.display = '';
  const hpBar = $('enemyHpBar');
  if (hpBar) hpBar.classList.toggle('boss-hp', !!e.boss);
  updateBars();
}

// ===== 問題ロード =====
function loadBattleProblem() {
  B.locked = false; B.hintShown = false;
  const pool = (B.unit && B.unit.pool) ? B.unit.pool : ['tasi'];

  // アダプティブ難易度: 直近5問中3問以上ミス → 易しいジェネレーターを優先
  let selectedPool = pool;
  if (B.recentAnswers.length >= 4) {
    const recentWrong = B.recentAnswers.slice(-5).filter(x => !x).length;
    if (recentWrong >= 3 && pool.length > 1) {
      // 易しいジェネレーターを優先（先頭要素 = 易しめ）
      selectedPool = [pool[0], pool[0], pool[1] || pool[0]];
    }
  }

  const genName = selectedPool[ri(0, selectedPool.length - 1)];
  B.currentGenName = genName;
  B.problem = GEN[genName]();
  B.fields = []; B.active = 0;

  $('qText').innerHTML = B.problem.qText;
  const ins = $('qInstr');
  if (B.problem.instr) { ins.textContent = B.problem.instr; ins.style.display = 'block'; }
  else ins.style.display = 'none';

  buildAnswerArea();
  buildKeypad();
  $('attackBtn').disabled = true;
  $('hintBtn').style.display = 'inline-flex';
  $('hintBtn').classList.remove('used');
}

// ===== こたえ入力 =====
function buildAnswerArea() {
  const area = $('answerArea');
  area.innerHTML = '';
  const p = B.problem;
  const row = document.createElement('div');
  row.className = 'ans-row';

  if (p.layout === 'fraction') {
    const wrap = document.createElement('div');
    wrap.className = 'frac-input';
    const nb = makeBox(0, '分子'), bar = document.createElement('div');
    bar.className = 'barwide';
    const db = makeBox(1, '分母');
    wrap.appendChild(nb.label); wrap.appendChild(nb.box);
    wrap.appendChild(bar);
    wrap.appendChild(db.box); wrap.appendChild(db.label);
    row.appendChild(wrap);
  } else if (p.layout === 'divrem') {
    const qB = makeBox(0, '商'); row.appendChild(wrapField(qB));
    const am = document.createElement('div'); am.className = 'amari-txt'; am.textContent = 'あまり';
    row.appendChild(am);
    const rB = makeBox(1, 'あまり'); row.appendChild(wrapField(rB));
  } else {
    const sB = makeBox(0, ''); sB.box.style.minWidth = '120px'; row.appendChild(wrapField(sB));
  }
  area.appendChild(row);
  refreshBoxes();
}

function wrapField(o) {
  const w = document.createElement('div');
  w.className = 'ans-field-wrap';
  if (o.label.textContent) w.appendChild(o.label);
  w.appendChild(o.box);
  return w;
}

function makeBox(idx, lab) {
  B.fields[idx] = { value: '' };
  const label = document.createElement('div');
  label.className = 'ans-label'; label.textContent = lab;
  const box = document.createElement('div');
  box.className = 'ans-box';
  box.addEventListener('click', () => { B.active = idx; refreshBoxes(); Audio.play('tap'); });
  B.fields[idx].el = box;
  return { box, label };
}

function refreshBoxes() {
  B.fields.forEach((f, i) => {
    f.el.classList.toggle('active', i === B.active && !B.locked);
    if (f.value === '') f.el.innerHTML = '<span class="ph">?</span>';
    else f.el.textContent = f.value;
  });
  const all = B.fields.every(f => f.value !== '');
  $('attackBtn').disabled = !all || B.locked;
  $('attackBtn').classList.toggle('ready', all && !B.locked);
}

function buildKeypad() {
  const kp = $('keypad'); kp.innerHTML = '';
  ['1','2','3','4','5','6','7','8','9'].forEach(k => kp.appendChild(keyBtn(k)));
  if (B.problem.decimal) kp.appendChild(keyBtn('.'));
  else { const s = keyBtn('.'); s.classList.add('hidden'); kp.appendChild(s); }
  kp.appendChild(keyBtn('0'));
  const d = keyBtn('←'); d.classList.add('del');
  d.addEventListener('click', onDel); kp.appendChild(d);
}

function keyBtn(l) {
  const b = document.createElement('button');
  b.className = 'key'; b.textContent = l;
  if (l !== '←') b.addEventListener('click', () => { Audio.play('tap'); onKey(l); });
  return b;
}

function onKey(ch) {
  if (B.locked) return;
  const f = B.fields[B.active];
  if (ch === '.') { if (f.value === '' || f.value.includes('.')) return; }
  if (f.value.replace('.', '').length >= 6) return;
  f.value += ch;
  refreshBoxes();
}

function onDel() {
  if (B.locked) return;
  const f = B.fields[B.active];
  f.value = f.value.slice(0, -1);
  refreshBoxes();
  Audio.play('tap');
}

// ===== モード切替 =====
function setMode(m) {
  $('inputCluster').style.display = m === 'input' ? 'block' : 'none';
  $('continueBtn').style.display = m === 'input' ? 'none' : 'block';
  if (m === 'message') {
    // 攻撃後・メッセージ表示時：敵が見えるようトップにスクロール
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 60);
  } else {
    // 入力モード時：問題欄が見えるようスクロール
    setTimeout(() => {
      const sw = document.querySelector('.spell-win');
      if (sw) sw.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 80);
  }
}

function setMessage(lines) {
  $('msgWin').innerHTML = lines.join('');
}

// ===== ヒントボタン =====
$('hintBtn').addEventListener('click', () => {
  if (!B.problem || B.hintShown) return;
  B.hintShown = true;
  $('hintBtn').classList.add('used');
  Audio.play('hint');
  const hint = B.problem.hint || 'ゆっくり 考えてみよう！ 問題を もう一度 読み直してみて';
  setMessage([`<p class="hint-msg">💡 ヒント：${hint}</p>`]);
  setMode('message');
  $('continueBtn').textContent = 'もどる';
  B.pending = '__hint_return';
});

// ===== こうげき =====
$('attackBtn').addEventListener('click', () => {
  if (B.churchMode) { handleChurchAnswer(); return; }
  if (B.locked) return;
  B.locked = true; refreshBoxes();
  const vals = B.fields.map(f => f.value);
  const ok = B.problem.check(vals);
  const e = B.enemies[B.idx];
  const lines = [];

  // 習熟度記録
  recordMasteryResult(B.currentGenName, ok);
  B.recentAnswers.push(ok);
  if (B.recentAnswers.length > 10) B.recentAnswers.shift();

  if (ok) {
    B.totalCorrect++;
    B.streak++;
    Audio.play('correct');
    Particles.spawn('correct', getParticleCenter('x'), getParticleCenter('y'));

    if (B.practiceMode) {
      lines.push('<p class="good">⭕ せいかい！ すごい！</p>');
      if (B.streak >= 3) lines.push(`<p class="lvup">🔥 ${B.streak}もん れんぞく せいかい！</p>`);
      advanceActiveSlot();
      renderParty('battleParty');
      B.pending = 'fight';
    } else {
      // ===== キャラ固有の攻撃 =====
      const slot = B.activeSlot;
      const baseEff = atkBase(hero.level) + equippedWeapon().atk;
      let eff = baseEff;
      let attackLabel = HEROES[slot].name + 'の こうげき！';
      let specialMsg = '';

      if (slot === 0) { // ゆうしゃ：敵瀕死でとどめの一撃
        if (e.hp / e.maxHp < 0.3) { eff = Math.floor(eff * 1.5); specialMsg = '⚔️ とどめの いちげき！'; }
      } else if (slot === 1) { // まほうつかい：高火力、連続正解でさらに強化
        eff = Math.floor(eff * 1.3);
        attackLabel = 'まほうつかいの じゅもん！';
        if (B.streak >= 2) { eff = Math.floor(eff * 1.5); specialMsg = `✨ ${B.streak}もん れんぞく！ まほうが さえわたる！`; }
      } else { // そうりょ：低火力、正解時に仲間を回復
        eff = Math.floor(eff * 0.7);
        attackLabel = 'そうりょの こうげき！';
      }

      const crit = slot !== 1 && Math.random() < 0.12; // まほうつかいは独自強化あるのでクリットなし
      let dmg = ri(Math.max(1, eff - 2), eff + 2);
      if (crit) { dmg *= 2; Audio.play('crit'); lines.push('<p class="lvup">💥 かいしんの いちげき！</p>'); }
      if (specialMsg) lines.push(`<p class="lvup">${specialMsg}</p>`);
      lines.push(`<p class="good">${attackLabel}</p>`);
      lines.push(`<p>${e.name}に ${dmg}の ダメージ！</p>`);

      e.hp -= dmg; if (e.hp < 0) e.hp = 0;
      setTimeout(() => animEnemyHit(dmg, crit, slot), 360);

      // そうりょの回復（生きている仲間のみ対象）
      if (slot === 2) {
        const living = B.partyHP.map((hp, i) => ({ hp, i })).filter(({ hp }) => hp > 0);
        if (living.length > 0) {
          const { i: healIdx } = living.reduce((best, cur) =>
            cur.hp / B.partyMaxHP[cur.i] < best.hp / B.partyMaxHP[best.i] ? cur : best
          );
          const healAmt = Math.min(3, B.partyMaxHP[healIdx] - B.partyHP[healIdx]);
          if (healAmt > 0) {
            B.partyHP[healIdx] += healAmt;
            syncPartyHP();
            lines.push(`<p class="good">🙏 ${HEROES[healIdx].name}を ${healAmt}かいふく！</p>`);
          }
        }
      }

      advanceActiveSlot();
      renderParty('battleParty');
      updateBars();

      if (e.hp <= 0) {
        lines.push(`<p class="good">${e.name}を たおした！</p>`);
        lines.push(`<p class="lvup">けいけんち ${e.exp} かくとく！</p>`);
        B.runExp += e.exp;
        grantExp(e.exp, lines);
        animEnemyDefeat();
        B.pending = (B.idx + 1 < B.enemies.length) ? 'spawn' : 'clear';
      } else {
        B.pending = 'fight';
      }
    }

    // 連続正解アチーブメント
    if (B.streak >= 3) {
      if (grantAchievement('streak3')) showAchievementPopup('streak3');
    }
    if (B.streak >= 5) tryCollect('streak5_gem');

  } else {
    B.totalWrong++;
    B.streak = 0;
    Audio.play('wrong');
    Particles.spawn('wrong', getParticleCenter('x'), getParticleCenter('y'));
    recordMistake(vals);

    lines.push(`<p class="bad">ざんねん… こたえは <b>${B.problem.ansHTML}</b></p>`);

    if (B.practiceMode) {
      lines.push('<p class="hint">もう一度 かんがえてみよう！</p>');
      if (B.problem.explain) lines.push(`<p class="mn-exp">💡 ${B.problem.explain}</p>`);
      advanceActiveSlot();
      renderParty('battleParty');
      B.pending = 'fight';
    } else {
      const slot = B.activeSlot;
      const edmg = ri(Math.max(1, e.atk - 1), e.atk + 1);
      B.partyHP[slot] -= edmg;
      if (B.partyHP[slot] < 0) B.partyHP[slot] = 0;
      syncPartyHP();

      lines.push(`<p>${e.name}の こうげき！</p>`);
      lines.push(`<p class="bad">${HEROES[slot].name}は ${edmg}の ダメージを うけた！</p>`);
      if (B.problem.explain) lines.push(`<p class="mn-exp">💡 ${B.problem.explain}</p>`);

      if (B.partyHP[slot] <= 0) {
        lines.push(`<p class="bad">😵 ${HEROES[slot].name}が たおれた…！</p>`);
      }

      setTimeout(() => animHeroHit(slot), 360);
      advanceActiveSlot();
      renderParty('battleParty');
      updateBars();

      B.pending = isAllFainted() ? 'gameover' : 'fight';
    }
  }

  updateStreakDisplay();
  setMessage(lines);
  $('continueBtn').textContent = B.pending === 'clear' ? 'けっかを みる'
    : B.pending === 'gameover' ? 'ぼうけんの きろく' : 'つづける';
  setMode('message');
});

$('continueBtn').addEventListener('click', () => {
  switch (B.pending) {
    case '__hint_return':
      setMode('input'); break;
    case 'fight':
      setMode('input'); loadBattleProblem(); break;
    case 'spawn':
      B.idx++;
      renderEnemy();
      { const spawnE = B.enemies[B.idx];
        if (spawnE.boss) {
          Transitions.flash('#880022', 220);
          setMessage([
            `<p class="bad">⚠️ ボスが あらわれた！</p>`,
            `<p class="lvup">★ ${spawnE.name}！</p>`,
            `<span class="hint">こうげきに そなえろ！</span>`,
          ]);
          const ebar = $('enemyHpBar');
          if (ebar) ebar.classList.add('boss-hp');
        } else {
          const ebar = $('enemyHpBar');
          if (ebar) ebar.classList.remove('boss-hp');
          setMessage([`<span class="hint">${spawnE.name}が あらわれた！</span>`]);
        }
      }
      B.pending = 'fight'; setMode('message');
      $('continueBtn').textContent = 'つづける';
      break;
    case 'clear':
      showClear(); break;
    case 'gameover':
      showChurch(); break;
    case 'church_start':
    case 'church_next':
    case 'church_retry_q':
      churchLoadProblem(); setMode('input'); break;
  }
});

// ===== 経験値・レベルアップ =====
function grantExp(amount, lines) {
  hero.exp += amount;
  while (hero.exp >= needExp(hero.level)) {
    hero.exp -= needExp(hero.level);
    hero.level++;
    B.leveled = true;
    B.partyMaxHP = HEROES.map((_, i) => charMaxHP(i, hero.level));
    B.partyHP    = [...B.partyMaxHP]; // レベルアップで全員全回復
    syncPartyHP();
    lines.push(`<p class="lvup">🌟 レベルアップ！ Lv ${hero.level}！</p>`);
    lines.push(`<p class="lvup">なかま全員 たいりょく かいふく！</p>`);
    Audio.play('levelup');
    Transitions.flash('#ffcf3f', 280);
    Particles.spawn('levelup', getParticleCenter('x'), getParticleCenter('y'));

    // レベルアチーブメント
    if (hero.level >= 10 && grantAchievement('lv10')) showAchievementPopup('lv10');
    if (hero.level >= 20 && grantAchievement('lv20')) showAchievementPopup('lv20');
    if (hero.level >= 10) tryCollect('lv10_gem');
    if (hero.level >= 20) tryCollect('lv20_gem');
  }
  saveHero(hero);
  updateBars();
}

// ===== アニメーション =====
function animEnemyHit(dmg, crit, slot = 0) {
  const s = $('enemySprite');
  if (s) { s.classList.remove('hit'); void s.offsetWidth; s.classList.add('hit'); }
  Audio.play('attack');
  Transitions.flash(crit ? '#ffcf3f' : slot === 1 ? '#aa44ff' : '#ffffff', crit ? 160 : 100);

  const stage = $('enemyStage');
  const f = document.createElement('div');
  f.className = `float-dmg slot-${slot}${crit ? ' crit' : ''}`;
  f.textContent = dmg;
  stage.appendChild(f);
  setTimeout(() => { if (f.parentNode) f.parentNode.removeChild(f); }, 1300);
}

function animEnemyDefeat() {
  const s = $('enemySprite');
  if (s) s.classList.add('defeated');
}

function updateStreakDisplay() {
  const bar = $('streakBar');
  if (!bar) return;
  if (B.streak >= 2) {
    bar.style.display = 'flex';
    bar.className = `streak-bar${B.streak >= 5 ? ' hot' : ''}`;
    const fire = B.streak >= 5 ? '🔥🔥' : '🔥';
    bar.textContent = `${fire} ${B.streak}もん れんぞく！`;
  } else {
    bar.style.display = 'none';
  }
}

function animHeroHit(slot) {
  const w = $('heroWinBattle');
  if (w) { w.classList.remove('flash-red'); void w.offsetWidth; w.classList.add('flash-red'); }
  Transitions.shake($('app'), 6, 280);
  // アクティブキャラだけ揺らす
  const slots = document.querySelectorAll('#battleParty .hero-slot');
  if (slots[slot]) {
    const s = slots[slot].querySelector('.hero-sprite');
    if (s) { s.classList.remove('hurt'); void s.offsetWidth; s.classList.add('hurt'); }
  }
}

function getParticleCenter(axis) {
  const battle = $('screen-battle');
  if (!battle) return axis === 'x' ? window.innerWidth / 2 : window.innerHeight / 3;
  const rect = battle.getBoundingClientRect();
  return axis === 'x' ? rect.left + rect.width / 2 : rect.top + rect.height * 0.35;
}

// ===== まちがいノート =====
function fmtYour(p, vals) {
  if (p.layout === 'fraction') return fracHTML(vals[0] || '?', vals[1] || '?');
  if (p.layout === 'divrem') return `${vals[0] || '?'} あまり ${vals[1] || '?'}`;
  return vals[0] !== undefined && vals[0] !== '' ? vals[0] : '?';
}

function recordMistake(vals) {
  if (!B.mistakes) B.mistakes = [];
  B.mistakes.push({
    qHTML: B.problem.qText,
    yourHTML: fmtYour(B.problem, vals),
    ansHTML: B.problem.ansHTML,
    expHTML: B.problem.explain || '',
  });
}

function renderMistakes(containerId) {
  const box = $(containerId);
  if (!box) return;
  const ms = B.mistakes || [];
  if (ms.length === 0) { box.style.display = 'none'; return; }
  box.style.display = 'block';
  const shown = ms.slice(-6);
  const skipped = ms.length - shown.length;
  let html = `<h3>📓 まちがいノート（${ms.length}もん）</h3><div class="mn-list">`;
  shown.forEach((m, i) => {
    html += `<div class="mn-item">
      <div class="mn-q">${skipped + i + 1}. ${m.qHTML}</div>
      <div class="mn-row mn-your">きみの こたえ：${m.yourHTML}</div>
      <div class="mn-row mn-ans">正しい こたえ：${m.ansHTML}</div>
      ${m.expHTML ? `<div class="mn-exp"><b>かいせつ</b><br>${m.expHTML}</div>` : ''}
    </div>`;
  });
  html += '</div>';
  box.innerHTML = html;
}

// ===== 報酬表示 =====
function renderReward(stage) {
  const box = $('rewardBox');
  if (!box) return;
  const w = stage.weapon;
  let html = `<div class="reward-chest">`;
  if (WIMG['__chestClosed'] && WIMG['__chestOpen']) {
    html += `<img class="chest-img" id="chestImg" src="${WIMG['__chestClosed']}" alt="たからばこ">`;
  } else {
    html += `<span style="font-size:40px">📦</span>`;
  }
  html += `<span class="reward-pop" id="rewardPop" style="display:none">${wIco(w)}</span></div>`;
  html += `<div class="reward-line">⚔️ <b>${w.name}</b> を てにいれた！ <span class="reward-atk">こうげき＋${w.atk}</span></div>`;
  if (stage.last) {
    html += '<div class="reward-line big">👑 ぜんステージ クリア！ でんせつの ゆうしゃだ！</div>';
  } else {
    const idx = STAGES.indexOf(stage), next = STAGES[idx + 1];
    html += `<div class="reward-line">${keyIco(stage)} <b>${stage.keyName}</b> で「${next ? next.name : 'つぎ'}」が ひらいた！</div>`;
  }
  box.innerHTML = html;
  box.style.display = 'block';

  // 宝箱アニメーション
  setTimeout(() => {
    const chestImg = $('chestImg');
    if (chestImg && WIMG['__chestOpen']) {
      Audio.play('chest');
      Particles.spawn('chest',
        chestImg.getBoundingClientRect().left + chestImg.clientWidth / 2,
        chestImg.getBoundingClientRect().top + chestImg.clientHeight / 2
      );
      chestImg.src = WIMG['__chestOpen'];
    }
    const pop = $('rewardPop');
    if (pop) pop.style.display = 'inline';
  }, 600);
}

// ===== クリア =====
function showClear() {
  markCleared(B.unit.id);
  Audio.stopBGM();
  BattleBG.stop();
  clearBattleBG();
  Audio.play('victory');

  $('crownEmblem').innerHTML = `<svg viewBox="0 0 120 120" class="big-emblem"><g transform="translate(10,10)">${crownSVG()}</g></svg>`;
  $('clearStats').innerHTML = `
    <div class="row"><span>たおした てき</span><span class="v">${B.enemies.length}たい</span></div>
    <div class="row"><span>かくとく けいけんち</span><span class="v">${B.runExp}</span></div>
    <div class="row"><span>せいかい / もんだい</span><span class="v">${B.totalCorrect} / ${B.totalCorrect + B.totalWrong}</span></div>
    <div class="row"><span>いまの レベル</span><span class="v">Lv ${hero.level}${B.leveled ? ' ↑' : ''}</span></div>`;

  renderReward(B.unit);
  renderMistakes('clearNote');

  // アチーブメントチェック
  const cleared = loadCleared();
  checkProgressTitles(cleared).forEach(id => {
    if (grantAchievement(id)) showAchievementPopup(id);
  });
  // ノーミスアチーブメント
  if (B.totalWrong === 0 && grantAchievement('no_miss')) {
    showAchievementPopup('no_miss');
  }

  // かがやきストーン付与
  tryCollect(B.unit.id);                               // ステージ石
  if (B.totalWrong === 0)   tryCollect('no_miss_gem');
  if (cleared.length >= 12) tryCollect('all_clear_gem');

  show('screen-clear');
  Particles.spawn('levelup', window.innerWidth / 2, window.innerHeight * 0.25);
}

// ===== ゲームオーバー =====
function showOver() {
  Audio.stopBGM();
  BattleBG.stop();
  clearBattleBG();
  Audio.play('defeat');
  $('skullEmblem').innerHTML = `<svg viewBox="0 0 120 120" class="big-emblem"><g transform="translate(10,10)">${skullSVG()}</g></svg>`;
  $('overStats').innerHTML = `
    <div class="row"><span>このぼうけんの けいけんち</span><span class="v">${B.runExp}</span></div>
    <div class="row"><span>いまの レベル</span><span class="v">Lv ${hero.level}</span></div>`;
  renderMistakes('overNote');
  show('screen-over');
}

// ===== 教会（復活）システム =====
function showChurch() {
  B.churchMode = true;
  B.revivedCount = 0;
  BattleBG.stop(); clearBattleBG();
  $('heroWinBattle').style.display = 'none';
  $('enemyHpRow').style.display = 'none';
  $('enemyName').textContent = '⛪ 教会';
  $('enemyDots').innerHTML = '';
  const sprite = document.querySelector('#enemyStage #enemySprite');
  if (sprite) sprite.style.display = 'none';
  const area = document.querySelector('.enemy-area');
  if (area) {
    area.style.backgroundImage = `url(${BG_CHURCH})`;
    area.style.backgroundSize = 'cover';
    area.style.backgroundPosition = 'center top';
  }
  setMessage([`<span class="hint">まちがえた もんだいを といて なかまを ふっかつさせよう！</span>`]);
  $('continueBtn').textContent = 'もんだいをとく';
  B.pending = 'church_start';
  $('churchEscapeBtn').style.display = 'block';
  setMode('message');
  Audio.stopBGM();
}

function churchLoadProblem() {
  B.locked = false; B.hintShown = false;
  const pool = (B.unit && B.unit.pool) ? B.unit.pool : ['tasi'];
  const genName = pool[ri(0, pool.length - 1)];
  B.currentGenName = genName;
  B.problem = GEN[genName]();
  B.fields = []; B.active = 0;
  $('qText').innerHTML = B.problem.qText;
  $('qInstr').style.display = 'none';
  buildAnswerArea();
  buildKeypad();
  $('attackBtn').disabled = true;
  $('hintBtn').style.display = 'none';
  $('attackBtn').textContent = '✨ ふっかつ！';
}

function handleChurchAnswer() {
  if (B.locked) return;
  B.locked = true; refreshBoxes();
  const vals = B.fields.map(f => f.value);
  const ok = B.problem.check(vals);
  if (ok) {
    Audio.play('correct');
    B.partyHP[B.revivedCount] = B.partyMaxHP[B.revivedCount];
    const revivedName = HEROES[B.revivedCount].name;
    B.revivedCount++;
    renderParty('battleParty');
    updateBars();
    if (B.revivedCount >= 3) {
      B.needsRevival = false;
      setMessage([`<p class="lvup">🌟 なかまたちが みんな ふっかつした！</p>`]);
      $('inputCluster').style.display = 'none';
      $('continueBtn').style.display = 'none';
      $('churchEscapeBtn').style.display = 'none';
      $('churchCompleteBtns').style.display = 'flex';
    } else {
      const remaining = 3 - B.revivedCount;
      setMessage([`<p class="lvup">✨ ${revivedName}が ふっかつ！</p><p>あと${remaining}人！</p>`]);
      $('continueBtn').textContent = 'つぎへ';
      B.pending = 'church_next';
      setMode('message');
    }
  } else {
    Audio.play('wrong');
    setMessage([`<p class="bad">まちがい！ もう いちど！</p><p class="hint">こたえは <b>${B.problem.ansHTML}</b></p>`]);
    $('continueBtn').textContent = 'もう いちど';
    B.pending = 'church_retry_q';
    setMode('message');
  }
}

// ===== アチーブメント ポップアップ =====
function showAchievementPopup(id) {
  const title = TITLES.find(t => t.id === id);
  if (!title) return;
  const pop = document.createElement('div');
  pop.className = 'achievement-popup';
  pop.innerHTML = `<span class="ach-icon">${title.icon}</span><div class="ach-info"><b>称号かくとく！</b><br>${title.name}</div>`;
  document.body.appendChild(pop);
  setTimeout(() => pop.classList.add('show'), 10);
  setTimeout(() => { pop.classList.remove('show'); setTimeout(() => pop.remove(), 400); }, 3000);
}

// ===== かがやきストーン =====
function tryCollect(id) {
  if (!addToCollection(id)) return;
  const s = STONE_MAP[id];
  if (!s) return;
  const pop = document.createElement('div');
  pop.className = 'stone-popup';
  const gemSrc = GEM_IMGS[id];
  const gemEl = gemSrc
    ? `<img class="stone-popup-gem-img" src="${gemSrc}" alt="${s.name}">`
    : `<div class="stone-gem-sm" style="--c1:${s.c1};--c2:${s.c2};--bd:${s.bd};--glow:${s.glow}"></div>`;
  pop.innerHTML = `${gemEl}
    <div class="stone-popup-info"><b>✨ あたらしい石を てにいれた！</b><br>${s.name}</div>`;
  document.body.appendChild(pop);
  setTimeout(() => pop.classList.add('show'), 10);
  setTimeout(() => { pop.classList.remove('show'); setTimeout(() => pop.remove(), 400); }, 3200);
}

function stoneGemHTML(s, collected) {
  if (!collected) {
    return `<div class="stone-gem locked"><span class="stone-qm">?</span></div>`;
  }
  const src = GEM_IMGS[s.id];
  if (src) {
    return `<div class="stone-gem-wrap" style="--glow:${s.glow}">
      <img class="stone-gem-img" src="${src}" alt="${s.name}">
    </div>`;
  }
  return `<div class="stone-gem" style="--c1:${s.c1};--c2:${s.c2};--bd:${s.bd};--glow:${s.glow}">
    <div class="stone-shine"></div>
  </div>`;
}

function renderCollection() {
  const el = $('collectionGrid');
  if (!el) return;
  const owned = loadCollection();
  const stageSec = STONES.filter(s => !s.special);
  const specSec  = STONES.filter(s =>  s.special);
  let html = '<div class="coll-section-title">🗺️ ステージストーン</div><div class="stone-grid">';
  stageSec.forEach(s => {
    const got = owned.has(s.id);
    html += `<div class="stone-card${got ? ' got' : ''}">
      ${stoneGemHTML(s, got)}
      <div class="stone-name">${got ? s.name : '???'}</div>
      <div class="stone-desc">${got ? s.desc : '---'}</div>
    </div>`;
  });
  html += '</div><div class="coll-section-title" style="margin-top:16px">⭐ とくべつ輝石</div><div class="stone-grid stone-grid-5">';
  specSec.forEach(s => {
    const got = owned.has(s.id);
    html += `<div class="stone-card${got ? ' got' : ''}">
      ${stoneGemHTML(s, got)}
      <div class="stone-name">${got ? s.name : '???'}</div>
      <div class="stone-desc">${got ? s.desc : '---'}</div>
    </div>`;
  });
  const total = STONES.length, cnt = owned.size;
  html += `</div><div class="coll-total">${cnt} / ${total} コレクト</div>`;
  el.innerHTML = html;
}

// ===== アチーブメント画面 =====
function renderAchievements() {
  const earned = loadAchievements();
  const el = $('achievementsList');
  if (!el) return;
  el.innerHTML = TITLES.map(t => `
    <div class="ach-item${earned.has(t.id) ? ' earned' : ''}">
      <span class="ach-ico">${earned.has(t.id) ? t.icon : '🔒'}</span>
      <div class="ach-info">
        <b>${earned.has(t.id) ? t.name : '???'}</b>
        <small>${earned.has(t.id) ? t.desc : '---'}</small>
      </div>
    </div>
  `).join('');
}

// ===== 習熟度画面 =====
function renderMasteryScreen() {
  const el = $('masteryList');
  if (!el) return;
  const genLabels = {
    tasi: 'たし算', hiki: 'ひき算', kake: 'かけ算', wari: 'わり算',
    gaisu: 'がいすう', junjo: 'じゅんじょ', decas: '小数たし引き', decmul: '小数×整数',
    decdiv: '小数÷整数', frac: '分数たし引き', koubai: '最小公倍数', kouyaku: '最大公約数',
    idenbun: '異分母分数', decmul2: '小数×小数', decdiv2: '小数÷小数',
    heikin: '平均', wariai: '割合', fracmul: '分数×分数', fracdiv: '分数÷分数',
  };
  const mastery = loadMastery();
  const items = Object.entries(genLabels).map(([key, label]) => {
    const m = mastery[key];
    if (!m || m.total < 3) return `<div class="mastery-item"><span>${label}</span><span class="mastery-bar-wrap"><span class="mastery-pct gray">データなし</span></span></div>`;
    const pct = Math.round(m.correct / m.total * 100);
    const color = pct >= 80 ? '#46d36a' : pct >= 50 ? '#ffcf3f' : '#ff5a55';
    return `<div class="mastery-item">
      <span>${label}</span>
      <span class="mastery-bar-wrap">
        <span class="mastery-bar" style="width:${pct}%;background:${color}"></span>
        <span class="mastery-pct">${pct}%</span>
      </span>
    </div>`;
  }).join('');
  el.innerHTML = items;
}

// ===== ナビゲーション =====
document.querySelectorAll('[data-screen]').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.screen;
    Audio.play('tap');
    if (target === 'screen-map') {
      openMap();
    } else if (target === 'screen-achievements') {
      renderAchievements();
      show('screen-achievements');
    } else if (target === 'screen-collection') {
      renderCollection();
      show('screen-collection');
    } else if (target === 'screen-mastery') {
      renderMasteryScreen();
      show('screen-mastery');
    } else if (target === 'screen-title') {
      Audio.stopBGM();
      initTitle();
      show('screen-title', 'back');
    } else {
      show(target);
    }
  });
});

document.querySelectorAll('[data-back]').forEach(btn => {
  btn.addEventListener('click', () => {
    Audio.play('tap');
    const target = btn.dataset.back;
    if (target === 'screen-map') {
      if (B.churchMode && B.revivedCount < 3) B.needsRevival = true;
      exitChurch();
      Audio.stopBGM(); BattleBG.stop(); clearBattleBG(); openMap();
    }
    else if (target === 'screen-title') { Audio.stopBGM(); initTitle(); show('screen-title', 'back'); }
    else show(target, 'back');
  });
});

// バトル内ボタン
$('clearRetry').addEventListener('click', () => { Audio.play('tap'); startBattle(B.unit); });
$('clearOther').addEventListener('click', () => { Audio.play('tap'); openMap(); });
$('overRetry').addEventListener('click', () => { Audio.play('tap'); startBattle(B.unit); });
$('overFlee').addEventListener('click', () => { Audio.play('tap'); openMap(); });

// 教会ボタン
function exitChurch() {
  B.churchMode = false;
  $('heroWinBattle').style.display = '';
  $('enemyHpRow').style.display = '';
  $('attackBtn').textContent = '⚔️ こうげき！';
  $('hintBtn').style.display = 'inline-flex';
  $('inputCluster').style.display = '';
  $('continueBtn').style.display = '';
  $('churchCompleteBtns').style.display = 'none';
  $('churchEscapeBtn').style.display = 'none';
  const sprite = document.querySelector('#enemyStage #enemySprite');
  if (sprite) sprite.style.display = '';
}
$('churchRetryBtn').addEventListener('click', () => {
  Audio.play('tap');
  B.needsRevival = false;
  exitChurch();
  startBattle(B.unit);
});
$('churchFleeBtn').addEventListener('click', () => {
  Audio.play('tap');
  B.needsRevival = (B.revivedCount < 3);
  exitChurch();
  openMap();
});
$('churchMapBtn').addEventListener('click', () => {
  Audio.play('tap');
  resumeChurch();
});
$('churchEscapeBtn').addEventListener('click', () => {
  Audio.play('tap');
  B.needsRevival = true;
  exitChurch();
  Audio.stopBGM(); BattleBG.stop(); clearBattleBG(); openMap();
});

function resumeChurch() {
  show('screen-battle');
  $('battleTitle').textContent = B.unit ? B.unit.name : '';
  BattleBG.stop(); clearBattleBG();
  $('heroWinBattle').style.display = 'none';
  $('enemyHpRow').style.display = 'none';
  renderParty('battleParty');
  B.churchMode = true;
  $('enemyName').textContent = '⛪ 教会';
  $('enemyDots').innerHTML = '';
  const sprite = document.querySelector('#enemyStage #enemySprite');
  if (sprite) sprite.style.display = 'none';
  const area = document.querySelector('.enemy-area');
  if (area) {
    area.style.backgroundImage = `url(${BG_CHURCH})`;
    area.style.backgroundSize = 'cover';
    area.style.backgroundPosition = 'center top';
  }
  const remaining = 3 - B.revivedCount;
  setMessage([`<span class="hint">あと${remaining}人 ふっかつさせよう！</span>`]);
  $('continueBtn').textContent = 'もんだいをとく';
  B.pending = 'church_start';
  $('attackBtn').textContent = '✨ ふっかつ！';
  $('hintBtn').style.display = 'none';
  $('inputCluster').style.display = '';
  $('continueBtn').style.display = '';
  $('churchCompleteBtns').style.display = 'none';
  $('churchEscapeBtn').style.display = 'block';
  setMode('message');
  Audio.stopBGM();
}

// ふくしゅうモードボタン
$('practiceBtn')?.addEventListener('click', () => { Audio.play('tap'); startPractice(); });

// ミュートトグル
$('muteBtn').addEventListener('click', () => {
  Audio.toggle();
  $('muteBtn').textContent = Audio.muted ? '🔇' : '🔊';
  $('muteBtn').setAttribute('aria-label', Audio.muted ? '音をオンにする' : 'ミュートにする');
});

// ===== 初期化 =====
(async () => {
  // Vite 環境: 遷移システム初期化
  Transitions.init();
  BattleBG.init($('enemyStage'));

  // パーティクルキャンバス
  const canvas = document.createElement('canvas');
  canvas.id = 'particleCanvas';
  Object.assign(canvas.style, {
    position: 'fixed', inset: '0', pointerEvents: 'none', zIndex: '9997',
  });
  document.body.appendChild(canvas);
  Particles.init(canvas);

  // データロード
  hero = loadHero();
  initTitle();
})();
