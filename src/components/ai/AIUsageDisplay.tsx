'use client'

import { useEffect, useState } from 'react'
import { AIUsageStats, getAIUsageStats } from '@/lib/utils/ai-usage-client'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import Link from 'next/link'

interface AIUsageDisplayProps {
  className?: string
  onUsageLoaded?: (stats: AIUsageStats) => void
  showUpgradeLink?: boolean
}

export default function AIUsageDisplay({ 
  className = '', 
  onUsageLoaded,
  showUpgradeLink = true 
}: AIUsageDisplayProps) {
  const [stats, setStats] = useState<AIUsageStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { isAuthenticated } = useCurrentUser()

  useEffect(() => {
    if (isAuthenticated) {
      loadStats()
    }
  }, [isAuthenticated])

  const loadStats = async () => {
    setIsLoading(true)
    try {
      const loadedStats = await getAIUsageStats()
      if (loadedStats) {
        setStats(loadedStats)
        onUsageLoaded?.(loadedStats)
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading || !stats) {
    return null
  }

  if (stats.isUnlimited) {
    return (
      <div className={`text-center ${className}`}>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
          プラン: <span className="font-medium text-green-600">有料プラン</span>
        </p>
        <p className="text-lg font-bold text-green-600">無制限</p>
        <p className="text-xs text-gray-500">AI生成に制限はありません</p>
      </div>
    )
  }

  const usagePercentage = (stats.used / stats.limit) * 100

  return (
    <div className={className}>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
        プラン: <span className="font-medium">無料プラン</span>
      </p>
      
      <div className="mb-2">
        <div className="flex justify-between text-sm mb-1">
          <span>今月の使用回数</span>
          <span className="font-medium">{stats.used} / {stats.limit}</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all ${
              stats.remaining === 0 ? 'bg-red-600' : 'bg-blue-600'
            }`}
            style={{ width: `${Math.min(usagePercentage, 100)}%` }}
          />
        </div>
      </div>
      
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
        残り: <span className={`font-medium ${stats.remaining === 0 ? 'text-red-600' : 'text-green-600'}`}>
          {stats.remaining}回
        </span>
      </p>
      
      {stats.remaining === 0 && showUpgradeLink && (
        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <p className="text-xs text-yellow-800 dark:text-yellow-200 mb-2">
            今月の無料枠を使い切りました。
          </p>
          <Link href="/account">
            <button className="text-xs text-blue-600 hover:text-blue-700 underline">
              有料プランにアップグレード
            </button>
          </Link>
        </div>
      )}
      
      {stats.periodEnd && (
        <p className="text-xs text-gray-500 mt-2">
          リセット日: {new Date(stats.periodEnd).toLocaleDateString('ja-JP')}
        </p>
      )}
    </div>
  )
}