/**
 * ワールドマップ型ステージ選択 - SFC高品質版
 */
import { STAGES, STAGE_MAP_POS } from '../data/stages.js';
import { stageUnlocked } from '../engine/progression.js';
import { loadCleared } from '../engine/save.js';
import { Audio } from '../fx/audio.js';

const NS = 'http://www.w3.org/2000/svg';

/** SVG要素作成ユーティリティ */
function E(tag, attrs = {}) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}
function anim(attrs) { return E('animate', attrs); }
function animT(attrs) { return E('animateTransform', { attributeName: 'transform', ...attrs }); }
function app(parent, ...children) { children.forEach(c => parent.appendChild(c)); return parent; }
function txt(parent, content, attrs = {}) {
  const t = E('text', attrs); t.textContent = content; parent.appendChild(t);
}

/** ステージ短縮ラベル */
const SHORT = ['草原', '森', '霧谷', '泉', '湖', '氷洞', '霜廊', '火山', '溶岩', '暗殿', '祭壇', '玉座'];

function pathD(positions) {
  return positions.map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`)).join(' ');
}

// ===== 地形装飾ヘルパー =====

function tree(svg, x, y, col, trunk = '#3a2008') {
  svg.appendChild(E('rect',   { x: x - .7, y: y - 3, width: 1.4, height: 3.5, fill: trunk, opacity: '.8' }));
  svg.appendChild(E('circle', { cx: x,     cy: y - 4.2, r: 2.2, fill: col, opacity: '.82' }));
  svg.appendChild(E('circle', { cx: x - 1.5, cy: y - 3,  r: 1.5, fill: col, opacity: '.7' }));
  svg.appendChild(E('circle', { cx: x + 1.5, cy: y - 3,  r: 1.5, fill: col, opacity: '.7' }));
}

function mountain(svg, x, y, col, h = 7) {
  svg.appendChild(E('path', { d: `M${x},${y - h} L${x - h * .65},${y} L${x + h * .65},${y} Z`, fill: col, opacity: '.82' }));
  svg.appendChild(E('path', { d: `M${x},${y - h} L${x - h * .22},${y - h * .65} L${x + h * .22},${y - h * .65} Z`, fill: '#ddeeff', opacity: '.88' }));
}

function crystal(svg, x, y) {
  svg.appendChild(E('path', {
    d: `M${x},${y - 2.5} L${x + 1.3},${y} L${x},${y + 2.5} L${x - 1.3},${y} Z`,
    fill: '#80d8ff', stroke: '#b0eeff', 'stroke-width': '.25', opacity: '.78',
  }));
}

function pillar(svg, x, y) {
  svg.appendChild(E('rect', { x: x - .9, y: y - 6.5, width: 1.8, height: 7,   fill: '#221038', opacity: '.85' }));
  svg.appendChild(E('rect', { x: x - 1.3, y: y - 7.6, width: 2.6, height: 1.2, fill: '#3a2060', opacity: '.85' }));
}

function volcano(svg, x, y) {
  svg.appendChild(E('path', { d: `M${x},${y - 7} L${x - 6},${y} L${x + 6},${y} Z`, fill: '#2a0a00', opacity: '.85' }));
  const glow = E('ellipse', { cx: x, cy: y - 7, rx: 1.5, ry: 1, fill: '#ff4000', opacity: '.9' });
  app(glow, anim({ attributeName: 'opacity', values: '.7;1;.7', dur: '1.2s', repeatCount: 'indefinite' }));
  svg.appendChild(glow);
}

// ===== メイン描画 =====

export function renderWorldMap(container, onSelectStage) {
  const cleared    = loadCleared();
  const clearedCnt = cleared.length;

  const svg = E('svg', { viewBox: '0 0 100 100', class: 'worldmap-svg', 'aria-label': 'ワールドマップ' });

  // ===== DEFS =====
  const defs = E('defs');
  defs.innerHTML = `
    <radialGradient id="mapbg" cx="45%" cy="55%" r="60%">
      <stop offset="0%"   stop-color="#0e1838"/>
      <stop offset="65%"  stop-color="#080e22"/>
      <stop offset="100%" stop-color="#04080e"/>
    </radialGradient>
    <radialGradient id="tg_grass"  cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#0d3206" stop-opacity=".9"/><stop offset="100%" stop-color="#0d3206" stop-opacity="0"/></radialGradient>
    <radialGradient id="tg_forest" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#052208" stop-opacity=".9"/><stop offset="100%" stop-color="#052208" stop-opacity="0"/></radialGradient>
    <radialGradient id="tg_valley" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#101e38" stop-opacity=".85"/><stop offset="100%" stop-color="#101e38" stop-opacity="0"/></radialGradient>
    <radialGradient id="tg_water"  cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#042050" stop-opacity=".9"/><stop offset="100%" stop-color="#042050" stop-opacity="0"/></radialGradient>
    <radialGradient id="tg_ice"    cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#082838" stop-opacity=".9"/><stop offset="100%" stop-color="#082838" stop-opacity="0"/></radialGradient>
    <radialGradient id="tg_fire"   cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#401200" stop-opacity=".9"/><stop offset="100%" stop-color="#401200" stop-opacity="0"/></radialGradient>
    <radialGradient id="tg_lava"   cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#2a0400" stop-opacity=".9"/><stop offset="100%" stop-color="#2a0400" stop-opacity="0"/></radialGradient>
    <radialGradient id="tg_dark"   cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#140030" stop-opacity=".9"/><stop offset="100%" stop-color="#140030" stop-opacity="0"/></radialGradient>
    <radialGradient id="tg_altar"  cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#1c0042" stop-opacity=".95"/><stop offset="100%" stop-color="#1c0042" stop-opacity="0"/></radialGradient>
    <radialGradient id="tg_throne" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#181200" stop-opacity=".95"/><stop offset="100%" stop-color="#181200" stop-opacity="0"/></radialGradient>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="1.2" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="bigglow" x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur stdDeviation="2.8" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  `;
  svg.appendChild(defs);

  // ===== 背景 =====
  svg.appendChild(E('rect', { width: 100, height: 100, fill: 'url(#mapbg)' }));

  // ===== 地形ゾーン（放射グラデーション楕円） =====
  [
    { cx: 12, cy: 78, rx: 18, ry: 13, g: 'tg_grass' },
    { cx: 28, cy: 64, rx: 17, ry: 12, g: 'tg_forest' },
    { cx: 42, cy: 52, rx: 15, ry: 12, g: 'tg_valley' },
    { cx: 45, cy: 37, rx: 14, ry: 13, g: 'tg_water' },
    { cx: 31, cy: 17, rx: 17, ry: 11, g: 'tg_ice' },
    { cx: 56, cy: 19, rx: 17, ry: 12, g: 'tg_fire' },
    { cx: 66, cy: 32, rx: 14, ry: 12, g: 'tg_lava' },
    { cx: 69, cy: 47, rx: 14, ry: 12, g: 'tg_dark' },
    { cx: 60, cy: 58, rx: 13, ry: 11, g: 'tg_altar' },
    { cx: 50, cy: 68, rx: 12, ry: 10, g: 'tg_throne' },
  ].forEach(z => svg.appendChild(E('ellipse', { cx: z.cx, cy: z.cy, rx: z.rx, ry: z.ry, fill: `url(#${z.g})` })));

  // ===== SVG地形装飾 =====

  // 草原の木 (st01周辺)
  tree(svg,  6, 80, '#1a6012');
  tree(svg, 14, 84, '#1a6012');
  tree(svg, 18, 78, '#196010');
  // 草花
  svg.appendChild(E('circle', { cx: 8,  cy: 85, r: '.6', fill: '#e060a0', opacity: '.7' }));
  svg.appendChild(E('circle', { cx: 12, cy: 87, r: '.6', fill: '#60c0ff', opacity: '.7' }));
  svg.appendChild(E('circle', { cx: 16, cy: 86, r: '.5', fill: '#ffe040', opacity: '.7' }));

  // 森の大木 (st02周辺)
  tree(svg, 20, 66, '#0a3a08', '#1e0e04');
  tree(svg, 26, 69, '#0a3a08', '#1e0e04');
  tree(svg, 31, 63, '#083408', '#1e0e04');
  tree(svg, 18, 72, '#0c4008', '#1e0e04');

  // 霧の谷 — 岩と霧 (st03周辺)
  svg.appendChild(E('ellipse', { cx: 37, cy: 58, rx: 2.5, ry: 1.5, fill: '#2a3850', opacity: '.6' }));
  svg.appendChild(E('ellipse', { cx: 44, cy: 59, rx: 2,   ry: 1.2, fill: '#2a3850', opacity: '.5' }));
  svg.appendChild(E('ellipse', { cx: 40, cy: 54, rx: 4,   ry: 1.5, fill: '#8090b0', opacity: '.2' })); // 霧

  // 水面の波紋 (st04-05周辺)
  svg.appendChild(E('path', { d: 'M40,36 Q44,34 48,36', fill: 'none', stroke: '#1860c0', 'stroke-width': '.7', opacity: '.55' }));
  svg.appendChild(E('path', { d: 'M43,41 Q46,39 50,41', fill: 'none', stroke: '#1860c0', 'stroke-width': '.7', opacity: '.45' }));
  svg.appendChild(E('ellipse', { cx: 44, cy: 33, rx: 3, ry: 1.5, fill: '#1060b0', opacity: '.35' })); // 池

  // 氷の結晶 (st06-07周辺)
  crystal(svg, 22, 21); crystal(svg, 28, 17); crystal(svg, 35, 14);
  crystal(svg, 40, 18); crystal(svg, 24, 14); crystal(svg, 32, 24);

  // 雪山 (st06-07周辺)
  mountain(svg, 26, 23, '#1a2840', 5.5);
  mountain(svg, 36, 20, '#182640', 5);

  // 火山 (st08-09周辺)
  volcano(svg, 52, 25);
  volcano(svg, 63, 34);
  // 溶岩の亀裂
  svg.appendChild(E('path', { d: 'M62,34 L65,38 L63,42 L67,46', fill: 'none', stroke: '#d04000', 'stroke-width': '.65', opacity: '.6' }));
  svg.appendChild(E('path', { d: 'M56,24 L58,30', fill: 'none', stroke: '#ff6000', 'stroke-width': '.5', opacity: '.5' }));

  // 暗黒神殿の柱 (st10周辺)
  pillar(svg, 66, 49); pillar(svg, 70, 49);
  // 紫の輝き
  svg.appendChild(E('circle', { cx: 68, cy: 46, r: 1.5, fill: '#8020e0', opacity: '.25', filter: 'url(#glow)' }));

  // 深淵の祭壇の柱 (st11周辺)
  pillar(svg, 57, 62); pillar(svg, 62, 62);

  // 玉座の城の装飾 (st12周辺)
  svg.appendChild(E('path', { d: 'M47,73 L50,69 L53,73 Z', fill: '#806000', opacity: '.65' }));
  svg.appendChild(E('path', { d: 'M45,75 L50,70 L55,75 Z', fill: '#604000', opacity: '.5' }));
  svg.appendChild(E('rect', { x: 48, y: 74, width: 4, height: 4, fill: '#402800', opacity: '.55' }));

  // ===== バイオームラベル =====
  [
    { x:  7, y: 93, text: '草原の大地', col: '#2a8014', sz: '2.6' },
    { x: 18, y: 76, text: '森',         col: '#1a5008', sz: '3.2' },
    { x: 26, y: 29, text: '氷の山',     col: '#4888b0', sz: '2.5' },
    { x: 64, y: 14, text: '炎の山脈',   col: '#c04010', sz: '2.5' },
    { x: 82, y: 50, text: '暗黒域',     col: '#6020a0', sz: '2.5' },
  ].forEach(({ x, y, text, col, sz }) => {
    txt(svg, text, { x, y, 'font-size': sz, fill: col, opacity: '.5', 'text-anchor': 'middle', 'font-style': 'italic', 'font-weight': 'bold' });
  });

  // ===== 道（3レイヤー） =====
  const allD = pathD(STAGE_MAP_POS);
  // 影
  svg.appendChild(E('path', { d: allD, fill: 'none', stroke: '#000', 'stroke-width': '3.5', 'stroke-opacity': '.45', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
  // 道ベース
  svg.appendChild(E('path', { d: allD, fill: 'none', stroke: '#3a2808', 'stroke-width': '2.2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
  // 中央ハイライト（破線）
  svg.appendChild(E('path', { d: allD, fill: 'none', stroke: '#7a5828', 'stroke-width': '.7', 'stroke-dasharray': '1.5 2.5', 'stroke-linecap': 'round' }));

  // クリア済みゴールド道
  if (clearedCnt > 0) {
    const cpD = pathD(STAGE_MAP_POS.slice(0, clearedCnt + 1));
    svg.appendChild(E('path', { d: cpD, fill: 'none', stroke: '#c89010', 'stroke-width': '2.2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
    svg.appendChild(E('path', { d: cpD, fill: 'none', stroke: '#ffd040', 'stroke-width': '.9',  'stroke-linecap': 'round', 'stroke-opacity': '.85' }));
  }

  // ===== ステージノード =====
  STAGES.forEach((stage, i) => {
    const pos      = STAGE_MAP_POS[i];
    const done     = cleared.includes(stage.id);
    const unlocked = stageUnlocked(i);
    const isCurrent = !done && unlocked;
    const isFinal   = !!stage.last;
    const r = isFinal ? 6.5 : 4.5;

    const g = E('g', { transform: `translate(${pos.x},${pos.y})` });
    if (unlocked) {
      g.style.cursor = 'pointer';
      g.setAttribute('role', 'button');
      g.setAttribute('aria-label', stage.name);
      g.setAttribute('tabindex', '0');
    }

    // ── パルスリング（選択可能ノード） ──
    if (isCurrent) {
      const ring = E('circle', { r: r + 1.5, fill: 'none', stroke: stage.uc, 'stroke-width': '1.2', opacity: '0' });
      app(ring,
        anim({ attributeName: 'r',       values: `${r + 1};${r + 5.5};${r + 1}`, dur: '1.8s', repeatCount: 'indefinite' }),
        anim({ attributeName: 'opacity', values: '0.9;0;0.9',                      dur: '1.8s', repeatCount: 'indefinite' }),
      );
      g.appendChild(ring);
    }

    // ── ラスボス専用演出 ──
    if (isFinal) {
      // ビッググロー
      const glowC = E('circle', { r: r + 5, fill: '#c89000', opacity: '.0', filter: 'url(#bigglow)' });
      app(glowC, anim({ attributeName: 'opacity', values: '.2;.7;.2', dur: '2.5s', repeatCount: 'indefinite' }));
      g.appendChild(glowC);

      // 回転スパークルリング
      const rotG = E('g');
      app(rotG, animT({ type: 'rotate', from: '0', to: '360', dur: '9s', repeatCount: 'indefinite' }));
      for (let d = 0; d < 8; d++) {
        const rad = (d * 45 * Math.PI) / 180;
        rotG.appendChild(E('circle', {
          cx: `${(r + 3.5) * Math.sin(rad)}`,
          cy: `${-(r + 3.5) * Math.cos(rad)}`,
          r: d % 2 === 0 ? '.9' : '.55',
          fill: '#ffd040',
          opacity: d % 2 === 0 ? '.9' : '.5',
        }));
      }
      g.appendChild(rotG);

      // 王冠（点滅）
      if (!done) {
        const crown = E('text', { 'text-anchor': 'middle', y: `${-(r + 3.5)}`, 'font-size': '4.5', fill: '#ffd040' });
        crown.textContent = '♛';
        app(crown, anim({ attributeName: 'opacity', values: '.7;1;.7', dur: '1.5s', repeatCount: 'indefinite' }));
        g.appendChild(crown);
      }
    }

    // ── 外リング ──
    const ringCol = done ? '#ffd040' : (unlocked ? stage.uc : '#2a3058');
    const outer   = E('circle', { r: r + 1.2, fill: ringCol, opacity: unlocked ? '1' : '.3' });
    if (isCurrent || isFinal) outer.setAttribute('filter', 'url(#glow)');
    g.appendChild(outer);

    // ── 内円 ──
    g.appendChild(E('circle', { r, fill: done ? '#a07200' : (unlocked ? '#060c1e' : '#121a30') }));

    // ── アイコン ──
    txt(g, done ? '⭐' : (unlocked ? stage.ico : '?'), {
      'text-anchor': 'middle', 'dominant-baseline': 'central',
      'font-size': isFinal ? '5.5' : '3.8',
      fill: done ? '#ffd040' : (unlocked ? '#f0f4ff' : '#2a3260'),
    });

    // ── ステージ番号バッジ（右上角） ──
    txt(g, String(i + 1), {
      'text-anchor': 'start', x: `${r + .8}`, y: `${-(r + .5)}`,
      'font-size': '2', 'font-weight': 'bold',
      fill: done ? '#ffd040' : (unlocked ? '#8aa0d0' : '#303860'),
    });

    // ── ステージ名ラベル（解放済みのみ） ──
    if (unlocked) {
      txt(g, SHORT[i], {
        'text-anchor': 'middle', y: `${r + 4.8}`,
        'font-size': isFinal ? '2.8' : '2.5', 'font-weight': 'bold',
        fill: done ? '#ffd040' : '#8ab0e0',
      });
    }

    // ── インタラクション ──
    if (unlocked) {
      const go = () => { Audio.play('tap'); onSelectStage(stage); };
      g.addEventListener('click', go);
      g.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') go(); });
    }

    svg.appendChild(g);
  });

  container.innerHTML = '';
  container.appendChild(svg);
}
