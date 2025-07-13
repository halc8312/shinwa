import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { SubscriptionService } from '@/lib/services/subscription-service';
import { prisma } from '@/lib/prisma';
import type { PlanType } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    // 開発環境でのみ許可
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'This endpoint is only available in development' },
        { status: 403 }
      );
    }

    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { plan } = await request.json();

    if (!plan || !['free', 'pro', 'enterprise'].includes(plan)) {
      return NextResponse.json(
        { error: 'Invalid plan' },
        { status: 400 }
      );
    }

    // 既存のサブスクリプションを確認
    const existingSubscription = await SubscriptionService.getSubscription(session.user.id);
    
    let customerId = existingSubscription?.stripeCustomerId;

    // カスタマーIDがない場合は作成（開発用のダミーID）
    if (!customerId) {
      customerId = `dev_customer_${session.user.id}`;
    }

    // サブスクリプションを更新（開発用）
    const updatedSubscription = await SubscriptionService.createOrUpdateSubscription(
      session.user.id,
      customerId,
      {
        stripeSubscriptionId: `dev_sub_${session.user.id}_${plan}`,
        stripePriceId: `dev_price_${plan}`,
        stripeCurrentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1年後
        status: 'active',
      }
    );

    // AI使用履歴をリセット（プランアップグレード時）
    if (plan !== 'free' && existingSubscription?.plan === 'free') {
      const usage = await prisma.aIUsage.findFirst({
        where: {
          userId: session.user.id,
          periodStart: { lte: new Date() },
          periodEnd: { gt: new Date() },
        },
      });

      if (usage) {
        await prisma.aIUsage.update({
          where: { id: usage.id },
          data: {
            chapterGenCount: 0, // リセット
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      subscription: {
        plan: updatedSubscription.plan,
        status: updatedSubscription.status,
      },
      message: `開発モード: ${plan}プランに変更されました`,
    });
  } catch (error) {
    console.error('Dev subscription update error:', error);
    return NextResponse.json(
      { error: 'Failed to update subscription' },
      { status: 500 }
    );
  }
}