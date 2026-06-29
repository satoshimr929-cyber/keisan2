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
      const D = ac.destination;

      // ゲイン生成ヘルパー(D直結)
      const mk = (vol, when, dur) => {
        const nd = ac.createGain();
        nd.gain.setValueAtTime(vol, when);
        nd.gain.exponentialRampToValueAtTime(0.0001, when + dur);
        nd.connect(D);
        return nd;
      };

      switch (type) {
        // ─────────────────────────────────
        case 'tap': {
          // カチッとした二重クリック
          const g1 = mk(0.18, t, 0.055);
          osc('sine', 1100, g1, t, 0.045);
          const g2 = mk(0.12, t, 0.035);
          osc('sine', 340, g2, t, 0.028);
          break;
        }

        // ─────────────────────────────────
        case 'correct': {
          // Cメジャーコードブルーム + 上昇スパークル
          [523, 659, 784].forEach(f => {
            const gc = mk(0.11, t, 0.50);
            osc('triangle', f, gc, t, 0.45);
            const gh = mk(0.04, t, 0.30);
            osc('sine', f * 2, gh, t, 0.25);
          });
          [523, 659, 784, 1047, 1319].forEach((f, i) => {
            const d = t + 0.04 + i * 0.08;
            const ga = mk(0.14, d, 0.40);
            osc('sine', f, ga, d, 0.35);
          });
          break;
        }

        // ─────────────────────────────────
        case 'wrong': {
          // バズ下降 + ノイズインパクト + 不協和音
          const gb = ac.createGain();
          gb.gain.setValueAtTime(0.28, t);
          gb.gain.linearRampToValueAtTime(0.22, t + 0.12);
          gb.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
          gb.connect(D);
          const ob = ac.createOscillator();
          ob.type = 'square';
          ob.frequency.setValueAtTime(210, t);
          ob.frequency.linearRampToValueAtTime(118, t + 0.32);
          ob.connect(gb); ob.start(t); ob.stop(t + 0.38);
          const gni = mk(0.18, t, 0.10);
          noise(gni, t, 0.10);
          const gdi = mk(0.09, t + 0.06, 0.30);
          osc('sawtooth', 178, gdi, t + 0.06, 0.26);
          break;
        }

        // ─────────────────────────────────
        case 'attack': {
          // バンドパスノイズ「ウーシュ」
          const bpf = ac.createBiquadFilter();
          bpf.type = 'bandpass';
          bpf.frequency.setValueAtTime(700, t);
          bpf.frequency.exponentialRampToValueAtTime(3200, t + 0.09);
          bpf.Q.value = 0.9;
          const gw = ac.createGain();
          gw.gain.setValueAtTime(0.001, t);
          gw.gain.linearRampToValueAtTime(0.22, t + 0.03);
          gw.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
          bpf.connect(gw); gw.connect(D);
          noise(bpf, t, 0.14);
          // 重低音インパクト
          const gi = ac.createGain();
          gi.gain.setValueAtTime(0.40, t + 0.07);
          gi.gain.exponentialRampToValueAtTime(0.0001, t + 0.30);
          gi.connect(D);
          const oi = ac.createOscillator();
          oi.type = 'sawtooth';
          oi.frequency.setValueAtTime(220, t + 0.07);
          oi.frequency.exponentialRampToValueAtTime(52, t + 0.27);
          oi.connect(gi); oi.start(t + 0.07); oi.stop(t + 0.30);
          // メタルリング残響
          const gm = mk(0.07, t + 0.07, 0.45);
          osc('triangle', 1800, gm, t + 0.07, 0.40);
          break;
        }

        // ─────────────────────────────────
        case 'crit': {
          // 超重低音ドーン
          const gb2 = ac.createGain();
          gb2.gain.setValueAtTime(0.48, t);
          gb2.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
          gb2.connect(D);
          const ob2 = ac.createOscillator();
          ob2.type = 'sawtooth';
          ob2.frequency.setValueAtTime(300, t);
          ob2.frequency.exponentialRampToValueAtTime(44, t + 0.40);
          ob2.connect(gb2); ob2.start(t); ob2.stop(t + 0.45);
          // ノイズクラッシュ × 2
          const gnc = mk(0.28, t, 0.20);
          noise(gnc, t, 0.20);
          const gnc2 = mk(0.10, t + 0.06, 0.30);
          noise(gnc2, t + 0.06, 0.25);
          // 上昇メタルシマー4連
          [550, 740, 1100, 1650].forEach((f, i) => {
            const d = t + 0.05 + i * 0.075;
            const gs = mk(0.13, d, 0.55);
            osc('square', f, gs, d, 0.50);
          });
          break;
        }

        // ─────────────────────────────────
        case 'victory': {
          // ドラムロール(8連打クレッシェンド)
          for (let i = 0; i < 8; i++) {
            const d = t + i * 0.045;
            const gnr = mk(0.04 + i * 0.012, d, 0.06);
            noise(gnr, d, 0.05);
            const gsr = mk(0.025 + i * 0.007, d, 0.065);
            osc('sine', 185, gsr, d, 0.055);
          }
          // ファンファーレ C-C-C-Ab-C-Eb-G
          const vMel = [523, 523, 523, 415, 523, 622, 784];
          const vDurs = [0.14, 0.14, 0.14, 0.10, 0.14, 0.19, 0.55];
          let vOff = 0.40;
          vMel.forEach((f, i) => {
            const d = t + vOff;
            const gf = mk(0.22, d, vDurs[i]);
            osc('triangle', f, gf, d, vDurs[i] * 0.86);
            const gf5 = mk(0.09, d, vDurs[i]);
            osc('triangle', f * 1.498, gf5, d, vDurs[i] * 0.86);
            vOff += vDurs[i];
          });
          // 凱旋コード C-E-G-C + ベルスパークル
          const tc = t + 1.72;
          [523, 659, 784, 1047].forEach(f => {
            const gc = mk(0.17, tc, 1.05);
            osc('triangle', f, gc, tc, 1.0);
          });
          [2093, 2637, 3136].forEach((f, i) => {
            const d = tc + i * 0.08;
            const gbv = mk(0.10, d, 0.85);
            osc('sine', f, gbv, d, 0.80);
          });
          break;
        }

        // ─────────────────────────────────
        case 'levelup': {
          // バンドパスノイズ上昇スウィープ
          const bpf3 = ac.createBiquadFilter();
          bpf3.type = 'bandpass';
          bpf3.frequency.setValueAtTime(280, t);
          bpf3.frequency.exponentialRampToValueAtTime(2800, t + 0.75);
          bpf3.Q.value = 2.2;
          const gsw = ac.createGain();
          gsw.gain.setValueAtTime(0, t);
          gsw.gain.linearRampToValueAtTime(0.18, t + 0.08);
          gsw.gain.linearRampToValueAtTime(0.06, t + 0.75);
          gsw.gain.exponentialRampToValueAtTime(0.0001, t + 0.80);
          bpf3.connect(gsw); gsw.connect(D);
          noise(bpf3, t, 0.81);
          // サイングリッサンド
          const gg = ac.createGain();
          gg.gain.setValueAtTime(0, t);
          gg.gain.linearRampToValueAtTime(0.25, t + 0.18);
          gg.gain.exponentialRampToValueAtTime(0.0001, t + 0.80);
          gg.connect(D);
          const og2 = ac.createOscillator();
          og2.type = 'sine';
          og2.frequency.setValueAtTime(220, t);
          og2.frequency.exponentialRampToValueAtTime(2200, t + 0.75);
          og2.connect(gg); og2.start(t); og2.stop(t + 0.80);
          // Cメジャー1.5オクターブ上昇アルペジオ
          [523, 587, 659, 784, 880, 988, 1047, 1175, 1319, 1568].forEach((f, i) => {
            const d = t + 0.50 + i * 0.09;
            const ga = mk(0.17, d, 0.52);
            osc('triangle', f, ga, d, 0.47);
            const gh = mk(0.055, d, 0.28);
            osc('sine', f * 2, gh, d, 0.23);
          });
          // Cmaj7 最終コード
          const fc = t + 1.48;
          [523, 659, 784, 988, 1047].forEach(f => {
            const gc = mk(0.15, fc, 1.00);
            osc('triangle', f, gc, fc, 0.95);
          });
          // ベルスパークルカスケード
          [1760, 2093, 2637, 3136, 2093, 2637].forEach((f, i) => {
            const d = fc + 0.02 + i * 0.08;
            const gbv = mk(0.11, d, 0.95);
            osc('sine', f, gbv, d, 0.88);
          });
          break;
        }

        // ─────────────────────────────────
        case 'defeat': {
          // キック + ノイズバースト
          const gkd = ac.createGain();
          gkd.gain.setValueAtTime(0.35, t);
          gkd.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
          gkd.connect(D);
          const okd = ac.createOscillator();
          okd.type = 'sine';
          okd.frequency.setValueAtTime(90, t);
          okd.frequency.exponentialRampToValueAtTime(28, t + 0.45);
          okd.connect(gkd); okd.start(t); okd.stop(t + 0.55);
          const gnd2 = mk(0.12, t, 0.15);
          noise(gnd2, t, 0.15);
          // 下降メロディ G→F→Eb→C + 短3度和音
          [[392, 0.10], [349, 0.40], [311, 0.68], [261, 0.95]].forEach(([f, d]) => {
            const gm = mk(0.20, t + d, 0.40);
            osc('sawtooth', f, gm, t + d, 0.35);
            const gm2 = mk(0.07, t + d, 0.40);
            osc('sawtooth', f * 0.794, gm2, t + d, 0.35);
          });
          // 余韻ノイズ
          const gndt = mk(0.05, t + 0.3, 1.30);
          noise(gndt, t + 0.3, 1.20);
          break;
        }

        // ─────────────────────────────────
        case 'chest': {
          // コインジャラジャラ(ベル倍音付き)
          [1047, 1175, 1319, 1568, 1760].forEach((f, i) => {
            const d = t + i * 0.055;
            const gc = mk(0.13, d, 0.65);
            osc('sine', f, gc, d, 0.60);
            const gcb = mk(0.045, d, 0.40);
            osc('sine', f * 2.756, gcb, d, 0.35);
          });
          // 上昇キラキラ
          [2093, 2637, 3136, 3729].forEach((f, i) => {
            const d = t + 0.22 + i * 0.07;
            const gs = mk(0.09, d, 0.58);
            osc('sine', f, gs, d, 0.52);
          });
          // 暖かみのある低音パッド
          const gcpad = ac.createGain();
          gcpad.gain.setValueAtTime(0, t);
          gcpad.gain.linearRampToValueAtTime(0.08, t + 0.07);
          gcpad.gain.exponentialRampToValueAtTime(0.0001, t + 0.85);
          gcpad.connect(D);
          [262, 330, 392].forEach(f => osc('triangle', f, gcpad, t, 0.80));
          break;
        }

        // ─────────────────────────────────
        case 'hint': {
          // ベル倍音チャイム(2.756倍音 = ベル特性倍音)
          [880, 1047].forEach((f, i) => {
            const d = t + i * 0.14;
            const gh = mk(0.14, d, 0.75);
            osc('sine', f, gh, d, 0.70);
            const gh2 = mk(0.05, d, 0.45);
            osc('sine', f * 2.756, gh2, d, 0.38);
            const gh3 = mk(0.02, d, 0.28);
            osc('sine', f * 5.404, gh3, d, 0.22);
          });
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
      ac.resume().catch(() => {});

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
        _bgmMaster.gain.cancelScheduledValues(t);
        _bgmMaster.gain.setTargetAtTime(0, t, 0.03);
        const m = _bgmMaster;
        _bgmMaster = null;
        setTimeout(() => { try { m.disconnect(); } catch (_) {} }, 200);
      } catch (_) { _bgmMaster = null; }
    }
  },
};
