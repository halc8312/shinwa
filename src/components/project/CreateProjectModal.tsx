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
  
  // 確認・再生成関連の状態
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [generatedContent, setGeneratedContent] = useState<any>(null)
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false)
  const [regenerateMode, setRegenerateMode] = useState<'full' | 'withInstruction'>('full')
  const [additionalInstruction, setAdditionalInstruction] = useState('')
  const [projectId, setProjectId] = useState<string | null>(null)
  
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

          // 生成されたコンテンツを状態に保存
          setGeneratedContent(generatedContent)
          setProjectId(project.id)
          setGenerationComplete(true)
          
          // 確認画面を表示
          setTimeout(() => {
            setShowConfirmation(true)
          }, 1000)
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
    setShowConfirmation(false)
    setGeneratedContent(null)
    setShowRegenerateDialog(false)
    setRegenerateMode('full')
    setAdditionalInstruction('')
    setProjectId(null)
    onClose()
  }

  // 生成内容を保存して次へ進む
  const handleConfirmAndSave = async () => {
    if (!generatedContent || !projectId) return
    
    try {
      // 執筆ルール
      await projectService.updateWritingRules(projectId, generatedContent.writingRules)
      
      // 世界観設定
      await worldService.updateWorldSettings(projectId, generatedContent.worldSettings)
      
      // キャラクター
      for (const character of generatedContent.characters) {
        await characterService.createCharacter(projectId, character)
      }
      
      // プロット概要とテーマを保存（拡張データとして）
      if (generatedContent.plotOutline || generatedContent.themes || generatedContent.genre) {
        localStorage.setItem(`shinwa-project-meta-${projectId}`, JSON.stringify({
          plotOutline: generatedContent.plotOutline,
          themes: generatedContent.themes,
          genre: generatedContent.genre
        }))
      }
      
      // 章立て設定画面へ遷移
      router.push(`/projects/${projectId}/setup-chapters`)
    } catch (err: any) {
      setError('保存に失敗しました: ' + (err.message || '不明なエラー'))
    }
  }

  // 再生成処理
  const handleRegenerate = async () => {
    if (!projectId) return
    
    setShowRegenerateDialog(false)
    setShowConfirmation(false)
    setIsGenerating(true)
    setGenerationComplete(false)
    setError('')
    
    try {
      const prompt = regenerateMode === 'withInstruction' && additionalInstruction.trim()
        ? `${description.trim()}\n\n追加の指示: ${additionalInstruction.trim()}`
        : description.trim()
      
      const regeneratedContent = await projectGeneratorService.generateProjectContent({
        projectId: projectId,
        title: name.trim(),
        description: prompt,
        aiModel: selectedModel,
        temperature: regenerateMode === 'full' ? 0.8 : 0.7, // 完全再生成時は多様性を上げる
        onProgress: (progress) => {
          setGenerationProgress(progress)
        }
      })
      
      setGeneratedContent(regeneratedContent)
      setGenerationComplete(true)
      
      // 確認画面を表示
      setTimeout(() => {
        setShowConfirmation(true)
        setAdditionalInstruction('') // 追加指示をクリア
      }, 1000)
    } catch (err: any) {
      console.error('Regeneration failed:', err)
      setError('再生成に失敗しました: ' + (err.message || '不明なエラー'))
      setShowConfirmation(true) // エラー時も確認画面に戻る
    } finally {
      setIsGenerating(false)
    }
  }

  // プレビューテキストを生成
  const generatePreviewText = () => {
    if (!generatedContent) return ''
    
    let preview = '## 生成された内容\n\n'
    
    // 執筆ルール
    if (generatedContent.writingRules) {
      const rules = generatedContent.writingRules
      preview += '### 執筆ルール\n'
      preview += `- 視点: ${rules.pointOfView || '未設定'}\n`
      preview += `- 時制: ${rules.tense || '未設定'}\n`
      preview += `- 文体: ${rules.writingStyle || '未設定'}\n`
      if (rules.additionalRules) {
        preview += `- その他: ${rules.additionalRules}\n`
      }
      preview += '\n'
    }
    
    // 世界観設定
    if (generatedContent.worldSettings) {
      const world = generatedContent.worldSettings
      preview += '### 世界観設定\n'
      if (world.era) preview += `- 時代設定: ${world.era}\n`
      if (world.geography) preview += `- 地理: ${world.geography}\n`
      if (world.culture) preview += `- 文化: ${world.culture}\n`
      if (world.magicSystem) preview += `- 魔法体系: ${world.magicSystem}\n`
      if (world.technologyLevel) preview += `- 技術レベル: ${world.technologyLevel}\n`
      preview += '\n'
    }
    
    // キャラクター
    if (generatedContent.characters && generatedContent.characters.length > 0) {
      preview += '### キャラクター\n'
      generatedContent.characters.forEach((char: any, index: number) => {
        preview += `\n**${index + 1}. ${char.name}**\n`
        if (char.role) preview += `- 役割: ${char.role}\n`
        if (char.age) preview += `- 年齢: ${char.age}\n`
        if (char.personality) preview += `- 性格: ${char.personality}\n`
        if (char.background) preview += `- 背景: ${char.background}\n`
      })
    }
    
    return preview
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
          {showConfirmation ? (
          // 確認画面
          <>
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-3">生成結果の確認</h3>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 max-h-96 overflow-y-auto">
                <pre className="text-sm whitespace-pre-wrap font-sans">
                  {generatePreviewText()}
                </pre>
              </div>
            </div>
            
            {error && (
              <p className="text-sm text-red-600 mb-4">{error}</p>
            )}
            
            <div className="flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => setShowRegenerateDialog(true)}
              >
                再生成する
              </Button>
              <Button
                onClick={handleConfirmAndSave}
              >
                この内容で進む
              </Button>
            </div>
          </>
        ) : !isGenerating ? (
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
                className="block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-base shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                  生成内容を確認しています...
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
    
    {/* 再生成ダイアログ */}
    <Modal
      isOpen={showRegenerateDialog}
      onClose={() => setShowRegenerateDialog(false)}
      title="再生成オプション"
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          どのように再生成しますか？
        </p>
        
        <div className="space-y-2">
          <label className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            style={{
              borderColor: regenerateMode === 'full' ? 'rgb(59, 130, 246)' : 'rgb(209, 213, 219)'
            }}
          >
            <input
              type="radio"
              name="regenerateMode"
              value="full"
              checked={regenerateMode === 'full'}
              onChange={(e) => setRegenerateMode('full')}
              className="mt-0.5"
            />
            <div>
              <div className="font-medium">完全に最初から生成</div>
              <div className="text-sm text-gray-500">元の説明文のみを使用して、全く新しい内容を生成します</div>
            </div>
          </label>
          
          <label className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            style={{
              borderColor: regenerateMode === 'withInstruction' ? 'rgb(59, 130, 246)' : 'rgb(209, 213, 219)'
            }}
          >
            <input
              type="radio"
              name="regenerateMode"
              value="withInstruction"
              checked={regenerateMode === 'withInstruction'}
              onChange={(e) => setRegenerateMode('withInstruction')}
              className="mt-0.5"
            />
            <div className="flex-1">
              <div className="font-medium">指示を追加して再生成</div>
              <div className="text-sm text-gray-500 mb-2">特定の要望を追加して再生成します</div>
              {regenerateMode === 'withInstruction' && (
                <textarea
                  value={additionalInstruction}
                  onChange={(e) => setAdditionalInstruction(e.target.value)}
                  placeholder="例: もっとダークな雰囲気にして、魔法要素を強めてください"
                  className="mt-2 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  rows={3}
                />
              )}
            </div>
          </label>
        </div>
        
        <div className="flex justify-end gap-3 pt-2">
          <Button
            variant="secondary"
            onClick={() => setShowRegenerateDialog(false)}
          >
            キャンセル
          </Button>
          <Button
            onClick={handleRegenerate}
            disabled={regenerateMode === 'withInstruction' && !additionalInstruction.trim()}
          >
            再生成を開始
          </Button>
        </div>
      </div>
    </Modal>
    </>
  )
}