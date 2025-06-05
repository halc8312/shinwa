import { AIProvider, AIProviderConfig, AICompletionOptions, AICompletionResponse } from './types'
import { OpenAIProvider } from './providers/openai'
import { AnthropicProvider } from './providers/anthropic'
import { AIModel } from './models'

export type ProviderType = 'openai' | 'anthropic' | 'custom'

export interface CustomProvider {
  name: string
  apiKey: string
  baseUrl: string
  headers?: Record<string, string>
}

export class AIManager {
  private providers: Map<string, AIProvider> = new Map()
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
    let provider: AIProvider
    
    switch (name.toLowerCase()) {
      case 'openai':
        provider = new OpenAIProvider(config)
        break
      case 'anthropic':
        provider = new AnthropicProvider(config)
        break
      default:
        throw new Error(`Unknown provider: ${name}`)
    }
    
    this.providers.set(name, provider)
    
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
    if (!this.providers.has(name)) {
      throw new Error(`Provider ${name} not registered`)
    }
    this.currentProvider = name
  }

  getCurrentProvider(): AIProvider | null {
    if (!this.currentProvider) return null
    return this.providers.get(this.currentProvider) || null
  }

  getProvider(name: string): AIProvider | null {
    return this.providers.get(name) || null
  }

  getAllProviders(): string[] {
    return Array.from(this.providers.keys())
  }

  async complete(options: AICompletionOptions): Promise<AICompletionResponse> {
    const provider = this.getCurrentProvider()
    if (!provider) {
      throw new Error('No AI provider configured')
    }
    
    return provider.complete(options)
  }

  async completeWithProvider(
    providerName: string, 
    options: AICompletionOptions
  ): Promise<AICompletionResponse> {
    const provider = this.getProvider(providerName)
    if (!provider) {
      throw new Error(`Provider ${providerName} not found`)
    }
    
    return provider.complete(options)
  }

  async validateApiKey(providerName: string): Promise<boolean> {
    const provider = this.getProvider(providerName)
    if (!provider) {
      throw new Error(`Provider ${providerName} not found`)
    }
    
    return provider.validateApiKey()
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