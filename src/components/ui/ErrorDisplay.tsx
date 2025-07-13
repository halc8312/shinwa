'use client'

import { useState } from 'react'
import Button from './Button'

export interface ErrorInfo {
  message: string
  code?: string
  isRecoverable?: boolean
  recoveryActions?: {
    label: string
    action: () => void | Promise<void>
  }[]
  details?: string
}

interface ErrorDisplayProps {
  error: ErrorInfo
  onRetry?: () => void
  className?: string
}

export default function ErrorDisplay({ error, onRetry, className = '' }: ErrorDisplayProps) {
  const [showDetails, setShowDetails] = useState(false)
  const [isRecovering, setIsRecovering] = useState(false)

  const handleRecoveryAction = async (action: () => void | Promise<void>) => {
    setIsRecovering(true)
    try {
      await action()
    } finally {
      setIsRecovering(false)
    }
  }

  // Determine error type and provide guidance
  const getErrorGuidance = () => {
    if (error.code === 'API_KEY_MISSING') {
      return {
        icon: '🔑',
        title: 'APIキーが設定されていません',
        guidance: 'AIプロバイダーのAPIキーを設定する必要があります。',
        isRecoverable: true
      }
    } else if (error.code === 'RATE_LIMIT') {
      return {
        icon: '⏱️',
        title: 'レート制限に達しました',
        guidance: '少し時間をおいてから再度お試しください。',
        isRecoverable: true
      }
    } else if (error.code === 'NETWORK_ERROR') {
      return {
        icon: '🌐',
        title: 'ネットワークエラー',
        guidance: 'インターネット接続を確認してください。',
        isRecoverable: true
      }
    } else if (error.code === 'AI_GENERATION_FAILED') {
      return {
        icon: '🤖',
        title: 'AI生成エラー',
        guidance: 'AI生成中にエラーが発生しました。別のモデルを試すか、プロンプトを調整してください。',
        isRecoverable: true
      }
    } else if (error.code === 'USAGE_LIMIT_EXCEEDED') {
      return {
        icon: '📊',
        title: '使用制限に達しました',
        guidance: '月間の生成制限に達しました。プランをアップグレードするか、翌月までお待ちください。',
        isRecoverable: false
      }
    } else {
      return {
        icon: '⚠️',
        title: 'エラーが発生しました',
        guidance: error.message,
        isRecoverable: error.isRecoverable ?? true
      }
    }
  }

  const errorGuidance = getErrorGuidance()

  return (
    <div
      className={`rounded-lg border p-4 ${
        errorGuidance.isRecoverable
          ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
          : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
      } ${className}`}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0" aria-hidden="true">
          {errorGuidance.icon}
        </span>
        <div className="flex-1 min-w-0">
          <h3 className={`font-semibold mb-1 ${
            errorGuidance.isRecoverable
              ? 'text-yellow-800 dark:text-yellow-200'
              : 'text-red-800 dark:text-red-200'
          }`}>
            {errorGuidance.title}
          </h3>
          <p className={`text-sm mb-3 ${
            errorGuidance.isRecoverable
              ? 'text-yellow-700 dark:text-yellow-300'
              : 'text-red-700 dark:text-red-300'
          }`}>
            {errorGuidance.guidance}
          </p>

          {/* Recovery actions */}
          <div className="flex flex-wrap gap-2">
            {error.recoveryActions && error.recoveryActions.map((action, index) => (
              <Button
                key={index}
                size="sm"
                variant="secondary"
                onClick={() => handleRecoveryAction(action.action)}
                disabled={isRecovering}
              >
                {action.label}
              </Button>
            ))}
            
            {onRetry && errorGuidance.isRecoverable && (
              <Button
                size="sm"
                variant="secondary"
                onClick={onRetry}
                disabled={isRecovering}
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                再試行
              </Button>
            )}

            {error.details && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowDetails(!showDetails)}
              >
                {showDetails ? '詳細を隠す' : '詳細を表示'}
              </Button>
            )}
          </div>

          {/* Error details */}
          {showDetails && error.details && (
            <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
              <pre className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap font-mono">
                {error.details}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}