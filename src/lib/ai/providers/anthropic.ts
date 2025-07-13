import Anthropic from '@anthropic-ai/sdk'
import { 
  AIProvider, 
  AIProviderConfig, 
  AICompletionOptions, 
  AICompletionResponse, 
  AIStreamResponse,
  AIError 
} from '../types'

export class AnthropicProvider implements AIProvider {
  name = 'Anthropic'
  private client: Anthropic
  private config: AIProviderConfig

  constructor(config: AIProviderConfig) {
    this.config = config
    this.client = new Anthropic({
      apiKey: config.apiKey,
      baseURL: config.baseUrl
    })
  }

  async complete(options: AICompletionOptions): Promise<AICompletionResponse> {
    try {
      const systemMessage = options.messages.find(m => m.role === 'system')
      const otherMessages = options.messages.filter(m => m.role !== 'system')

      const completion = await this.client.messages.create({
        model: options.model,
        messages: otherMessages.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        })),
        system: systemMessage?.content,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens || 4096,
        top_p: options.topP,
        stop_sequences: options.stopSequences,
        stream: false
      })

      return {
        content: completion.content[0].type === 'text' 
          ? completion.content[0].text 
          : '',
        usage: {
          promptTokens: completion.usage.input_tokens,
          completionTokens: completion.usage.output_tokens,
          totalTokens: completion.usage.input_tokens + completion.usage.output_tokens
        },
        finishReason: completion.stop_reason || undefined
      }
    } catch (error: any) {
      throw this.handleError(error)
    }
  }

  async *completeStream(options: AICompletionOptions): AsyncGenerator<AIStreamResponse> {
    try {
      const systemMessage = options.messages.find(m => m.role === 'system')
      const otherMessages = options.messages.filter(m => m.role !== 'system')

      const stream = await this.client.messages.create({
        model: options.model,
        messages: otherMessages.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        })),
        system: systemMessage?.content,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens || 4096,
        top_p: options.topP,
        stop_sequences: options.stopSequences,
        stream: true
      })

      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta') {
          yield {
            content: chunk.delta.type === 'text_delta' ? chunk.delta.text : '',
            done: false
          }
        } else if (chunk.type === 'message_stop') {
          yield {
            content: '',
            done: true
          }
        }
      }
    } catch (error: any) {
      throw this.handleError(error)
    }
  }

  async validateApiKey(): Promise<boolean> {
    try {
      await this.client.messages.create({
        model: 'claude-3-haiku-20240307',
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 1
      })
      return true
    } catch (error: any) {
      if (error.status === 401) {
        return false
      }
      return true
    }
  }

  private handleError(error: any): AIError {
    const aiError = new Error(error.message) as AIError
    aiError.provider = this.name
    aiError.statusCode = error.status
    aiError.details = error.response?.data
    
    if (error.status === 401) {
      aiError.message = 'Invalid API key for Anthropic'
    } else if (error.status === 429) {
      aiError.message = 'Rate limit exceeded for Anthropic'
    } else if (error.status === 500) {
      aiError.message = 'Anthropic server error'
    } else if (error.status === 400) {
      aiError.message = `Invalid request: ${error.message}`
    }
    
    return aiError
  }
}