/** ランダム整数 */
export function ri(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** 最大公約数 */
export function gcd(a, b) {
  a = Math.abs(a); b = Math.abs(b);
  while (b) { const t = b; b = a % b; a = t; }
  return a || 1;
}

/** 小数表示 (内部は×100整数) */
export function fmtH(h) {
  const s = h < 0 ? '−' : '';
  h = Math.abs(h);
  const ip = Math.floor(h / 100);
  const fr = h % 100;
  if (fr === 0) return s + ip;
  const fs = (fr % 10 === 0) ? String(fr / 10) : (fr < 10 ? '0' + fr : String(fr));
  return s + ip + '.' + fs;
}

export function parseH(v) {
  const f = parseFloat(v);
  if (isNaN(f)) return null;
  return Math.round(f * 100);
}

export function fracHTML(n, d) {
  return `<span class="frac"><span class="num">${n}</span><span class="bar"></span><span class="den">${d}</span></span>`;
}

/**
 * 19種の問題ジェネレーター
 * 各エントリが返すオブジェクト：
 *   qText: string        表示用問題文 (HTML可)
 *   instr?: string       補足指示
 *   decimal: boolean     小数入力モード
 *   layout: 'single'|'fraction'|'divrem'
 *   inputs: {label:string}[]
 *   check(vals: string[]): boolean
 *   ansHTML: string      正答表示HTML
 *   explain: string      解説HTML
 */
export const GEN = {
  // ---- 4年 ----
  tasi() {
    const a = ri(120, 9899), b = ri(120, 9899);
    return {
      qText: `${a} ＋ ${b} ＝`, decimal: false, layout: 'single', inputs: [{ label: '' }],
      check: v => parseInt(v[0], 10) === a + b,
      ansHTML: String(a + b),
      explain: `くらいを そろえて たし算<br>${a} ＋ ${b} ＝ ${a + b}　✓`,
    };
  },
  hiki() {
    const a = ri(400, 9899), b = ri(120, a - 1);
    return {
      qText: `${a} − ${b} ＝`, decimal: false, layout: 'single', inputs: [{ label: '' }],
      check: v => parseInt(v[0], 10) === a - b,
      ansHTML: String(a - b),
      explain: `くらいを そろえて ひき算<br>${a} − ${b} ＝ ${a - b}　✓`,
    };
  },
  kake() {
    let a, b;
    if (Math.random() < 0.5) { a = ri(12, 99); b = ri(2, 9); }
    else { a = ri(11, 40); b = ri(11, 30); }
    return {
      qText: `${a} × ${b} ＝`, decimal: false, layout: 'single', inputs: [{ label: '' }],
      check: v => parseInt(v[0], 10) === a * b,
      ansHTML: String(a * b),
      explain: `くらいごとに かけて たす<br>${a} × ${b} ＝ ${a * b}　✓`,
    };
  },
  wari() {
    let dv, q, r;
    if (Math.random() < 0.65) { dv = ri(3, 9); q = ri(12, 99); }
    else { dv = ri(12, 29); q = ri(11, 40); }
    r = ri(0, dv - 1);
    const n = dv * q + r;
    return {
      qText: `${n} ÷ ${dv} ＝`, decimal: false, layout: 'divrem', inputs: [{ label: '商' }, { label: 'あまり' }],
      check: v => parseInt(v[0], 10) === q && parseInt(v[1], 10) === r,
      ansHTML: `${q} あまり ${r}`,
      explain: `${n} ÷ ${dv}<br>商 ${q}、あまり ${r}<br>確認：${dv} × ${q} ＋ ${r} ＝ ${n}　✓`,
    };
  },
  gaisu() {
    let n, a, ins, tu;
    if (Math.random() < 0.5) {
      const o = [{ u: 100, l: '百の位' }, { u: 1000, l: '千の位' }, { u: 10000, l: '一万の位' }][ri(0, 2)];
      n = ri(2, 8) * o.u + ri(1, o.u - 1);
      a = Math.round(n / o.u) * o.u;
      ins = o.l + 'で 四捨五入しよう';
      tu = o.l;
    } else {
      const places = [{ u: 10, l: '一の位' }, { u: 100, l: '十の位' }][ri(0, 1)];
      n = ri(100, 9899);
      a = Math.round(n / places.u) * places.u;
      ins = places.l + 'で 四捨五入しよう';
      tu = places.l;
    }
    return {
      qText: String(n), instr: ins, decimal: false, layout: 'single', inputs: [{ label: '' }],
      check: v => parseInt(v[0], 10) === a,
      ansHTML: String(a),
      explain: `${tu}に 着目 → ${n} → 四捨五入 → ${a}　✓`,
    };
  },
  junjo() {
    const T = [
      () => { const a = ri(2, 9), b = ri(2, 5), c = ri(2, 5); return { h: `${a} ＋ ${b} × ${c}`, ans: a + b * c, s: `さきに ×：${b} × ${c} ＝ ${b * c}<br>つぎに ＋：${a} ＋ ${b * c} ＝ ${a + b * c}` }; },
      () => { const a = ri(2, 5), b = ri(2, 5), c = ri(2, 9); return { h: `${a} × ${b} ＋ ${c}`, ans: a * b + c, s: `さきに ×：${a} × ${b} ＝ ${a * b}<br>つぎに ＋：${a * b} ＋ ${c} ＝ ${a * b + c}` }; },
      () => { const a = ri(2, 5), b = ri(2, 5), c = ri(1, a * b - 1); return { h: `${a} × ${b} − ${c}`, ans: a * b - c, s: `さきに ×：${a} × ${b} ＝ ${a * b}<br>つぎに −：${a * b} − ${c} ＝ ${a * b - c}` }; },
      () => { const a = ri(2, 8), b = ri(2, 8), c = ri(2, 5); return { h: `(${a} ＋ ${b}) × ${c}`, ans: (a + b) * c, s: `さきに ( )：${a} ＋ ${b} ＝ ${a + b}<br>つぎに ×：${a + b} × ${c} ＝ ${(a + b) * c}` }; },
      () => { const a = ri(4, 9), b = ri(1, a - 1), c = ri(2, 5); return { h: `(${a} − ${b}) × ${c}`, ans: (a - b) * c, s: `さきに ( )：${a} − ${b} ＝ ${a - b}<br>つぎに ×：${a - b} × ${c} ＝ ${(a - b) * c}` }; },
      () => { const a = ri(2, 5), b = ri(2, 6), c = ri(2, 6); return { h: `${a} × (${b} ＋ ${c})`, ans: a * (b + c), s: `さきに ( )：${b} ＋ ${c} ＝ ${b + c}<br>つぎに ×：${a} × ${b + c} ＝ ${a * (b + c)}` }; },
      () => { const c = ri(2, 9), q = ri(2, 9), d = ri(1, 9); return { h: `${c * q} ÷ ${c} ＋ ${d}`, ans: q + d, s: `さきに ÷：${c * q} ÷ ${c} ＝ ${q}<br>つぎに ＋：${q} ＋ ${d} ＝ ${q + d}` }; },
      () => { const a = ri(10, 40), c = ri(2, 9), q = ri(2, 9); return { h: `${a} ＋ ${c * q} ÷ ${c}`, ans: a + q, s: `さきに ÷：${c * q} ÷ ${c} ＝ ${q}<br>つぎに ＋：${a} ＋ ${q} ＝ ${a + q}` }; },
    ];
    const r = T[ri(0, T.length - 1)]();
    return {
      qText: r.h + ' ＝', instr: '計算の じゅんじょに 気をつけよう', decimal: false,
      layout: 'single', inputs: [{ label: '' }],
      check: v => parseInt(v[0], 10) === r.ans,
      ansHTML: String(r.ans),
      explain: r.s + `<br>こたえ ${r.ans}　✓`,
    };
  },
  decas() {
    let aH, bH, op, res;
    do {
      aH = ri(11, 900); bH = ri(11, 900);
      if (Math.random() < 0.5) aH = Math.round(aH / 10) * 10;
      if (Math.random() < 0.5) bH = Math.round(bH / 10) * 10;
    } while (aH % 100 === 0 && bH % 100 === 0);
    if (Math.random() < 0.5) { op = '＋'; res = aH + bH; }
    else { if (aH < bH) [aH, bH] = [bH, aH]; op = '−'; res = aH - bH; }
    return {
      qText: `${fmtH(aH)} ${op} ${fmtH(bH)} ＝`, decimal: true, layout: 'single', inputs: [{ label: '' }],
      check: v => parseH(v[0]) === res,
      ansHTML: fmtH(res),
      explain: `小数点を そろえて 計算<br>${fmtH(aH)} ${op} ${fmtH(bH)} ＝ ${fmtH(res)}　✓`,
    };
  },
  // ---- 5年 ----
  decmul() {
    const aH = ri(11, 99) * 10, m = ri(2, 9), res = aH * m;
    const ai = aH / 10;
    return {
      qText: `${fmtH(aH)} × ${m} ＝`, decimal: true, layout: 'single', inputs: [{ label: '' }],
      check: v => parseH(v[0]) === res,
      ansHTML: fmtH(res),
      explain: `整数と 思って ${ai} × ${m} ＝ ${ai * m}<br>小数点を もどして ${fmtH(res)}　✓`,
    };
  },
  decdiv() {
    const aH = ri(11, 99) * 10, m = ri(2, 9), d = aH * m;
    return {
      qText: `${fmtH(d)} ÷ ${m} ＝`, decimal: true, layout: 'single', inputs: [{ label: '' }],
      check: v => parseH(v[0]) === aH,
      ansHTML: fmtH(aH),
      explain: `整数で ${d / 10} ÷ ${m} ＝ ${aH / 10}<br>こたえ ${fmtH(aH)}　✓`,
    };
  },
  frac() {
    const den = ri(3, 9);
    let op, n1, n2, rn;
    if (Math.random() < 0.5) { op = '＋'; n1 = ri(1, den - 1); n2 = ri(1, den - 1); rn = n1 + n2; }
    else { op = '−'; n1 = ri(2, den - 1); n2 = ri(1, n1 - 1); rn = n1 - n2; }
    return {
      qText: `${fracHTML(n1, den)} ${op} ${fracHTML(n2, den)} ＝`, decimal: false,
      layout: 'fraction', inputs: [{ label: '分子' }, { label: '分母' }],
      check: v => { const a = parseInt(v[0], 10), b = parseInt(v[1], 10); if (!b) return false; return a * den === rn * b; },
      ansHTML: fracHTML(rn, den),
      explain: `分母が おなじだから 分子だけ 計算しよう<br>分子：${n1} ${op} ${n2} ＝ ${rn}<br>こたえ ${fracHTML(rn, den)}　✓`,
    };
  },
  koubai() {
    const a = ri(2, 9); let b = ri(2, 9); while (b === a) b = ri(2, 9);
    const l = a * b / gcd(a, b);
    return {
      qText: `${a} と ${b} の さいしょうこうばいすう`, instr: 'いちばん 小さい 公倍数を もとめよう',
      decimal: false, layout: 'single', inputs: [{ label: '' }],
      check: v => parseInt(v[0], 10) === l,
      ansHTML: String(l),
      explain: `両方の だんに さいしょに 出てくる 数<br>${a} と ${b} → ${l}　✓`,
    };
  },
  kouyaku() {
    let a, b, d;
    do { a = ri(8, 60); b = ri(8, 60); d = gcd(a, b); } while (d < 2 || a === b);
    return {
      qText: `${a} と ${b} の さいだいこうやくすう`, instr: 'いちばん 大きい 公約数を もとめよう',
      decimal: false, layout: 'single', inputs: [{ label: '' }],
      check: v => parseInt(v[0], 10) === d,
      ansHTML: String(d),
      explain: `両方を わりきれる いちばん 大きい 数<br>${a} と ${b} → ${d}　✓`,
    };
  },
  idenbun() {
    let d1 = ri(2, 6), d2 = ri(2, 8);
    while (d2 === d1) d2 = ri(2, 8);
    let n1 = ri(1, d1 - 1), n2 = ri(1, d2 - 1);
    const add = Math.random() < 0.5;
    let rd = d1 * d2, c1 = n1 * d2, c2 = n2 * d1, rn, op;
    if (add) { op = '＋'; rn = c1 + c2; }
    else {
      if (c1 < c2) { [n1, n2] = [n2, n1]; [d1, d2] = [d2, d1]; c1 = n1 * d2; c2 = n2 * d1; }
      op = '−'; rn = c1 - c2;
    }
    return {
      qText: `${fracHTML(n1, d1)} ${op} ${fracHTML(n2, d2)} ＝`, decimal: false,
      layout: 'fraction', inputs: [{ label: '分子' }, { label: '分母' }],
      check: v => { const a = parseInt(v[0], 10), b = parseInt(v[1], 10); if (!b) return false; return a * rd === rn * b; },
      ansHTML: fracHTML(rn, rd),
      explain: `分母を そろえる（通分）→ ${rd}<br>${c1}/${rd} ${op} ${c2}/${rd} ＝ ${rn}/${rd}　✓`,
    };
  },
  decmul2() {
    const ai = ri(11, 99), bi = ri(11, 99), aH = ai * 10, bH = bi * 10, res = ai * bi;
    return {
      qText: `${fmtH(aH)} × ${fmtH(bH)} ＝`, decimal: true, layout: 'single', inputs: [{ label: '' }],
      check: v => parseH(v[0]) === res,
      ansHTML: fmtH(res),
      explain: `整数だと 思って かけ算<br>${ai} × ${bi} ＝ ${ai * bi}<br>小数点を 2つ もどして ${fmtH(res)}　✓`,
    };
  },
  decdiv2() {
    const bi = ri(11, 29), q = ri(2, 9), bH = bi * 10, aH = bi * q * 10;
    return {
      qText: `${fmtH(aH)} ÷ ${fmtH(bH)} ＝`, decimal: true, layout: 'single', inputs: [{ label: '' }],
      check: v => parseH(v[0]) === q * 100,
      ansHTML: String(q),
      explain: `わる数を 整数に するため 両方を 10ばい<br>${bi * q} ÷ ${bi} ＝ ${q}　✓`,
    };
  },
  // ---- 6年 ----
  heikin() {
    let n, nums, avg, sum, last, g = 0;
    do {
      n = ri(3, 5); avg = ri(5, 18); nums = []; sum = 0;
      for (let i = 0; i < n - 1; i++) { const x = ri(1, avg * 2); nums.push(x); sum += x; }
      last = avg * n - sum; nums.push(last); g++;
    } while ((last < 1 || last > avg * 2 + 4) && g < 40);
    return {
      qText: nums.join('、') + ' の へいきん', instr: `${n}つの 数の 平均を もとめよう`,
      decimal: false, layout: 'single', inputs: [{ label: '' }],
      check: v => parseInt(v[0], 10) === avg,
      ansHTML: String(avg),
      explain: `平均＝ ぜんぶ たして 個数で わる<br>${nums.join('＋')} ＝ ${avg * n}<br>${avg * n} ÷ ${n} ＝ ${avg}　✓`,
    };
  },
  wariai() {
    let base, pct, ans, g = 0;
    do {
      base = ri(2, 40) * 10; pct = [10, 20, 25, 40, 50, 60, 75, 80][ri(0, 7)];
      ans = base * pct / 100; g++;
    } while ((ans !== Math.round(ans) || ans < 1) && g < 40);
    return {
      qText: `${base} の ${pct}％ は？`, decimal: false, layout: 'single', inputs: [{ label: '' }],
      check: v => parseInt(v[0], 10) === ans,
      ansHTML: String(ans),
      explain: `百分率は 100で わって かける<br>${base} × ${pct} ÷ 100 ＝ ${ans}　✓`,
    };
  },
  fracmul() {
    const d1 = ri(2, 6), d2 = ri(2, 6), n1 = ri(1, d1 - 1), n2 = ri(1, d2 - 1), rn = n1 * n2, rd = d1 * d2;
    return {
      qText: `${fracHTML(n1, d1)} × ${fracHTML(n2, d2)} ＝`, decimal: false,
      layout: 'fraction', inputs: [{ label: '分子' }, { label: '分母' }],
      check: v => { const a = parseInt(v[0], 10), b = parseInt(v[1], 10); if (!b) return false; return a * rd === rn * b; },
      ansHTML: fracHTML(rn, rd),
      explain: `分子どうし・分母どうし かける<br>分子 ${n1}×${n2}＝${rn}／分母 ${d1}×${d2}＝${rd}　✓`,
    };
  },
  fracdiv() {
    const d1 = ri(2, 6), d2 = ri(2, 6), n1 = ri(1, d1 - 1), n2 = ri(1, d2 - 1), rn = n1 * d2, rd = d1 * n2;
    return {
      qText: `${fracHTML(n1, d1)} ÷ ${fracHTML(n2, d2)} ＝`, decimal: false,
      layout: 'fraction', inputs: [{ label: '分子' }, { label: '分母' }],
      check: v => { const a = parseInt(v[0], 10), b = parseInt(v[1], 10); if (!b) return false; return a * rd === rn * b; },
      ansHTML: fracHTML(rn, rd),
      explain: `わる数を ひっくり返して かける<br>${fracHTML(n1, d1)} × ${fracHTML(d2, n2)}<br>分子 ${n1}×${d2}＝${rn}／分母 ${d1}×${n2}＝${rd}　✓`,
    };
  },
};
