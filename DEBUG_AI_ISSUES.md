# AI機能のデバッグガイド

## 問題の概要

render.comにデプロイされたウェブアプリでAI機能を使用する際にエラーが発生しています。調査の結果、以下の問題が特定されました：

### 1. 環境変数の未設定
- `.env`ファイルが存在しない
- 必要な環境変数（DATABASE_URL、AI APIキーなど）が設定されていない

### 2. データベース接続エラー
```
Error: Environment variable not found: DATABASE_URL.
```

## エラーが発生する流れ

1. **ユーザーがAI機能を使用しようとする**
   - 「第X章を執筆」ボタンをクリック
   - AI設定を変更しようとする

2. **APIエンドポイントが呼ばれる**
   - `/api/ai/complete` - AI完了エンドポイント
   - `/api/ai-usage` - AI使用状況確認エンドポイント

3. **データベースアクセスでエラー**
   - PrismaがDATABASE_URLを見つけられない
   - render.comのPostgreSQLに接続できない

4. **AI APIキーエラー**
   - OpenAI/AnthropicのAPIキーが未設定
   - 「Invalid API key」エラーが発生

## デバッグ手順

### 1. 環境変数の確認

```bash
# 現在の環境変数を確認
env | grep -E "DATABASE_URL|OPENAI|ANTHROPIC|NEXTAUTH"
```

### 2. render.comのログ確認

render.comダッシュボードで以下を確認：
- **Service Logs** - アプリケーションのエラーログ
- **Deploy Logs** - デプロイ時のエラー
- **Environment** - 環境変数の設定状態

### 3. ローカルでのテスト

```bash
# .envファイルを作成
cp .env.example .env
# 必要な値を設定後

# データベース接続テスト
npx prisma db push

# 開発サーバー起動
npm run dev
```

### 4. ブラウザのコンソール確認

開発者ツールを開いて以下を確認：
- Networkタブで失敗したリクエスト
- Consoleタブでエラーメッセージ

## よくあるエラーと解決方法

### エラー1: "Failed to check AI usage"
```javascript
// クライアント側のエラー
Error checking AI usage: Failed to check AI usage
```

**原因**: データベース接続エラーによりAI使用状況を確認できない

**解決方法**: 
1. DATABASE_URLを正しく設定
2. render.comでデータベースが起動していることを確認

### エラー2: "Invalid API key for OpenAI/Anthropic"
```javascript
// サーバー側のエラー
AIError: Invalid API key for OpenAI
```

**原因**: AI APIキーが設定されていない、または無効

**解決方法**:
1. 正しいAPIキーを環境変数に設定
2. APIキーの前後の空白を削除
3. APIキーの有効性を確認

### エラー3: "AI usage limit exceeded"
```javascript
// 使用制限エラー
{ error: 'AI usage limit exceeded' }
```

**原因**: 無料プランで月10回の制限に達した

**解決方法**:
1. 翌月まで待つ
2. 有料プランにアップグレード
3. データベースのAIUsageテーブルを確認

## エラーログの収集方法

### 1. サーバーサイドログ

```typescript
// src/app/api/ai/complete/route.ts に追加
console.error('AI completion error details:', {
  provider: providerName,
  model: options.model,
  error: error.message,
  stack: error.stack,
  env: {
    hasOpenAIKey: !!process.env.OPENAI_API_KEY,
    hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
    hasDatabaseUrl: !!process.env.DATABASE_URL
  }
});
```

### 2. クライアントサイドログ

```typescript
// src/app/projects/[id]/page.tsx に追加
try {
  const checkResponse = await fetch('/api/ai-usage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'check' })
  })
  
  if (!checkResponse.ok) {
    const errorData = await checkResponse.json();
    console.error('AI usage check failed:', {
      status: checkResponse.status,
      error: errorData,
      url: checkResponse.url
    });
  }
} catch (error) {
  console.error('Network error during AI usage check:', error);
}
```

## render.comでの確認事項

### 1. データベース設定
- PostgreSQLサービスが作成されているか
- 接続情報が正しいか
- データベースが起動しているか

### 2. 環境変数設定
- すべての必須環境変数が設定されているか
- 値に誤りがないか（特殊文字、空白など）
- 変更後にサービスが再デプロイされたか

### 3. ビルドログ
- `npx prisma db push`が成功しているか
- `npm run build`でエラーが出ていないか

## 推奨される次のステップ

1. **即座に実行すべきこと**
   - render.comで環境変数を設定
   - データベース接続を確認
   - 手動で再デプロイ

2. **エラーが続く場合**
   - render.comのサポートログを確認
   - ローカルで同じ環境変数を使ってテスト
   - Prismaのログレベルを上げて詳細を確認

3. **長期的な改善**
   - エラーハンドリングの強化
   - ヘルスチェックエンドポイントの追加
   - 環境変数の検証スクリプトの作成