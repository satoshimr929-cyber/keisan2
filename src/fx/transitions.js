/**
 * 画面遷移エフェクト
 * - フェードイン/アウト
 * - スクリーンシェイク
 * - reduced-motion 対応
 */

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const Transitions = {
  /** フラッシュオーバーレイ要素 */
  _overlay: null,

  init() {
    this._overlay = document.createElement('div');
    Object.assign(this._overlay.style, {
      position: 'fixed', inset: '0', pointerEvents: 'none',
      zIndex: '9998', opacity: '0', background: '#fff',
      transition: 'opacity 0.15s ease',
    });
    document.body.appendChild(this._overlay);
  },

  flash(color = '#fff', durationMs = 150) {
    if (prefersReducedMotion || !this._overlay) return;
    this._overlay.style.background = color;
    this._overlay.style.opacity = '0.7';
    setTimeout(() => { if (this._overlay) this._overlay.style.opacity = '0'; }, durationMs);
  },

  shake(el, intensity = 6, durationMs = 300) {
    if (prefersReducedMotion || !el) return;
    const steps = 8;
    const interval = durationMs / steps;
    let i = 0;
    const anim = setInterval(() => {
      const decay = 1 - i / steps;
      const dx = (Math.random() - 0.5) * intensity * 2 * decay;
      const dy = (Math.random() - 0.5) * intensity * decay;
      el.style.transform = `translate(${dx}px,${dy}px)`;
      i++;
      if (i >= steps) {
        clearInterval(anim);
        el.style.transform = '';
      }
    }, interval);
  },

  /** 画面遷移（スライドフェード） */
  async switchScreen(from, to, dir = 'forward') {
    if (prefersReducedMotion) {
      if (from) from.classList.remove('active');
      if (to) { to.classList.add('active'); to.scrollTop = 0; }
      return;
    }
    const dx = dir === 'forward' ? 20 : -20;
    if (from) {
      from.style.transition = 'opacity 0.18s ease, transform 0.18s ease';
      from.style.opacity = '0';
      from.style.transform = `translateX(${-dx}px)`;
      await delay(180);
      from.classList.remove('active');
      from.style.cssText = '';
    }
    if (to) {
      to.style.opacity = '0';
      to.style.transform = `translateX(${dx}px)`;
      to.classList.add('active');
      to.scrollTop = 0;
      await delay(10);
      to.style.transition = 'opacity 0.22s ease, transform 0.22s ease';
      to.style.opacity = '1';
      to.style.transform = '';
      await delay(220);
      to.style.cssText = '';
    }
  },
};

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}
