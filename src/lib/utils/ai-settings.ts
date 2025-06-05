import { AIModelSettings } from '@/lib/types'

// デフォルトのモデル設定
export const DEFAULT_MODEL_SETTINGS: AIModelSettings = {
  defaultModel: {
    model: 'gpt-4.1-mini',
    temperature: 0.7,
    maxTokens: 4000
  },
  chapterWriting: {
    model: 'gpt-4o',
    temperature: 0.8,
    maxTokens: 5000
  },
  chapterPlanning: {
    model: 'gpt-4.1-mini',
    temperature: 0.5,
    maxTokens: 2000
  },
  backgroundEvents: {
    model: 'gpt-4o-mini',
    temperature: 0.3,
    maxTokens: 1000
  },
  summarization: {
    model: 'gpt-4.1-mini',
    temperature: 0.3,
    maxTokens: 500
  },
  characterAnalysis: {
    model: 'gpt-4.1-mini',
    temperature: 0.5,
    maxTokens: 2000
  },
  validation: {
    model: 'gpt-4o-mini',
    temperature: 0.3,
    maxTokens: 1000
  },
  assistant: {
    model: 'gpt-4.1-mini',
    temperature: 0.7,
    maxTokens: 2000
  }
}

/**
 * プロジェクトのAIモデル設定を取得
 */
export function getProjectModelSettings(projectId: string): AIModelSettings {
  const stored = localStorage.getItem(`shinwa-ai-model-settings-${projectId}`)
  if (stored) {
    try {
      return JSON.parse(stored)
    } catch (error) {
      console.error('Failed to parse AI model settings:', error)
    }
  }
  return DEFAULT_MODEL_SETTINGS
}

/**
 * 特定の機能のモデル設定を取得
 */
export function getFeatureModelSettings(
  projectId: string, 
  feature: keyof AIModelSettings
): AIModelSettings[keyof AIModelSettings] {
  const settings = getProjectModelSettings(projectId)
  return settings[feature] || settings.defaultModel
}