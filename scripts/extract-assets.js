#!/usr/bin/env node
/**
 * keisan-quest 資産抽出スクリプト
 * keisan-quest-2.html から IMG / WIMG の base64 データを抽出して
 * src/assets-generated.js として ES モジュール化する。
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import vm from 'vm';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'keisan-quest-2.html');
const OUT = path.join(ROOT, 'src', 'assets-generated.js');

const html = fs.readFileSync(SRC, 'utf8');

// <script> 内を取り出す
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
if (!scriptMatch) { console.error('script tag not found'); process.exit(1); }
const script = scriptMatch[1];

// IMG / WIMG ブロックを正規表現で切り出す（base64 文字列は } を含まないので安全）
const imgBlock  = script.match(/var IMG=(\{[\s\S]*?\});/);
const wimgBlock = script.match(/var WIMG=(\{[\s\S]*?\});/);
if (!imgBlock || !wimgBlock) { console.error('IMG/WIMG not found'); process.exit(1); }

// sandbox で評価してオブジェクトを得る
const ctx = vm.createContext({ IMG: null, WIMG: null });
vm.runInContext(`var IMG=${imgBlock[1]}; var WIMG=${wimgBlock[1]};`, ctx);
const IMG  = ctx.IMG;
const WIMG = ctx.WIMG;

// タイトル背景画像を HTML から取り出す
const titleBgMatch = html.match(/class="title-bg" src="(data:[^"]+)"/);
const TITLE_BG = titleBgMatch ? titleBgMatch[1] : '';

// ヒーロースプライト配列（src を正規表現で取り出す）
const heroSpriteMatches = [...html.matchAll(/class="hero-sprite"[^>]+src="(data:[^"]+)"/g)];
const HERO_SPRITES = heroSpriteMatches.map(m => m[1]);

// JSON シリアライズ（大きいが正確）
const IMGjson  = JSON.stringify(IMG);
const WIMGjson = JSON.stringify(WIMG);

const out = `// !! 自動生成ファイル - scripts/extract-assets.js で更新 !!
// keisan-quest-2.html から base64 資産を抽出

export const IMG = ${IMGjson};

export const WIMG = ${WIMGjson};

export const TITLE_BG = ${JSON.stringify(TITLE_BG)};
`;

fs.writeFileSync(OUT, out);
console.log(`✓ assets-generated.js を出力しました (${Math.round(fs.statSync(OUT).size/1024)}KB)`);
