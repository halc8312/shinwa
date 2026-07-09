# Shinwa リポジトリ横断分析レポート

**分析日**: 2026-07-09
**対象**: `halc8312/shinwa` main ブランチ（HEAD: `ebc8127`）
**手法**: 全レイヤーのソースコード精読、`tsc --noEmit` / `next build` / `jest` の実測、git 履歴分析

---

## 1. エグゼクティブサマリー

Shinwa は Next.js 14 (App Router) + TypeScript 製の AI 小説執筆エンジン（約 28,000 行の TS/TSX、88 コミット）。フロー駆動の章生成、伏線トラッキング、世界地図・移動シミュレーションなど、ドメイン設計としては独創的で作り込みが深い。

しかし現在の main は **「Manus 組み込み AI 対応」(commit `46e11e0`) を境に、SaaS としての根幹（認証・課金ゲート・マルチプロバイダー対応）が意図的に無効化された状態** にあり、さらに **プロダクションビルドが型エラーで失敗する**。ドキュメント（CLAUDE.md / README / .env.example）は改造前の姿を記述しており、実装と大きく乖離している。

**現状の実測結果:**

| チェック | 結果 |
|---|---|
| `npm run build` | ❌ **失敗**（`src/app/api/auth/register/route.ts:56` 型エラー） |
| `npx tsc --noEmit` | ❌ 5 ファイル 8 エラー（本体 1 件 + テスト 4 件） |
| `npx jest` | ⚠️ 20 テスト中 3 失敗（4 スイート中 2 失敗） |
| `npm run lint` | ❌ ESLint 未設定（対話プロンプトが出て CI では動かない） |

---

## 2. リポジトリの全体構造

```
shinwa/
├── src/                    # Next.js アプリ本体（28,292 行）
│   ├── app/                # App Router（ページ + API ルート）
│   ├── components/         # 機能別 UI（ai/chapter/character/dashboard/world/...）
│   ├── lib/
│   │   ├── ai/             # AI 統合レイヤー（client → API → provider）
│   │   ├── services/       # ビジネスロジック（19 サービス、9,728 行）
│   │   ├── auth/ store/ utils/ types/
│   └── data/               # フロー定義・デフォルト執筆ルール
├── prisma/                 # スキーマ + マイグレーション（現在 SQLite）
├── backend/                # Python/FastAPI「自律エージェント」の空スケルトン
├── .github/workflows/      # @claude メンション駆動の PR アシスタント
└── *.md                    # 調査レポート類が多数ルートに散在
```

### アーキテクチャの実際の姿（3 層 + 二重ストレージ）

```
[ブラウザ]
  UI コンポーネント
    → サービス層（ProjectService, ChapterService, ...）→ localStorage が主データストア
    → AIClient (fetch)
         ↓
[サーバー]
  /api/ai/complete
    → CachedAIProvider(RetryAIProvider(OpenAIProvider))  … デコレータチェーン
    → OpenAI 互換 API（環境変数 OPENAI_API_KEY / OPENAI_BASE_URL）
  /api/auth・stripe・subscription → Prisma → SQLite/PostgreSQL
```

重要な特徴: **創作データ（プロジェクト・章・キャラ・世界観・伏線）はすべて localStorage、DB はユーザー/課金情報のみ**。つまりサーバー側 DB と創作データは完全に分離しており、デバイス間同期・バックアップは存在しない（`project-db-service.ts` に移行途中の痕跡あり）。

---

## 3. 最重要の発見: 「Manus 化」による設計の骨抜き

直近のコミット群（`1124034` GenSpark 対応 → `46e11e0` Manus 組み込み AI 統合 → `ebc8127` エージェントバックエンド追加）で、以下がまとめて無効化されている。

### 3.1 認証が完全バイパス（`src/lib/auth/auth-options.ts`）

```typescript
async authorize(credentials) {
  // 組み込みAIの動作確認のため、認証をスキップしダミーユーザーを返す
  return { id: 'dummy-user-id', email: credentials?.email || 'dummy@example.com', ... }
}
```

- PrismaAdapter はコメントアウト、Google OAuth もコメントアウト
- **任意のメール/パスワードで誰でもログイン成立**（全員が `dummy-user-id`）
- `src/middleware.ts` も matcher を空にして全ルート保護を解除

### 3.2 AI エンドポイントが無認証・無制限（`src/app/api/ai/complete/route.ts`）

```typescript
// 認証と利用制限チェックは削除
// 利用状況の記録は削除
```

本番デプロイ（render.yaml は公開 Web サービス）すると、**誰でも `/api/ai/complete` に POST するだけでバックエンドの API キーを使った推論を無料・無制限に実行できる**。コスト面・悪用面で最も危険な箇所。

### 3.3 利用量トラッキングが「幽霊化」

- `ai-usage-client.ts` は `/api/ai-usage` を fetch するが、**この API ルートは削除済みで存在しない**
- 失敗時のフォールバックが `{ canGenerate: true, remaining: -1, isUnlimited: true }`（フェイルオープン）
- つまり UI 上の利用量表示・Free プラン月 10 回制限は完全に機能していない
- `SubscriptionService.enforceAIGenerationLimit` もスタブ（常に許可）で、DB の `AIUsage` テーブルは書き込まれない

### 3.4 マルチプロバイダー抽象の形骸化

- CLAUDE.md/README は「OpenAI・Anthropic 対応、AIProvider インターフェースで拡張可能」と謳うが、**Anthropic プロバイダーの実装ファイルは削除済み**（`package.json` に `@anthropic-ai/sdk` だけ残存）
- `AIManager` は 'openai' 固定のほぼ空クラスに退化。`validateApiKey()` は常に `true`
- 対応モデルは `gpt-4.1-mini` / `gpt-4.1-nano` / `gemini-2.5-flash` の 3 つをハードコード（`models.ts`、価格はすべて 0 扱い）

### 3.5 DB が SQLite に変更、ドキュメントは PostgreSQL のまま

- `prisma/schema.prisma` と `migration_lock.toml` は `provider = "sqlite"`
- CLAUDE.md・.env.example・backend/README は PostgreSQL を前提に記述
- Render にデプロイする場合、SQLite はエフェメラルファイルシステム上で**再起動のたびに消える**

> **判断が必要な点**: この「Manus 化」を本来の SaaS 構成に巻き戻すのか、Manus 環境専用として割り切るのかで、修正方針が根本的に変わる。現状は「どちらでもない中途半端な状態 + ビルド不能」が最大の問題。

---

## 4. ビルド・品質の実測詳細

### 4.1 ビルドを壊している型エラー（本体コード）

`src/app/api/auth/register/route.ts:52-59` — catch ブロックで try 内スコープの `email` / `name` を参照:

```typescript
} catch (error) {
  // データベース接続の問題を回避するため、ダミーユーザーを返す
  return NextResponse.json({
    id: 'dummy-user-id',
    email: email,   // ← TS2304: Cannot find name 'email'
    name: name
  }, { status: 200 })
}
```

型エラーであると同時に設計としても問題: **DB 例外時に登録成功（200）を偽装して返す**。修正するなら変数スコープの手直しではなく、このフォールバック自体の削除が妥当。

### 4.2 テストの失敗（3 件）

- `TravelSimulator.test.tsx`: UI 文言変更（「シミュレート開始」→「旅行を開始」）にテストが追従していない
- `WorldMapDisplay.test.tsx` / `CharacterDetailModal.test.tsx`: 型定義変更（`WorldMap` に `scale`/`geography` 追加、`Character.role` のリテラル型変更）にフィクスチャが未追従
- テストは 4 スイート 20 ケースのみで、**中核の FlowEngine / FlowExecutor / 伏線システムはテストゼロ**

### 4.3 Lint 基盤の不在

`.eslintrc` が存在せず `next lint` は初期設定プロンプトで停止する。CI での静的検査は事実上不可能。

---

## 5. セキュリティ評価

| # | 深刻度 | 問題 | 場所 |
|---|---|---|---|
| 1 | **Critical** | 認証バイパス（誰でもダミーユーザーでログイン） | `auth-options.ts` |
| 2 | **Critical** | AI 補完 API が無認証・無レート制限（API キー費用の窃取が可能） | `api/ai/complete/route.ts` |
| 3 | High | 登録 API が DB 例外時に成功を偽装 | `api/auth/register/route.ts` |
| 4 | Medium | API キーが zustand persist 経由で localStorage に平文保存（XSS で窃取可能）。現構成では未使用だが経路は残存 | `lib/store/index.ts`, `ai/init.ts` |
| 5 | Medium | GitHub Actions がサードパーティ製 `grll/claude-code-action@beta` に Claude OAuth トークン（access + refresh）を渡している。タグ固定なしの @beta 参照はサプライチェーンリスク | `.github/workflows/claude.yml` |
| 6 | Low | `/api/dev/update-subscription` は `NODE_ENV === 'production'` ガードのみ。ステージング等では任意プランへ昇格可能 | `api/dev/update-subscription/route.ts` |
| 7 | Low | `/api/health` が環境変数の構成状態（何が未設定か）を無認証で開示 | `api/health/route.ts` |

**良い点**: Stripe Webhook は署名検証（`constructEvent`）を正しく実装。checkout / portal ルートはセッション認証チェックあり（ただし認証自体が #1 で無意味化している）。パスワードは bcrypt cost 12。登録入力は zod で検証。

---

## 6. アーキテクチャ上の技術的負債

### 6.1 神クラス `NovelFlowExecutor`（1,631 行）

プロンプト構築・AI 呼び出し・応答パース・キャラクター移動検証・伏線検証・状態更新をすべて 1 クラスで実施。`docs/ISSUES.md` 自身が分割案を提示済みだが未着手。`flowEngine?: any` と型を捨てた相互参照もあり、テスト不能性の主因。

### 6.2 AI 応答パースの脆弱性（サービス層に `JSON.parse` 系 81 箇所）

LLM 応答から正規表現で JSON を抜き出して `JSON.parse` するパターンが 12 ファイルに分散。スキーマ検証（zod は依存に入っているのに未使用）がなく、モデルの応答形式が揺れると黙って部分的に壊れる。集中化した「構造化出力パーサー + zod スキーマ」層の導入が最も費用対効果が高いリファクタリング。

### 6.3 フローエンジンの構造的限界（`flow-engine.ts`）

- `nextSteps` を再帰で辿る設計のため、条件不成立時は `nextSteps[0]` に決め打ちでスキップ（分岐が実質表現できない）
- ステップ失敗 = フロー全体失敗（チェックポイント/再開なし）。10 ステップ直列で各ステップが LLM 呼び出しのため、終盤の 1 回の失敗で全部やり直し
- `main-flow.ts` の `input`/`output` 宣言は実行時にほぼ飾り（executor 側の switch が実体）

### 6.4 データ整合性のリスク

- `ChapterService.deleteChapter` は章番号を自動リナンバーするが、**伏線の `plantedChapter`/`resolvedChapter` 等は章番号参照**のため、削除でズレる
- localStorage 主体のため 5–10MB 制限・ブラウザクリアで全喪失（ISSUES.md も認識済み）
- `ContextManager` のトークン見積りは「日本語 1 文字 ≈ 2 トークン」の粗い近似で、`buildAnalysisContext` は未実装（空文字を返す）
- `maxTokens: 32768` をデフォルト設定しているが、想定モデル（gpt-4.1-mini 系）の出力上限と整合するかは未検証のままハードコード

### 6.5 ドキュメントと実装の乖離

| ドキュメントの記述 | 実際 |
|---|---|
| CLAUDE.md「PostgreSQL」 | SQLite |
| CLAUDE.md「AI 使用制限を必ずチェック」 | チェック機構は削除済み |
| CLAUDE.md「`/src/data/flows/novel-writing-flow.ts`」 | 実在せず（`main-flow.ts`） |
| README「OpenAI/Anthropic 対応、GPT-4o・Claude 3.5 等」 | Manus 経由 3 モデル固定 |
| README「`.env.local.example` をコピー」 | 存在せず（`.env.example` のみ、内容も旧構成） |

### 6.6 リポジトリ衛生

- `backend/` は FastAPI の空スケルトン（全モジュールが空 `__init__.py`、ルート未実装）。しかも **`__pycache__/*.pyc` がコミットされている**（.gitignore 不備）
- ルートに調査レポート（`result.md`, `ui_result.md`, `togo_result.md`, `E2E_TEST_REPORT.md`, `DEBUG_AI_ISSUES.md`）や `test.txt` が散在
- `caniuse-lite` が 14 ヶ月古い

---

## 7. 評価できる点

1. **伏線管理サブシステム**は本物の作り込み: `ForeshadowingTrackerService`（自動検出・追跡）、`ForeshadowingContextBuilder`（章計画への文脈注入）、`ForeshadowingResolutionValidator`（回収の AI 検証）の 3 層構成 + 健全性レポート/回収提案 API
2. **デコレータパターンの AI プロバイダー合成**（`RetryAIProvider` は指数バックオフ + ジッター、ストリーミング途中失敗の非リトライ制御まで考慮。`CachedAIProvider` は温度・プロンプト長でキャッシュ可否を判定）— docs/ISSUES.md の提案が実際に実装された好例
3. **ドメイン型定義**（`lib/types/index.ts`、628 行）が包括的で、サービス層は概ね型安全
4. **世界観シミュレーション**（world-map-service 1,556 行 + transport-service）: 時代別移動手段・移動時間検証を執筆時の整合性チェックに組み込む発想はユニーク
5. Stripe 連携（checkout / portal / webhook 5 イベント処理）は雛形として十分な品質
6. `docs/ISSUES.md` / `docs/TODO.md` が自己批判的かつ具体的で、負債が「認識されている」

---

## 8. 推奨アクション（優先度順）

### P0 — ビルドと方針の確定
1. `register/route.ts` の catch フォールバックを削除しビルドを復旧（機械的修正で即可能）
2. **「Manus 専用」か「汎用 SaaS」かの方針決定**。汎用に戻すなら `46e11e0` 以前の認証・制限コードの復元が必要

### P1 — 公開前に必須
3. `/api/ai/complete` に認証 + レート制限を再導入（現状のまま公開すると API キー費用が無制限に流出）
4. `auth-options.ts` のダミー認証を廃止し、bcrypt 照合 + PrismaAdapter を復元
5. `/api/ai-usage` ルートを復活させるか、クライアント側の幽霊呼び出しを削除（フェイルオープンをフェイルクローズに）

### P2 — 品質基盤
6. ESLint 設定を追加し、`tsc --noEmit` + `jest` を CI（GitHub Actions）に組み込む
7. 失敗中のテスト 3 件を現行の型・UI に追従させ、FlowEngine と伏線サービスにユニットテストを追加
8. AI 応答パースを zod スキーマ検証つきの共通ユーティリティに集約

### P3 — 中期
9. `NovelFlowExecutor` を PromptBuilder / ResponseParser / StateUpdater 等に分割（ISSUES.md の案に沿う）
10. localStorage → DB 移行（`project-db-service.ts` の完成）。少なくともエクスポート/インポート機能で喪失リスクを緩和
11. ドキュメント（CLAUDE.md / README / .env.example）を実装に同期
12. `backend/` の扱いを決める（本体と統合計画がないなら別リポジトリへ分離）、`__pycache__`・`test.txt`・ルート散在レポートの整理

---

## 9. 総評

コードベースには「小説の一貫性を工学的に担保する」という明確な思想があり、伏線・世界状態・移動整合性まで追跡する設計は類例が少ない。一方で直近の環境特化改造（Manus 対応）が安全装置と抽象化を削ぎ落としたまま main に入り、ビルド不能・認証ゼロ・制限ゼロという「デモ専用スナップショット」の状態で止まっている。**まず P0 の方針決定とビルド復旧を行わない限り、他のどの改善も積み上げられない**というのが本分析の結論である。
