import { getStripe, getPlanByPriceId, type PlanType } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import type { User } from '@prisma/client';

export class SubscriptionService {
  static async createOrUpdateSubscription(
    userId: string,
    stripeCustomerId: string,
    subscriptionData: {
      stripeSubscriptionId?: string;
      stripePriceId?: string;
      stripeCurrentPeriodEnd?: Date;
      status?: string;
    }
  ) {
    const plan = subscriptionData.stripePriceId
      ? getPlanByPriceId(subscriptionData.stripePriceId)
      : 'free';

    return await prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        stripeCustomerId,
        ...subscriptionData,
        plan,
      },
      update: {
        ...subscriptionData,
        plan,
      },
    });
  }

  static async getSubscription(userId: string) {
    return await prisma.subscription.findUnique({
      where: { userId },
    });
  }

  static async cancelSubscription(userId: string) {
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription?.stripeSubscriptionId) {
      throw new Error('No active subscription found');
    }

    // Stripe側でサブスクリプションをキャンセル
    const stripe = getStripe();
    if (!stripe) {
      throw new Error('Stripe not configured');
    }
    
    const canceledSubscription = await stripe.subscriptions.update(
      subscription.stripeSubscriptionId,
      {
        cancel_at_period_end: true,
      }
    );

    // データベースを更新
    return await prisma.subscription.update({
      where: { userId },
      data: {
        status: 'canceled',
      },
    });
  }

  static async createCustomerPortalSession(userId: string) {
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription?.stripeCustomerId) {
      throw new Error('No customer found');
    }

    const stripe = getStripe();
    if (!stripe) {
      throw new Error('Stripe not configured');
    }
    
    return await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${process.env.NEXTAUTH_URL}/account`,
    });
  }

  static async checkSubscriptionStatus(userId: string): Promise<{
    hasActiveSubscription: boolean;
    plan: PlanType;
    canAccessFeature: (feature: string) => boolean;
  }> {
    try {
      const subscription = await this.getSubscription(userId);

      const hasActiveSubscription = Boolean(
        subscription?.status === 'active' &&
        subscription?.stripeCurrentPeriodEnd &&
        subscription.stripeCurrentPeriodEnd > new Date()
      );

      const plan = (subscription?.plan || 'free') as PlanType;

      const canAccessFeature = (feature: string): boolean => {
        const featureAccess: Record<string, PlanType[]> = {
          unlimited_projects: ['pro', 'enterprise'],
          unlimited_ai_generation: ['pro', 'enterprise'],
          team_collaboration: ['enterprise'],
          api_access: ['enterprise'],
          export_feature: ['pro', 'enterprise'],
        };

        const allowedPlans = featureAccess[feature] || [];
        return allowedPlans.includes(plan);
      };

      return {
        hasActiveSubscription,
        plan,
        canAccessFeature,
      };
    } catch (error: any) {
      console.error('Subscription check failed:', error);
      
      // テーブルが存在しない場合やその他のエラーの場合は、無料プランとして扱う
      if (error.message?.includes('does not exist') || error.code === 'P2021') {
        console.warn('Subscription table not found. Treating as free plan.');
      }
      
      return {
        hasActiveSubscription: false,
        plan: 'free' as PlanType,
        canAccessFeature: (feature: string) => false,
      };
    }
  }

  static async enforceProjectLimit(userId: string): Promise<boolean> {
    const { plan } = await this.checkSubscriptionStatus(userId);
    
    if (plan !== 'free') {
      return true; // 有料プランは制限なし
    }

    const projectCount = await prisma.project.count({
      where: { userId },
    });

    return projectCount < 1; // 無料プランは1プロジェクトまで
  }

  static async enforceAIGenerationLimit(userId: string): Promise<{
    canGenerate: boolean;
    remaining: number;
  }> {
    const { plan } = await this.checkSubscriptionStatus(userId);
    
    if (plan !== 'free') {
      return { canGenerate: true, remaining: -1 }; // 無制限
    }

    // ここでAI生成回数をカウントする実装が必要
    // 現在は簡易的に実装
    return { canGenerate: true, remaining: 10 };
  }
}