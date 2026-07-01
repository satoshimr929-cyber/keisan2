/**
 * ワールドマップ型ステージ選択 - SFC高品質版
 */
import { STAGES, STAGE_MAP_POS } from '../data/stages.js';
import { stageUnlocked } from '../engine/progression.js';
import { loadCleared } from '../engine/save.js';
import { Audio } from '../fx/audio.js';
import { WORLDMAP_BG } from '../assets-worldmap-bg.js';
import { ICONS } from '../assets-icons.js';

const NS = 'http://www.w3.org/2000/svg';

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

// ===== メイン描画 =====

export function renderWorldMap(container, onSelectStage) {
  const cleared    = loadCleared();
  const clearedCnt = cleared.length;

  const svg = E('svg', { viewBox: '0 0 180 100', class: 'worldmap-svg', 'aria-label': 'ワールドマップ' });

  // ===== DEFS =====
  const defs = E('defs');
  defs.innerHTML = `
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="1.2" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="bigglow" x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur stdDeviation="2.8" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="0.8" stdDeviation="1" flood-color="#000" flood-opacity="0.9"/>
    </filter>
  `;
  svg.appendChild(defs);

  // ===== 背景画像 =====
  if (WORLDMAP_BG) {
    svg.appendChild(E('image', {
      href: WORLDMAP_BG,
      x: 0, y: 0, width: 180, height: 100,
      preserveAspectRatio: 'none',
      'image-rendering': 'pixelated',
    }));
    // 半透明オーバーレイ（ノード・テキストの視認性確保）
    svg.appendChild(E('rect', { width: 100, height: 100, fill: 'rgba(0,0,0,.38)' }));
  } else {
    // フォールバック（画像なし）
    const dg = E('radialGradient', { id: 'mapbg', cx: '45%', cy: '55%', r: '60%' });
    dg.innerHTML = `<stop offset="0%" stop-color="#0e1838"/><stop offset="65%" stop-color="#080e22"/><stop offset="100%" stop-color="#04080e"/>`;
    defs.appendChild(dg);
    svg.appendChild(E('rect', { width: 100, height: 100, fill: 'url(#mapbg)' }));
  }

  // ===== 道（3レイヤー） =====
  const allD = pathD(STAGE_MAP_POS);
  svg.appendChild(E('path', { d: allD, fill: 'none', stroke: '#000',     'stroke-width': '3.5', 'stroke-opacity': '.55', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
  svg.appendChild(E('path', { d: allD, fill: 'none', stroke: '#5a3c14',  'stroke-width': '2.2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
  svg.appendChild(E('path', { d: allD, fill: 'none', stroke: '#9a6a2a',  'stroke-width': '.7',  'stroke-dasharray': '1.5 2.5', 'stroke-linecap': 'round' }));

  // クリア済みゴールド道
  if (clearedCnt > 0) {
    const cpD = pathD(STAGE_MAP_POS.slice(0, clearedCnt + 1));
    svg.appendChild(E('path', { d: cpD, fill: 'none', stroke: '#c89010', 'stroke-width': '2.2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
    svg.appendChild(E('path', { d: cpD, fill: 'none', stroke: '#ffd040', 'stroke-width': '.9',  'stroke-linecap': 'round', 'stroke-opacity': '.9' }));
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
      const glowC = E('circle', { r: r + 5, fill: '#c89000', opacity: '.0', filter: 'url(#bigglow)' });
      app(glowC, anim({ attributeName: 'opacity', values: '.2;.7;.2', dur: '2.5s', repeatCount: 'indefinite' }));
      g.appendChild(glowC);

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

      if (!done) {
        const crown = E('text', { 'text-anchor': 'middle', y: `${-(r + 3.5)}`, 'font-size': '4.5', fill: '#ffd040' });
        crown.textContent = '♛';
        app(crown, anim({ attributeName: 'opacity', values: '.7;1;.7', dur: '1.5s', repeatCount: 'indefinite' }));
        g.appendChild(crown);
      }
    }

    // ── 外リング ──
    const ringCol = done ? '#ffd040' : (unlocked ? stage.uc : '#2a3058');
    const outer   = E('circle', { r: r + 1.2, fill: ringCol, opacity: unlocked ? '1' : '.25' });
    if (isCurrent || isFinal) outer.setAttribute('filter', 'url(#glow)');
    g.appendChild(outer);

    // ── 内円 ──
    g.appendChild(E('circle', { r, fill: done ? '#a07200' : (unlocked ? '#060c1e' : '#0c1228'), opacity: unlocked ? '1' : '.7' }));

    // ── アイコン ──
    const iconSize = isFinal ? 6.5 : 5;
    const iconSrc = done ? ICONS['star'] : (unlocked ? ICONS[stage.ico] : null);
    if (iconSrc) {
      const imgEl = E('image', {
        href: iconSrc,
        x: `${-iconSize / 2}`, y: `${-iconSize / 2}`,
        width: `${iconSize}`, height: `${iconSize}`,
        preserveAspectRatio: 'xMidYMid meet',
      });
      g.appendChild(imgEl);
    } else if (!unlocked) {
      txt(g, '🔒', {
        'text-anchor': 'middle', 'dominant-baseline': 'central',
        'font-size': '3.8',
        fill: '#3a4270', filter: 'url(#shadow)',
      });
    }

    // ── ステージ番号バッジ（右上角） ──
    txt(g, String(i + 1), {
      'text-anchor': 'start', x: `${r + .8}`, y: `${-(r + .5)}`,
      'font-size': '2', 'font-weight': 'bold',
      fill: done ? '#ffd040' : (unlocked ? '#8aa0d0' : '#303860'),
      filter: 'url(#shadow)',
    });

    // ── ステージ名ラベル（解放済みのみ） ──
    if (unlocked) {
      txt(g, SHORT[i], {
        'text-anchor': 'middle', y: `${r + 4.8}`,
        'font-size': isFinal ? '2.8' : '2.4', 'font-weight': 'bold',
        fill: done ? '#ffd040' : '#c0d8ff',
        filter: 'url(#shadow)',
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

  // 現在のステージが見えるよう横スクロール位置を調整
  requestAnimationFrame(() => {
    const svgW = svg.getBoundingClientRect().width;
    const viewW = 180;
    // 最初の未クリアステージのx座標を中心に
    const nextIdx = cleared.length < STAGES.length ? cleared.length : STAGES.length - 1;
    const targetX = STAGE_MAP_POS[nextIdx].x;
    const scrollX = (targetX / viewW) * svgW - container.clientWidth / 2;
    container.scrollLeft = Math.max(0, scrollX);
  });
}
