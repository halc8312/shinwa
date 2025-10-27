# Shinwa - プロジェクト構造

## 概要

このリポジトリには、2つの主要なプロジェクトが含まれています。

### 1. フロントエンド（既存）- AI小説執筆エンジン

**ディレクトリ:** ルート（`/shinwa`）

AI技術を活用した高度な小説執筆支援システムです。Next.js（TypeScript）で実装されています。

**技術スタック:**
- Next.js 14
- React
- TypeScript
- Prisma
- Stripe

**主な機能:**
- フロー駆動型執筆
- 多層的な物語管理
- 複数AIプロバイダー対応
- 伏線管理システム
- 一貫性チェック

### 2. バックエンド（新規）- 自律型AIエージェント

**ディレクトリ:** `/backend`

認知アーキテクチャに基づいた自律型AIエージェントのバックエンドシステムです。Python（FastAPI）で実装されています。

**技術スタック:**
- Python 3.11
- FastAPI
- Manus組み込みAI
- PostgreSQL / SQLite
- Redis
- ChromaDB

**主な機能:**
- 対話管理（Dialogue Manager）
- 記憶システム（Episodic / Semantic / Working Memory）
- 計画と実行（Planning & Execution）
- アクチュエータ（Web / File / Database）
- プロアクティブ機能（能動的提案）

---

## ディレクトリ構造

```
shinwa/
├── frontend/              # （将来的に移動予定）Next.jsフロントエンド
├── backend/               # 自律型AIエージェント（Python）
│   ├── src/
│   │   └── shinwa_agent/
│   │       ├── main.py
│   │       ├── config/
│   │       ├── core/
│   │       ├── memory/
│   │       ├── actuators/
│   │       ├── api/
│   │       └── ...
│   ├── tests/
│   ├── config/
│   ├── scripts/
│   ├── pyproject.toml
│   └── README.md
├── docs/                  # 共通ドキュメント
├── .github/               # CI/CD
├── src/                   # （既存）Next.jsソースコード
├── package.json           # （既存）Node.js依存関係
└── README.md              # プロジェクト全体の説明
```

---

## 開発環境のセットアップ

### フロントエンド（既存）

```bash
# ルートディレクトリで
npm install
npm run dev
# http://localhost:3000
```

### バックエンド（新規）

```bash
cd backend
poetry install
cp .env.example .env
# .envを編集
poetry run uvicorn src.shinwa_agent.main:app --reload
# http://localhost:8000
```

---

## 連携方法

フロントエンド（Next.js）とバックエンド（FastAPI）は、REST API / WebSocketで連携します。

- **フロントエンド → バックエンド:** HTTP/WebSocket通信
- **認証:** JWTトークンを使用
- **データベース:** 必要に応じて共有または分離

---

## 開発ロードマップ

### フェーズ1：基盤構築（現在）

- [x] バックエンドプロジェクト構造の構築
- [x] FastAPI基本セットアップ
- [ ] Dialogue Managerの実装
- [ ] Working Memoryの実装
- [ ] Web Actuatorの実装

### フェーズ2：記憶と学習能力の強化

- [ ] Semantic Memoryの実装
- [ ] Memory APIの統合
- [ ] Attention Mechanismの実装

### フェーズ3：アクチュエータと外部連携

- [ ] File Actuatorの実装
- [ ] Database Actuatorの実装

### フェーズ4：プロアクティブ機能と高度化

- [ ] Trigger Systemの実装
- [ ] Proactive Candidate Generationの実装
- [ ] Learning & Personalizationの実装

---

## 関連ドキュメント

- [バックエンドREADME](./backend/README.md)
- [技術スタック選定](../tech_stack_decision.md)
- [アーキテクチャ設計](../architecture_design.md)
- [開発ロードマップ](../ai_agent_development_roadmap.md)
- [タスクリスト](../ai_agent_development_tasks.json)

