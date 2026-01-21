# Shinwa - AI Novel Writing Engine

限りなくすぐれたAIによる小説執筆エンジン

## 概要

Shinwaは、AI技術を活用した高度な小説執筆支援システムです。フロー駆動型のアーキテクチャにより、一貫性のある物語を自律的に生成することができます。

### 主な特徴

- **フロー駆動型執筆**: 定義されたフローに従って自律的に執筆を進行
- **多層的な物語管理**: 本編、裏で進行する出来事、状態管理を統合
- **複数AIプロバイダー対応**: OpenAI、Anthropicの最新モデルに対応
- **カスタムモデル対応**: 新しいAPIモデルにも柔軟に対応可能
- **伏線管理システム**: 伏線の配置と回収を自動追跡
- **一貫性チェック**: キャラクター、世界観、時系列の整合性を検証

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.local.example`を`.env.local`にコピーし、APIキーを設定：

```bash
cp .env.local.example .env.local
```

```env
NEXT_PUBLIC_OPENAI_API_KEY=your-openai-api-key
NEXT_PUBLIC_ANTHROPIC_API_KEY=your-anthropic-api-key
```

### 3. 開発サーバーの起動

```bash
npm run dev
```

http://localhost:3000 でアプリケーションにアクセスできます。

## GitHub Pages へのデプロイ

このリポジトリは GitHub Pages で静的ホスティングできるように設定されています。`main` ブランチに push すると、`deploy-pages.yml` が実行されて `out/` を公開します。

### 注意点（静的サイト制約）
- GitHub Pages は静的ホスティングのため、API ルート・認証・Stripe・DB などのサーバー機能は動作しません。
- AI 生成などのサーバー依存機能は GitHub Pages では利用できません。
- フル機能を利用する場合は、従来どおりサーバーを持つ環境（Render など）でのデプロイが必要です。

### ローカルでの確認方法
```bash
# GitHub Pages と同じ静的ビルド
GITHUB_PAGES=true npm run build

# out/ を簡易サーバーで確認（任意）
npx serve out
```

## 使い方

### AI設定

1. 「AI設定」ボタンをクリック
2. 使用するAIプロバイダー（OpenAI/Anthropic）を選択
3. APIキーを入力
4. 使用するモデルを選択（カスタムモデルも追加可能）
5. Temperature等のパラメータを調整
6. 「保存」をクリック

### 執筆フローの実行

1. AI設定が完了していることを確認
2. 「フロー実行」ボタンをクリック
3. 実行ログで進行状況を確認

## アーキテクチャ

### ディレクトリ構造

```
src/
├── app/                # Next.js App Router
├── components/         # UIコンポーネント
│   ├── ui/            # 基本UIコンポーネント
│   ├── settings/      # 設定関連コンポーネント
│   ├── flow/          # フロー管理コンポーネント
│   └── editor/        # エディターコンポーネント
├── lib/               # ライブラリ
│   ├── ai/           # AI統合レイヤー
│   ├── services/     # ビジネスロジック
│   ├── store/        # 状態管理
│   ├── types/        # 型定義
│   └── utils/        # ユーティリティ
└── data/             # データ定義
    ├── flows/        # フロー定義
    ├── rules/        # 執筆ルール
    └── templates/    # テンプレート
```

### 主要コンポーネント

- **FlowEngine**: フローの実行を管理
- **FlowExecutor**: 各ステップの具体的な実行処理
- **AIManager**: 複数のAIプロバイダーを統一的に管理
- **AIProvider**: 各AIプロバイダーの実装

## 対応モデル

### OpenAI
- GPT-4o（最新版含む）
- GPT-4o Mini
- GPT-4 Turbo
- GPT-3.5 Turbo
- O1 Preview/Mini（推論モデル）

### Anthropic
- Claude 3.5 Sonnet/Haiku
- Claude 3 Opus/Sonnet/Haiku
- Claude 2.1
- Claude Instant

## 今後の実装予定

- 執筆ルールエンジンの強化
- 物語状態管理システムの詳細実装
- リッチテキストエディター
- プロジェクト管理機能
- エクスポート機能（PDF/EPUB）
- 協調執筆機能

## ライセンス

MIT License
