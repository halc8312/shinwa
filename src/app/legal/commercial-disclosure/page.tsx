export default function CommercialDisclosurePage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">特定商取引法に基づく表記</h1>
      
      <div className="space-y-6">
        <div className="border-b pb-4">
          <h2 className="text-lg font-semibold mb-2">事業者名</h2>
          <p>中川樹</p>
        </div>

        <div className="border-b pb-4">
          <h2 className="text-lg font-semibold mb-2">代表者名</h2>
          <p>中川樹</p>
        </div>

        <div className="border-b pb-4">
          <h2 className="text-lg font-semibold mb-2">所在地</h2>
          <p>愛知県知多郡東浦町</p>
        </div>

        <div className="border-b pb-4">
          <h2 className="text-lg font-semibold mb-2">電話番号</h2>
          <p>090-9182-6222</p>
        </div>

        <div className="border-b pb-4">
          <h2 className="text-lg font-semibold mb-2">メールアドレス</h2>
          <p>shinwa.ai.arinko@gmail.com</p>
        </div>

        <div className="border-b pb-4">
          <h2 className="text-lg font-semibold mb-2">販売価格</h2>
          <div className="space-y-2">
            <p>・無料プラン：0円</p>
            <p>・Proプラン：1,000円/月（税込）</p>
            <p>・Enterpriseプラン：5,000円/月（税込）</p>
          </div>
        </div>

        <div className="border-b pb-4">
          <h2 className="text-lg font-semibold mb-2">追加手数料</h2>
          <p>なし（表示価格に全て含まれています）</p>
        </div>

        <div className="border-b pb-4">
          <h2 className="text-lg font-semibold mb-2">支払い方法</h2>
          <div className="space-y-2">
            <p>・クレジットカード（Visa、Mastercard、American Express、JCB、Diners Club、Discover）</p>
            <p>・デビットカード（各種国際ブランド付き）</p>
            <p>・Link（Stripe決済）</p>
            <p>・Apple Pay</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">※その他の決済方法は随時追加予定</p>
          </div>
        </div>

        <div className="border-b pb-4">
          <h2 className="text-lg font-semibold mb-2">支払い時期</h2>
          <p>毎月の自動更新時（初回は申込時）</p>
        </div>

        <div className="border-b pb-4">
          <h2 className="text-lg font-semibold mb-2">サービス提供時期</h2>
          <p>決済完了後、即時利用可能</p>
        </div>

        <div className="border-b pb-4">
          <h2 className="text-lg font-semibold mb-2">返品・交換について</h2>
          <p>デジタルサービスの性質上、返品・交換はお受けできません。</p>
          <p>ただし、サブスクリプションの解約はいつでも可能です。解約後は次回更新日まで引き続きサービスをご利用いただけます。</p>
        </div>

        <div className="border-b pb-4">
          <h2 className="text-lg font-semibold mb-2">解約について</h2>
          <p>アカウント設定画面からいつでも解約可能です。</p>
          <p>解約後も、現在の請求期間が終了するまでサービスをご利用いただけます。</p>
        </div>

        <div className="pb-4">
          <h2 className="text-lg font-semibold mb-2">動作環境</h2>
          <p>最新版のChrome、Firefox、Safari、Edgeブラウザ</p>
          <p>インターネット接続環境が必要です</p>
        </div>
      </div>
    </div>
  );
}