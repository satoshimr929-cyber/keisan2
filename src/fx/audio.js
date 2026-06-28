/**
 * Web Audio API 効果音エンジン
 * 音源生成のみ。外部ファイル・ライブラリ不使用。
 */

let _ctx = null;
let _muted = false;
let _noiseBuffer = null;
let _bgmMaster = null;

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

/** ノイズバッファを一度だけ生成して使い回す */
function noiseBuf() {
  if (!_noiseBuffer) {
    const ac = ctx();
    _noiseBuffer = ac.createBuffer(1, Math.ceil(ac.sampleRate * 2), ac.sampleRate);
    const d = _noiseBuffer.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return _noiseBuffer;
}

function noise(dest, when, dur) {
  const src = ctx().createBufferSource();
  src.buffer = noiseBuf();
  src.loop = true;
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
          [523, 659, 784, 1047].forEach((f, i) => osc('triangle', f, g, t + i * 0.18, 0.35));
          break;
        }
        case 'levelup': {
          const g = gain(0.22, t, 1.2);
          [392, 523, 659, 784, 1047].forEach((f, i) => {
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
      }
    } catch (_) {}
  },

  // ===== BGM =====
  _bgmTimer: null,

  startBGM(type = 'battle') {
    if (_muted) return;
    this.stopBGM();
    try {
      const ac = ctx();

      // マスターゲイン（BGM全体のフェードアウト用）
      const master = ac.createGain();
      master.gain.setValueAtTime(1, ac.currentTime);
      master.connect(ac.destination);
      _bgmMaster = master;
      const dest = master;

      const BPM  = type === 'map' ? 108 : 152;
      const S    = 60 / BPM;      // 4分音符（beat）
      const E    = S / 2;         // 8分音符
      const BAR  = S * 4;         // 1小節
      const LOOP = BAR * 8;       // 8小節

      // ---------- ヘルパー ----------
      // エンベロープ付きOscillator → dest
      const sn = (waveType, freq, vol, when, dur) => {
        const g = ac.createGain();
        g.gain.setValueAtTime(vol, when);
        g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
        g.connect(dest);
        osc(waveType, freq, g, when, dur);
      };
      // エンベロープ付きNoise → dest
      const sno = (vol, when, dur) => {
        const g = ac.createGain();
        g.gain.setValueAtTime(vol, when);
        g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
        g.connect(dest);
        noise(g, when, dur);
      };
      // フェードイン/アウト付きパッド → dest
      const pad = (freq, when, dur, vol = 0.028) => {
        const g = ac.createGain();
        g.gain.setValueAtTime(0, when);
        g.gain.linearRampToValueAtTime(vol, when + 0.18);
        g.gain.setValueAtTime(vol, when + dur - 0.22);
        g.gain.linearRampToValueAtTime(0, when + dur);
        g.connect(dest);
        osc('triangle', freq, g, when, dur);
      };

      // ================================================================
      // バトルBGM: Aマイナー 152BPM
      // コード進行: Am → G → F → G (各2小節)
      // ================================================================
      if (type === 'battle') {
        const [A2, G2, F2]               = [110, 98.0, 87.3];
        const [A3, B3, C4, D4, E4, F3, G3] = [220, 246.9, 261.6, 293.7, 329.6, 174.6, 196];
        const [A4, B4, C5, D5, E5, F4, G4, F5, G5, A5] =
              [440, 493.9, 523.3, 587.3, 659.3, 349.2, 392, 698.5, 784, 880];
        const R = 0;

        // [bassRoot, padFreqs[], 小節数]
        const BLOCKS = [
          [A2, [A3, C4, E4],      2],  // Am
          [G2, [G3, B3, D4],      2],  // G
          [F2, [F3, A3, C4],      2],  // F
          [G2, [G3, B3, D4, F4],  2],  // G7風（テンション）
        ];

        // 8分音符×64 のメロディ（8小節）
        const MEL = [
          // 小節1-2 (Am)
          E5, E5,  R, A5,  G5, E5, D5, C5,
          D5, C5,  R, E5,  C5, A4,  R,  R,
          // 小節3-4 (G)
          D5, D5,  R, G5,  F5, D5, C5, B4,
          C5, B4,  R, D5,  B4, G4,  R,  R,
          // 小節5-6 (F)
          C5, C5,  R, F5,  E5, C5, B4, A4,
          B4, A4,  R, C5,  A4, F4,  R,  R,
          // 小節7-8 (G → クライマックス)
          D5, D5,  R, G5,  A5, G5, E5, D5,
          C5, B4, A4, G4,  A4,  R, A5,  R,
        ];

        let t0 = ac.currentTime + 0.05;

        const sched = (start) => {
          // ── パッド + ベース ──
          let off = 0;
          for (const [bass, pads, bars] of BLOCKS) {
            const dur = bars * BAR;
            const cs  = start + off;
            for (const f of pads) pad(f, cs, dur);
            // ベース: sawtooth 4分音符、3拍目をオクターブ上
            for (let b = 0; b < bars * 4; b++) {
              const bs  = cs + b * S;
              const vol = b % 4 === 0 ? 0.13 : 0.085;
              const frq = b % 4 === 2 ? bass * 2 : bass;
              sn('sawtooth', frq, vol, bs, S * 0.82);
            }
            off += dur;
          }

          // ── メロディ（square）──
          MEL.forEach((f, i) => {
            if (!f) return;
            const t = start + i * E;
            sn('square', f, 0.10, t, E * 0.76);
          });

          // ── キック（偶数beat: 1,3,5...）──
          for (let b = 0; b < 32; b++) {
            if (b % 2 !== 0) continue;
            const t = start + b * S;
            const g = ac.createGain();
            g.gain.setValueAtTime(0.22, t);
            g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
            g.connect(dest);
            const o = ac.createOscillator();
            o.type = 'sine';
            o.frequency.setValueAtTime(110, t);
            o.frequency.exponentialRampToValueAtTime(36, t + 0.18);
            o.connect(g); o.start(t); o.stop(t + 0.22);
          }

          // ── スネア（奇数beat: 2,4,6...）──
          for (let b = 0; b < 32; b++) {
            if (b % 2 === 0) continue;
            const t = start + b * S;
            sno(0.10, t, 0.10);
            sn('sine', 185, 0.042, t, 0.065);
          }

          // ── ハイハット（全beat）──
          for (let b = 0; b < 32; b++) {
            const t = start + b * S;
            sno(0.036, t, 0.040);
          }
        };

        sched(t0);
        const loop = () => {
          if (!this._bgmTimer) return;
          t0 += LOOP;
          if (!_muted && _bgmMaster) sched(t0);
          this._bgmTimer = setTimeout(loop, (LOOP - 0.65) * 1000);
        };
        this._bgmTimer = setTimeout(loop, (LOOP - 0.65) * 1000);

      // ================================================================
      // マップBGM: Gメジャー 108BPM（穏やか・探索感）
      // コード進行: G → C → D → Em (各2小節)
      // ================================================================
      } else {
        const [G2, C3, D3, E3]             = [98.0, 130.8, 146.8, 164.8];
        const [G3, C4, D4, E4, A3, B3, Fs3] = [196, 261.6, 293.7, 329.6, 220, 246.9, 185.0];
        const [G4, C5, D5, E5, A4, B4, Fs4, G5] =
              [392, 523.3, 587.3, 659.3, 440, 493.9, 370.0, 784];
        const Fs5 = 740;
        const R = 0;

        const BLOCKS = [
          [G2, [G3, B3, D4],      2],  // G
          [C3, [C4, E4, G4],      2],  // C
          [D3, [D4, Fs4, A4],     2],  // D (F#で明るく)
          [E3, [E4, G4, B4],      2],  // Em
        ];

        const MEL = [
          // 小節1-2 (G)
          G4, A4, B4, D5,  E5,  R, D5,  R,
          B4,  R, A4, G4,  A4, B4,  R,  R,
          // 小節3-4 (C)
          E5, D5, C5,  R,  E5, D5, C5, B4,
          C5,  R, E5,  R,  G5,  R, E5,  R,
          // 小節5-6 (D)
          D5, E5, Fs5, E5,  D5, C5, B4,  R,
          D5,  R, A4,  R,  B4, D5,  R,  R,
          // 小節7-8 (Em → 解決)
          E5, D5, B4,  R,  E5,  R, D5, B4,
          G4,  R, B4,  R,  G4,  R,  R,  R,
        ];

        let t0 = ac.currentTime + 0.05;

        const sched = (start) => {
          let off = 0;
          for (const [bass, pads, bars] of BLOCKS) {
            const dur = bars * BAR;
            const cs  = start + off;
            for (const f of pads) pad(f, cs, dur, 0.022);
            for (let b = 0; b < bars * 4; b++) {
              const bs = cs + b * S;
              sn('triangle', bass, 0.085, bs, S * 0.80);
            }
            off += dur;
          }

          MEL.forEach((f, i) => {
            if (!f) return;
            const t = start + i * E;
            sn('triangle', f, 0.072, t, E * 0.82);
          });

          // 柔らかいキック（1拍目のみ）
          for (let b = 0; b < 32; b++) {
            if (b % 4 !== 0) continue;
            const t = start + b * S;
            const g = ac.createGain();
            g.gain.setValueAtTime(0.13, t);
            g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
            g.connect(dest);
            const o = ac.createOscillator();
            o.type = 'sine';
            o.frequency.setValueAtTime(80, t);
            o.frequency.exponentialRampToValueAtTime(36, t + 0.22);
            o.connect(g); o.start(t); o.stop(t + 0.28);
          }

          // 鈴音（各小節の頭）
          for (let b = 0; b < 8; b++) {
            const t = start + b * BAR;
            sn('sine', 1320, 0.045, t, 0.75);
            sn('sine', 1760, 0.020, t, 0.45);
          }
        };

        sched(t0);
        const loop = () => {
          if (!this._bgmTimer) return;
          t0 += LOOP;
          if (!_muted && _bgmMaster) sched(t0);
          this._bgmTimer = setTimeout(loop, (LOOP - 0.65) * 1000);
        };
        this._bgmTimer = setTimeout(loop, (LOOP - 0.65) * 1000);
      }
    } catch (_) {}
  },

  stopBGM() {
    if (this._bgmTimer) { clearTimeout(this._bgmTimer); this._bgmTimer = null; }
    if (_bgmMaster) {
      try {
        const t = ctx().currentTime;
        _bgmMaster.gain.setValueAtTime(_bgmMaster.gain.value, t);
        _bgmMaster.gain.linearRampToValueAtTime(0, t + 0.35);
        const m = _bgmMaster;
        _bgmMaster = null;
        setTimeout(() => { try { m.disconnect(); } catch (_) {} }, 500);
      } catch (_) { _bgmMaster = null; }
    }
  },
};
