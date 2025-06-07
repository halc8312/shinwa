import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { SubscriptionService } from '@/lib/services/subscription-service';
import prisma from '@/lib/prisma';
import type Stripe from 'stripe';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        if (session.mode === 'subscription' && session.subscription && session.customer) {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          );

          await SubscriptionService.createOrUpdateSubscription(
            session.metadata?.userId!,
            session.customer as string,
            {
              stripeSubscriptionId: subscription.id,
              stripePriceId: subscription.items.data[0].price.id,
              stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
              status: subscription.status,
            }
          );
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // カスタマーIDからユーザーを取得
        const existingSubscription = await prisma.subscription.findUnique({
          where: { stripeCustomerId: customerId },
        });

        if (existingSubscription) {
          await SubscriptionService.createOrUpdateSubscription(
            existingSubscription.userId,
            customerId,
            {
              stripeSubscriptionId: subscription.id,
              stripePriceId: subscription.items.data[0].price.id,
              stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
              status: subscription.status,
            }
          );
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const existingSubscription = await prisma.subscription.findUnique({
          where: { stripeCustomerId: customerId },
        });

        if (existingSubscription) {
          await SubscriptionService.createOrUpdateSubscription(
            existingSubscription.userId,
            customerId,
            {
              status: 'canceled',
              stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
            }
          );
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const customerId = subscription.customer as string;

          const existingSubscription = await prisma.subscription.findUnique({
            where: { stripeCustomerId: customerId },
          });

          if (existingSubscription) {
            await SubscriptionService.createOrUpdateSubscription(
              existingSubscription.userId,
              customerId,
              {
                status: 'active',
                stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
              }
            );
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const customerId = subscription.customer as string;

          const existingSubscription = await prisma.subscription.findUnique({
            where: { stripeCustomerId: customerId },
          });

          if (existingSubscription) {
            await SubscriptionService.createOrUpdateSubscription(
              existingSubscription.userId,
              customerId,
              {
                status: 'past_due',
              }
            );
          }
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

// Stripe Webhookは生のボディが必要なため、bodyParserを無効化
export const config = {
  api: {
    bodyParser: false,
  },
};