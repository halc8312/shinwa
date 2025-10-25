export interface AIModel {
  id: string
  name: string
  provider: 'openai'
  contextWindow: number
  description: string
  capabilities: string[]
  pricing?: {
    input: number  // per 1M tokens
    output: number // per 1M tokens
  }
}

// Manusの組み込みAIがサポートするモデル
export const MANUS_AI_MODELS: AIModel[] = [
  {
    id: 'gpt-4.1-mini',
    name: 'GPT-4.1 Mini (Manus AI)',
    provider: 'openai',
    contextWindow: 128000,
    description: 'Manus AIの高速かつ高性能なモデル。',
    capabilities: ['text', 'vision', 'function-calling', 'json-mode'],
    pricing: { input: 0, output: 0 } // 組み込みAIのため無料
  },
  {
    id: 'gpt-4.1-nano',
    name: 'GPT-4.1 Nano (Manus AI)',
    provider: 'openai',
    contextWindow: 128000,
    description: 'Manus AIの最速・最軽量モデル。',
    capabilities: ['text', 'function-calling', 'json-mode'],
    pricing: { input: 0, output: 0 } // 組み込みAIのため無料
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash (Manus AI)',
    provider: 'openai', // OpenAI互換APIでアクセス
    contextWindow: 1000000,
    description: 'Manus AIの高性能なマルチモーダルモデル。',
    capabilities: ['text', 'vision', 'multimodal', 'reasoning'],
    pricing: { input: 0, output: 0 } // 組み込みAIのため無料
  }
]

export const DEFAULT_MODELS = MANUS_AI_MODELS

export function getModelById(modelId: string): AIModel | undefined {
  return DEFAULT_MODELS.find(model => model.id === modelId)
}

export function getModelsByProvider(provider: 'openai'): AIModel[] {
  return DEFAULT_MODELS.filter(model => model.provider === provider)
}
