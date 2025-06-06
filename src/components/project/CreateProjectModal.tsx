import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import { projectService } from '@/lib/services/project-service'
import { projectGeneratorService, GenerationProgress } from '@/lib/services/project-generator-service'
import { characterService } from '@/lib/services/character-service'
import { worldService } from '@/lib/services/world-service'
import { aiManager } from '@/lib/ai/manager'
import { useAppStore } from '@/lib/store'
import { NOVEL_TYPE_CONFIGS } from '@/lib/config/novel-types'
import AISettings, { AISettingsData } from '@/components/settings/AISettings'

interface CreateProjectModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated: () => void
}

export default function CreateProjectModal({ isOpen, onClose, onCreated }: CreateProjectModalProps) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState('')
  
  // 小説タイプ
  const [novelType, setNovelType] = useState<string>('medium')
  
  // AI自動生成関連の状態
  const [useAIGeneration, setUseAIGeneration] = useState(false)
  const [selectedModel, setSelectedModel] = useState('gpt-4.1-mini')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState<GenerationProgress | null>(null)
  const [generationComplete, setGenerationComplete] = useState(false)
  const [showAISettings, setShowAISettings] = useState(false)
  
  const { currentProvider, setCurrentProvider, setApiKey } = useAppStore()

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('プロジェクト名を入力してください')
      return
    }

    if (useAIGeneration && !description.trim()) {
      setError('AI生成を使用する場合は、プロジェクトの概要を入力してください')
      return
    }

    if (useAIGeneration && !currentProvider) {
      setError('AIプロバイダーが設定されていません。設定画面でAPIキーを設定してください。')
      return
    }

    setIsCreating(true)
    setError('')

    try {
      // プロジェクトを作成（小説タイプを含む）
      const project = await projectService.createProject({
        name: name.trim(),
        description: description.trim(),
        novelType: novelType as any
      })

      if (useAIGeneration) {
        // AI自動生成を実行
        setIsGenerating(true)
        
        try {
          const generatedContent = await projectGeneratorService.generateProjectContent({
            projectId: project.id,
            title: name.trim(),
            description: description.trim(),
            aiModel: selectedModel,
            temperature: 0.7,
            onProgress: (progress) => {
              setGenerationProgress(progress)
            }
          })

          // 生成されたコンテンツを保存
          // 執筆ルール
          await projectService.updateWritingRules(project.id, generatedContent.writingRules)
          
          // 世界観設定
          await worldService.updateWorldSettings(project.id, generatedContent.worldSettings)
          
          // キャラクター
          for (const character of generatedContent.characters) {
            await characterService.createCharacter(project.id, character)
          }
          
          // プロット概要とテーマを保存（拡張データとして）
          if (generatedContent.plotOutline || generatedContent.themes || generatedContent.genre) {
            localStorage.setItem(`shinwa-project-meta-${project.id}`, JSON.stringify({
              plotOutline: generatedContent.plotOutline,
              themes: generatedContent.themes,
              genre: generatedContent.genre
            }))
          }
          
          setGenerationComplete(true)
          
          // 2秒後に章立て設定画面へ遷移
          setTimeout(() => {
            router.push(`/projects/${project.id}/setup-chapters`)
          }, 2000)
        } catch (genError: any) {
          console.error('AI generation failed:', genError)
          setError('AI生成に失敗しました。プロジェクトは作成されました。')
          // プロジェクトは作成されているので、一覧を更新
          onCreated()
        } finally {
          setIsGenerating(false)
        }
      } else {
        // AI生成を使わない場合も章立て設定画面へ
        onCreated()
        router.push(`/projects/${project.id}/setup-chapters`)
      }
    } catch (err: any) {
      setError(err.message || 'プロジェクトの作成に失敗しました')
    } finally {
      setIsCreating(false)
    }
  }

  const handleClose = () => {
    if (isGenerating) {
      return // 生成中は閉じない
    }
    setName('')
    setDescription('')
    setError('')
    setUseAIGeneration(false)
    setGenerationProgress(null)
    setGenerationComplete(false)
    onClose()
  }

  const handleAISettingsSave = (settings: AISettingsData) => {
    setCurrentProvider(settings.provider)
    setApiKey(settings.provider, settings.apiKey)
    setError('') // APIキー設定後はエラーをクリア
  }

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="新規プロジェクト作成"
      >
        <div className="space-y-4">
          {!isGenerating ? (
          <>
            <Input
              label="プロジェクト名"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: ファンタジー小説"
              error={error && !name.trim() ? error : undefined}
              autoFocus
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                説明{useAIGeneration ? '（必須）' : '（任意）'}
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={useAIGeneration 
                  ? "物語の概要を詳しく入力してください。AIがこの情報を基に世界観やキャラクターを生成します。"
                  : "プロジェクトの概要を入力..."}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-base text-black shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                rows={useAIGeneration ? 5 : 3}
              />
            </div>

            {/* 小説タイプ選択 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                小説の規模
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {Object.entries(NOVEL_TYPE_CONFIGS).map(([key, config]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setNovelType(key)}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      novelType === key
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                    }`}
                  >
                    <div className="text-sm font-medium">{config.name}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {config.chapterCountRange.min}〜{config.chapterCountRange.max}章
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <div className="flex items-center gap-3 mb-4">
                <input
                  type="checkbox"
                  id="useAI"
                  checked={useAIGeneration}
                  onChange={(e) => setUseAIGeneration(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="useAI" className="font-medium">
                  AIで設定を自動生成する
                </label>
              </div>

              {useAIGeneration && (
                <div className="ml-7 space-y-3">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    プロジェクトの概要を基に、AIが以下を自動生成します：
                  </p>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
                    <li>執筆ルール（視点、時制、文体）</li>
                    <li>世界観設定（時代、地理、文化）</li>
                    <li>主要キャラクター（5-8人）</li>
                    <li>キャラクター間の関係性</li>
                  </ul>
                  
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    使用するAIモデル
                  </label>
                  <Select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    options={[
                      { value: 'gpt-4.1-mini', label: 'GPT-4.1 mini（推奨・高速）' },
                      { value: 'gpt-4.1-nano', label: 'GPT-4.1 nano（最速・軽量）' }
                    ]}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    GPT-4.1 mini/nanoは最新の軽量モデルで、プロンプトに非常に忠実に従います。
                  </p>
                </div>
              )}
            </div>

            {error && (
              <div className="space-y-2">
                <p className="text-sm text-red-600">{error}</p>
                {error.includes('AIプロバイダーが設定されていません') && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setShowAISettings(true)}
                  >
                    AI設定を開く
                  </Button>
                )}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="secondary"
                onClick={handleClose}
                disabled={isCreating}
              >
                キャンセル
              </Button>
              <Button
                onClick={handleCreate}
                disabled={isCreating || !name.trim() || (useAIGeneration && !description.trim())}
              >
                {isCreating ? '作成中...' : useAIGeneration ? '作成して生成開始' : '作成'}
              </Button>
            </div>
          </>
        ) : (
          <div className="py-8">
            {!generationComplete ? (
              <>
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full mb-4">
                    <svg className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">AIがプロジェクトを構築中...</h3>
                  {generationProgress && (
                    <>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        {generationProgress.message}
                      </p>
                      <div className="max-w-md mx-auto">
                        <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                          <div 
                            className="bg-blue-600 h-full transition-all duration-500 ease-out"
                            style={{ width: `${generationProgress.progress}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          {generationProgress.progress}%
                        </p>
                      </div>
                    </>
                  )}
                </div>

                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                  <p>生成ステップ:</p>
                  <ul className="space-y-1">
                    <li className={generationProgress?.step === 'プロジェクト分析' ? 'font-medium text-blue-600' : ''}>
                      {generationProgress?.step === 'プロジェクト分析' ? '▶' : '○'} プロジェクト分析
                    </li>
                    <li className={generationProgress?.step === '執筆ルール生成' ? 'font-medium text-blue-600' : ''}>
                      {generationProgress?.step === '執筆ルール生成' ? '▶' : '○'} 執筆ルール生成
                    </li>
                    <li className={generationProgress?.step === '世界観設定生成' ? 'font-medium text-blue-600' : ''}>
                      {generationProgress?.step === '世界観設定生成' ? '▶' : '○'} 世界観設定生成
                    </li>
                    <li className={generationProgress?.step === 'キャラクター生成' ? 'font-medium text-blue-600' : ''}>
                      {generationProgress?.step === 'キャラクター生成' ? '▶' : '○'} キャラクター生成
                    </li>
                    <li className={generationProgress?.step === '関係性構築' ? 'font-medium text-blue-600' : ''}>
                      {generationProgress?.step === '関係性構築' ? '▶' : '○'} 関係性構築
                    </li>
                  </ul>
                </div>
              </>
            ) : (
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full mb-4">
                  <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">生成完了！</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  章立て設定へ移動します...
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>

    <AISettings
      isOpen={showAISettings}
      onClose={() => setShowAISettings(false)}
      onSave={handleAISettingsSave}
    />
    </>
  )
}