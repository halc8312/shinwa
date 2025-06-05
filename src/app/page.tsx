'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Button from '@/components/ui/Button'

export default function Home() {
  const router = useRouter()

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-6 md:p-8 bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-950">
      <div className="max-w-5xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-4 text-gray-900 dark:text-white">
            Shinwa
          </h1>
          <p className="text-xl sm:text-2xl text-gray-600 dark:text-gray-400 mb-2">
            AI Novel Writing Engine
          </p>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-500">
            限りなくすぐれたAIによる小説執筆エンジン
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-12">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mb-3 sm:mb-4">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-base sm:text-lg font-semibold mb-2">自律的な執筆</h3>
            <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">
              フロー駆動型システムにより、AIが自律的に小説を執筆します
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mb-3 sm:mb-4">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-base sm:text-lg font-semibold mb-2">一貫性の保証</h3>
            <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">
              キャラクター、世界観、時系列の整合性を自動的に管理します
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 shadow-lg hover:shadow-xl transition-shadow sm:col-span-2 lg:col-span-1">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mb-3 sm:mb-4">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-base sm:text-lg font-semibold mb-2">最新AIモデル</h3>
            <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">
              OpenAIとAnthropicの最新モデルに対応、カスタムモデルも利用可能
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/projects">
            <Button size="lg" className="w-full sm:w-auto">
              プロジェクトを開始
            </Button>
          </Link>
          <a 
            href="https://github.com/yourusername/shinwa" 
            target="_blank" 
            rel="noopener noreferrer"
          >
            <Button size="lg" variant="secondary" className="w-full sm:w-auto">
              GitHubで見る
            </Button>
          </a>
        </div>
      </div>
    </main>
  )
}