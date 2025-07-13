import { useState, useEffect } from 'react'
import { AIModel, DEFAULT_MODELS, getModelById } from '@/lib/ai/models'
import Select from '@/components/ui/Select'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface AIModelSelectorProps {
  value: string
  onChange: (modelId: string) => void
  provider: 'openai' | 'anthropic'
  allowCustom?: boolean
}

export default function AIModelSelector({ 
  value, 
  onChange, 
  provider,
  allowCustom = true 
}: AIModelSelectorProps) {
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [customModelId, setCustomModelId] = useState('')
  const [customModels, setCustomModels] = useState<string[]>([])

  useEffect(() => {
    const stored = localStorage.getItem(`shinwa-custom-models-${provider}`)
    if (stored) {
      setCustomModels(JSON.parse(stored))
    }
  }, [provider])

  const saveCustomModels = (models: string[]) => {
    setCustomModels(models)
    localStorage.setItem(`shinwa-custom-models-${provider}`, JSON.stringify(models))
  }

  const providerModels = DEFAULT_MODELS.filter(m => m.provider === provider)
  const allModels = [
    ...providerModels,
    ...customModels.map(id => ({
      id,
      name: `カスタム: ${id}`,
      provider: provider as 'openai' | 'anthropic',
      contextWindow: 0,
      description: 'ユーザー定義のカスタムモデル',
      capabilities: []
    }))
  ]

  const selectOptions = [
    ...allModels.map(model => ({
      value: model.id,
      label: model.name
    })),
    ...(allowCustom ? [{
      value: '__custom__',
      label: '+ カスタムモデルを追加'
    }] : [])
  ]

  const selectedModel = getModelById(value) || allModels.find(m => m.id === value)

  const handleSelectChange = (newValue: string) => {
    if (newValue === '__custom__') {
      setShowCustomInput(true)
      setCustomModelId('')
    } else {
      onChange(newValue)
      setShowCustomInput(false)
    }
  }

  const handleAddCustomModel = () => {
    if (customModelId.trim()) {
      const updatedModels = [...customModels, customModelId.trim()]
      saveCustomModels(updatedModels)
      onChange(customModelId.trim())
      setShowCustomInput(false)
      setCustomModelId('')
    }
  }

  const handleRemoveCustomModel = (modelId: string) => {
    const updatedModels = customModels.filter(id => id !== modelId)
    saveCustomModels(updatedModels)
    if (value === modelId) {
      onChange(providerModels[0]?.id || '')
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          AIモデル
        </label>
        {!showCustomInput ? (
          <Select
            value={value}
            onChange={(e) => handleSelectChange(e.target.value)}
            options={selectOptions}
            placeholder="モデルを選択"
          />
        ) : (
          <div className="space-y-2">
            <Input
              value={customModelId}
              onChange={(e) => setCustomModelId(e.target.value)}
              placeholder="モデルIDを入力 (例: gpt-4-turbo-2024-12-01)"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleAddCustomModel()
                }
              }}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleAddCustomModel}
                disabled={!customModelId.trim()}
              >
                追加
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setShowCustomInput(false)
                  setCustomModelId('')
                }}
              >
                キャンセル
              </Button>
            </div>
          </div>
        )}
      </div>

      {selectedModel && !showCustomInput && (
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
          
          {customModels.includes(selectedModel.id) && (
            <Button
              size="sm"
              variant="danger"
              onClick={() => handleRemoveCustomModel(selectedModel.id)}
              className="mt-2"
            >
              カスタムモデルを削除
            </Button>
          )}
        </div>
      )}
    </div>
  )
}