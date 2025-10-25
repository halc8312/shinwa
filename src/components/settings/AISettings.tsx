import { useState, useEffect } from 'react'
import { aiManager } from '@/lib/ai/manager'
import { useAppStore } from '@/lib/store'
import AIModelSelector from './AIModelSelector'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import Modal from '@/components/ui/Modal'

interface AISettingsProps {
  isOpen: boolean
  onClose: () => void
  onSave: (settings: AISettingsData) => void
}

export interface AISettingsData {
  provider: 'openai' // Manus組み込みAIに固定
  apiKey: string // ダミー値として残す
  model: string
  temperature: number
  maxTokens: number
}

export default function AISettings({ isOpen, onClose, onSave }: AISettingsProps) {
  const { setCurrentProvider, setApiKey: setStoreApiKey } = useAppStore()
  const provider = 'openai' // Manus組み込みAIに固定
  const [apiKey, setApiKey] = useState('manus-builtin-key') // ダミー値に固定
  const [model, setModel] = useState('gpt-4.1-mini')
  const [temperature, setTemperature] = useState(0.7)
  const [maxTokens, setMaxTokens] = useState(4000)
  const [isValidating, setIsValidating] = useState(false)
  const [validationError, setValidationError] = useState('')

  useEffect(() => {
    // ストアから既存の設定を読み込む
    const stored = localStorage.getItem('shinwa-ai-settings')
    if (stored) {
      try {
        const settings = JSON.parse(stored)
        // プロバイダーは'openai'に固定
        // APIキーはダミー値に固定
        setModel(settings.model || 'gpt-4.1-mini')
        setTemperature(settings.temperature ?? 0.7)
        setMaxTokens(settings.maxTokens || 4000)
      } catch (error) {
        console.error('Failed to load AI settings:', error)
      }
    }
  }, [])

  // Manus組み込みAIを使用するため、APIキーの検証は常に成功
  const validateSettings = async () => {
    return true
  }

  const handleSave = async () => {
    const isValid = await validateSettings()
    if (!isValid) return

    const settings: AISettingsData = {
      provider: 'openai', // Manus組み込みAIに固定
      apiKey: 'manus-builtin-key', // ダミー値に固定
      model,
      temperature,
      maxTokens
    }

    localStorage.setItem('shinwa-ai-settings', JSON.stringify(settings))
    
    // aiManagerに登録
    aiManager.registerProvider('openai', {
      apiKey: 'manus-builtin-key',
      defaultModel: model
    })
    aiManager.setCurrentProvider('openai')
    
    // ストアを更新
    setStoreApiKey('openai', 'manus-builtin-key')

    onSave(settings)
    onClose()
  }

  // プロバイダー選択は削除
  const handleProviderChange = (newProvider: string) => {
    // 何もしない
  }

  // プロバイダー選択肢は削除
  const providerOptions: { value: string, label: string }[] = []

  // APIキーのプレースホルダーは不要
  const getApiKeyPlaceholder = () => {
    return '組み込みAI（キー不要）'
  }

  const getApiKeyHelp = () => {
    // Manus組み込みAI専用の説明に修正
    return (
      <>
        <li>✨ Manus組み込みAIを使用します（OpenAI互換）</li>
        <li>🚀 APIキーは不要です</li>
        <li>💡 gpt-4.1-mini, gpt-4.1-nano, gemini-2.5-flashが利用可能です</li>
      </>
    )
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="AI設定"
      className="max-w-2xl"
    >
      <div className="space-y-6">
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
          <p className="text-sm font-medium text-green-700 dark:text-green-400">
            ✨ Manus組み込みAIを使用しています（OpenAI互換）。APIキーは不要です。
          </p>
        </div>

        <AIModelSelector
          value={model}
          onChange={setModel}
          provider={provider}
          allowCustom={true}
        />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Temperature
              <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                ({temperature})
              </span>
            </label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
              <span>確定的</span>
              <span>創造的</span>
            </div>
          </div>

          <Input
            label="最大トークン数"
            type="number"
            min="100"
            max="128000"
            value={maxTokens}
            onChange={(e) => setMaxTokens(parseInt(e.target.value))}
          />
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">
            Manus組み込みAIについて
          </h4>
          <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
            {getApiKeyHelp()}
          </ul>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            variant="secondary"
            onClick={onClose}
          >
            キャンセル
          </Button>
          <Button
            onClick={handleSave}
            disabled={isValidating || !model} // APIキー不要のため条件を簡素化
          >
            {isValidating ? '検証中...' : '保存'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
