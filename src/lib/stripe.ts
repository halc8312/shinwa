import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-05-28.basil',
  typescript: true,
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
    priceId: process.env.STRIPE_PRICE_ID_PRO,
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
    priceId: process.env.STRIPE_PRICE_ID_ENTERPRISE,
    price: 5000,
  },
};

export type PlanType = keyof typeof PLANS;

export const getStripePriceId = (plan: PlanType): string | null => {
  return PLANS[plan].priceId || null;
};

export const getPlanByPriceId = (priceId: string): PlanType => {
  for (const [key, plan] of Object.entries(PLANS)) {
    if (plan.priceId === priceId) {
      return key as PlanType;
    }
  }
  return 'free';
};