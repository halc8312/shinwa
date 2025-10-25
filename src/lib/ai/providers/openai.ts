import { OpenAI } from 'openai'
import { 
  AIProvider, 
  AIProviderConfig, 
  AICompletionOptions, 
  AICompletionResponse,
  AIError 
} from '../types'

// Manusの組み込みAIはOpenAI互換APIとして提供され、
// 環境変数 (OPENAI_API_KEY, OPENAI_BASE_URL) から自動的に設定されます。
export class OpenAIProvider implements AIProvider {
  name = 'OpenAI'
  private client: OpenAI

  constructor(config?: AIProviderConfig) {
    // APIキーとBase URLは環境変数から自動的に取得されるため、引数は無視します。
    // クライアントの初期化は、環境変数が設定されていることを前提とします。
    this.client = new OpenAI()
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

  // Manusの組み込みAIを使用する場合、APIキーの検証は不要です。
  // サービスが利用可能であれば、常にtrueを返します。
  async validateApiKey(): Promise<boolean> {
    return true
  }

  private handleError(error: any): AIError {
    // エラーハンドリングを簡素化
    const aiError = new Error(error.message) as AIError
    aiError.provider = this.name
    aiError.statusCode = error.status
    aiError.details = error.response?.data
    
    return aiError
  }
}
