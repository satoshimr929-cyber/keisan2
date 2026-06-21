/**
 * Web Audio API 効果音エンジン
 * 音源生成のみ。外部ファイル・ライブラリ不使用。
 */

let _ctx = null;
let _muted = false;

function ctx() {
  if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)();
  return _ctx;
}

function gain(v, when, dur) {
  const g = ctx().createGain();
  g.gain.setValueAtTime(v, when);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  g.connect(ctx().destination);
  return g;
}

function osc(type, freq, dest, when, dur) {
  const o = ctx().createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, when);
  o.connect(dest);
  o.start(when);
  o.stop(when + dur);
  return o;
}

function noise(dest, when, dur) {
  const buf = ctx().createBuffer(1, ctx().sampleRate * dur, ctx().sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx().createBufferSource();
  src.buffer = buf;
  src.connect(dest);
  src.start(when);
  src.stop(when + dur);
}

export const Audio = {
  get muted() { return _muted; },
  toggle() { _muted = !_muted; },

  play(type) {
    if (_muted) return;
    try {
      const ac = ctx();
      const t = ac.currentTime;
      switch (type) {
        case 'tap': {
          const g = gain(0.12, t, 0.08);
          osc('sine', 880, g, t, 0.08);
          break;
        }
        case 'correct': {
          const g = gain(0.25, t, 0.35);
          osc('triangle', 660, g, t, 0.10);
          osc('triangle', 880, g, t + 0.10, 0.10);
          osc('triangle', 1100, g, t + 0.20, 0.15);
          break;
        }
        case 'wrong': {
          const g = gain(0.18, t, 0.30);
          osc('sawtooth', 220, g, t, 0.15);
          osc('sawtooth', 165, g, t + 0.12, 0.18);
          break;
        }
        case 'attack': {
          const g = gain(0.20, t, 0.20);
          osc('sawtooth', 330, g, t, 0.05);
          const gn = gain(0.10, t, 0.15);
          noise(gn, t, 0.15);
          break;
        }
        case 'crit': {
          const g = gain(0.30, t, 0.50);
          osc('square', 440, g, t, 0.10);
          osc('square', 660, g, t + 0.05, 0.15);
          osc('square', 880, g, t + 0.15, 0.20);
          const gn = gain(0.15, t, 0.12);
          noise(gn, t, 0.12);
          break;
        }
        case 'victory': {
          const g = gain(0.22, t, 1.4);
          const notes = [523, 659, 784, 1047];
          notes.forEach((f, i) => osc('triangle', f, g, t + i * 0.18, 0.35));
          break;
        }
        case 'levelup': {
          const g = gain(0.22, t, 1.2);
          const seq = [392, 523, 659, 784, 1047];
          seq.forEach((f, i) => {
            osc('triangle', f, g, t + i * 0.14, 0.28);
            osc('sine',     f * 2, g, t + i * 0.14, 0.14);
          });
          break;
        }
        case 'defeat': {
          const g = gain(0.20, t, 0.80);
          osc('sawtooth', 220, g, t, 0.25);
          osc('sawtooth', 185, g, t + 0.20, 0.30);
          osc('sawtooth', 147, g, t + 0.45, 0.35);
          break;
        }
        case 'chest': {
          const g = gain(0.20, t, 0.50);
          osc('sine', 523, g, t, 0.15);
          osc('sine', 784, g, t + 0.12, 0.18);
          osc('sine', 1047, g, t + 0.26, 0.25);
          break;
        }
        case 'hint': {
          const g = gain(0.12, t, 0.25);
          osc('sine', 440, g, t, 0.12);
          osc('sine', 550, g, t + 0.10, 0.15);
          break;
        }
        case 'bgm_ping': {
          const g = gain(0.06, t, 1.0);
          osc('sine', 220, g, t, 1.0);
          osc('sine', 330, g, t, 1.0);
          break;
        }
      }
    } catch (_) {}
  },

  /** 軽いBGMループ（1音ずつ鳴らす）*/
  _bgmTimer: null,
  startBGM() {
    if (_muted || this._bgmTimer) return;
    const scale = [220, 261, 294, 330, 370, 440, 494];
    let i = 0;
    const tick = () => {
      if (_muted) { this._bgmTimer = null; return; }
      try {
        const ac = ctx();
        const t = ac.currentTime;
        const g = ac.createGain();
        g.gain.setValueAtTime(0.04, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
        g.connect(ac.destination);
        osc('sine', scale[i % scale.length], g, t, 1.8);
        i++;
      } catch (_) {}
      this._bgmTimer = setTimeout(tick, 1800);
    };
    tick();
  },
  stopBGM() {
    if (this._bgmTimer) { clearTimeout(this._bgmTimer); this._bgmTimer = null; }
  },
};
