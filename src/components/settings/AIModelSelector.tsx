import { useState, useEffect } from 'react'
import { AIModel, DEFAULT_MODELS, getModelById } from '@/lib/ai/models'
import Select from '@/components/ui/Select'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface AIModelSelectorProps {
  value: string
  onChange: (modelId: string) => void
  provider?: 'openai' // Manus組み込みAIに固定
  allowCustom?: boolean
}

export default function AIModelSelector({ 
  value, 
  onChange, 
  provider = 'openai', // Manus組み込みAIに固定
  allowCustom = false // カスタムモデルは無効化
}: AIModelSelectorProps) {


  // Manus組み込みAIのモデルのみに限定
  const providerModels = DEFAULT_MODELS.filter(m => m.provider === 'openai' && ['gpt-4.1-mini', 'gpt-4.1-nano', 'gemini-2.5-flash'].includes(m.id))
  const allModels = [
    ...providerModels,
  ]

  const selectOptions = [
    ...allModels.map(model => ({
      value: model.id,
      label: model.name
    })),
  ]

  // getModelByIdはすべてのモデルから取得するため、allModels.findは不要
  const selectedModel = getModelById(value) || providerModels.find(m => m.id === value)

  const handleSelectChange = (newValue: string) => {
    onChange(newValue)
  }

  // カスタムモデル関連の関数を削除


  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          AIモデル
        </label>
        <Select
          value={value}
          onChange={(e) => handleSelectChange(e.target.value)}
          options={selectOptions}
          placeholder="モデルを選択"
        />
      </div>

      {selectedModel && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
          <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100">
            {selectedModel.name}
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {selectedModel.description}
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            {selectedModel.capabilities.map((cap) => (
              <span
                key={cap}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
              >
                {cap}
              </span>
            ))}
          </div>
          {selectedModel.contextWindow > 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              コンテキストウィンドウ: {selectedModel.contextWindow.toLocaleString()} トークン
            </p>
          )}
          {'pricing' in selectedModel && selectedModel.pricing && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              価格: ${selectedModel.pricing.input}/1M 入力 | ${selectedModel.pricing.output}/1M 出力
            </p>
          )}
          

        </div>
      )}
    </div>
  )
}