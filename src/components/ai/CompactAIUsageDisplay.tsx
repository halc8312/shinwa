'use client'

import { useEffect, useState } from 'react'
import { AIUsageStats, getAIUsageStats } from '@/lib/utils/ai-usage-client'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import Link from 'next/link'

export default function CompactAIUsageDisplay() {
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
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading || !stats) {
    return null
  }

  const usageColor = stats.isUnlimited 
    ? 'text-green-600' 
    : stats.remaining === 0 
      ? 'text-red-600' 
      : 'text-gray-600 dark:text-gray-400'

  return (
    <Link href="/account" className="flex items-center space-x-2 px-3 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
      <svg className="h-4 w-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
      <span className={`text-sm font-medium ${usageColor}`}>
        {stats.isUnlimited ? (
          '無制限'
        ) : (
          `${stats.remaining}/${stats.limit}`
        )}
      </span>
    </Link>
  )
}