/**
 * けいさんクエスト 2.0 - メインゲームロジック
 */
import { GEN, ri, fracHTML } from './data/generators.js';
import { STAGES, STARTWEAPON } from './data/stages.js';
import { ZAKO, BOSS, HEROES, buildDungeon, finalBossSVG, crownSVG, skullSVG } from './data/enemies.js';
import { maxHP, atkBase, needExp, equippedWeapon, ownedWeapons, stageUnlocked, clearPct, TITLES, checkProgressTitles } from './engine/progression.js';
import { loadHero, saveHero, loadCleared, markCleared, recordMasteryResult, loadMastery, masteryPct, grantAchievement, loadAchievements } from './engine/save.js';
import { Audio } from './fx/audio.js';
import { Particles } from './fx/particles.js';
import { Transitions } from './fx/transitions.js';
import { renderWorldMap } from './ui/worldmap.js';
import { IMG, WIMG, TITLE_BG } from './assets-generated.js';
import { BG_GRASSLAND, BG_FOREST, BG_SNOW, BG_VOLCANO, BG_TEMPLE } from './assets-battle-bg.js';
import { BattleBG } from './fx/battle-bg.js';

// tier → バトル背景画像
const BATTLE_BG_MAP = {
  1: BG_GRASSLAND, 2: BG_FOREST,   3: BG_FOREST,
  4: BG_GRASSLAND, 5: BG_GRASSLAND,
  6: BG_SNOW,      7: BG_SNOW,
  8: BG_VOLCANO,   9: BG_VOLCANO,
  10: BG_TEMPLE,  11: BG_TEMPLE,  12: BG_TEMPLE,
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

// ===== ユーティリティ =====
const $ = id => document.getElementById(id);
const q = sel => document.querySelector(sel);

// ===== 状態 =====
let hero = { level: 1, exp: 0 };

/** バトル状態 */
const B = {
  unit: null, enemies: [], idx: 0, heroHP: 0,
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
  if (e.sprite === '__final') return finalBossSVG(150);
  return IMG[e.sprite] || finalBossSVG(100);
}

function renderParty(elId) {
  const el = $(elId);
  if (!el) return;
  el.innerHTML = HEROES.map(h => heroSpriteHTML(h)).join('');
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
  const mh = maxHP(hero.level), nd = needExp(hero.level);
  const eq = equippedWeapon();
  el.innerHTML = `
    <div class="hero-line">
      <span class="hero-name">ゆうしゃ</span>
      <span class="hero-lv">Lv ${hero.level}</span>
    </div>
    <div class="bar-row">
      <span class="bar-tag">HP</span>
      <div class="bar hp"><i id="${winId}_hp" style="width:${winId === 'heroWinBattle' ? Math.max(0, B.heroHP / mh * 100) : 100}%"></i></div>
      <span class="bar-num" id="${winId}_hpn">${winId === 'heroWinBattle' ? B.heroHP : mh} / ${mh}</span>
    </div>
    <div class="bar-row">
      <span class="bar-tag">EXP</span>
      <div class="bar exp"><i id="${winId}_exp" style="width:${hero.exp / nd * 100}%"></i></div>
      <span class="bar-num">${hero.exp} / ${nd}</span>
    </div>
    <div class="equip-line">${wIco(eq)} <small>${eq.name}（＋${eq.atk}）</small></div>`;
}

function updateBars() {
  const mh = maxHP(hero.level);
  const hb = $('heroWinBattle_hp'), hn = $('heroWinBattle_hpn');
  if (hb) hb.style.width = Math.max(0, B.heroHP / mh * 100) + '%';
  if (hn) hn.textContent = `${B.heroHP} / ${mh}`;
  const nd = needExp(hero.level);
  const eb = $('heroWinBattle_exp');
  if (eb) eb.style.width = (hero.exp / nd * 100) + '%';
  const e = B.enemies[B.idx];
  const ehb = $('enemyHpBar');
  if (ehb && e) ehb.style.width = Math.max(0, e.hp / e.maxHp * 100) + '%';
}

// ===== ワールドマップ =====
function openMap() {
  renderHeroWin('heroWinMap');
  renderBag();
  renderWorldMap($('mapContainer'), (stage) => {
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
  B.heroHP = maxHP(hero.level);
  B.runExp = 0; B.leveled = false; B.locked = false;
  B.mistakes = [];
  B.recentAnswers = []; B.streak = 0;
  B.totalCorrect = 0; B.totalWrong = 0;
  B.hintShown = false;
  B.practiceMode = false;

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
  B.heroHP = maxHP(hero.level);
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
  img.className = `enemy-sprite${e.boss ? ' boss' : ''}`;
  img.id = 'enemySprite';
  img.src = src;
  img.alt = e.name;
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
  const exp = B.problem.explain || 'ゆっくり 考えてみよう！';
  setMessage([`<p class="hint-msg">💡 ヒント：${exp}</p>`]);
  setMode('message');
  $('continueBtn').textContent = 'もどる';
  B.pending = '__hint_return';
});

// ===== こうげき =====
$('attackBtn').addEventListener('click', () => {
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

    const crit = Math.random() < 0.12;
    const eff = atkBase(hero.level) + equippedWeapon().atk;
    let dmg = ri(eff - 2, eff + 2); if (dmg < 1) dmg = 1;
    if (crit) { dmg *= 2; Audio.play('crit'); }

    if (B.practiceMode) {
      lines.push('<p class="good">⭕ せいかい！ すごい！</p>');
      if (B.streak >= 3) lines.push(`<p class="lvup">🔥 ${B.streak}もん れんぞく せいかい！</p>`);
      B.pending = 'fight';
    } else {
      e.hp -= dmg; if (e.hp < 0) e.hp = 0;
      if (crit) lines.push('<p class="lvup">💥 かいしんの いちげき！</p>');
      lines.push('<p class="good">ゆうしゃの こうげき！</p>');
      lines.push(`<p>${e.name}に ${dmg}の ダメージ！</p>`);
      animEnemyHit(dmg, crit); updateBars();

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
      B.pending = 'fight';
    } else {
      const edmg = ri(Math.max(1, e.atk - 1), e.atk + 1);
      B.heroHP -= edmg; if (B.heroHP < 0) B.heroHP = 0;
      lines.push(`<p>${e.name}の こうげき！</p>`);
      lines.push(`<p class="bad">ゆうしゃは ${edmg}の ダメージ！</p>`);
      if (B.problem.explain) lines.push(`<p class="mn-exp">💡 ${B.problem.explain}</p>`);
      animHeroHit(); updateBars();
      B.pending = (B.heroHP <= 0) ? 'gameover' : 'fight';
    }
  }

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
      setMessage([`<span class="hint">${B.enemies[B.idx].name}が あらわれた！</span>`]);
      B.pending = 'fight'; setMode('message');
      $('continueBtn').textContent = 'つづける';
      break;
    case 'clear':
      showClear(); break;
    case 'gameover':
      showOver(); break;
  }
});

// ===== 経験値・レベルアップ =====
function grantExp(amount, lines) {
  hero.exp += amount;
  while (hero.exp >= needExp(hero.level)) {
    hero.exp -= needExp(hero.level);
    hero.level++;
    B.leveled = true;
    B.heroHP = maxHP(hero.level);
    lines.push('<p class="lvup">✨ レベルが あがった！</p>');
    lines.push(`<p class="lvup">ゆうしゃは Lv${hero.level}に なった！ HPかいふく！</p>`);
    Audio.play('levelup');
    Particles.spawn('levelup', getParticleCenter('x'), getParticleCenter('y'));

    // レベルアチーブメント
    if (hero.level >= 10 && grantAchievement('lv10')) showAchievementPopup('lv10');
    if (hero.level >= 20 && grantAchievement('lv20')) showAchievementPopup('lv20');
  }
  saveHero(hero);
  updateBars();
}

// ===== アニメーション =====
function animEnemyHit(dmg, crit) {
  const s = $('enemySprite');
  if (s) { s.classList.remove('hit'); void s.offsetWidth; s.classList.add('hit'); }
  Audio.play('attack');
  Transitions.flash(crit ? '#ffcf3f' : '#ffffff', 120);

  const stage = $('enemyStage');
  const f = document.createElement('div');
  f.className = 'float-dmg' + (crit ? ' crit' : '');
  f.textContent = dmg;
  stage.appendChild(f);
  setTimeout(() => { if (f.parentNode) f.parentNode.removeChild(f); }, 1000);
}

function animEnemyDefeat() {
  const s = $('enemySprite');
  if (s) s.classList.add('defeated');
}

function animHeroHit() {
  const w = $('heroWinBattle');
  if (w) { w.classList.remove('flash-red'); void w.offsetWidth; w.classList.add('flash-red'); }
  const app = $('app');
  Transitions.shake(app, 6, 280);
  document.querySelectorAll('#battleParty .hero-sprite').forEach(s => {
    s.classList.remove('hurt'); void s.offsetWidth; s.classList.add('hurt');
  });
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
    if (target === 'screen-map') { Audio.stopBGM(); BattleBG.stop(); clearBattleBG(); openMap(); }
    else if (target === 'screen-title') { Audio.stopBGM(); initTitle(); show('screen-title', 'back'); }
    else show(target, 'back');
  });
});

// バトル内ボタン
$('clearRetry').addEventListener('click', () => { Audio.play('tap'); startBattle(B.unit); });
$('clearOther').addEventListener('click', () => { Audio.play('tap'); openMap(); });
$('overRetry').addEventListener('click', () => { Audio.play('tap'); startBattle(B.unit); });
$('overFlee').addEventListener('click', () => { Audio.play('tap'); openMap(); });

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
