import { aiManager } from './manager'
import { useAppStore } from '../store'

// AIマネージャーの初期化
export function initializeAIManager() {
  // ストアから保存された設定を読み込む
  const state = useAppStore.getState()
  
  if (state.currentProvider && state.apiKeys[state.currentProvider]) {
    aiManager.registerProvider(state.currentProvider, {
      apiKey: state.apiKeys[state.currentProvider]!
    })
    aiManager.setCurrentProvider(state.currentProvider)
  }
  
  // LocalStorageからも読み込む（後方互換性のため）
  const stored = localStorage.getItem('shinwa-ai-settings')
  if (stored && !state.currentProvider) {
    try {
      const settings = JSON.parse(stored)
      if (settings.provider && settings.apiKey) {
        aiManager.registerProvider(settings.provider, {
          apiKey: settings.apiKey,
          defaultModel: settings.model
        })
        aiManager.setCurrentProvider(settings.provider)
        
        // ストアも更新
        useAppStore.getState().setCurrentProvider(settings.provider)
        useAppStore.getState().setApiKey(settings.provider, settings.apiKey)
      }
    } catch (error) {
      console.error('Failed to load AI settings from localStorage:', error)
    }
  }
}