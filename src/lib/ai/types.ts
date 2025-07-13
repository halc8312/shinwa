export interface AIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AICompletionOptions {
  model: string
  messages: AIMessage[]
  temperature?: number
  maxTokens?: number
  topP?: number
  stream?: boolean
  stopSequences?: string[]
}

export interface AICompletionResponse {
  content: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  finishReason?: string
}

export interface AIStreamResponse {
  content: string
  done: boolean
}

export interface AIProvider {
  name: string
  complete(options: AICompletionOptions): Promise<AICompletionResponse>
  completeStream?(options: AICompletionOptions): AsyncGenerator<AIStreamResponse>
  validateApiKey(): Promise<boolean>
}

export interface AIProviderConfig {
  apiKey: string
  baseUrl?: string
  organization?: string
  defaultModel?: string
}

export interface AIError extends Error {
  provider: string
  statusCode?: number
  details?: any
}