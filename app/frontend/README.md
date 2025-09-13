# Eco Route Frontend

React + TypeScript + Viteを使用したエコルートMVPのフロントエンドアプリケーション。

## 🚀 開発環境のセットアップ

### 依存関係のインストール
```bash
npm install
```

### 開発サーバーの起動
```bash
npm run dev
```

### 本番ビルド
```bash
npm run build
npm run preview
```

## 🔧 環境変数設定

### API接続先の設定

アプリケーションは環境に応じて自動的にAPIエンドポイントを切り替えます。

**開発環境（npm run dev）**:
- ファイル: `.env.development`
- API URL: `http://localhost:3000`

**本番環境（npm run build）**:
- ファイル: `.env.production`
- API URL: `https://im6bg2tvct.us-east-1.awsapprunner.com`

**ローカル開発（個人設定）**:
- ファイル: `.env.local`（最優先）
- 例: `.env.local.example`をコピーして使用

### 環境変数の設定例

```bash
# .env.local
VITE_API_URL=http://localhost:3000
VITE_DEV_MODE=true
VITE_LOG_LEVEL=debug
```

### API接続テスト

本番APIをローカルでテストする場合:
```bash
VITE_API_URL=https://im6bg2tvct.us-east-1.awsapprunner.com npm run dev
```

## 📁 プロジェクト構造

```
src/
├── components/          # Reactコンポーネント
│   ├── ComparisonForm.tsx
│   ├── ResultsDisplay.tsx
│   └── ComparisonChart.tsx
├── hooks/              # カスタムフック
│   └── useComparisonAPI.ts
├── styles/             # CSSモジュール
│   ├── App.module.css
│   └── components/
├── types.ts            # TypeScript型定義
├── utils/              # ユーティリティ関数
└── App.tsx             # メインアプリケーション
```

## 🎯 主な機能

- 🌱 輸送ルート比較フォーム
- 📊 結果表示（時間・コスト・CO2排出量）
- 📈 インタラクティブなグラフ表示
- 🔄 環境自動切り替え
- 📱 レスポンシブデザイン

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      ...tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      ...tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      ...tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
