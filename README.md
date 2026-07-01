# けいさんクエスト 2.0

小学4〜6年生向け 算数学習RPG。オフライン単一HTMLで動作。

## 遊び方

- `dist/index.html` をダブルクリックするか、GitHub Pages に置くだけで動きます。
- サーバー不要・インターネット接続不要。

## 開発コマンド

```bash
npm install       # 依存関係インストール
npm run dev       # 開発サーバー起動 (Vite HMR)
npm run build     # 配布用単一 HTML を dist/ に出力
npm test          # 19ジェネレーター自己整合テスト (4000回×19 = 76000試行)
npm run extract   # keisan-quest-2.html から base64 資産を再抽出
```

## プロジェクト構成

```
src/
  data/
    generators.js   19種の問題ジェネレーター（正答ロジック保証済み）
    stages.js       12ステージ定義（物語フレーバー付き）
    enemies.js      敵データ・SVG生成
  engine/
    save.js         localStorage 管理（既存キー互換）
    progression.js  ヒーロー成長・称号・装備
    battle.js       バトルロジック補助
  fx/
    audio.js        Web Audio API 効果音エンジン（外部ファイル不要）
    particles.js    Canvas パーティクルシステム
    transitions.js  画面遷移・スクリーンシェイク
  ui/
    worldmap.js     SVG ワールドマップ描画
  main.js           ゲームメインロジック
  assets-generated.js  ← npm run extract で自動生成（base64資産）

keisan-quest-2.html   オリジナルリファレンス（変更しない）
tests/
  generators.test.js  ジェネレーター自己整合テスト
```

## アップグレード内容

| カテゴリ | 内容 |
|---|---|
| **ステージ選択** | SVG ワールドマップ（すごろく風冒険ルート）|
| **物語** | 各ステージに フレーバーテキスト・ストーリー画面 |
| **バトル演出** | Canvas パーティクル、スクリーンシェイク、ヒットフラッシュ |
| **サウンド** | Web Audio API で効果音合成（容量0追加）、BGMループ、ミュート切替 |
| **ヒント** | 問題画面に「ヒント」ボタン（explain を表示） |
| **アダプティブ** | 直近5問の正否でプール偏重を自動調整 |
| **習熟度** | ジェネレーター別 正解率をlocalStorageに記録・表示 |
| **称号** | 7種の称号（進捗・連続正解・ノーミスなど） |
| **ふくしゅう** | 弱点ジェネレーターを自動選択して練習 |
| **セーブ互換** | keisan_rpg_hero / keisan_rpg_progress キーを完全維持 |
| **アクセシビリティ** | reduced-motion 対応、高コントラスト、大タップ領域、ふりがな |

## ビルド仕様

- Vite + vite-plugin-singlefile → 単一 HTML（全資産インライン）
- 配布物は `dist/index.html` のみ（約1.3MB）
- GitHub Pages / ローカルオフライン 両対応

## 著作権

- 新規他社IPを含まない
- 敵スプライトは既存 base64 資産を流用
- 効果音は Web Audio API で合成生成（著作権フリー）
