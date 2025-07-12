'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Button from '@/components/ui/Button'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { PLANS } from '@/lib/stripe'
import AIUsageDisplay from '@/components/ai/AIUsageDisplay'

export default function AccountPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [subscription, setSubscription] = useState<any>(null)
  const [loadingPortal, setLoadingPortal] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
    } else {
      fetchSubscription()
    }
  }, [session, status, router])

  const fetchSubscription = async () => {
    try {
      const response = await fetch('/api/subscription')
      if (response.ok) {
        const data = await response.json()
        setSubscription(data)
      }
    } catch (error) {
      console.error('Failed to fetch subscription:', error)
    }
  }

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' })
  }

  const handleManageSubscription = async () => {
    setLoadingPortal(true)
    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
      })
      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      console.error('Failed to create portal session:', error)
    } finally {
      setLoadingPortal(false)
    }
  }

  const handleDevPlanChange = async (plan: string) => {
    if (process.env.NODE_ENV === 'production') return

    try {
      const response = await fetch('/api/dev/update-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plan }),
      })

      const data = await response.json()

      if (data.success) {
        alert(data.message)
        // 再読み込みしてサブスクリプション情報を更新
        await fetchSubscription()
      } else {
        console.error('Failed to update subscription:', data.error)
        alert('プランの更新に失敗しました: ' + data.error)
      }
    } catch (error) {
      console.error('Error:', error)
      alert('エラーが発生しました')
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <Header />
      <div className="flex-grow max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8 w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            アカウント設定
          </h1>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">
              プロフィール情報
            </h2>
          </div>

          <div className="px-6 py-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                名前
              </label>
              <p className="mt-1 text-gray-900 dark:text-white">
                {session.user?.name || '未設定'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                メールアドレス
              </label>
              <p className="mt-1 text-gray-900 dark:text-white">
                {session.user?.email}
              </p>
            </div>

            {session.user?.image && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  プロフィール画像
                </label>
                <img
                  src={session.user.image}
                  alt="プロフィール"
                  className="mt-1 h-20 w-20 rounded-full"
                />
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">
              サブスクリプション
            </h2>
          </div>

          <div className="px-6 py-4">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  現在のプラン
                </label>
                <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                  {subscription?.plan ? PLANS[subscription.plan as keyof typeof PLANS]?.name : '無料プラン'}
                </p>
              </div>

              {subscription?.stripeCurrentPeriodEnd && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    次回更新日
                  </label>
                  <p className="mt-1 text-gray-900 dark:text-white">
                    {new Date(subscription.stripeCurrentPeriodEnd).toLocaleDateString('ja-JP')}
                  </p>
                </div>
              )}

              <div className="pt-4">
                {subscription?.stripeCustomerId ? (
                  <Button
                    onClick={handleManageSubscription}
                    disabled={loadingPortal}
                  >
                    {loadingPortal ? '処理中...' : 'サブスクリプションを管理'}
                  </Button>
                ) : (
                  <Button
                    onClick={() => router.push('/pricing')}
                    variant="primary"
                  >
                    プランをアップグレード
                  </Button>
                )}
              </div>

              {/* 開発モード用のプラン切り替えボタン */}
              {process.env.NODE_ENV !== 'production' && (
                <div className="mt-6 p-4 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-3">
                    開発モード: 以下のボタンで直接プランを切り替えできます
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={() => handleDevPlanChange('free')}
                      variant="secondary"
                      className="text-sm"
                      disabled={subscription?.plan === 'free'}
                    >
                      無料プランに変更
                    </Button>
                    <Button
                      onClick={() => handleDevPlanChange('pro')}
                      variant="secondary"
                      className="text-sm"
                      disabled={subscription?.plan === 'pro'}
                    >
                      プロプランに変更
                    </Button>
                    <Button
                      onClick={() => handleDevPlanChange('enterprise')}
                      variant="secondary"
                      className="text-sm"
                      disabled={subscription?.plan === 'enterprise'}
                    >
                      エンタープライズプランに変更
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">
              AI使用状況
            </h2>
          </div>

          <div className="px-6 py-4">
            <AIUsageDisplay className="max-w-md" />
          </div>
        </div>

        <div className="mt-8 bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">
              アカウント管理
            </h2>
          </div>

          <div className="px-6 py-4">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                  ログアウト
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  現在のセッションからログアウトします
                </p>
                <Button
                  variant="secondary"
                  onClick={handleSignOut}
                >
                  ログアウト
                </Button>
              </div>
            </div>
          </div>
        </div>

      </div>
      <Footer />
    </div>
  )
}