/**
 * SFC風バトル背景 Canvas アニメーションシステム
 *
 * 内部解像度 64×40 で描画 → CSS で引き伸ばし → image-rendering: pixelated で
 * 本物の 16bit ドット絵風に見せる。
 */

// ステージ tier 別バトルテーマ設定
const THEMES = [
  // tier 1: はじまりの草原
  {
    skyTop: [0x18, 0x60, 0xc0], skyBot: [0x68, 0xa0, 0xe0],
    stars: false, cloudsColor: [0xf0, 0xf0, 0xff],
    hills: [[0x10, 0x50, 0x10], [0x18, 0x68, 0x18]],
    ground: [0x10, 0x40, 0x10], groundLine: [0x50, 0xa0, 0x30],
    fgColor: [0x08, 0x30, 0x08],
    particleColor: [0x80, 0xd0, 0x30], particleType: 'leaf',
  },
  // tier 2: ざわめきの森
  {
    skyTop: [0x10, 0x30, 0x60], skyBot: [0x20, 0x50, 0x80],
    stars: false, cloudsColor: null,
    hills: [[0x08, 0x28, 0x08], [0x10, 0x38, 0x08]],
    ground: [0x08, 0x28, 0x08], groundLine: [0x20, 0x50, 0x10],
    fgColor: [0x04, 0x18, 0x04],
    particleColor: [0x30, 0x80, 0x20], particleType: 'leaf',
  },
  // tier 3: きりの谷
  {
    skyTop: [0x28, 0x38, 0x70], skyBot: [0x40, 0x50, 0x90],
    stars: true, cloudsColor: [0x80, 0x90, 0xb0],
    hills: [[0x20, 0x28, 0x50], [0x28, 0x30, 0x60]],
    ground: [0x18, 0x20, 0x40], groundLine: [0x40, 0x50, 0x80],
    fgColor: [0x10, 0x18, 0x30],
    particleColor: [0xa0, 0xb0, 0xd0], particleType: 'mist',
  },
  // tier 4: しずくの泉
  {
    skyTop: [0x08, 0x40, 0x90], skyBot: [0x18, 0x60, 0xc0],
    stars: false, cloudsColor: [0xa0, 0xd0, 0xff],
    hills: [[0x10, 0x50, 0x80], [0x10, 0x60, 0xa0]],
    ground: [0x08, 0x40, 0x70], groundLine: [0x20, 0x80, 0xd0],
    fgColor: [0x04, 0x28, 0x50],
    particleColor: [0x60, 0xb0, 0xff], particleType: 'water',
  },
  // tier 5: みずうみの里
  {
    skyTop: [0x10, 0x38, 0x80], skyBot: [0x38, 0x60, 0xb0],
    stars: true, cloudsColor: [0x80, 0xb0, 0xe0],
    hills: [[0x30, 0x50, 0x90], [0x40, 0x68, 0xa8]],
    ground: [0x20, 0x40, 0x70], groundLine: [0x50, 0x80, 0xd0],
    fgColor: [0x10, 0x28, 0x50],
    particleColor: [0x80, 0xc0, 0xff], particleType: 'water',
  },
  // tier 6: こおりの洞くつ
  {
    skyTop: [0x08, 0x18, 0x30], skyBot: [0x10, 0x28, 0x50],
    stars: false, cloudsColor: null,
    hills: [[0x20, 0x38, 0x60], [0x30, 0x50, 0x80]],
    ground: [0x10, 0x28, 0x50], groundLine: [0x60, 0x90, 0xd0],
    fgColor: [0x08, 0x18, 0x38],
    particleColor: [0x90, 0xd0, 0xff], particleType: 'ice',
  },
  // tier 7: つらら回廊
  {
    skyTop: [0x04, 0x08, 0x20], skyBot: [0x08, 0x10, 0x38],
    stars: true, cloudsColor: null,
    hills: [[0x18, 0x28, 0x50], [0x20, 0x38, 0x68]],
    ground: [0x08, 0x14, 0x38], groundLine: [0x40, 0x70, 0xb0],
    fgColor: [0x04, 0x08, 0x20],
    particleColor: [0x60, 0xa0, 0xe0], particleType: 'ice',
  },
  // tier 8: ほのおの山道
  {
    skyTop: [0x60, 0x10, 0x08], skyBot: [0x90, 0x20, 0x08],
    stars: false, cloudsColor: [0xd0, 0x60, 0x10],
    hills: [[0x40, 0x10, 0x08], [0x58, 0x18, 0x08]],
    ground: [0x30, 0x08, 0x04], groundLine: [0xd0, 0x40, 0x08],
    fgColor: [0x20, 0x04, 0x00],
    particleColor: [0xff, 0x80, 0x20], particleType: 'ember',
  },
  // tier 9: ようがんの間
  {
    skyTop: [0x40, 0x08, 0x00], skyBot: [0x60, 0x10, 0x00],
    stars: false, cloudsColor: [0xd0, 0x40, 0x00],
    hills: [[0x30, 0x08, 0x00], [0x40, 0x10, 0x00]],
    ground: [0x20, 0x04, 0x00], groundLine: [0xff, 0x50, 0x00],
    fgColor: [0x14, 0x02, 0x00],
    particleColor: [0xff, 0xa0, 0x00], particleType: 'ember',
  },
  // tier 10: やみの神殿
  {
    skyTop: [0x04, 0x00, 0x14], skyBot: [0x08, 0x00, 0x20],
    stars: true, cloudsColor: null,
    hills: [[0x10, 0x04, 0x28], [0x18, 0x08, 0x38]],
    ground: [0x06, 0x00, 0x14], groundLine: [0x70, 0x20, 0xa0],
    fgColor: [0x04, 0x00, 0x0c],
    particleColor: [0xa0, 0x40, 0xe0], particleType: 'spark',
  },
  // tier 11: しんえんの祭壇
  {
    skyTop: [0x02, 0x00, 0x10], skyBot: [0x06, 0x00, 0x18],
    stars: true, cloudsColor: null,
    hills: [[0x14, 0x04, 0x30], [0x1c, 0x08, 0x40]],
    ground: [0x04, 0x00, 0x10], groundLine: [0x90, 0x30, 0xc0],
    fgColor: [0x02, 0x00, 0x08],
    particleColor: [0xc0, 0x60, 0xff], particleType: 'spark',
  },
  // tier 12: けいさん王の玉座
  {
    skyTop: [0x00, 0x00, 0x06], skyBot: [0x00, 0x00, 0x0e],
    stars: true, cloudsColor: null,
    hills: [[0x10, 0x08, 0x00], [0x18, 0x10, 0x00]],
    ground: [0x02, 0x02, 0x04], groundLine: [0xf0, 0xc0, 0x00],
    fgColor: [0x00, 0x00, 0x02],
    particleColor: [0xff, 0xd0, 0x00], particleType: 'gold',
  },
];

const W = 64, H = 40; // 内部解像度

// パーティクル
let _particles = [];
// スクロール位置
let _scrollX = 0;
// 星座標（固定）
let _stars = [];
for (let i = 0; i < 40; i++) {
  _stars.push({ x: Math.floor(Math.random() * W), y: Math.floor(Math.random() * (H * 0.55)), b: Math.random() > 0.5 });
}

let _canvas = null, _ctx = null, _raf = null;
let _currentTier = 1;
let _frame = 0;
let _hasImage = false; // 背景画像がある場合 true → シーン描画スキップ・パーティクルのみ

export const BattleBG = {
  init(container) {
    _canvas = document.createElement('canvas');
    _canvas.width = W; _canvas.height = H;
    Object.assign(_canvas.style, {
      position: 'absolute', inset: '0', width: '100%', height: '100%',
      imageRendering: 'pixelated', zIndex: '0',
    });
    container.style.position = 'relative';
    container.insertBefore(_canvas, container.firstChild);
    _ctx = _canvas.getContext('2d');
  },

  start(tier, hasImage = false) {
    _currentTier = Math.max(1, Math.min(12, tier || 1));
    _hasImage = hasImage;
    _particles = [];
    _frame = 0;
    _scrollX = 0;
    if (!_raf) this._loop();
  },

  stop() {
    if (_raf) { cancelAnimationFrame(_raf); _raf = null; }
    if (_ctx) _ctx.clearRect(0, 0, W, H);
  },

  _loop() {
    _raf = requestAnimationFrame(() => {
      this._draw();
      this._loop();
    });
  },

  _draw() {
    const t = THEMES[_currentTier - 1];
    const ctx = _ctx;
    _frame++;
    _scrollX = (_scrollX + 0.15) % W;

    if (_hasImage) {
      // 背景画像がある場合: Canvasを透明にしてパーティクルのみ描画
      ctx.clearRect(0, 0, W, H);
    } else {
      // 1. 空グラデーション
      const skyGrad = ctx.createLinearGradient(0, 0, 0, H * 0.65);
      skyGrad.addColorStop(0, rgb(t.skyTop));
      skyGrad.addColorStop(1, rgb(t.skyBot));
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, W, H);

      // 2. 星
      if (t.stars) {
        const twinkle = Math.floor(_frame / 20) % 2;
        ctx.fillStyle = '#f8f8f8';
        for (const s of _stars) {
          if (s.b === (twinkle === 1)) ctx.fillRect(s.x, s.y, 1, 1);
        }
      }

      // 3. 雲 / 遠景
      if (t.cloudsColor) {
        ctx.fillStyle = rgb(t.cloudsColor);
        const cx = ((_scrollX * 0.4) | 0) % W;
        drawCloud(ctx, (cx + 5) % W, 4, 12, 3);
        drawCloud(ctx, (cx + 30) % W, 7, 9, 2);
        drawCloud(ctx, (cx + 50) % W, 3, 14, 3);
      }

      // 4. 遠景の山/丘
      const hx = (_scrollX * 0.6) | 0;
      ctx.fillStyle = rgb(t.hills[0]);
      drawHills(ctx, hx, H * 0.42, W, H * 0.24, 3, 18);
      ctx.fillStyle = rgb(t.hills[1]);
      drawHills(ctx, (hx + 20) % W, H * 0.52, W, H * 0.18, 4, 14);

      // 5. 地面
      const groundY = (H * 0.68) | 0;
      ctx.fillStyle = rgb(t.ground);
      ctx.fillRect(0, groundY, W, H - groundY);

      // 6. 地面ライン
      ctx.fillStyle = rgb(t.groundLine);
      ctx.fillRect(0, groundY, W, 1);
      ctx.fillRect(0, groundY + 2, W, 1);

      // 7. 前景装飾
      drawForeground(ctx, t, _frame, _scrollX);

      // 9. ラスボスの玉座: 柱
      if (_currentTier === 12) drawPillars(ctx, _frame);
    }

    // 8. パーティクル（常に描画）
    spawnParticle(t, _frame);
    updateParticles(ctx, _frame);
  },
};

// ===== 描画ヘルパー =====
function rgb([r, g, b]) { return `rgb(${r},${g},${b})`; }

function drawCloud(ctx, x, y, w, h) {
  // 雲をブロック状に描く（ドット絵風）
  const bx = (x | 0), by = (y | 0);
  ctx.fillRect(bx % W, by, w, h);
  if (bx + w > W) ctx.fillRect(0, by, bx + w - W, h);  // ラップ
  ctx.fillRect((bx + 2) % W, by - 1, w - 4, 1);
  ctx.fillRect((bx + 1) % W, by + h, w - 2, 1);
}

function drawHills(ctx, offsetX, y, w, h, steps, period) {
  // サイン波ベースの丘をブロック的に描く
  for (let px = 0; px < w; px++) {
    const phase = ((px + offsetX) / period) * Math.PI * 2;
    const hy = (y + Math.sin(phase) * h * 0.5) | 0;
    ctx.fillRect(px, hy, 1, H - hy);
  }
}

function drawForeground(ctx, t, frame, scrollX) {
  ctx.fillStyle = rgb(t.fgColor);
  const groundY = (H * 0.68) | 0;
  const fx = (scrollX * 1.2) | 0;

  if (t.particleType === 'leaf' || t.particleType === 'water') {
    // 木のシルエット
    for (const tx of [4, 20, 40, 56]) {
      const ox = (tx - (fx % 60) + 60) % 60 + (fx % 4 | 0);
      ctx.fillRect(ox, groundY - 10, 4, 10);
      ctx.fillRect(ox - 3, groundY - 16, 10, 8);
      ctx.fillRect(ox - 2, groundY - 20, 8, 6);
    }
  } else if (t.particleType === 'ice') {
    // つらら
    for (let i = 0; i < 8; i++) {
      const ix = ((i * 8 - (fx % 8)) % W + W) % W;
      const ih = 3 + (i % 3);
      ctx.fillRect(ix, 0, 2, ih);
      ctx.fillRect(ix + 5, 0, 2, ih - 1);
    }
    // 氷の床
    ctx.fillStyle = 'rgba(150,200,255,0.4)';
    ctx.fillRect(0, groundY, W, 2);
  } else if (t.particleType === 'ember') {
    // 岩のシルエット
    for (const rx of [5, 18, 35, 48]) {
      const ox = ((rx - (fx % 20)) % W + W) % W;
      ctx.fillRect(ox, groundY - 5, 8, 5);
      ctx.fillRect(ox + 1, groundY - 7, 6, 2);
    }
    // 溶岩のグロー
    const gAlpha = (Math.sin(frame * 0.08) + 1) * 0.5;
    ctx.fillStyle = `rgba(255,80,0,${gAlpha * 0.25})`;
    ctx.fillRect(0, groundY - 2, W, 4);
  } else if (t.particleType === 'spark' || t.particleType === 'gold') {
    // 神殿の柱（前景）
    ctx.fillStyle = rgb(t.fgColor);
    for (const px of [0, 14, 28, 42, 56]) {
      ctx.fillRect(px, groundY - 14, 4, 14);
      ctx.fillRect(px - 1, groundY - 15, 6, 2);
    }
  }
}

function drawPillars(ctx, frame) {
  // ラスボスの玉座: 金色の装飾柱
  const glow = Math.sin(frame * 0.05) * 0.3 + 0.7;
  ctx.fillStyle = `rgba(255,200,0,${glow * 0.6})`;
  ctx.fillRect(0, 14, W, 1);
  ctx.fillRect(0, 22, W, 1);
  for (let i = 0; i < W; i += 8) {
    ctx.fillStyle = `rgba(255,200,0,${glow * 0.4})`;
    ctx.fillRect(i, 0, 2, 28);
  }
}

// ===== パーティクル =====
function spawnParticle(t, frame) {
  if (_particles.length > 24) return;
  if (frame % 4 !== 0) return;

  const [r, g, b] = t.particleColor;
  _particles.push({
    x: Math.random() * W,
    y: t.particleType === 'ice' ? Math.random() * 4 : H * 0.5 + Math.random() * H * 0.2,
    vx: (Math.random() - 0.5) * 0.4,
    vy: t.particleType === 'ice' ? Math.random() * 0.3 + 0.1
       : t.particleType === 'ember' ? -(Math.random() * 0.5 + 0.2)
       : -(Math.random() * 0.3 + 0.1),
    life: 1.0,
    decay: 0.015 + Math.random() * 0.02,
    r, g, b,
  });
}

function updateParticles(ctx, frame) {
  const sz = _hasImage ? 2 : 1; // 背景画像あり時は視認性のため2×2
  for (let i = _particles.length - 1; i >= 0; i--) {
    const p = _particles[i];
    p.x = (p.x + p.vx + W) % W;
    p.y += p.vy;
    p.life -= p.decay;
    if (p.life <= 0) { _particles.splice(i, 1); continue; }
    ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${p.life})`;
    ctx.fillRect(p.x | 0, p.y | 0, sz, sz);
  }
}
