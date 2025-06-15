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

  // プレビューコンポーネントを生成
  const GeneratedContentPreview = () => {
    if (!generatedContent) return null
    
    return (
      <div className="space-y-6">
        {/* 執筆ルール */}
        {generatedContent.writingRules && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">執筆ルール</h4>
            </div>
            <dl className="grid grid-cols-1 gap-3">
              <div className="flex gap-3">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 min-w-[80px]">視点：</dt>
                <dd className="text-sm text-gray-900 dark:text-gray-100">{generatedContent.writingRules.pointOfView === 'first' ? '一人称' : generatedContent.writingRules.pointOfView === 'third' ? '三人称' : '神視点'}</dd>
              </div>
              <div className="flex gap-3">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 min-w-[80px]">時制：</dt>
                <dd className="text-sm text-gray-900 dark:text-gray-100">{generatedContent.writingRules.tense === 'past' ? '過去形' : '現在形'}</dd>
              </div>
              <div className="flex gap-3">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 min-w-[80px]">文体：</dt>
                <dd className="text-sm text-gray-900 dark:text-gray-100">{generatedContent.writingRules.style || '標準'}</dd>
              </div>
              {generatedContent.writingRules.chapterLength && (
                <div className="flex gap-3">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 min-w-[80px]">章の長さ：</dt>
                  <dd className="text-sm text-gray-900 dark:text-gray-100">{generatedContent.writingRules.chapterLength.min}〜{generatedContent.writingRules.chapterLength.max}文字</dd>
                </div>
              )}
            </dl>
          </div>
        )}
        
        {/* 世界観設定 */}
        {generatedContent.worldSettings && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">世界観設定</h4>
            </div>
            <dl className="grid grid-cols-1 gap-3">
              {generatedContent.worldSettings.era && (
                <div className="flex gap-3">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 min-w-[100px]">時代設定：</dt>
                  <dd className="text-sm text-gray-900 dark:text-gray-100">{generatedContent.worldSettings.era}</dd>
                </div>
              )}
              {generatedContent.worldSettings.geography && (
                <div className="flex gap-3">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 min-w-[100px]">地理：</dt>
                  <dd className="text-sm text-gray-900 dark:text-gray-100">{generatedContent.worldSettings.geography}</dd>
                </div>
              )}
              {generatedContent.worldSettings.culture && (
                <div className="flex gap-3">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 min-w-[100px]">文化：</dt>
                  <dd className="text-sm text-gray-900 dark:text-gray-100">{generatedContent.worldSettings.culture}</dd>
                </div>
              )}
              {generatedContent.worldSettings.magicSystem && (
                <div className="flex gap-3">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 min-w-[100px]">魔法体系：</dt>
                  <dd className="text-sm text-gray-900 dark:text-gray-100">{generatedContent.worldSettings.magicSystem}</dd>
                </div>
              )}
              {generatedContent.worldSettings.technologyLevel && (
                <div className="flex gap-3">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 min-w-[100px]">技術レベル：</dt>
                  <dd className="text-sm text-gray-900 dark:text-gray-100">{generatedContent.worldSettings.technologyLevel}</dd>
                </div>
              )}
            </dl>
          </div>
        )}
        
        {/* キャラクター */}
        {generatedContent.characters && generatedContent.characters.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">キャラクター（{generatedContent.characters.length}人）</h4>
            </div>
            <div className="space-y-4">
              {generatedContent.characters.map((char: any, index: number) => (
                <div key={index} className="border-l-4 border-blue-400 pl-4 py-2">
                  <h5 className="font-semibold text-gray-900 dark:text-gray-100">{char.name}</h5>
                  <dl className="mt-2 space-y-1">
                    {char.role && (
                      <div className="flex gap-2">
                        <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">役割：</dt>
                        <dd className="text-xs text-gray-700 dark:text-gray-300">{char.role}</dd>
                      </div>
                    )}
                    {char.age && (
                      <div className="flex gap-2">
                        <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">年齢：</dt>
                        <dd className="text-xs text-gray-700 dark:text-gray-300">{char.age}</dd>
                      </div>
                    )}
                    {char.personality && (
                      <div className="flex gap-2">
                        <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">性格：</dt>
                        <dd className="text-xs text-gray-700 dark:text-gray-300">{char.personality}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
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
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">生成結果の確認</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">AIが生成した内容を確認してください</p>
                </div>
              </div>
              
              <div className="max-h-[400px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
                <GeneratedContentPreview />
              </div>
            </div>
            
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}
            
            <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                内容に問題がある場合は再生成できます
              </p>
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setShowRegenerateDialog(true)}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  再生成する
                </Button>
                <Button
                  onClick={handleConfirmAndSave}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  この内容で進む
                </Button>
              </div>
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