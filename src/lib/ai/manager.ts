import { AIProviderConfig, AICompletionOptions, AICompletionResponse } from './types'
import { aiClient } from './client'

export type ProviderType = 'openai'

export class AIManager {
  private currentProvider: string | null = 'openai' // Manus AIはOpenAI互換なので、デフォルトを'openai'に設定

  constructor() {
    // 組み込みAIを使用するため、ストレージからのプロバイダー読み込みは不要
  }

  // 組み込みAIを使用するため、プロバイダーの登録は不要
  registerProvider(name: string, config: AIProviderConfig): void {
    // 組み込みAIを使用するため、何もしません
  }

  // カスタムプロバイダーのロジックは削除
  // registerCustomProvider, removeCustomProvider, getCustomProviders, saveProvidersToStorage, loadProvidersFromStorage は削除

  setCurrentProvider(name: string): void {
    // 組み込みAIのみをサポートするため、'openai'以外は無視
    if (name === 'openai') {
      this.currentProvider = name
    }
  }

  getCurrentProvider(): string | null {
    return this.currentProvider
  }

  getProvider(name: string): string | null {
    return name
  }

  getAllProviders(): string[] {
    // Manus AIはOpenAI互換のみをサポート
    return ['openai']
  }

  async complete(options: AICompletionOptions): Promise<AICompletionResponse> {
    if (!this.currentProvider) {
      throw new Error('No AI provider configured')
    }
    
    // 常に 'openai' プロバイダーで呼び出す
    return aiClient.complete(this.currentProvider, options)
  }

  async completeWithProvider(
    providerName: string, 
    options: AICompletionOptions
  ): Promise<AICompletionResponse> {
    // 常に 'openai' プロバイダーで呼び出す
    return aiClient.complete('openai', options)
  }

  async validateApiKey(providerName: string): Promise<boolean> {
    // 組み込みAIを使用するため、常にtrueを返す
    return true
  }

  isModelSupported(modelId: string, providerName: string): boolean {
    // Manus AIがサポートするモデルのみをチェック
    const supportedModels = ['gpt-4.1-mini', 'gpt-4.1-nano', 'gemini-2.5-flash']
    return supportedModels.includes(modelId)
  }
}

export const aiManager = new AIManager()
