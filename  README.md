# eco-route

国内向けの最適輸送モード比較（トラック vs トラック+内航船）。入力から時間/コスト/CO2を算出し、推奨案を返す。

## 技術スタック
- Node.js 22 LTS / TypeScript 5.9
- React 19 + Vite（フロント）
- API Gateway + Lambda (nodejs22.x)
- Amazon Location Service Routes（距離・時間）
- S3（係数CSV・港間テーブル）
- AWS SDK for JavaScript v3

## ディレクトリ
- `frontend/` … React + Vite
- `backend/` … Lambda ハンドラ（/compare）
- `data/` … `modes.csv`, `links.csv`, `locations.csv` など

## 使い方（ローカル開発）
```bash
# フロント
cd frontend
npm install
npm run dev

# バックエンド（ローカル実行例）
cd ../backend
npm install
npm run dev  # ts-node / nodemon 等で起動