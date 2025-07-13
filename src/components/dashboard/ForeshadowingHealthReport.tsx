'use client'

import { useEffect, useState } from 'react'
import { chapterService } from '@/lib/services/chapter-service'

interface ForeshadowingReport {
  totalCount: number
  plantedCount: number
  reinforcedCount: number
  revealedCount: number
  overdueCount: number
  healthIssues: {
    foreshadowingId: string
    hint: string
    chapter: number
    issues: string[]
    suggestions: string[]
  }[]
  recommendations: string[]
}

interface ForeshadowingHealthReportProps {
  projectId: string
}

export default function ForeshadowingHealthReport({ projectId }: ForeshadowingHealthReportProps) {
  const [report, setReport] = useState<ForeshadowingReport | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadReport()
  }, [projectId])

  const loadReport = async () => {
    setIsLoading(true)
    try {
      const reportData = await chapterService.getForeshadowingReport(projectId)
      setReport(reportData)
    } catch (error) {
      console.error('Failed to load foreshadowing report:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  if (!report) {
    return null
  }

  const hasIssues = report.overdueCount > 0 || report.healthIssues.length > 0

  return (
    <div className={`rounded-lg shadow p-6 ${
      hasIssues 
        ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700' 
        : 'bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700'
    }`}>
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        {hasIssues ? (
          <>
            <span className="text-yellow-600 dark:text-yellow-400">⚠️ 伏線の健全性チェック</span>
            <span className="text-sm font-normal text-yellow-600 dark:text-yellow-400">
              ({report.healthIssues.length + report.overdueCount}件の問題)
            </span>
          </>
        ) : (
          <span className="text-green-600 dark:text-green-400">✅ 伏線は健全です</span>
        )}
      </h3>

      {/* 期限切れの伏線警告 */}
      {report.overdueCount > 0 && (
        <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/30 rounded-lg border border-red-300 dark:border-red-700">
          <h4 className="font-medium text-red-800 dark:text-red-300 mb-2">
            🚨 期限切れの伏線: {report.overdueCount}件
          </h4>
          <p className="text-sm text-red-700 dark:text-red-400">
            回収予定章を過ぎた伏線があります。早急に回収するか、予定を見直してください。
          </p>
        </div>
      )}

      {/* 健全性の問題 */}
      {report.healthIssues.length > 0 && (
        <div className="space-y-3 mb-4">
          {report.healthIssues.map((issue, index) => (
            <div key={index} className="p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
              <div className="font-medium text-sm mb-1">
                第{issue.chapter}章: {issue.hint}
              </div>
              <div className="space-y-1">
                {issue.issues.map((problem, i) => (
                  <div key={i} className="text-sm text-red-600 dark:text-red-400">
                    • {problem}
                  </div>
                ))}
                {issue.suggestions.map((suggestion, i) => (
                  <div key={i} className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                    → {suggestion}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 推奨事項 */}
      {report.recommendations.length > 0 && (
        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">
            💡 推奨事項
          </h4>
          <ul className="space-y-1">
            {report.recommendations.map((rec, index) => (
              <li key={index} className="text-sm text-blue-700 dark:text-blue-400">
                • {rec}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 統計サマリー */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <div className="text-center p-2 bg-white dark:bg-gray-800 rounded">
          <div className="text-2xl font-bold">{report.totalCount}</div>
          <div className="text-gray-600 dark:text-gray-400">総数</div>
        </div>
        <div className="text-center p-2 bg-white dark:bg-gray-800 rounded">
          <div className="text-2xl font-bold text-yellow-600">{report.plantedCount}</div>
          <div className="text-gray-600 dark:text-gray-400">未回収</div>
        </div>
        <div className="text-center p-2 bg-white dark:bg-gray-800 rounded">
          <div className="text-2xl font-bold text-green-600">{report.revealedCount}</div>
          <div className="text-gray-600 dark:text-gray-400">回収済み</div>
        </div>
        <div className="text-center p-2 bg-white dark:bg-gray-800 rounded">
          <div className="text-2xl font-bold text-red-600">{report.overdueCount}</div>
          <div className="text-gray-600 dark:text-gray-400">期限切れ</div>
        </div>
      </div>
    </div>
  )
}