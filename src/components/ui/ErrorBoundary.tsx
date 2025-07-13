'use client'

import React, { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md w-full">
            <h2 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
              エラーが発生しました
            </h2>
            <p className="text-sm text-red-700 dark:text-red-300 mb-4">
              申し訳ございません。予期せぬエラーが発生しました。
            </p>
            {this.state.error && (
              <details className="text-xs text-red-600 dark:text-red-400">
                <summary className="cursor-pointer hover:underline mb-2">
                  エラーの詳細を表示
                </summary>
                <pre className="bg-red-100 dark:bg-red-900/40 p-3 rounded overflow-x-auto">
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors text-sm"
            >
              再試行
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary