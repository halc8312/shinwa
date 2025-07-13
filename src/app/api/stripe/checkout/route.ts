import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { getStripe, PLANS, type PlanType, getStripePriceId } from '@/lib/stripe';
import { SubscriptionService } from '@/lib/services/subscription-service';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    // Stripeの初期化チェック
    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe not configured' },
        { status: 500 }
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

    if (!plan || !['pro', 'enterprise'].includes(plan)) {
      return NextResponse.json(
        { error: 'Invalid plan' },
        { status: 400 }
      );
    }

    const priceId = getStripePriceId(plan as PlanType);
    if (!priceId) {
      return NextResponse.json(
        { error: 'Price ID not configured' },
        { status: 500 }
      );
    }

    // 既存のサブスクリプションを確認
    const existingSubscription = await SubscriptionService.getSubscription(session.user.id);
    
    let customerId = existingSubscription?.stripeCustomerId;

    // Stripeカスタマーを作成または取得
    if (!customerId) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
      });

      const customer = await stripe.customers.create({
        email: user?.email || undefined,
        metadata: {
          userId: session.user.id,
        },
      });

      customerId = customer.id;

      // サブスクリプションレコードを作成
      await SubscriptionService.createOrUpdateSubscription(
        session.user.id,
        customerId,
        {}
      );
    }

    // Checkoutセッションを作成
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXTAUTH_URL}/account?success=true`,
      cancel_url: `${process.env.NEXTAUTH_URL}/pricing?canceled=true`,
      metadata: {
        userId: session.user.id,
        plan,
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error('Checkout session error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}