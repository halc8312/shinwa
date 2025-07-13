'use client'

import { useState, useEffect, useRef } from 'react'

interface GenerationStep {
  id: string
  name: string
  estimatedDuration: number // in milliseconds
}

interface GenerationProgressTrackerProps {
  steps: GenerationStep[]
  currentStep: string
  progress: number
  onCancel?: () => void
  canCancel?: boolean
}

export default function GenerationProgressTracker({
  steps,
  currentStep,
  progress,
  onCancel,
  canCancel = true
}: GenerationProgressTrackerProps) {
  const [startTime, setStartTime] = useState<number | null>(null)
  const [stepStartTimes, setStepStartTimes] = useState<Record<string, number>>({})
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number | null>(null)
  const previousStep = useRef<string | null>(null)

  // Track when generation starts
  useEffect(() => {
    if (currentStep && !startTime) {
      setStartTime(Date.now())
    }
  }, [currentStep, startTime])

  // Track step transitions
  useEffect(() => {
    if (currentStep && currentStep !== previousStep.current) {
      setStepStartTimes(prev => ({
        ...prev,
        [currentStep]: Date.now()
      }))
      previousStep.current = currentStep
    }
  }, [currentStep])

  // Calculate estimated time remaining
  useEffect(() => {
    if (!startTime || !currentStep) {
      setEstimatedTimeRemaining(null)
      return
    }

    const currentStepIndex = steps.findIndex(s => s.id === currentStep)
    if (currentStepIndex === -1) {
      setEstimatedTimeRemaining(null)
      return
    }

    const elapsedTime = Date.now() - startTime
    const completedSteps = currentStepIndex
    const totalSteps = steps.length
    
    // Calculate average time per step based on completed steps
    if (completedSteps > 0) {
      const averageTimePerStep = elapsedTime / completedSteps
      const remainingSteps = totalSteps - currentStepIndex
      const estimated = averageTimePerStep * remainingSteps
      setEstimatedTimeRemaining(Math.round(estimated))
    } else {
      // Use estimated durations for initial estimate
      const remainingEstimate = steps
        .slice(currentStepIndex + 1)
        .reduce((sum, step) => sum + step.estimatedDuration, 0)
      setEstimatedTimeRemaining(remainingEstimate)
    }
  }, [currentStep, startTime, steps])

  // Format time for display
  const formatTime = (ms: number | null): string => {
    if (!ms) return '--:--'
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  // Get step status
  const getStepStatus = (stepId: string) => {
    const stepIndex = steps.findIndex(s => s.id === stepId)
    const currentIndex = steps.findIndex(s => s.id === currentStep)
    
    if (stepIndex < currentIndex) return 'completed'
    if (stepIndex === currentIndex) return 'current'
    return 'pending'
  }

  return (
    <div className="space-y-4">
      {/* Progress header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            生成進行状況
          </h3>
          {estimatedTimeRemaining !== null && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              推定残り時間: {formatTime(estimatedTimeRemaining)}
            </p>
          )}
        </div>
        {canCancel && onCancel && (
          <button
            onClick={onCancel}
            className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium"
          >
            キャンセル
          </button>
        )}
      </div>

      {/* Overall progress bar */}
      <div className="w-full">
        <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
          <div 
            className="bg-gradient-to-r from-blue-500 to-blue-600 h-full transition-all duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
          {progress}%
        </p>
      </div>

      {/* Step list with individual progress */}
      <ul className="space-y-3">
        {steps.map((step) => {
          const status = getStepStatus(step.id)
          const isActive = status === 'current'
          const isCompleted = status === 'completed'
          
          return (
            <li 
              key={step.id}
              className={`flex items-center gap-3 transition-all duration-300 ${
                isActive ? 'scale-105' : ''
              }`}
            >
              <div className="flex-shrink-0">
                {isCompleted ? (
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                ) : isActive ? (
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                  </div>
                ) : (
                  <div className="w-6 h-6 bg-gray-300 dark:bg-gray-600 rounded-full" />
                )}
              </div>
              
              <div className="flex-1">
                <p className={`text-sm ${
                  isActive ? 'font-medium text-blue-600 dark:text-blue-400' : 
                  isCompleted ? 'text-gray-600 dark:text-gray-400 line-through' : 
                  'text-gray-400 dark:text-gray-500'
                }`}>
                  {step.name}
                </p>
                {isActive && stepStartTimes[step.id] && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    経過時間: {formatTime(Date.now() - stepStartTimes[step.id])}
                  </p>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}