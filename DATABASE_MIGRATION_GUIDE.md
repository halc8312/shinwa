# データベースマイグレーションガイド

## エラーの原因

```
Error: Invalid `prisma.subscription.findUnique()` invocation: 
The table `public.Subscription` does not exist in the current database.
```

このエラーは、Prismaスキーマで定義されているテーブルが実際のデータベースに存在しないために発生しています。

## 解決方法

### 1. ローカル環境での解決

```bash
# 1. 環境変数を設定（まだの場合）
cp .env.example .env
# .envファイルを編集して、render.comのDATABASE_URLを設定

# 2. Prismaクライアントを生成
npx prisma generate

# 3. データベースにスキーマを反映
npx prisma db push

# 4. 確認（オプション）
npx prisma studio
```

### 2. render.comでの解決

#### 方法A: ビルドコマンドを確認（推奨）

render.yamlのビルドコマンドを確認します：

```yaml
buildCommand: npm install && npx prisma db push && npm run build
```

このコマンドが正しく実行されているか確認してください。

#### 方法B: 手動でマイグレーション

1. **render.comダッシュボード**にログイン
2. **あなたのサービス（shinwa）**を選択
3. **Shell**タブに移動（またはSSH接続）
4. 以下のコマンドを実行：

```bash
# Prismaスキーマをデータベースに反映
npx prisma db push

# 成功したか確認
npx prisma db seed # シードデータがある場合
```

#### 方法C: 環境変数の確認と再デプロイ

1. **Environment**タブで`DATABASE_URL`が正しく設定されているか確認
2. URLの形式が正しいか確認：
   ```
   postgresql://username:password@host:port/database?schema=public
   ```
3. **Manual Deploy**をクリックして再デプロイ

### 3. トラブルシューティング

#### データベース接続の確認

```bash
# ローカルで接続テスト
npx prisma db pull
```

これでエラーが出る場合は、DATABASE_URLが間違っています。

#### スキーマの確認

prisma/schema.prismaファイルに以下のモデルが定義されているか確認：

```prisma
model Subscription {
  id                     String    @id @default(cuid())
  userId                 String    @unique
  stripeCustomerId       String    @unique
  stripeSubscriptionId   String?   @unique
  stripePriceId          String?
  stripeCurrentPeriodEnd DateTime?
  plan                   String    @default("free")
  status                 String    @default("active")
  createdAt              DateTime  @default(now())
  updatedAt              DateTime  @updatedAt
  
  user                   User      @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model AIUsage {
  id               String   @id @default(cuid())
  userId           String
  chapterGenCount  Int      @default(0)
  periodStart      DateTime @default(now())
  periodEnd        DateTime
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  
  user             User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

#### render.comのログ確認

1. **Logs**タブでビルドログを確認
2. `npx prisma db push`の実行結果を探す
3. エラーメッセージがないか確認

### 4. 緊急の回避策

もしデータベースマイグレーションがすぐにできない場合の一時的な回避策：

1. **無料プランとして扱う設定**
   
   src/lib/services/subscription-service.tsを編集して、エラー時は無料プランとして扱う：

   ```typescript
   static async checkSubscriptionStatus(userId: string) {
     try {
       // 既存のコード
     } catch (error) {
       console.error('Subscription check failed:', error);
       // エラー時は無料プランとして扱う
       return {
         isActive: true,
         plan: 'free' as const,
         subscription: null
       };
     }
   }
   ```

### 5. 確認手順

マイグレーション後、以下を確認：

1. **ヘルスチェック**
   ```
   https://your-app.onrender.com/api/health
   ```

2. **データベースの状態**
   ```bash
   npx prisma studio
   ```
   ブラウザでテーブルが作成されているか確認

3. **AI機能のテスト**
   - ログイン
   - プロジェクトを開く
   - AI機能を使用してみる

## 重要な注意事項

- **データの保護**: `db push`は既存のデータを保持しますが、念のためバックアップを取ることを推奨
- **本番環境**: 本番環境では`prisma migrate`を使用することを検討してください
- **環境変数**: DATABASE_URLは必ず設定してください