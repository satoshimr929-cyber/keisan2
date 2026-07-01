/**
 * Canvas パーティクルシステム
 * バトル演出（ヒット・正解・不正解・レベルアップ）に使用
 */

let _canvas = null;
let _ctx = null;
let _raf = null;
const _particles = [];

export const Particles = {
  init(canvas) {
    _canvas = canvas;
    _ctx = canvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());
  },

  resize() {
    if (!_canvas) return;
    const parent = _canvas.parentElement;
    _canvas.width  = parent ? parent.clientWidth  : window.innerWidth;
    _canvas.height = parent ? parent.clientHeight : window.innerHeight;
  },

  spawn(type, x, y) {
    if (!_canvas) return;
    const config = CONFIGS[type] || CONFIGS.hit;
    for (let i = 0; i < config.count; i++) {
      _particles.push(makeParticle(type, x, y, config));
    }
    this._ensureLoop();
  },

  _ensureLoop() {
    if (_raf) return;
    const tick = () => {
      this._update();
      if (_particles.length > 0) {
        _raf = requestAnimationFrame(tick);
      } else {
        _raf = null;
        _ctx && _ctx.clearRect(0, 0, _canvas.width, _canvas.height);
      }
    };
    _raf = requestAnimationFrame(tick);
  },

  _update() {
    if (!_ctx || !_canvas) return;
    _ctx.clearRect(0, 0, _canvas.width, _canvas.height);
    for (let i = _particles.length - 1; i >= 0; i--) {
      const p = _particles[i];
      p.x   += p.vx;
      p.y   += p.vy;
      p.vy  += p.gravity;
      p.life -= p.decay;
      p.size *= 0.97;
      if (p.life <= 0 || p.size < 0.5) { _particles.splice(i, 1); continue; }
      const alpha = Math.max(0, p.life);
      _ctx.save();
      _ctx.globalAlpha = alpha;
      _ctx.fillStyle   = p.color;
      _ctx.shadowColor = p.color;
      _ctx.shadowBlur  = p.glow || 0;
      _ctx.beginPath();
      _ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      _ctx.fill();
      _ctx.restore();
    }
  },
};

function makeParticle(type, cx, cy, cfg) {
  const angle   = Math.random() * Math.PI * 2;
  const speed   = cfg.speed[0] + Math.random() * (cfg.speed[1] - cfg.speed[0]);
  const color   = cfg.colors[Math.floor(Math.random() * cfg.colors.length)];
  return {
    x: cx + (Math.random() - 0.5) * cfg.spread,
    y: cy + (Math.random() - 0.5) * cfg.spread * 0.5,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed - cfg.upBias,
    gravity: cfg.gravity || 0.15,
    life: 1.0,
    decay: 0.018 + Math.random() * 0.012,
    size: cfg.size[0] + Math.random() * (cfg.size[1] - cfg.size[0]),
    color,
    glow: cfg.glow || 0,
  };
}

const CONFIGS = {
  hit: {
    count: 14, speed: [2, 5], upBias: 1, gravity: 0.18, spread: 20,
    size: [2, 5], glow: 6,
    colors: ['#fff', '#ffaaaa', '#ff7777', '#ffcf3f'],
  },
  crit: {
    count: 28, speed: [3, 7], upBias: 2, gravity: 0.14, spread: 30,
    size: [3, 7], glow: 12,
    colors: ['#ffcf3f', '#fff', '#ffe27a', '#ff7ab0', '#ff5a55'],
  },
  correct: {
    count: 18, speed: [2, 4.5], upBias: 2.5, gravity: 0.10, spread: 40,
    size: [3, 6], glow: 10,
    colors: ['#46d36a', '#6ff09a', '#fff', '#ffe27a'],
  },
  wrong: {
    count: 10, speed: [1.5, 3], upBias: 0.5, gravity: 0.20, spread: 20,
    size: [2, 4], glow: 4,
    colors: ['#ff5a55', '#ff8a8a', '#cc4040'],
  },
  levelup: {
    count: 40, speed: [2, 6], upBias: 3, gravity: 0.08, spread: 60,
    size: [3, 8], glow: 14,
    colors: ['#ffcf3f', '#ffe27a', '#fff', '#7fd0ff', '#ff7ab0', '#46d36a'],
  },
  chest: {
    count: 22, speed: [2, 5], upBias: 3, gravity: 0.10, spread: 40,
    size: [2, 6], glow: 10,
    colors: ['#ffcf3f', '#ffe27a', '#fff', '#5aa0ff'],
  },
};
