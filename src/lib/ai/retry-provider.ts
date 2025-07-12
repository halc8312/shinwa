import { AIProvider, AICompletionOptions, AICompletionResponse, AIStreamResponse, AIError } from './types'

export interface RetryOptions {
  maxRetries?: number
  baseDelay?: number
  maxDelay?: number
  backoffMultiplier?: number
  retryableStatusCodes?: number[]
}

export class AIRetryExhaustedError extends Error {
  constructor(
    public readonly lastError: Error,
    public readonly attempts: number
  ) {
    super(`AI request failed after ${attempts} attempts: ${lastError.message}`)
    this.name = 'AIRetryExhaustedError'
  }
}

/**
 * Wraps an AI provider with retry logic including exponential backoff
 */
export class RetryAIProvider implements AIProvider {
  private readonly provider: AIProvider
  private readonly options: Required<RetryOptions>

  constructor(provider: AIProvider, options: RetryOptions = {}) {
    this.provider = provider
    this.options = {
      maxRetries: options.maxRetries ?? 3,
      baseDelay: options.baseDelay ?? 1000,
      maxDelay: options.maxDelay ?? 30000,
      backoffMultiplier: options.backoffMultiplier ?? 2,
      retryableStatusCodes: options.retryableStatusCodes ?? [429, 500, 502, 503, 504]
    }
  }

  get name(): string {
    return this.provider.name
  }

  async complete(options: AICompletionOptions): Promise<AICompletionResponse> {
    let lastError: Error | null = null

    for (let attempt = 0; attempt < this.options.maxRetries; attempt++) {
      try {
        return await this.provider.complete(options)
      } catch (error) {
        lastError = error as Error
        
        if (!this.isRetryableError(error)) {
          throw error
        }

        // Don't retry on the last attempt
        if (attempt === this.options.maxRetries - 1) {
          break
        }

        const delay = this.calculateBackoff(attempt)
        console.log(`AI request failed (attempt ${attempt + 1}/${this.options.maxRetries}), retrying in ${delay}ms...`)
        await this.sleep(delay)
      }
    }

    throw new AIRetryExhaustedError(lastError!, this.options.maxRetries)
  }

  async *completeStream(options: AICompletionOptions): AsyncGenerator<AIStreamResponse> {
    let lastError: Error | null = null

    for (let attempt = 0; attempt < this.options.maxRetries; attempt++) {
      try {
        if (!this.provider.completeStream) {
          throw new Error(`Provider ${this.provider.name} does not support streaming`)
        }

        // For streaming, we can't retry after starting to yield
        // So we only retry on initial connection errors
        const generator = this.provider.completeStream(options)
        let firstChunk = true

        for await (const chunk of generator) {
          firstChunk = false
          yield chunk
        }
        
        return
      } catch (error) {
        // Only retry if we haven't started yielding chunks
        if (!firstChunk) {
          throw error
        }

        lastError = error as Error
        
        if (!this.isRetryableError(error)) {
          throw error
        }

        // Don't retry on the last attempt
        if (attempt === this.options.maxRetries - 1) {
          break
        }

        const delay = this.calculateBackoff(attempt)
        console.log(`AI stream request failed (attempt ${attempt + 1}/${this.options.maxRetries}), retrying in ${delay}ms...`)
        await this.sleep(delay)
      }
    }

    throw new AIRetryExhaustedError(lastError!, this.options.maxRetries)
  }

  async validateApiKey(): Promise<boolean> {
    // Don't retry API key validation
    return this.provider.validateApiKey()
  }

  private isRetryableError(error: any): boolean {
    // Check if it's a network error
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
      return true
    }

    // Check if it's an AI error with a retryable status code
    if (error.statusCode && this.options.retryableStatusCodes.includes(error.statusCode)) {
      return true
    }

    // Check for specific error messages
    const message = error.message?.toLowerCase() || ''
    if (message.includes('rate limit') || message.includes('too many requests') || message.includes('timeout')) {
      return true
    }

    return false
  }

  private calculateBackoff(attempt: number): number {
    // Exponential backoff with jitter
    const exponentialDelay = Math.min(
      this.options.baseDelay * Math.pow(this.options.backoffMultiplier, attempt),
      this.options.maxDelay
    )
    
    // Add jitter (0-30% of the delay)
    const jitter = Math.random() * 0.3 * exponentialDelay
    
    return Math.floor(exponentialDelay + jitter)
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}