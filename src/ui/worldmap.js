/**
 * ワールドマップ型ステージ選択
 * SVG ベースの冒険マップを描画する
 */
import { STAGES, STAGE_MAP_POS } from '../data/stages.js';
import { stageUnlocked, equippedWeapon } from '../engine/progression.js';
import { loadCleared } from '../engine/save.js';
import { Audio } from '../fx/audio.js';

/** SVG パス文字列 */
function buildPath(positions) {
  return positions.map((p, i) =>
    (i === 0 ? `M${p.x} ${p.y}` : `L${p.x} ${p.y}`)
  ).join(' ');
}

export function renderWorldMap(container, onSelectStage) {
  const cleared = loadCleared();
  const W = 100, H = 100;

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('class', 'worldmap-svg');
  svg.setAttribute('aria-label', 'ワールドマップ');

  // 背景グラデーション・地形フィルター定義
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  defs.innerHTML = `
    <radialGradient id="mapbg" cx="50%" cy="60%" r="55%">
      <stop offset="0%" stop-color="#141e44"/>
      <stop offset="100%" stop-color="#060912"/>
    </radialGradient>
    <radialGradient id="tg0" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#0d2e06" stop-opacity=".85"/><stop offset="100%" stop-color="#0d2e06" stop-opacity="0"/></radialGradient>
    <radialGradient id="tg1" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#062008" stop-opacity=".85"/><stop offset="100%" stop-color="#062008" stop-opacity="0"/></radialGradient>
    <radialGradient id="tg2" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#0c1830" stop-opacity=".8"/><stop offset="100%" stop-color="#0c1830" stop-opacity="0"/></radialGradient>
    <radialGradient id="tg3" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#062248" stop-opacity=".85"/><stop offset="100%" stop-color="#062248" stop-opacity="0"/></radialGradient>
    <radialGradient id="tg4" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#102438" stop-opacity=".85"/><stop offset="100%" stop-color="#102438" stop-opacity="0"/></radialGradient>
    <radialGradient id="tg5" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#3a0e00" stop-opacity=".85"/><stop offset="100%" stop-color="#3a0e00" stop-opacity="0"/></radialGradient>
    <radialGradient id="tg6" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#220400" stop-opacity=".85"/><stop offset="100%" stop-color="#220400" stop-opacity="0"/></radialGradient>
    <radialGradient id="tg7" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#14003a" stop-opacity=".85"/><stop offset="100%" stop-color="#14003a" stop-opacity="0"/></radialGradient>
    <radialGradient id="tg8" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#200848" stop-opacity=".9"/><stop offset="100%" stop-color="#200848" stop-opacity="0"/></radialGradient>
    <radialGradient id="tg9" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#1a1400" stop-opacity=".9"/><stop offset="100%" stop-color="#1a1400" stop-opacity="0"/></radialGradient>
    <filter id="glow"><feGaussianBlur stdDeviation="1.2" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="tglow"><feGaussianBlur stdDeviation="2" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  `;
  svg.appendChild(defs);

  // 背景
  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bg.setAttribute('width', W); bg.setAttribute('height', H);
  bg.setAttribute('fill', 'url(#mapbg)');
  svg.appendChild(bg);

  // ===== 地形ゾーン（SFC風マップ） =====
  const TERRAIN = [
    { cx: 12, cy: 78, rx: 16, ry: 12, grad: 'tg0' },  // 草原
    { cx: 26, cy: 64, rx: 16, ry: 11, grad: 'tg1' },  // 森
    { cx: 40, cy: 52, rx: 14, ry: 11, grad: 'tg2' },  // 霧の谷
    { cx: 46, cy: 38, rx: 14, ry: 12, grad: 'tg3' },  // 水の泉・湖
    { cx: 33, cy: 17, rx: 16, ry: 10, grad: 'tg4' },  // 氷の洞窟
    { cx: 57, cy: 20, rx: 16, ry: 11, grad: 'tg5' },  // 火山
    { cx: 66, cy: 33, rx: 14, ry: 11, grad: 'tg6' },  // 溶岩の間
    { cx: 68, cy: 48, rx: 13, ry: 11, grad: 'tg7' },  // 暗黒神殿
    { cx: 60, cy: 57, rx: 12, ry: 10, grad: 'tg8' },  // 深淵の祭壇
    { cx: 50, cy: 67, rx: 11, ry: 9,  grad: 'tg9' },  // 玉座
  ];
  for (const z of TERRAIN) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
    el.setAttribute('cx', z.cx); el.setAttribute('cy', z.cy);
    el.setAttribute('rx', z.rx); el.setAttribute('ry', z.ry);
    el.setAttribute('fill', `url(#${z.grad})`);
    svg.appendChild(el);
  }

  // 地形アイコン（小さな装飾）
  const DECO = [
    // type, x, y, size, color
    ['▲', 8, 75, '3.5', '#1a5a10'],  ['▲', 16, 76, '3', '#1a5a10'],
    ['▲', 24, 61, '3.5', '#0e3808'],  ['▲', 30, 63, '3', '#0e3808'],
    ['❄', 27, 14, '3.5', '#7ad0ff'],  ['❄', 37, 11, '3', '#7ad0ff'],
    ['🌋', 55, 15, '4', '#ff6030'],
    ['★', 50, 63, '3.5', '#c8a000'],
  ];
  for (const [ch, x, y, sz, col] of DECO) {
    const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    t.setAttribute('x', x); t.setAttribute('y', y);
    t.setAttribute('font-size', sz);
    t.setAttribute('fill', col); t.setAttribute('opacity', '0.6');
    t.setAttribute('text-anchor', 'middle');
    t.textContent = ch;
    svg.appendChild(t);
  }

  // 道（破線）
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', buildPath(STAGE_MAP_POS));
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', '#39406a');
  path.setAttribute('stroke-width', '1.5');
  path.setAttribute('stroke-dasharray', '2 1.5');
  svg.appendChild(path);

  // クリア済み道（ゴールド）
  const clearedCount = cleared.length;
  if (clearedCount > 0) {
    const clearedPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const clearedPositions = STAGE_MAP_POS.slice(0, clearedCount + 1);
    clearedPath.setAttribute('d', buildPath(clearedPositions));
    clearedPath.setAttribute('fill', 'none');
    clearedPath.setAttribute('stroke', '#ffcf3f');
    clearedPath.setAttribute('stroke-width', '1.5');
    clearedPath.setAttribute('stroke-opacity', '0.5');
    svg.appendChild(clearedPath);
  }

  // ノード
  STAGES.forEach((stage, i) => {
    const pos = STAGE_MAP_POS[i];
    const done      = cleared.includes(stage.id);
    const unlocked  = stageUnlocked(i);
    const isCurrent = !done && unlocked;

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('transform', `translate(${pos.x} ${pos.y})`);
    if (unlocked) {
      g.style.cursor = 'pointer';
      g.setAttribute('role', 'button');
      g.setAttribute('aria-label', stage.name);
      g.setAttribute('tabindex', '0');
    }

    const r = stage.last ? 5 : (isCurrent ? 4.5 : 4);

    // 外枠
    const outer = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    outer.setAttribute('r', r + 1.5);
    outer.setAttribute('fill', done ? '#ffcf3f' : (unlocked ? stage.uc : '#39406a'));
    outer.setAttribute('opacity', unlocked ? '1' : '0.4');
    if (isCurrent) outer.setAttribute('filter', 'url(#glow)');
    g.appendChild(outer);

    // 内側
    const inner = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    inner.setAttribute('r', r);
    inner.setAttribute('fill', done ? '#c79a16' : (unlocked ? '#141b34' : '#1e2546'));
    g.appendChild(inner);

    // アイコン（テキスト）
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('dominant-baseline', 'central');
    label.setAttribute('font-size', stage.last ? '4.5' : '3.8');
    label.setAttribute('fill', done ? '#0a0e1c' : (unlocked ? '#f4f6ff' : '#5b6390'));
    label.textContent = done ? '⭐' : (unlocked ? stage.ico : '🔒');
    g.appendChild(label);

    // ステージ番号（小）
    const num = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    num.setAttribute('text-anchor', 'middle');
    num.setAttribute('y', r + 3.5);
    num.setAttribute('font-size', '2.2');
    num.setAttribute('fill', '#aeb8d8');
    num.textContent = i + 1;
    g.appendChild(num);

    // パルスアニメ（現在選択可能ノード）
    if (isCurrent) {
      const pulse = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      pulse.setAttribute('r', r + 1.5);
      pulse.setAttribute('fill', 'none');
      pulse.setAttribute('stroke', stage.uc);
      pulse.setAttribute('stroke-width', '1');
      pulse.setAttribute('opacity', '0');
      pulse.innerHTML = `<animate attributeName="r" from="${r + 1}" to="${r + 4}" dur="1.4s" repeatCount="indefinite"/>
        <animate attributeName="opacity" from="0.7" to="0" dur="1.4s" repeatCount="indefinite"/>`;
      g.insertBefore(pulse, outer);
    }

    if (unlocked) {
      const activate = () => {
        Audio.play('tap');
        onSelectStage(stage);
      };
      g.addEventListener('click', activate);
      g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') activate(); });
    }

    svg.appendChild(g);
  });

  container.innerHTML = '';
  container.appendChild(svg);
}
