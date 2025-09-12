# handoff.md

## 0. 目的と現状
- 目的: 国内向け「トラック vs トラック+内航船」を時間/コスト/CO2で比較し、最小案を返すAPIと簡易UIのMVPを完成させる。
- 現状: リポジトリ名は `eco-route`。`frontend/`, `backend/`, `data/`, `infra/` の空雛形あり想定。`README.md` も存在。

## 1. スコープ（最初のPOC/MVP）
- 比較対象: `truck` と `truck+ship` の2案（必要に応じて増やす）。
- 入力: 出発地 `origin`、到着地 `destination`、貨物重量 `weight_kg`、重み `weights{time,cost,co2}`。
- 出力: 各案の `time_h` `cost_jpy` `co2_kg` と `recommendation`（重み付き最小）。
- 非スコープ: 厳密な実運賃、ISO完全準拠、地図描画、ルート最適化（NSGA-II等）は後回し。

## 2. 実行方法（ローカル）
- フロント: `cd frontend && npm install && npm run dev`
- バックエンド: `cd backend && npm install && npm run dev`（Express互換で起動→後でLambda対応）

## 3. API 契約（確定版）
- `POST /compare`
- Request:
```json
{
  "origin": "Tokyo",
  "destination": "Osaka",
  "weight_kg": 500,
  "weights": { "time": 0.5, "cost": 0.3, "co2": 0.2 }
}
```
- Response（例）:
```json
{
  "candidates": [
    { "plan": "truck", "time_h": 7.2, "cost_jpy": 35000, "co2_kg": 25.1 },
    { "plan": "truck+ship", "time_h": 14.0, "cost_jpy": 21000, "co2_kg": 8.3 }
  ],
  "recommendation": "truck",
  "rationale": {
    "truck": { "distance_km": 520 },
    "truck+ship": { "legs": [
      {"from":"Tokyo","to":"TokyoPort","mode":"truck","distance_km":15},
      {"from":"TokyoPort","to":"OsakaPort","mode":"ship","distance_km":410},
      {"from":"OsakaPort","to":"Osaka","mode":"truck","distance_km":12}
    ]}
  }
}
```

## 4. 計算ロジック（MVP）
- 共通: スコア `score = α*time_h + β*cost_jpy + γ*co2_kg`。最小が推奨。
- `truck`: 距離・時間は Amazon Location Routes から取得。`cost = distance_km * modes.csv.cost_per_km`。`co2 = distance_km * modes.csv.co2_kg_per_ton_km * (weight_kg/1000)`。
- `truck+ship`: `origin→最寄港→港間→最寄港→destination` を `links.csv` で合算。`links.csv` に無い港ペアは今回は除外。

## 5. データ仕様（CSV）
- `data/modes.csv`  
  `mode,cost_per_km,co2_kg_per_ton_km,avg_speed_kmph`（例: `truck,50,0.1,60` / `ship,20,0.02,20`）
- `data/links.csv`（港↔港の距離・時間）  
  `from,to,mode,distance_km,time_hours`
- `data/locations.csv`（都市/港）  
  `id,name,lat,lon,type`（`type` は `city|port`）

## 6. 技術スタック（固定）
- Runtime: Node.js 22 LTS（Lambda ランタイム `nodejs22.x`）。
- 言語: TypeScript 5.x。
- フロント: React + Vite。
- バックエンド: API Gateway + Lambda（Node 22）。
- SDK: AWS SDK for JavaScript v3（`@aws-sdk/client-location` など）。
- 距離/時間: Amazon Location Service Routes API。
- ホスティング: Amplify Hosting（Git連携CI/CD）。
- データ置き場: S3（CSVを配置）。必要なら DynamoDB を後付け。

## 7. 環境変数（.env 例）
```
AWS_REGION=ap-northeast-1
ROUTE_CALCULATOR_NAME=<Amazon Location の Route calculator 名>
S3_BUCKET=<CSVを置くS3バケット名>
```
Routes API は「Route calculator を作成→CalculateRoute/CalculateRoutes を呼び出し」。

## 8. リポジトリ構成（期待形）
```
eco-route/
  frontend/           # React + Vite（フォーム→/compare→表表示）
  backend/            # /compare（Express互換→Lambdaハンドラ）
    src/
      handler.ts
      calc.ts
      types.ts
  data/               # modes.csv / links.csv / locations.csv
  infra/              # CDK 最小（API GW + Lambda + S3 読取権限）
  README.md
  handoff.md
```

## 9. codex への最初のプロンプト（貼り付け用）
```
あなたはTypeScript/NodeとAWSに強い実装アシスタントです。目的は国内向け「eco-route」MVPの完成です。

【スコープ】
- 比較対象: truck / truck+ship
- 出力: time_h, cost_jpy, co2_kg, recommendation
- 評価式: score = α*time + β*cost + γ*co2（デフォ 0.5/0.3/0.2）

【技術】
- Backend: Node 22 (Lambda), AWS SDK v3。Amazon Location Routes APIで距離・時間を取得。
- Frontend: React + Vite。フォームから /compare を叩き、表表示。
- Data: S3上の CSV（modes, links, locations）。

【やる順番】
1) backend: /compare を TypeScriptで実装（ローカルExpress→後でLambda化）。
2) data: CSV読み込み→計算→JSON返却。links が無い区間は truck 直行のみで計算。
3) frontend: 入力フォーム + 結果表を実装。
4) infra: CDK 最小（API GW + Lambda + S3 読取権限）。
5) docs: OpenAPI 3.1 最小yaml（/compare のみ）。
```

## 10. バックログ（実装順）
1. `/compare` 実装と単体テスト。
2. `links.csv` に港ペア（例: 門司↔大阪南港↔東京）を3件追加。
3. フロントのフォームと結果表。
4. CDK で API GW + Lambda + S3 読取権限の最小スタック。
5. OpenAPI 3.1 の最小yaml。
6. Amplify Hosting でフロントをデプロイ。

## 11. 品質ゲート（MVPの合格基準）
- API が 3つ以上の固定テストケースで一貫した値を返す。
- レスポンスに根拠（距離、係数、採用リンク）が含まれる。
- ブラウザから入力→比較表が表示できる。

## 12. 参考（将来対応）
- ISO 14083 / GLEC 準拠の係数への置換。
- ルート探索・最適化（OR-Toolsなど）の導入。
- 鉄道/航空の追加、地図描画、キャッシュ。

## 13. 参考情報（外部ドキュメント）
- Lambda Node.js 22 ランタイム、`nodejs22.x`
- AWS SDK for JavaScript v3（JS/TS向け）
- Amazon Location Service Routes（CalculateRoute/CalculateRoutes）
- Amplify Hosting（Git連携CI/CD）
- ISO 14083（輸送チェーンのGHG算定標準） / GLEC Framework（ロジスティクスGHG算定ガイド）

