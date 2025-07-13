import { AIProvider, AIProviderConfig, AICompletionOptions, AICompletionResponse } from './types'
import { AIModel } from './models'
import { aiClient } from './client'

export type ProviderType = 'openai' | 'anthropic' | 'custom'

export interface CustomProvider {
  name: string
  apiKey: string
  baseUrl: string
  headers?: Record<string, string>
}

export class AIManager {
  private currentProvider: string | null = null
  private customProviders: Map<string, CustomProvider> = new Map()

  constructor() {
    this.loadProvidersFromStorage()
  }

  private loadProvidersFromStorage() {
    if (typeof window === 'undefined') return
    
    const stored = localStorage.getItem('shinwa-ai-providers')
    if (stored) {
      try {
        const data = JSON.parse(stored)
        if (data.customProviders) {
          Object.entries(data.customProviders).forEach(([name, config]) => {
            this.customProviders.set(name, config as CustomProvider)
          })
        }
      } catch (error) {
        console.error('Failed to load AI providers from storage:', error)
      }
    }
  }

  private saveProvidersToStorage() {
    if (typeof window === 'undefined') return
    
    const data = {
      customProviders: Object.fromEntries(this.customProviders)
    }
    localStorage.setItem('shinwa-ai-providers', JSON.stringify(data))
  }

  registerProvider(name: string, config: AIProviderConfig): void {
    // プロバイダー名を記録するだけで、実際の初期化はサーバーサイドで行う
    if (!this.currentProvider) {
      this.currentProvider = name
    }
  }

  registerCustomProvider(config: CustomProvider): void {
    this.customProviders.set(config.name, config)
    this.saveProvidersToStorage()
  }

  removeCustomProvider(name: string): void {
    this.customProviders.delete(name)
    this.saveProvidersToStorage()
  }

  getCustomProviders(): CustomProvider[] {
    return Array.from(this.customProviders.values())
  }

  setCurrentProvider(name: string): void {
    this.currentProvider = name
  }

  getCurrentProvider(): string | null {
    return this.currentProvider
  }

  getProvider(name: string): string | null {
    return name
  }

  getAllProviders(): string[] {
    // サポートされているプロバイダーのリストを返す
    return ['openai', 'anthropic']
  }

  async complete(options: AICompletionOptions): Promise<AICompletionResponse> {
    if (!this.currentProvider) {
      throw new Error('No AI provider configured')
    }
    
    return aiClient.complete(this.currentProvider, options)
  }

  async completeWithProvider(
    providerName: string, 
    options: AICompletionOptions
  ): Promise<AICompletionResponse> {
    return aiClient.complete(providerName, options)
  }

  async validateApiKey(providerName: string): Promise<boolean> {
    return aiClient.validateApiKey(providerName)
  }

  isModelSupported(modelId: string, providerName: string): boolean {
    switch (providerName.toLowerCase()) {
      case 'openai':
        return modelId.startsWith('gpt-') || modelId.startsWith('o1-')
      case 'anthropic':
        return modelId.startsWith('claude-')
      default:
        return true
    }
  }
}

export const aiManager = new AIManager()