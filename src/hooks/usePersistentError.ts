import { useState, useCallback, useEffect } from 'react'
import { ErrorInfo } from '@/components/ui/ErrorDisplay'

interface PersistentErrorOptions {
  storageKey?: string
  autoClearAfter?: number // Auto clear error after X milliseconds
}

/**
 * Hook for managing persistent error state across component renders and steps
 * Optionally persists to sessionStorage for true persistence across page refreshes
 */
export function usePersistentError(options: PersistentErrorOptions = {}) {
  const { storageKey, autoClearAfter } = options
  
  // Initialize error from storage if key is provided
  const [error, setErrorState] = useState<ErrorInfo | null>(() => {
    if (storageKey && typeof window !== 'undefined') {
      const stored = sessionStorage.getItem(storageKey)
      if (stored) {
        try {
          return JSON.parse(stored)
        } catch {
          return null
        }
      }
    }
    return null
  })

  // Set error and optionally persist to storage
  const setError = useCallback((error: ErrorInfo | null) => {
    setErrorState(error)
    
    if (storageKey && typeof window !== 'undefined') {
      if (error) {
        sessionStorage.setItem(storageKey, JSON.stringify(error))
      } else {
        sessionStorage.removeItem(storageKey)
      }
    }
  }, [storageKey])

  // Clear error
  const clearError = useCallback(() => {
    setError(null)
  }, [setError])

  // Auto-clear error after specified time
  useEffect(() => {
    if (error && autoClearAfter && autoClearAfter > 0) {
      const timer = setTimeout(() => {
        clearError()
      }, autoClearAfter)

      return () => clearTimeout(timer)
    }
  }, [error, autoClearAfter, clearError])

  // Clear storage on unmount if specified
  useEffect(() => {
    return () => {
      if (storageKey && typeof window !== 'undefined') {
        // Optional: clear on unmount - uncomment if desired
        // sessionStorage.removeItem(storageKey)
      }
    }
  }, [storageKey])

  return {
    error,
    setError,
    clearError,
    hasError: !!error,
    isRecoverable: error?.isRecoverable ?? false
  }
}