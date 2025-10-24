export interface AIModel {
  id: string
  name: string
  provider: 'openai' | 'anthropic' | 'genspark' | 'genspark' | 'custom'
  contextWindow: number
  description: string
  capabilities: string[]
  pricing?: {
    input: number  // per 1M tokens
    output: number // per 1M tokens
  }
}

export const OPENAI_MODELS: AIModel[] = [
  // GPT-4.1 Series (最新モデル)
  {
    id: 'gpt-4.1-mini',
    name: 'GPT-4.1 Mini',
    provider: 'openai',
    contextWindow: 128000,
    description: '最新の軽量高性能モデル。プロンプトへの忠実度が非常に高い',
    capabilities: ['text', 'vision', 'function-calling', 'json-mode'],
    pricing: { input: 0.1, output: 0.3 }
  },
  {
    id: 'gpt-4.1-nano',
    name: 'GPT-4.1 Nano',
    provider: 'openai',
    contextWindow: 128000,
    description: '最速・最軽量のGPT-4.1モデル。プロンプト指示に正確に従う',
    capabilities: ['text', 'function-calling', 'json-mode'],
    pricing: { input: 0.05, output: 0.15 }
  },
  // GPT-4o Series
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    contextWindow: 128000,
    description: '高性能なマルチモーダルモデル',
    capabilities: ['text', 'vision', 'function-calling', 'json-mode'],
    pricing: { input: 2.5, output: 10 }
  },
  {
    id: 'gpt-4o-2024-11-20',
    name: 'GPT-4o (2024-11-20)',
    provider: 'openai',
    contextWindow: 128000,
    description: '最新版のGPT-4o',
    capabilities: ['text', 'vision', 'function-calling', 'json-mode'],
    pricing: { input: 2.5, output: 10 }
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    contextWindow: 128000,
    description: '高速で低コストなGPT-4o',
    capabilities: ['text', 'vision', 'function-calling', 'json-mode'],
    pricing: { input: 0.15, output: 0.6 }
  },
  
  // GPT-4 Turbo
  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'openai',
    contextWindow: 128000,
    description: '高性能なGPT-4の最新版',
    capabilities: ['text', 'vision', 'function-calling', 'json-mode'],
    pricing: { input: 10, output: 30 }
  },
  {
    id: 'gpt-4-turbo-preview',
    name: 'GPT-4 Turbo Preview',
    provider: 'openai',
    contextWindow: 128000,
    description: 'GPT-4 Turboのプレビュー版',
    capabilities: ['text', 'vision', 'function-calling', 'json-mode'],
    pricing: { input: 10, output: 30 }
  },
  
  // GPT-3.5 Series
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'openai',
    contextWindow: 16385,
    description: '高速で低コストな汎用モデル',
    capabilities: ['text', 'function-calling', 'json-mode'],
    pricing: { input: 0.5, output: 1.5 }
  },
  {
    id: 'gpt-3.5-turbo-16k',
    name: 'GPT-3.5 Turbo 16K',
    provider: 'openai',
    contextWindow: 16385,
    description: '拡張コンテキストウィンドウ版',
    capabilities: ['text', 'function-calling', 'json-mode'],
    pricing: { input: 0.5, output: 1.5 }
  },
  
  // Reasoning Models
  {
    id: 'o1-preview',
    name: 'O1 Preview',
    provider: 'openai',
    contextWindow: 128000,
    description: '高度な推論能力を持つモデル',
    capabilities: ['text', 'reasoning'],
  },
  {
    id: 'o1-mini',
    name: 'O1 Mini',
    provider: 'openai',
    contextWindow: 128000,
    description: '軽量版の推論モデル',
    capabilities: ['text', 'reasoning'],
  }
]

export const GENSPARK_MODELS: AIModel[] = [
  {
    id: 'genspark-default',
    name: 'GenSpark AI (Default)',
    provider: 'genspark',
    contextWindow: 1000000,
    description: 'GenSpark組み込みAI - Gemini 2.0 Flashベース',
    capabilities: ['text', 'reasoning', 'creative-writing'],
    pricing: { input: 0, output: 0 } // 無料
  },
  {
    id: 'gemini-2.0-flash-exp',
    name: 'Gemini 2.0 Flash (Experimental)',
    provider: 'genspark',
    contextWindow: 1000000,
    description: 'Google最新の高速AIモデル（実験版）',
    capabilities: ['text', 'vision', 'multimodal', 'reasoning'],
    pricing: { input: 0, output: 0 } // 実験版のため無料
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    provider: 'genspark',
    contextWindow: 1000000,
    description: '高速で効率的なGeminiモデル',
    capabilities: ['text', 'vision', 'multimodal'],
    pricing: { input: 0.075, output: 0.3 }
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    provider: 'genspark',
    contextWindow: 2000000,
    description: '最高性能のGeminiモデル',
    capabilities: ['text', 'vision', 'multimodal', 'reasoning'],
    pricing: { input: 1.25, output: 5 }
  }
]

export const ANTHROPIC_MODELS: AIModel[] = [
  // Claude 3.5 Series
  {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    contextWindow: 200000,
    description: '最新の高性能バランス型モデル',
    capabilities: ['text', 'vision', 'coding', 'analysis'],
    pricing: { input: 3, output: 15 }
  },
  {
    id: 'claude-3-5-haiku-20241022',
    name: 'Claude 3.5 Haiku',
    provider: 'anthropic',
    contextWindow: 200000,
    description: '高速で効率的な最新モデル',
    capabilities: ['text', 'vision', 'coding', 'analysis'],
    pricing: { input: 0.8, output: 4 }
  },
  
  // Claude 3 Series
  {
    id: 'claude-3-opus-20240229',
    name: 'Claude 3 Opus',
    provider: 'anthropic',
    contextWindow: 200000,
    description: '最も高性能なClaude 3モデル',
    capabilities: ['text', 'vision', 'coding', 'analysis'],
    pricing: { input: 15, output: 75 }
  },
  {
    id: 'claude-3-sonnet-20240229',
    name: 'Claude 3 Sonnet',
    provider: 'anthropic',
    contextWindow: 200000,
    description: 'バランスの取れたClaude 3モデル',
    capabilities: ['text', 'vision', 'coding', 'analysis'],
    pricing: { input: 3, output: 15 }
  },
  {
    id: 'claude-3-haiku-20240307',
    name: 'Claude 3 Haiku',
    provider: 'anthropic',
    contextWindow: 200000,
    description: '高速で効率的なClaude 3モデル',
    capabilities: ['text', 'vision', 'coding', 'analysis'],
    pricing: { input: 0.25, output: 1.25 }
  },
  
  // Legacy Models
  {
    id: 'claude-2.1',
    name: 'Claude 2.1',
    provider: 'anthropic',
    contextWindow: 100000,
    description: '前世代の安定版モデル',
    capabilities: ['text', 'coding', 'analysis'],
    pricing: { input: 8, output: 24 }
  },
  {
    id: 'claude-instant-1.2',
    name: 'Claude Instant 1.2',
    provider: 'anthropic',
    contextWindow: 100000,
    description: '高速で経済的なモデル',
    capabilities: ['text', 'coding'],
    pricing: { input: 0.8, output: 2.4 }
  }
]

export const DEFAULT_MODELS = [...OPENAI_MODELS, ...ANTHROPIC_MODELS, ...GENSPARK_MODELS]

export function getModelById(modelId: string): AIModel | undefined {
  return DEFAULT_MODELS.find(model => model.id === modelId)
}

export function getModelsByProvider(provider: 'openai' | 'anthropic' | 'genspark'): AIModel[] {
  return DEFAULT_MODELS.filter(model => model.provider === provider)
}