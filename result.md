# AI機能調査結果レポート

## 調査概要
ShinwaプロジェクトのAI関連機能を深く調査し、不具合や改善の余地がある箇所を特定しました。

## 発見された問題と改善点

### 1. AIモデル名の不正な設定

**場所**: `/src/lib/utils/ai-settings.ts`, `/src/app/api/ai/complete/route.ts`

**問題**: 
- デフォルトモデルとして `gpt-4.1-mini` が設定されているが、このモデルは存在しない
- キャッシュ可能モデルとして `gpt-4.1-mini`, `gpt-4.1-nano` が指定されているが、これらも存在しない

**影響**: AI生成機能が動作しない可能性がある

**改善案**: 
- 正しいモデル名（例: `gpt-4`, `gpt-3.5-turbo`）に変更する
- モデル名の検証機能を追加する

### 2. AIUsageService の制限値の問題

**場所**: `/src/lib/services/ai-usage-service.ts`

**問題**:
- `FREE_PLAN_LIMIT` が 9999 に設定されているが、これはテスト用の値と思われる
- 本来は10章/月の制限のはず

**影響**: 無料プランユーザーが制限以上に生成できてしまう

**改善案**:
```typescript
private static readonly FREE_PLAN_LIMIT = 10;
```

### 3. エラーハンドリングの不備

#### 3.1 AIManager

**場所**: `/src/lib/ai/manager.ts`

**問題**:
- `getProvider` メソッドが引数をそのまま返すだけで、実際のプロバイダーインスタンスを返していない
- `loadProvidersFromStorage` でエラーをconsole.errorするだけで、上位に伝播しない

#### 3.2 OpenAI/Anthropic プロバイダー

**場所**: `/src/lib/ai/providers/openai.ts`, `/src/lib/ai/providers/anthropic.ts`

**問題**:
- `error.status` の存在確認なしにアクセスしている
- タイムアウト処理がない
- Anthropicの`validateApiKey`が実際にAPIコールを行い、トークンを消費する

**改善案**:
```typescript
private handleError(error: any): AIError {
  const aiError = new Error(error.message) as AIError
  aiError.provider = this.name
  aiError.statusCode = error?.status || error?.statusCode
  // ...
}
```

### 4. ストリーミング機能の未実装

**場所**: `/src/app/api/ai/complete/route.ts`

**問題**:
- ストリーミングフラグがあるが、実際にはストリーミングせず通常のレスポンスを返している

**影響**: ユーザーが長い生成を待つ間、進捗が見えない

### 5. キャッシュの永続性問題

**場所**: `/src/lib/ai/cache-provider.ts`

**問題**:
- キャッシュがメモリ上のMapに保存されるため、サーバー再起動で失われる
- キャッシュヒット率の統計が実装されていない（常に0を返す）

**改善案**: 
- Redis等の永続的なキャッシュストレージを使用
- ヒット/ミスのカウンターを実装

### 6. レース条件とトランザクション不備

**場所**: `/src/lib/services/ai-usage-service.ts`

**問題**:
- 使用回数のチェックと更新の間にレース条件が発生する可能性
- トランザクション処理がない

**改善案**:
```typescript
// トランザクションを使用した原子的な操作
await prisma.$transaction(async (tx) => {
  const usage = await tx.aIUsage.findFirst({...})
  if (usage.chapterGenCount >= this.FREE_PLAN_LIMIT) {
    throw new Error('Limit exceeded')
  }
  await tx.aIUsage.update({...})
})
```

### 7. FlowEngine の問題

**場所**: `/src/lib/services/flow-engine.ts`

**問題**:
- 再帰的なステップ実行に深さ制限がない（スタックオーバーフローの可能性）
- フロー実行のキャンセル・一時停止機能がない
- タイムアウト処理がない

**改善案**:
- 実行深度のカウンターと制限を追加
- AbortControllerを使用したキャンセル機能の実装

### 8. localStorage の問題

**場所**: 複数のサービスファイル

**問題**:
- クォータ超過時のエラーハンドリングがない
- 並行更新時のデータ競合の可能性
- データ検証がない

**改善案**:
```typescript
try {
  localStorage.setItem(key, JSON.stringify(data))
} catch (e) {
  if (e.name === 'QuotaExceededError') {
    // クォータ超過時の処理
  }
}
```

### 9. セキュリティ上の懸念

#### 9.1 API キーの露出リスク

**場所**: `/src/lib/ai/client.ts`

**問題**:
- validateApiKey がGETリクエストを使用（URLにプロバイダー名が露出）

**改善案**: POSTリクエストに変更

#### 9.2 エラー時のフォールバック

**場所**: `/src/lib/utils/ai-usage-client.ts`

**問題**:
- `checkAIUsage` でエラー時に制限なしを返す（制限回避の可能性）

**改善案**:
```typescript
catch (error) {
  // エラー時は安全側に倒す
  return { canGenerate: false, remaining: 0, isUnlimited: false };
}
```

### 10. パフォーマンスの問題

#### 10.1 トークン数の設定

**場所**: `/src/lib/utils/ai-settings.ts`

**問題**:
- 全機能で `maxTokens: 32768` に設定（過剰）
- 要約などの短いタスクでも大量のトークンを要求

**改善案**: 
- 機能ごとに適切なトークン数を設定
- 動的なトークン数計算の実装

#### 10.2 並列処理の欠如

**場所**: `/src/lib/services/flow-executor.ts`

**問題**:
- 独立したステップも順次実行される

**改善案**: 
- 依存関係のないステップの並列実行

### 11. 型安全性の問題

**場所**: `/src/app/api/ai/complete/route.ts`

**問題**:
- `as any` キャストで型チェックを回避している

**改善案**: 適切な型定義の使用

### 12. ログとモニタリング

**問題**:
- エラーログが `console.error` のみ
- AI使用状況の詳細なメトリクスがない
- レート制限やエラー率の追跡がない

**改善案**:
- 構造化ログの実装
- メトリクス収集システムの導入

## 優先度の高い改善項目

1. **緊急**: AIモデル名の修正（機能が動作しない）
2. **緊急**: FREE_PLAN_LIMIT の修正（ビジネスロジックの問題）
3. **高**: エラーハンドリングの改善
4. **高**: レース条件の解決
5. **中**: キャッシュの永続化
6. **中**: ストリーミング機能の実装
7. **低**: パフォーマンス最適化

## まとめ

AI機能全体で多数の改善点が見つかりました。特に、基本的な設定ミス（モデル名、制限値）は即座に修正が必要です。また、エラーハンドリング、並行性制御、セキュリティ面での改善により、より堅牢なシステムにできます。