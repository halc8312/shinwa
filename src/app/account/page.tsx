'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Button from '@/components/ui/Button'

export default function AccountPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
    }
  }, [session, status, router])

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' })
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
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

        <div className="mt-4">
          <Button
            variant="secondary"
            onClick={() => router.push('/projects')}
          >
            プロジェクト一覧に戻る
          </Button>
        </div>
      </div>
    </div>
  )
}