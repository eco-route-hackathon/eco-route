# リポジトリガイドライン

## プロジェクト構成・モジュール
- `frontend/` React + Vite（フォーム → `/compare` 呼び出し → 表表示）。
- `backend/` Node.js 22 + TypeScript（`/compare` の Lambda/ローカル実行）。
- `data/` CSV 資産（`modes.csv`、`links.csv`、`locations.csv`）。
- `infra/` 最小 IaC（API Gateway、Lambda、S3 読取権限）。
- 各パッケージは `src/` 配下に実装。テスト・型は近接配置。

## ビルド・テスト・開発コマンド
- フロント開発: `cd frontend && npm install && npm run dev`（Vite）。
- バックエンド開発: `cd backend && npm install && npm run dev`（ts-node/ローカルサーバ）。
- ビルド: 各パッケージで `npm run build`（出力は `dist/`）。
- テスト: `npm test`（Vitest/Jest。各パッケージを参照）。
- Lint/整形: `npm run lint` / `npm run format`（ESLint + Prettier）。

## コーディング規約・命名
- TypeScript strict、インデント2スペース、セミコロンあり、シングルクォート。
- ファイル名: kebab-case（例: `calc-routes.ts`）。React コンポーネントは PascalCase。
- 変数/関数: camelCase、型/インターフェース: PascalCase（例: `RoutePlan`）。
- ESLint（`@typescript-eslint`）+ Prettier を使用。未使用の export は残さない。

## テスト方針
- テスト: `*.test.ts[x]` をコード横または `src/__tests__/` に配置。
- 計算・CSV 解析は単体テストを優先。AWS SDK 呼び出しはモック。
- フロント: Testing Library + Vitest（コンポーネント/フック）。
- バックエンド: Vitest/Jest + supertest（HTTP）を適用。
- 重要経路のカバレッジは 80%以上。`/compare` の E2E を1件以上追加。

## コミット・PR ガイドライン
- Conventional Commits を採用: `feat:` `fix:` `docs:` `chore:` `test:` `refactor:`。
- スコープ例: `feat(backend): add compare handler`。
- PR には概要・背景・スクリーンショット（UI）・検証手順・関連 Issue を含める。
- CI グリーン、テスト/ lint/ format 合格をマージ条件とする。

## セキュリティと設定
- 秘密情報はコミットしない。ローカルは `.env`、クラウドはマネージドシークレット。
- 必要な環境変数（backend）: `AWS_REGION`、`ROUTE_CALCULATOR_NAME`、`S3_BUCKET`。
- `/compare` の外部入力は検証・サニタイズを徹底。

## エージェント向けメモ
- 変更は最小限で目的に集中。大規模リファクタは避ける。
- パッケージごとのスタイル/構成/スクリプトは本ガイドに従う。
- API やデータ形式を追加したら README とテストを同時更新。
