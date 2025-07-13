# Stripe決済機能セットアップガイド

## 概要
Shinwaアプリケーションに実装されたStripe決済機能のセットアップ手順です。

## 実装された機能
- ✅ サブスクリプション管理（無料・プロ・エンタープライズプラン）
- ✅ Stripe Checkoutによる安全な決済
- ✅ カスタマーポータル（プラン変更・解約）
- ✅ Webhook連携（支払い状態の自動同期）
- ✅ プランベースのアクセス制御

## セットアップ手順

### 1. Stripeアカウントの準備

1. [Stripe](https://stripe.com/jp)でアカウントを作成
2. ダッシュボードからテスト環境のAPIキーを取得：
   - Publishable key: `pk_test_...`
   - Secret key: `sk_test_...`

### 2. Stripe商品とプランの作成

Stripeダッシュボードで以下の商品を作成：

1. **プロプラン**
   - 商品名: Shinwa Pro
   - 価格: ¥1,000/月
   - Price IDをメモ（例: `price_1234...`）

2. **エンタープライズプラン**
   - 商品名: Shinwa Enterprise
   - 価格: ¥5,000/月
   - Price IDをメモ

### 3. 環境変数の設定

#### ローカル開発環境
`.env.local`ファイルを作成し、以下を設定：

```env
# Stripe
STRIPE_SECRET_KEY=sk_test_あなたのシークレットキー
STRIPE_PUBLISHABLE_KEY=pk_test_あなたのパブリッシャブルキー
STRIPE_WEBHOOK_SECRET=whsec_あなたのWebhookシークレット

# Stripe Price IDs
STRIPE_PRICE_ID_PRO=price_プロプランのID
STRIPE_PRICE_ID_ENTERPRISE=price_エンタープライズプランのID
```

#### Render本番環境
Renderダッシュボードで環境変数を設定：

1. Renderダッシュボードにログイン
2. 対象のサービスを選択
3. Environment > Environment Variablesで以下を追加：
   - `STRIPE_SECRET_KEY`: 本番用のシークレットキー（`sk_live_...`）
   - `STRIPE_PUBLISHABLE_KEY`: 本番用のパブリッシャブルキー（`pk_live_...`）
   - `STRIPE_WEBHOOK_SECRET`: Webhook設定後に取得
   - `STRIPE_PRICE_ID_PRO`: 本番プロプランのPrice ID
   - `STRIPE_PRICE_ID_ENTERPRISE`: 本番エンタープライズプランのPrice ID

### 4. Webhookの設定

#### ローカル開発環境
Stripe CLIを使用：

```bash
# Stripe CLIのインストール
brew install stripe/stripe-cli/stripe

# ログイン
stripe login

# Webhookのフォワード
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

表示されるWebhook signing secretを`.env.local`に設定。

#### 本番環境（Render）
1. Stripeダッシュボード > Developers > Webhooks
2. 「Add endpoint」をクリック
3. Endpoint URL: `https://あなたのアプリ.onrender.com/api/stripe/webhook`
4. イベントを選択：
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. 作成後、Signing secretをコピーしてRenderの環境変数に設定

### 5. データベースマイグレーション

```bash
# ローカル環境
npx prisma migrate dev

# 本番環境（初回のみ）
npx prisma migrate deploy
```

### 6. 機能の確認

1. `/pricing`ページでプラン選択
2. Stripeのテストカード（`4242 4242 4242 4242`）で決済
3. `/account`ページでサブスクリプション状態を確認
4. カスタマーポータルでプラン変更・解約をテスト

## トラブルシューティング

### Webhook署名エラー
- 環境変数の`STRIPE_WEBHOOK_SECRET`が正しく設定されているか確認
- ローカルではStripe CLIが実行中か確認

### 決済後のリダイレクトエラー
- `NEXTAUTH_URL`環境変数が正しく設定されているか確認
- Renderでは`https://あなたのアプリ.onrender.com`を設定

### プラン情報が表示されない
- Stripe Price IDが環境変数に正しく設定されているか確認
- Stripeダッシュボードで商品が有効になっているか確認

## セキュリティ注意事項

- 本番環境では必ず`sk_live_`で始まる本番用キーを使用
- APIキーは絶対にフロントエンドやGitHubに公開しない
- Webhook署名の検証を必ず行う（実装済み）

## 追加開発のヒント

- 使用量制限の実装: `subscription-service.ts`の`enforceAIGenerationLimit`を拡張
- 新しいプランの追加: `lib/stripe.ts`の`PLANS`オブジェクトを更新
- メール通知: Webhookハンドラーにメール送信処理を追加