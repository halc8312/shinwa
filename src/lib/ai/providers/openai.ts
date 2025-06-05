import OpenAI from 'openai'
import { 
  AIProvider, 
  AIProviderConfig, 
  AICompletionOptions, 
  AICompletionResponse, 
  AIStreamResponse,
  AIError 
} from '../types'

export class OpenAIProvider implements AIProvider {
  name = 'OpenAI'
  private client: OpenAI
  private config: AIProviderConfig

  constructor(config: AIProviderConfig) {
    this.config = config
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
      organization: config.organization,
      dangerouslyAllowBrowser: true
    })
  }

  async complete(options: AICompletionOptions): Promise<AICompletionResponse> {
    try {
      const completion = await this.client.chat.completions.create({
        model: options.model,
        messages: options.messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens,
        top_p: options.topP,
        stop: options.stopSequences,
        stream: false
      })

      const choice = completion.choices[0]
      
      return {
        content: choice.message.content || '',
        usage: completion.usage ? {
          promptTokens: completion.usage.prompt_tokens,
          completionTokens: completion.usage.completion_tokens,
          totalTokens: completion.usage.total_tokens
        } : undefined,
        finishReason: choice.finish_reason || undefined
      }
    } catch (error: any) {
      throw this.handleError(error)
    }
  }

  async *completeStream(options: AICompletionOptions): AsyncGenerator<AIStreamResponse> {
    try {
      const stream = await this.client.chat.completions.create({
        model: options.model,
        messages: options.messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens,
        top_p: options.topP,
        stop: options.stopSequences,
        stream: true
      })

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || ''
        const done = chunk.choices[0]?.finish_reason !== null
        
        yield {
          content,
          done
        }
      }
    } catch (error: any) {
      throw this.handleError(error)
    }
  }

  async validateApiKey(): Promise<boolean> {
    try {
      await this.client.models.list()
      return true
    } catch (error) {
      return false
    }
  }

  private handleError(error: any): AIError {
    const aiError = new Error(error.message) as AIError
    aiError.provider = this.name
    aiError.statusCode = error.status
    aiError.details = error.response?.data
    
    if (error.status === 401) {
      aiError.message = 'Invalid API key for OpenAI'
    } else if (error.status === 429) {
      aiError.message = 'Rate limit exceeded for OpenAI'
    } else if (error.status === 500) {
      aiError.message = 'OpenAI server error'
    }
    
    return aiError
  }
}