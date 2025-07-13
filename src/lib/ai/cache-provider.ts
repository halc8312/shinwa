import { AIProvider, AICompletionOptions, AICompletionResponse, AIStreamResponse } from './types'
import crypto from 'crypto'

interface CacheEntry {
  key: string
  response: AICompletionResponse
  timestamp: number
  ttl: number
}

export interface CacheOptions {
  ttl?: number // Time to live in milliseconds
  maxSize?: number // Maximum number of cached entries
  cacheableModels?: string[] // Only cache responses from these models
  minPromptLength?: number // Only cache if prompt is longer than this
}

/**
 * Wraps an AI provider with caching capabilities
 * Caches responses based on prompt content, model, and temperature
 */
export class CachedAIProvider implements AIProvider {
  private readonly provider: AIProvider
  private readonly cache: Map<string, CacheEntry>
  private readonly options: Required<CacheOptions>

  constructor(provider: AIProvider, options: CacheOptions = {}) {
    this.provider = provider
    this.cache = new Map()
    this.options = {
      ttl: options.ttl ?? 3600000, // 1 hour default
      maxSize: options.maxSize ?? 100,
      cacheableModels: options.cacheableModels ?? [],
      minPromptLength: options.minPromptLength ?? 50
    }
  }

  get name(): string {
    return this.provider.name
  }

  async complete(options: AICompletionOptions): Promise<AICompletionResponse> {
    // Check if this request should be cached
    if (!this.shouldCache(options)) {
      return this.provider.complete(options)
    }

    const cacheKey = this.generateCacheKey(options)
    
    // Check cache first
    const cached = this.getFromCache(cacheKey)
    if (cached) {
      console.log(`Cache hit for AI request (key: ${cacheKey.substring(0, 8)}...)`)
      return cached
    }

    // Make the actual request
    const response = await this.provider.complete(options)
    
    // Cache the response
    this.addToCache(cacheKey, response)
    
    return response
  }

  async *completeStream(options: AICompletionOptions): AsyncGenerator<AIStreamResponse> {
    // Streaming responses are not cached
    if (!this.provider.completeStream) {
      throw new Error(`Provider ${this.provider.name} does not support streaming`)
    }
    
    yield* this.provider.completeStream(options)
  }

  async validateApiKey(): Promise<boolean> {
    return this.provider.validateApiKey()
  }

  private shouldCache(options: AICompletionOptions): boolean {
    // Don't cache if streaming is enabled
    if (options.stream) return false
    
    // Check if model is in cacheable list (if specified)
    if (this.options.cacheableModels.length > 0 && 
        !this.options.cacheableModels.includes(options.model)) {
      return false
    }
    
    // Check minimum prompt length
    const promptLength = options.messages.reduce((sum, msg) => sum + msg.content.length, 0)
    if (promptLength < this.options.minPromptLength) {
      return false
    }
    
    // Don't cache if temperature is too high (more random)
    if (options.temperature && options.temperature > 0.8) {
      return false
    }
    
    return true
  }

  private generateCacheKey(options: AICompletionOptions): string {
    // Create a deterministic key based on the request parameters
    const keyData = {
      model: options.model,
      messages: options.messages,
      temperature: options.temperature || 0,
      maxTokens: options.maxTokens,
      topP: options.topP,
      stopSequences: options.stopSequences
    }
    
    const hash = crypto.createHash('sha256')
    hash.update(JSON.stringify(keyData))
    return hash.digest('hex')
  }

  private getFromCache(key: string): AICompletionResponse | null {
    const entry = this.cache.get(key)
    
    if (!entry) return null
    
    // Check if entry has expired
    const now = Date.now()
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }
    
    return entry.response
  }

  private addToCache(key: string, response: AICompletionResponse): void {
    // Check cache size limit
    if (this.cache.size >= this.options.maxSize) {
      // Remove oldest entry
      const oldestKey = this.findOldestEntry()
      if (oldestKey) {
        this.cache.delete(oldestKey)
      }
    }
    
    this.cache.set(key, {
      key,
      response,
      timestamp: Date.now(),
      ttl: this.options.ttl
    })
  }

  private findOldestEntry(): string | null {
    let oldestKey: string | null = null
    let oldestTime = Infinity
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp
        oldestKey = key
      }
    }
    
    return oldestKey
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear()
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; maxSize: number; hitRate: number } {
    return {
      size: this.cache.size,
      maxSize: this.options.maxSize,
      hitRate: 0 // Would need to track hits/misses for accurate rate
    }
  }
}