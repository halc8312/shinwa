# 環境変数設定ガイド

## 問題の診断結果

現在、以下の問題が発生しています：

1. **環境変数が設定されていない**: `.env`ファイルが存在しないため、アプリケーションが必要な設定にアクセスできません
2. **データベース接続エラー**: `DATABASE_URL`が未設定のため、Prismaがデータベースに接続できません
3. **AI APIキーの欠如**: OpenAI/AnthropicのAPIキーが未設定のため、AI機能が動作しません

## 解決方法

### 1. ローカル開発環境の設定

`.env`ファイルを作成して、以下の環境変数を設定してください：

```bash
# .envファイルを作成
cp .env.example .env
```

次に、`.env`ファイルを編集して実際の値を設定します：

```env
# Database (render.comのPostgreSQLデータベースURL)
DATABASE_URL="postgresql://your_db_user:your_db_password@your_db_host:5432/your_db_name"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="ランダムな秘密鍵を生成してください"

# AI API Keys (少なくとも1つは必須)
OPENAI_API_KEY="sk-..."
ANTHROPIC_API_KEY="sk-ant-..."

# Stripe (オプション)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
```

### 2. render.comでの環境変数設定

render.comのダッシュボードで以下の環境変数を設定する必要があります：

1. **render.comダッシュボード**にログイン
2. **あなたのサービス（shinwa）**を選択
3. **Environment**タブに移動
4. 以下の環境変数を追加：

#### 必須の環境変数：

- `DATABASE_URL`: render.comのPostgreSQLデータベースURL（自動的に設定される場合もあります）
- `NEXTAUTH_URL`: デプロイされたアプリのURL（例: `https://shinwa.onrender.com`）
- `NEXTAUTH_SECRET`: セキュアなランダム文字列（`openssl rand -base64 32`で生成可能）
- `OPENAI_API_KEY`: OpenAI APIキー（AI機能を使用する場合）
- `ANTHROPIC_API_KEY`: Anthropic APIキー（Claude を使用する場合）

#### オプションの環境変数：

- `STRIPE_SECRET_KEY`: Stripe秘密鍵
- `STRIPE_PUBLISHABLE_KEY`: Stripe公開鍵
- `STRIPE_WEBHOOK_SECRET`: Stripe Webhookシークレット
- `STRIPE_PRICE_ID_PRO`: ProプランのStripe価格ID
- `STRIPE_PRICE_ID_ENTERPRISE`: EnterpriseプランのStripe価格ID

### 3. データベースの確認

render.comでPostgreSQLデータベースが作成されているか確認：

1. render.comダッシュボードで**PostgreSQL**サービスを確認
2. データベースが存在しない場合は新規作成
3. 接続情報（Internal Database URL）をコピー
4. この値を`DATABASE_URL`環境変数に設定

### 4. デプロイの再実行

環境変数を設定した後：

1. render.comで**Manual Deploy**をクリック
2. デプロイログを確認して、エラーがないことを確認
3. 特に以下のコマンドが成功することを確認：
   - `npm install`
   - `npx prisma db push`
   - `npm run build`

### 5. トラブルシューティング

#### エラー: "Invalid API key for OpenAI/Anthropic"
- APIキーが正しく設定されているか確認
- APIキーの前後に余分なスペースがないか確認

#### エラー: "Database connection failed"
- `DATABASE_URL`の形式が正しいか確認
- render.comのデータベースが起動しているか確認
- ファイアウォール設定を確認

#### エラー: "AI usage limit exceeded"
- 無料プランの場合、月10回の制限があります
- データベースの`AIUsage`テーブルを確認

### 6. ローカルでのテスト

環境変数を設定した後、ローカルで動作確認：

```bash
# データベースのマイグレーション
npx prisma db push

# 開発サーバーの起動
npm run dev
```

ブラウザで`http://localhost:3000`にアクセスして、AI機能が正常に動作することを確認してください。