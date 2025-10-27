# Shinwa Agent Backend

自律型AIエージェントのバックエンドシステム

## 概要

このプロジェクトは、認知アーキテクチャに基づいた自律型AIエージェントのバックエンドシステムです。FastAPIを使用したREST API / WebSocketサーバーとして実装されています。

### 主な機能

- **対話管理（Dialogue Manager）** - 自然言語での対話と意図理解
- **記憶システム（Memory System）** - エピソード記憶、セマンティック記憶、ワーキングメモリ
- **計画と実行（Planning & Execution）** - 目標の分解と実行制御
- **アクチュエータ（Actuators）** - Web検索、ファイル操作、データベース連携
- **プロアクティブ機能（Proactive Features）** - 能動的な提案と支援

## 技術スタック

- **言語:** Python 3.11
- **Webフレームワーク:** FastAPI
- **AIモデル:** Manus組み込みAI（OpenAI互換API）
- **データベース:** SQLite（開発）/ PostgreSQL（本番）
- **キャッシュ:** Redis
- **ベクトル検索:** ChromaDB
- **依存関係管理:** Poetry

## セットアップ

### 1. 依存関係のインストール

```bash
cd backend
poetry install
```

### 2. 環境変数の設定

```bash
cp .env.example .env
# .envを編集して必要な設定を行う
```

**重要:** `OPENAI_API_KEY`と`OPENAI_BASE_URL`は、Manusのサンドボックス環境では自動的に設定されます。

### 3. データベースのセットアップ（今後実装）

```bash
poetry run python scripts/init_db.py
```

### 4. 開発サーバーの起動

```bash
poetry run uvicorn src.shinwa_agent.main:app --reload --host 0.0.0.0 --port 8000
```

または、Poetry経由で：

```bash
poetry run python -m src.shinwa_agent.main
```

## API仕様

- **ベースURL:** `http://localhost:8000`
- **ドキュメント（Swagger UI）:** `http://localhost:8000/docs`
- **ReDoc:** `http://localhost:8000/redoc`

### 主要エンドポイント

- `GET /` - ルートエンドポイント
- `GET /health` - ヘルスチェック
- `POST /api/v1/chat` - チャット（今後実装）
- `GET /api/v1/memory/episodic` - エピソード記憶検索（今後実装）
- `GET /api/v1/memory/semantic` - セマンティック記憶検索（今後実装）
- `WS /ws/chat` - WebSocketチャット（今後実装）

## テスト

```bash
poetry run pytest
```

カバレッジレポート付き：

```bash
poetry run pytest --cov=src/shinwa_agent --cov-report=html
```

## プロジェクト構造

```
backend/
├── src/
│   └── shinwa_agent/
│       ├── main.py              # FastAPIエントリーポイント
│       ├── config/              # 設定管理
│       ├── core/                # コアエンジン
│       ├── memory/              # 記憶システム
│       ├── actuators/           # アクチュエータ
│       ├── api/                 # API層
│       ├── models/              # データモデル
│       ├── security/            # セキュリティ
│       ├── utils/               # ユーティリティ
│       └── proactive/           # プロアクティブ機能
├── tests/                       # テストコード
├── config/                      # 設定ファイル
├── scripts/                     # スクリプト
├── pyproject.toml               # Poetry設定
└── README.md
```

## 開発ロードマップ

### フェーズ1：基盤構築（現在）

- [x] プロジェクト構造の構築
- [x] FastAPI基本セットアップ
- [ ] Dialogue Managerの実装
- [ ] Working Memoryの実装
- [ ] Web Actuatorの実装
- [ ] Episodic Memoryの基本実装

### フェーズ2：記憶と学習能力の強化

- [ ] Semantic Memoryの実装
- [ ] Memory APIの統合
- [ ] Attention Mechanismの実装
- [ ] Introspectionの実装

### フェーズ3：アクチュエータと外部連携

- [ ] File Actuatorの実装
- [ ] Database Actuatorの実装
- [ ] Actuator Registryの実装

### フェーズ4：プロアクティブ機能と高度化

- [ ] Trigger Systemの実装
- [ ] Proactive Candidate Generationの実装
- [ ] Learning & Personalizationの実装

## ライセンス

（プロジェクトのライセンスを記載）

## 貢献

（貢献ガイドラインを記載）

