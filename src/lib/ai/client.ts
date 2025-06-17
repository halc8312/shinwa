import { AICompletionOptions, AICompletionResponse } from './types'

export class AIClient {
  async complete(providerName: string, options: AICompletionOptions): Promise<AICompletionResponse> {
    const response = await fetch('/api/ai/complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        provider: providerName,
        options,
        stream: false
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'AI completion failed')
    }

    return response.json()
  }

  async validateApiKey(providerName: string): Promise<boolean> {
    const response = await fetch(`/api/ai/complete?provider=${providerName}`, {
      method: 'GET',
    })

    if (!response.ok) {
      return false
    }

    const result = await response.json()
    return result.valid
  }
}

export const aiClient = new AIClient()