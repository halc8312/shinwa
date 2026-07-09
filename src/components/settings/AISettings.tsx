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
  provider: 'openai' | 'anthropic' | 'genspark'
  apiKey: string
  model: string
  temperature: number
  maxTokens: number
}

export default function AISettings({ isOpen, onClose, onSave }: AISettingsProps) {
  const { currentProvider, apiKeys, setCurrentProvider, setApiKey: setStoreApiKey } = useAppStore()
  const [provider, setProvider] = useState<'openai' | 'anthropic' | 'genspark'>(currentProvider || 'openai')
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('gpt-4.1-mini')
  const [temperature, setTemperature] = useState(0.7)
  const [maxTokens, setMaxTokens] = useState(4000)
  const [isValidating, setIsValidating] = useState(false)
  const [validationError, setValidationError] = useState('')

  useEffect(() => {
    // ストアから既存の設定を読み込む
    if (currentProvider) {
      setProvider(currentProvider as any)
      const storedApiKey = apiKeys[currentProvider]
      if (storedApiKey) {
        setApiKey(storedApiKey)
      }
    }
    
    const stored = localStorage.getItem('shinwa-ai-settings')
    if (stored) {
      try {
        const settings = JSON.parse(stored)
        if (!currentProvider) {
          setProvider(settings.provider || 'openai')
        }
        if (!apiKey && settings.apiKey) {
          setApiKey(settings.apiKey || '')
        }
        setModel(settings.model || 'gpt-4.1-mini')
        setTemperature(settings.temperature ?? 0.7)
        setMaxTokens(settings.maxTokens || 4000)
      } catch (error) {
        console.error('Failed to load AI settings:', error)
      }
    }

    // API keys should only be stored on the server side
    // Remove any client-side environment variable usage
  }, [provider, currentProvider, apiKeys])

  const validateSettings = async () => {
    // GenSparkは組み込みなのでAPIキーチェック不要
    if (provider === 'genspark') {
      return true
    }
    
    if (!apiKey) {
      setValidationError('APIキーを入力してください')
      return false
    }

    setIsValidating(true)
    setValidationError('')

    try {
      aiManager.registerProvider(provider, {
        apiKey,
        defaultModel: model
      })

      const isValid = await aiManager.validateApiKey(provider)
      
      if (!isValid) {
        setValidationError('APIキーが無効です')
        setIsValidating(false)
        return false
      }

      setIsValidating(false)
      return true
    } catch (error: any) {
      setValidationError(error.message)
      setIsValidating(false)
      return false
    }
  }

  const handleSave = async () => {
    const isValid = await validateSettings()
    if (!isValid) return

    const settings: AISettingsData = {
      provider,
      apiKey: provider === 'genspark' ? 'genspark-builtin' : apiKey,
      model,
      temperature,
      maxTokens
    }

    localStorage.setItem('shinwa-ai-settings', JSON.stringify(settings))
    
    // aiManagerに登録
    aiManager.registerProvider(provider, {
      apiKey: settings.apiKey,
      defaultModel: model
    })
    aiManager.setCurrentProvider(provider)
    
    // ストアを更新
    setCurrentProvider(provider as any)
    setStoreApiKey(provider, settings.apiKey)

    onSave(settings)
    onClose()
  }

  const handleProviderChange = (newProvider: string) => {
    const typedProvider = newProvider as 'openai' | 'anthropic' | 'genspark'
    setProvider(typedProvider)
    
    if (typedProvider === 'openai') {
      setModel('gpt-4.1-mini')
      setApiKey('')
    } else if (typedProvider === 'anthropic') {
      setModel('claude-3-5-sonnet-20241022')
      setApiKey('')
    } else if (typedProvider === 'genspark') {
      setModel('genspark-default')
      setApiKey('genspark-builtin')
    }
    
    setValidationError('')
  }

  const providerOptions = [
    { value: 'openai', label: 'OpenAI' },
    { value: 'anthropic', label: 'Anthropic' },
    { value: 'genspark', label: 'GenSpark AI (組み込み)' }
  ]

  const getApiKeyPlaceholder = () => {
    if (provider === 'openai') return 'sk-...'
    if (provider === 'anthropic') return 'sk-ant-...'
    return '組み込みAI（キー不要）'
  }

  const getApiKeyHelp = () => {
    if (provider === 'genspark') {
      return (
        <>
          <li>✨ GenSparkの組み込みAIを使用します</li>
          <li>🚀 APIキーは不要です</li>
          <li>💡 Gemini 2.0 Flash等の高性能モデルを利用可能</li>
        </>
      )
    } else if (provider === 'openai') {
      return (
        <>
          <li>1. <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline">OpenAI Platform</a> にアクセス</li>
          <li>2. 「Create new secret key」をクリック</li>
          <li>3. 生成されたキーをコピーして上記に貼り付け</li>
        </>
      )
    } else {
      return (
        <>
          <li>1. <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="underline">Anthropic Console</a> にアクセス</li>
          <li>2. 「Create Key」をクリック</li>
          <li>3. 生成されたキーをコピーして上記に貼り付け</li>
        </>
      )
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="AI設定"
      className="max-w-2xl"
    >
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            AIプロバイダー
          </label>
          <Select
            value={provider}
            onChange={(e) => handleProviderChange(e.target.value)}
            options={providerOptions}
          />
        </div>

        {provider !== 'genspark' && (
          <Input
            label="APIキー"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={getApiKeyPlaceholder()}
            error={validationError}
          />
        )}

        {provider === 'genspark' && (
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
            <p className="text-sm text-green-700 dark:text-green-400">
              ✨ GenSpark組み込みAIを使用します。APIキーは不要です。
            </p>
          </div>
        )}

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
            {provider === 'genspark' ? '組み込みAIについて' : 'APIキーの取得方法'}
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
            disabled={isValidating || (provider !== 'genspark' && !apiKey) || !model}
          >
            {isValidating ? '検証中...' : '保存'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
