import { AIModelSettings } from '@/lib/types'

// デフォルトのモデル設定
export const DEFAULT_MODEL_SETTINGS: AIModelSettings = {
  defaultModel: {
    model: 'gpt-4.1-mini',
    temperature: 0.7,
    maxTokens: 32768
  },
  chapterWriting: {
    model: 'gpt-4.1-mini',
    temperature: 0.8,
    maxTokens: 32768
  },
  chapterPlanning: {
    model: 'gpt-4.1-mini',
    temperature: 0.5,
    maxTokens: 32768
  },
  backgroundEvents: {
    model: 'gpt-4.1-mini',
    temperature: 0.3,
    maxTokens: 32768
  },
  summarization: {
    model: 'gpt-4.1-mini',
    temperature: 0.3,
    maxTokens: 32768
  },
  characterAnalysis: {
    model: 'gpt-4.1-mini',
    temperature: 0.5,
    maxTokens: 32768
  },
  validation: {
    model: 'gpt-4.1-mini',
    temperature: 0.3,
    maxTokens: 32768
  },
  assistant: {
    model: 'gpt-4.1-mini',
    temperature: 0.7,
    maxTokens: 32768
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
  
  // プロジェクトの基本設定からモデルを取得
  const projectStored = localStorage.getItem(`shinwa-project-${projectId}`)
  if (projectStored) {
    try {
      const project = JSON.parse(projectStored)
      if (project.settings?.aiSettings?.model) {
        // 基本AI設定のモデルを各機能のデフォルトとして使用
        const baseModel = project.settings.aiSettings.model
        const baseTemperature = project.settings.aiSettings.temperature || 0.7
        const baseMaxTokens = project.settings.aiSettings.maxTokens || 4000
        
        return {
          defaultModel: {
            model: baseModel,
            temperature: baseTemperature,
            maxTokens: baseMaxTokens
          },
          chapterWriting: {
            model: baseModel,  // 基本設定のモデルを使用
            temperature: 0.8,
            maxTokens: 5000
          },
          chapterPlanning: {
            model: baseModel,
            temperature: 0.5,
            maxTokens: 2000
          },
          backgroundEvents: {
            model: baseModel,
            temperature: 0.3,
            maxTokens: 1000
          },
          summarization: {
            model: baseModel,
            temperature: 0.3,
            maxTokens: 500
          },
          characterAnalysis: {
            model: baseModel,
            temperature: 0.5,
            maxTokens: 2000
          },
          validation: {
            model: baseModel,
            temperature: 0.3,
            maxTokens: 1000
          },
          assistant: {
            model: baseModel,
            temperature: 0.7,
            maxTokens: 2000
          }
        }
      }
    } catch (error) {
      console.error('Failed to parse project settings:', error)
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