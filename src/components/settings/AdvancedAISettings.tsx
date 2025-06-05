'use client'

import { useState, useEffect } from 'react'
import { AIModelSettings, AIProviderSettings } from '@/lib/types'
import { getModelsByProvider, DEFAULT_MODELS } from '@/lib/ai/models'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import { aiManager } from '@/lib/ai/manager'

interface AdvancedAISettingsProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
}

// デフォルトのモデル設定
const DEFAULT_MODEL_SETTINGS: AIModelSettings = {
  defaultModel: {
    model: 'gpt-4.1-mini',
    temperature: 0.7,
    maxTokens: 4000
  },
  chapterWriting: {
    model: 'gpt-4o',
    temperature: 0.8,
    maxTokens: 5000
  },
  chapterPlanning: {
    model: 'gpt-4.1-mini',
    temperature: 0.5,
    maxTokens: 2000
  },
  backgroundEvents: {
    model: 'gpt-4o-mini',
    temperature: 0.3,
    maxTokens: 1000
  },
  summarization: {
    model: 'gpt-4.1-mini',
    temperature: 0.3,
    maxTokens: 500
  },
  characterAnalysis: {
    model: 'gpt-4.1-mini',
    temperature: 0.5,
    maxTokens: 2000
  },
  validation: {
    model: 'gpt-4o-mini',
    temperature: 0.3,
    maxTokens: 1000
  },
  assistant: {
    model: 'gpt-4.1-mini',
    temperature: 0.7,
    maxTokens: 2000
  }
}

// 機能説明
const FEATURE_DESCRIPTIONS = {
  defaultModel: 'その他の機能で使用される汎用モデル',
  chapterWriting: '章の本文を執筆する際に使用',
  chapterPlanning: '章の構成や計画を立てる際に使用',
  backgroundEvents: '背景で起きている出来事を生成',
  summarization: '章の要約を生成する際に使用',
  characterAnalysis: 'キャラクターの分析や成長を評価',
  validation: '一貫性チェックや整合性検証に使用',
  assistant: 'ダッシュボードのAIアシスタント機能'
}

export default function AdvancedAISettings({ isOpen, onClose, projectId }: AdvancedAISettingsProps) {
  const [modelSettings, setModelSettings] = useState<AIModelSettings>(DEFAULT_MODEL_SETTINGS)
  const [provider, setProvider] = useState<'openai' | 'anthropic'>('openai')
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    // 既存の設定を読み込む
    const stored = localStorage.getItem(`shinwa-ai-model-settings-${projectId}`)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setModelSettings(parsed)
      } catch (error) {
        console.error('Failed to load advanced AI settings:', error)
      }
    }

    // プロバイダー設定を読み込む
    const aiSettings = localStorage.getItem('shinwa-ai-settings')
    if (aiSettings) {
      try {
        const parsed = JSON.parse(aiSettings)
        setProvider(parsed.provider || 'openai')
      } catch (error) {
        console.error('Failed to load provider settings:', error)
      }
    }
  }, [projectId])

  const handleModelChange = (feature: keyof AIModelSettings, field: 'model' | 'temperature' | 'maxTokens', value: any) => {
    setModelSettings(prev => ({
      ...prev,
      [feature]: {
        ...prev[feature],
        [field]: value
      }
    }))
    setHasChanges(true)
  }

  const handleSave = () => {
    // 設定を保存
    localStorage.setItem(`shinwa-ai-model-settings-${projectId}`, JSON.stringify(modelSettings))
    setHasChanges(false)
    onClose()
  }

  const handleReset = () => {
    setModelSettings(DEFAULT_MODEL_SETTINGS)
    setHasChanges(true)
  }

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev)
      if (newSet.has(section)) {
        newSet.delete(section)
      } else {
        newSet.add(section)
      }
      return newSet
    })
  }

  const availableModels = getModelsByProvider(provider)
  const modelOptions = availableModels.map(model => ({
    value: model.id,
    label: `${model.name} (${model.contextWindow.toLocaleString()} tokens)`
  }))

  const renderModelSettings = (key: keyof AIModelSettings, title: string) => {
    const settings = modelSettings[key]
    const isExpanded = expandedSections.has(key)
    const description = FEATURE_DESCRIPTIONS[key]

    return (
      <div key={key} className="border rounded-lg overflow-hidden">
        <button
          className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 text-left flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          onClick={() => toggleSection(key)}
        >
          <div className="flex-1">
            <h4 className="font-medium text-gray-900 dark:text-white">{title}</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              現在: {availableModels.find(m => m.id === settings.model)?.name || settings.model}
            </p>
          </div>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {isExpanded && (
          <div className="p-4 space-y-4 bg-white dark:bg-gray-900 border-t">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                モデル
              </label>
              <Select
                value={settings.model}
                onChange={(e) => handleModelChange(key, 'model', e.target.value)}
                options={modelOptions}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Temperature
                <span className="ml-2 text-xs text-gray-500">({settings.temperature})</span>
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={settings.temperature}
                onChange={(e) => handleModelChange(key, 'temperature', parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>確定的</span>
                <span>創造的</span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                最大トークン数
              </label>
              <input
                type="number"
                min="100"
                max="128000"
                value={settings.maxTokens}
                onChange={(e) => handleModelChange(key, 'maxTokens', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800"
              />
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="高度なAI設定"
      className="max-w-3xl"
    >
      <div className="space-y-6">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            <strong>注意:</strong> この設定は上級者向けです。各機能に最適なモデルを個別に設定できます。
            よくわからない場合はデフォルト設定のままで問題ありません。
          </p>
        </div>

        <div className="space-y-3">
          {renderModelSettings('defaultModel', 'デフォルトモデル')}
          {renderModelSettings('chapterWriting', '章の執筆')}
          {renderModelSettings('chapterPlanning', '章の計画・分析')}
          {renderModelSettings('backgroundEvents', '背景イベント生成')}
          {renderModelSettings('summarization', '要約生成')}
          {renderModelSettings('characterAnalysis', 'キャラクター分析')}
          {renderModelSettings('validation', '一貫性チェック')}
          {renderModelSettings('assistant', 'AIアシスタント')}
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <Button
            variant="secondary"
            onClick={handleReset}
            size="sm"
          >
            デフォルトに戻す
          </Button>
          
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={onClose}
            >
              キャンセル
            </Button>
            <Button
              onClick={handleSave}
              disabled={!hasChanges}
            >
              保存
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}