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

  // 背景グラデーション
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  defs.innerHTML = `
    <radialGradient id="mapbg" cx="50%" cy="60%" r="55%">
      <stop offset="0%" stop-color="#1a2c5a"/>
      <stop offset="100%" stop-color="#0b1020"/>
    </radialGradient>
    <filter id="glow"><feGaussianBlur stdDeviation="1.2" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  `;
  svg.appendChild(defs);

  // 背景
  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bg.setAttribute('width', W); bg.setAttribute('height', H);
  bg.setAttribute('fill', 'url(#mapbg)');
  svg.appendChild(bg);

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
