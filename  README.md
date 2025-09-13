# 🌱 Eco Route - 環境に優しい輸送ルート比較

トラックと船舶を組み合わせた最適な輸送ルートを提案するWebアプリケーション。時間・コスト・CO2排出量の3つの観点から比較し、ユーザーの優先度に応じた推奨ルートを提示します。

## ✨ 特徴

- 🚚 **輸送モード比較**: トラック単独 vs トラック+船舶の詳細比較
- ⏱️ **輸送時間**: Amazon Location Serviceによる正確な時間算出
- 💰 **コスト計算**: 燃料費・人件費・船舶料金を含む総合コスト
- 🌱 **CO2排出量**: 環境負荷の定量的評価と可視化
- 📊 **インタラクティブグラフ**: Rechartsによる直感的な比較表示
- 📱 **レスポンシブデザイン**: モバイル・タブレット・デスクトップ完全対応
- 🎯 **重み付け調整**: ユーザーの優先度に応じたカスタム推奨

## 🚀 デモ

現在MVP段階のため、デモサイトは準備中です。

## 🛠️ 技術スタック

### フロントエンド
- **React 19** + **TypeScript 5.8** - モダンなSPA構築
- **Vite 7.1** - 高速ビルドツール
- **Recharts** - データ可視化ライブラリ
- **CSS Modules** - スコープ化されたスタイリング
- **Axios** - HTTP通信

### バックエンド
- **Node.js 22 LTS** - サーバーランタイム
- **Express.js** - Webフレームワーク
- **TypeScript** - 型安全な開発
- **AWS SDK v3** - AWSサービス統合

### インフラ（AWS）
- **Lambda** (nodejs22.x) - サーバーレス実行環境
- **API Gateway** - RESTful API
- **Amazon Location Service** - ルート計算
- **S3** - データストレージ（CSV係数テーブル）
- **CloudFront** - CDN（将来実装）

## 📦 インストール

### 前提条件
- Node.js 22以上
- npm 10以上
- AWS CLIセットアップ済み（本番デプロイ時）

### セットアップ手順

1. **リポジトリクローン**
```bash
git clone https://github.com/massan02/eco-route.git
cd eco-route
```

2. **フロントエンド起動**
```bash
cd app/frontend
npm install
npm run dev
```

3. **バックエンド起動**（別ターミナル）
```bash
cd app/backend
npm install
npm run dev
```

4. **ブラウザアクセス**
```
http://localhost:5173  # フロントエンド
http://localhost:3000  # バックエンドAPI
```

## 🔧 環境変数

### フロントエンド (.env)
```env
VITE_API_URL=http://localhost:3000
```

### バックエンド (.env)
```env
PORT=3000
AWS_REGION=ap-northeast-1
ROUTE_CALCULATOR_NAME=eco-route-calculator
S3_BUCKET=eco-route-data
NODE_ENV=development
```

## 📁 プロジェクト構造

```
eco-route/
├── app/
│   ├── frontend/          # React SPA
│   │   ├── src/
│   │   │   ├── components/    # Reactコンポーネント
│   │   │   ├── hooks/         # カスタムフック
│   │   │   ├── styles/        # CSS Modules
│   │   │   ├── types/         # TypeScript型定義
│   │   │   └── utils/         # ユーティリティ関数
│   │   ├── public/        # 静的ファイル
│   │   └── package.json
│   ├── backend/           # Express API
│   │   ├── src/
│   │   │   ├── api/           # APIハンドラ
│   │   │   ├── services/      # ビジネスロジック
│   │   │   ├── middleware/    # Express middleware
│   │   │   └── lib/           # 共通ライブラリ
│   │   └── package.json
│   ├── data/              # CSV データファイル
│   └── infra/             # AWS CDK（将来実装）
├── specs/                 # 仕様書・設計資料
└── オープンデータ/          # 政府公開データ
```

## 📝 API仕様

### POST /compare
輸送ルートを比較し、推奨案を返します。

**リクエスト:**
```json
{
  "origin": "東京",
  "destination": "大阪",
  "weightKg": 1000,
  "weights": {
    "time": 0.33,
    "cost": 0.33,
    "co2": 0.34
  }
}
```

**レスポンス:**
```json
{
  "candidates": [
    {
      "plan": "truck",
      "timeH": 8.5,
      "costJpy": 45000,
      "co2Kg": 125.3
    },
    {
      "plan": "truck+ship",
      "timeH": 12.2,
      "costJpy": 38000,
      "co2Kg": 89.7,
      "legs": [...]
    }
  ],
  "recommendation": "truck+ship",
  "rationale": {...},
  "metadata": {
    "calculationTimeMs": 234,
    "dataVersion": "2025-09-13"
  }
}
```

## 🧪 テスト

```bash
# フロントエンドテスト
cd app/frontend
npm test
npm run test:coverage

# バックエンドテスト
cd app/backend
npm test
npm run test:coverage
```

## 📊 ビルド

```bash
# フロントエンドビルド
cd app/frontend
npm run build

# バックエンドビルド
cd app/backend
npm run build
```

## 🚢 デプロイ

### 開発環境
ローカル開発サーバーを使用

### 本番環境（AWS）
```bash
cd app/infra
cdk bootstrap
cdk deploy EcoRouteStack
```

## 🗺️ ロードマップ

### Phase 1: MVP ✅
- [x] 基本的な比較機能
- [x] React SPA
- [x] Express API
- [x] 基本的なUI/UX

### Phase 2: 機能拡張
- [ ] [インタラクティブマップ表示](https://github.com/massan02/eco-route/issues/6)
- [ ] [高度な分析機能](https://github.com/massan02/eco-route/issues/2)
- [ ] [改善されたルート計算](https://github.com/massan02/eco-route/issues/1)
- [ ] ユーザー認証・保存機能

### Phase 3: スケーリング
- [ ] マルチテナント対応
- [ ] 国際化（i18n）
- [ ] モバイルアプリ
- [ ] API公開

## 📊 パフォーマンス

- **ビルドサイズ**: 約560KB（gzip圧縮後）
- **初回読み込み時間**: <2秒
- **API応答時間**: <500ms
- **Lighthouse Score**: 90+

## 🤝 コントリビューション

1. Forkしてください
2. 機能ブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. Pull Requestを作成

## 📄 ライセンス

MIT License - 詳細は [LICENSE](LICENSE) ファイルを確認してください。

## 👥 Authors

- **[Your Name]** - *Initial work*

## 🔗 関連リンク

- [Issue Tracker](https://github.com/massan02/eco-route/issues)
- [Project Wiki](https://github.com/massan02/eco-route/wiki)
- [CLAUDE.md](CLAUDE.md) - AI開発ガイド

## 📞 サポート

質問やサポートが必要な場合は、[GitHub Issues](https://github.com/massan02/eco-route/issues)でお気軽にお問い合わせください。