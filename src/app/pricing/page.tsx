'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { PLANS, type PlanType } from '@/lib/stripe';

export default function PricingPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState<PlanType | null>(null);

  const handleSubscribe = async (plan: PlanType) => {
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    if (plan === 'free') {
      router.push('/projects');
      return;
    }

    setLoading(plan);

    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plan }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error('Failed to create checkout session');
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(null);
    }
  };

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
              料金プラン
            </h1>
            <p className="mt-4 text-xl text-gray-600 dark:text-gray-400">
              あなたの創作活動に最適なプランをお選びください
            </p>
          </div>

          <div className="mt-12 grid gap-8 lg:grid-cols-3">
            {Object.entries(PLANS).map(([key, plan]) => {
              const planKey = key as PlanType;
              const isPro = planKey === 'pro';
              
              return (
                <div
                  key={key}
                  className={`relative rounded-2xl shadow-lg ${
                    isPro
                      ? 'border-2 border-indigo-500 dark:border-indigo-400'
                      : 'border border-gray-200 dark:border-gray-700'
                  } bg-white dark:bg-gray-800 p-8`}
                >
                  {isPro && (
                    <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-2">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-500 text-white">
                        おすすめ
                      </span>
                    </div>
                  )}

                  <div className="text-center">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {plan.name}
                    </h3>
                    <p className="mt-2 text-gray-600 dark:text-gray-400">
                      {plan.description}
                    </p>
                    <div className="mt-6">
                      <span className="text-4xl font-bold text-gray-900 dark:text-white">
                        ¥{plan.price.toLocaleString()}
                      </span>
                      <span className="text-gray-600 dark:text-gray-400">
                        {plan.price > 0 ? '/月' : ''}
                      </span>
                    </div>
                  </div>

                  <ul className="mt-8 space-y-4">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <svg
                          className="w-5 h-5 text-green-500 mt-0.5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span className="ml-3 text-gray-700 dark:text-gray-300">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-8">
                    <Button
                      onClick={() => handleSubscribe(planKey)}
                      disabled={loading !== null}
                      className={`w-full ${
                        isPro
                          ? 'bg-indigo-600 hover:bg-indigo-700'
                          : planKey === 'free'
                          ? 'bg-gray-600 hover:bg-gray-700'
                          : 'bg-gray-800 hover:bg-gray-900'
                      }`}
                    >
                      {loading === planKey
                        ? '処理中...'
                        : planKey === 'free'
                        ? '無料で始める'
                        : '申し込む'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-12 text-center text-gray-600 dark:text-gray-400">
            <p>すべてのプランは月額課金です。いつでもキャンセル可能です。</p>
            <p className="mt-2">
              プランの変更やキャンセルは、アカウントページから行えます。
            </p>
          </div>
        </div>
      </div>
    </>
  );
}