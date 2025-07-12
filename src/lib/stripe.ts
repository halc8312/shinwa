import Stripe from 'stripe';

// Stripeインスタンスを遅延初期化
let stripeInstance: Stripe | null = null;

export const getStripe = () => {
  if (!stripeInstance && process.env.STRIPE_SECRET_KEY) {
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-05-28.basil',
      typescript: true,
    });
  }
  return stripeInstance;
};

// 互換性のためのエクスポート（エラーを防ぐためにダミーオブジェクトを返す）
export const stripe = new Proxy({} as Stripe, {
  get(target, prop) {
    const instance = getStripe();
    if (!instance) {
      console.warn('Stripe is not initialized. Please set STRIPE_SECRET_KEY environment variable.');
      return () => Promise.reject(new Error('Stripe not initialized'));
    }
    return instance[prop as keyof Stripe];
  },
});

export const PLANS = {
  free: {
    name: '無料プラン',
    description: '基本機能をお試しいただけます',
    features: [
      'プロジェクト作成（1つまで）',
      'AI生成（月10回まで）',
      '基本的なキャラクター管理',
      '章立て構成',
    ],
    priceId: null,
    price: 0,
  },
  pro: {
    name: 'プロプラン',
    description: 'プロの作家向けの充実した機能',
    features: [
      'プロジェクト作成（無制限）',
      'AI生成（無制限）',
      '高度なキャラクター管理',
      '詳細な世界観設定',
      'エクスポート機能',
      '優先サポート',
    ],
    priceId: null, // Will be set server-side
    price: 1000,
  },
  enterprise: {
    name: 'エンタープライズプラン',
    description: '出版社・プロダクション向け',
    features: [
      'プロプランの全機能',
      'チーム共同作業',
      'カスタムAI設定',
      'API アクセス',
      '専任サポート',
      'カスタマイズ対応',
    ],
    priceId: null, // Will be set server-side
    price: 5000,
  },
};

export type PlanType = keyof typeof PLANS;

export const getStripePriceId = (plan: PlanType): string | null => {
  // Price IDs should be retrieved from environment variables on the server side
  if (typeof window === 'undefined') {
    // Server-side only
    if (plan === 'pro') {
      return process.env.STRIPE_PRICE_ID_PRO || null;
    } else if (plan === 'enterprise') {
      return process.env.STRIPE_PRICE_ID_ENTERPRISE || null;
    }
  }
  return null;
};

export const getPlanByPriceId = (priceId: string): PlanType => {
  // This function should only be called server-side
  if (typeof window === 'undefined') {
    // 開発環境のプライスIDに対応
    if (priceId === 'dev_price_pro' || priceId === process.env.STRIPE_PRICE_ID_PRO) {
      return 'pro';
    } else if (priceId === 'dev_price_enterprise' || priceId === process.env.STRIPE_PRICE_ID_ENTERPRISE) {
      return 'enterprise';
    } else if (priceId === 'dev_price_free') {
      return 'free';
    }
  }
  return 'free';
};