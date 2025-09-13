# Eco-Route Backend - Local Development Setup

## ローカル開発環境のセットアップ

### 1. 環境変数の設定

```bash
# 環境変数ファイルのコピー
npm run setup:local

# または手動でコピー
cp env.example .env
```

`.env` ファイルを編集して、必要な設定を行います：

```bash
# Server Configuration
PORT=3000
NODE_ENV=development
HOST=localhost

# AWS Configuration (開発用)
AWS_REGION=ap-northeast-1
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key

# Route Calculator Configuration
ROUTE_CALCULATOR_NAME=eco-route-calculator-dev

# S3 Configuration
S3_BUCKET=eco-route-data-dev
S3_DATA_PREFIX=data/

# CORS Configuration
CORS_ORIGIN=http://localhost:5173

# Logging Configuration
LOG_LEVEL=debug
```

### 2. ローカル開発モードでの起動

#### オプション 1: ローカルCSVファイルを使用
```bash
npm run dev:local
```

このモードでは、`data/` ディレクトリ内のCSVファイルを直接読み込みます。

#### オプション 2: AWS S3を使用
```bash
npm run dev
```

このモードでは、AWS S3からCSVファイルを読み込みます。

### 3. ローカルデータファイル

`data/` ディレクトリに以下のファイルが含まれています：

- `modes.csv` - 輸送手段の設定
- `locations.csv` - 都市と港のデータ
- `links.csv` - 港間の船舶ルート

### 4. API エンドポイント

開発サーバー起動後、以下のエンドポイントが利用可能です：

- **ヘルスチェック**: `GET http://localhost:3000/health`
- **ルート比較**: `POST http://localhost:3000/compare`

### 5. フロントエンドとの連携

フロントエンドは `http://localhost:5173` で動作することを想定しています。
CORS設定により、このオリジンからのリクエストが許可されています。

### 6. トラブルシューティング

#### ポートが使用中の場合
```bash
# 別のポートを使用
PORT=3001 npm run dev:local
```

#### AWS認証エラーの場合
ローカル開発では、AWS認証情報が不要な場合があります。
`.env` ファイルで `LOCAL_DATA_PATH=./data` を設定することで、
ローカルファイルを使用できます。

#### データファイルが見つからない場合
`data/` ディレクトリに必要なCSVファイルが存在することを確認してください。

### 7. 開発用コマンド

```bash
# ローカル開発サーバー起動
npm run dev:local

# 通常の開発サーバー起動（S3使用）
npm run dev

# テスト実行
npm test

# リンター実行
npm run lint

# 型チェック
npm run typecheck
```
