/**
 * ジェネレーター自己整合テスト
 * 各ジェネレーターを 4000回試行し、answer が自身の check を満たすことを確認する
 */
import { GEN } from '../src/data/generators.js';

const TRIALS = 4000;
const results = [];
let allPassed = true;

for (const [name, generator] of Object.entries(GEN)) {
  let passed = 0;
  let failed = 0;
  const errors = [];

  for (let i = 0; i < TRIALS; i++) {
    try {
      const prob = generator();
      // ansHTML から正答を取り出して check にかける
      // layout が fraction の場合は ansHTML が <span class="frac">... なので別処理
      let answerValues;

      if (prob.layout === 'fraction') {
        // fracHTML の中身を regex で取り出す
        const matches = [...prob.ansHTML.matchAll(/<span class="num">(\d+)<\/span>/g)];
        const numStr = matches[0]?.[1];
        const denMatches = [...prob.ansHTML.matchAll(/<span class="den">(\d+)<\/span>/g)];
        const denStr = denMatches[0]?.[1];
        answerValues = [numStr, denStr];
      } else if (prob.layout === 'divrem') {
        // ansHTML は "q あまり r" 形式
        const parts = prob.ansHTML.split(' あまり ');
        answerValues = [parts[0], parts[1]];
      } else {
        // single: ansHTML は数値文字列
        answerValues = [prob.ansHTML];
      }

      const ok = prob.check(answerValues);
      if (ok) {
        passed++;
      } else {
        failed++;
        if (errors.length < 3) {
          errors.push({ qText: prob.qText, ans: prob.ansHTML, vals: answerValues });
        }
      }
    } catch (e) {
      failed++;
      if (errors.length < 3) {
        errors.push({ error: e.message });
      }
    }
  }

  const ok = failed === 0;
  if (!ok) allPassed = false;

  results.push({ name, passed, failed, ok, errors });
}

// 結果表示
let totalPassed = 0;
let totalFailed = 0;

for (const r of results) {
  const icon = r.ok ? '✓' : '✗';
  const pct = ((r.passed / TRIALS) * 100).toFixed(1);
  console.log(`${icon} ${r.name.padEnd(12)} ${r.passed}/${TRIALS} (${pct}%)`);
  if (!r.ok) {
    for (const e of r.errors) {
      if (e.error) {
        console.log(`    ERROR: ${e.error}`);
      } else {
        console.log(`    FAIL: q=${e.qText} ans=${e.ans} vals=${JSON.stringify(e.vals)}`);
      }
    }
  }
  totalPassed += r.passed;
  totalFailed += r.failed;
}

console.log('');
console.log(`合計: ${totalPassed}/${totalPassed + totalFailed} 通過`);

if (allPassed) {
  console.log('✓ 全ジェネレーターテスト通過！');
  process.exit(0);
} else {
  console.error('✗ テスト失敗があります');
  process.exit(1);
}
