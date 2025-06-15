'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Project, Chapter, Character, WorldMapSystem, CharacterLocation, ValidationResult, ValidationIssue } from '@/lib/types'
import { projectService } from '@/lib/services/project-service'
import { WorldMapService } from '@/lib/services/world-map-service'
import { useAppStore } from '@/lib/store'
import Button from '@/components/ui/Button'
import AISettings, { AISettingsData } from '@/components/settings/AISettings'
import AdvancedAISettings from '@/components/settings/AdvancedAISettings'
import { FlowEngine } from '@/lib/services/flow-engine'
import { NovelFlowExecutor } from '@/lib/services/flow-executor'
import { mainWritingFlow } from '@/data/flows/main-flow'
import { aiManager } from '@/lib/ai/manager'
import { formatDate, countCharacters, generateId } from '@/lib/utils'
import { getFeatureModelSettings } from '@/lib/utils/ai-settings'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import ValidationIssueSelector from '@/components/validation/ValidationIssueSelector'

export default function ProjectDashboard() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const { userId, isAuthenticated } = useCurrentUser()

  const [project, setProject] = useState<Project | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showAISettings, setShowAISettings] = useState(false)
  const [showAdvancedAISettings, setShowAdvancedAISettings] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)
  const [executionLog, setExecutionLog] = useState<string[]>([])
  const [projectMeta, setProjectMeta] = useState<{ plotOutline?: string; themes?: string[]; genre?: string } | null>(null)
  const [pendingChapter, setPendingChapter] = useState<Chapter | null>(null)
  const [showChapterPreview, setShowChapterPreview] = useState(false)
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [chapterStructure, setChapterStructure] = useState<any>(null)
  const [aiUsageStats, setAiUsageStats] = useState<{
    isUnlimited: boolean;
    remaining: number;
    used: number;
    limit: number;
  } | null>(null)
  const [showUsageWarning, setShowUsageWarning] = useState(false)
  const [worldMapSystem, setWorldMapSystem] = useState<WorldMapSystem | null>(null)
  const [characterLocations, setCharacterLocations] = useState<Record<string, CharacterLocation>>({})
  const [worldMapService, setWorldMapService] = useState<WorldMapService | null>(null)
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [showValidationSelector, setShowValidationSelector] = useState(false)
  const [characters, setCharacters] = useState<Character[]>([])
  const [isFixing, setIsFixing] = useState(false)
  const [fixingProgress, setFixingProgress] = useState<string>('')

  const { setCurrentProject, setCurrentProvider, setApiKey } = useAppStore()

  useEffect(() => {
    // プロジェクト切り替え時にチャプターをクリア
    setChapters([])
    
    // 既存データのマイグレーション（キャラクター名をIDに変換）
    import('@/lib/utils/character-data-migration').then(module => {
      module.migrateProjectCharacterData(projectId)
      module.cleanupCharacterLocations(projectId)
    })
    
    loadProject()
    loadChapters()
    loadProjectMeta()
    loadChapterStructure()
    loadCharacters()
    
    // WorldMapServiceを初期化
    const service = new WorldMapService(projectId)
    setWorldMapService(service)
    loadWorldMap(service)
    loadCharacterLocations()
    
    // クリーンアップ: コンポーネントがアンマウントされる時もクリア
    return () => {
      setChapters([])
    }
  }, [projectId])

  useEffect(() => {
    // AI使用状況を取得
    if (isAuthenticated && userId) {
      loadAIUsageStats()
    }
  }, [isAuthenticated, userId])

  const loadProject = async () => {
    setIsLoading(true)
    try {
      const loaded = await projectService.getProject(projectId)
      if (!loaded) {
        router.push('/projects')
        return
      }
      setProject(loaded)
      setCurrentProject(loaded)
    } catch (error) {
      console.error('Failed to load project:', error)
      router.push('/projects')
    } finally {
      setIsLoading(false)
    }
  }

  const loadChapters = async () => {
    console.log('Loading chapters for project:', projectId)
    const stored = localStorage.getItem(`shinwa-chapters-${projectId}`)
    if (stored) {
      try {
        const parsedData = JSON.parse(stored)
        console.log('Parsed chapter data:', parsedData)
        const loadedChapters = parsedData.map((ch: any) => ({
          ...ch,
          createdAt: new Date(ch.createdAt),
          updatedAt: new Date(ch.updatedAt)
        }))
        console.log('Loaded chapters:', loadedChapters)
        console.log('Chapter numbers:', loadedChapters.map((ch: any) => ch.number))
        setChapters(loadedChapters)
      } catch (error) {
        console.error('Failed to load chapters:', error)
      }
    } else {
      console.log('No stored chapters found for project:', projectId)
    }
  }

  const loadProjectMeta = () => {
    const stored = localStorage.getItem(`shinwa-project-meta-${projectId}`)
    if (stored) {
      try {
        setProjectMeta(JSON.parse(stored))
      } catch (error) {
        console.error('Failed to load project meta:', error)
      }
    }
  }
  
  const loadChapterStructure = () => {
    const stored = localStorage.getItem(`shinwa-chapter-structure-${projectId}`)
    if (stored) {
      try {
        setChapterStructure(JSON.parse(stored))
      } catch (error) {
        console.error('Failed to load chapter structure:', error)
      }
    }
  }

  const loadAIUsageStats = async () => {
    try {
      const response = await fetch('/api/ai-usage')
      if (response.ok) {
        const stats = await response.json()
        setAiUsageStats(stats)
      }
    } catch (error) {
      console.error('Failed to load AI usage stats:', error)
    }
  }

  const loadWorldMap = async (service: WorldMapService) => {
    try {
      const mapSystem = service.loadWorldMapSystem()
      if (mapSystem) {
        setWorldMapSystem(mapSystem)
      }
    } catch (error) {
      console.error('Failed to load world map:', error)
    }
  }

  const loadCharacterLocations = () => {
    const stored = localStorage.getItem(`shinwa-character-location-${projectId}`)
    if (stored) {
      try {
        const locations = JSON.parse(stored)
        setCharacterLocations(locations)
      } catch (error) {
        console.error('Failed to load character locations:', error)
      }
    }
  }

  const getLocationName = (locationId: string): string => {
    if (!worldMapSystem || !locationId || locationId === 'unknown') {
      return '不明'
    }

    // 世界地図から検索
    const worldLocation = worldMapSystem.worldMap.locations.find(loc => loc.id === locationId)
    if (worldLocation) {
      return worldLocation.name
    }

    // 地域地図から検索
    for (const region of worldMapSystem.regions) {
      const regionLocation = region.locations.find(loc => loc.id === locationId)
      if (regionLocation) {
        return regionLocation.name
      }
    }

    // ローカル地図から検索
    for (const localMap of worldMapSystem.localMaps) {
      const localArea = localMap.areas.find(area => area.id === locationId)
      if (localArea) {
        return localArea.name
      }
    }

    return '不明'
  }

  const loadCharacters = () => {
    const stored = localStorage.getItem(`shinwa-characters-${projectId}`)
    if (stored) {
      try {
        const charactersData = JSON.parse(stored)
        setCharacters(charactersData)
      } catch (error) {
        console.error('Failed to load characters:', error)
      }
    }
  }

  const getCharacterName = (characterId: string): string => {
    const character = characters.find(c => c.id === characterId)
    return character?.name || characterId // フォールバック
  }

  const handleAISettingsSave = async (settings: AISettingsData) => {
    // AI設定の保存とプロバイダーの登録
    aiManager.registerProvider(settings.provider, {
      apiKey: settings.apiKey,
      defaultModel: settings.model
    })
    aiManager.setCurrentProvider(settings.provider)
    
    // ストアを更新
    setCurrentProvider(settings.provider)
    setApiKey(settings.provider, settings.apiKey)

    // プロジェクト設定に保存
    if (project) {
      await projectService.updateProjectSettings(projectId, {
        aiSettings: {
          ...project.settings.aiSettings,
          model: settings.model,
          temperature: settings.temperature,
          maxTokens: settings.maxTokens
        }
      })
      loadProject()
    }
  }

  // 再チェック用の関数
  const handleRecheck = async (content: string) => {
    setExecutionLog(prev => [...prev, '修正後の内容を再チェック中...'])
    
    try {
      // FlowEngineを使用して検証ステップのみを実行
      const executor = new NovelFlowExecutor(
        projectId,
        project!.settings.aiSettings.model,
        project!.settings.aiSettings.temperature
      )
      
      const validateStep = mainWritingFlow.steps.find(step => step.id === 'validate-chapter')
      if (!validateStep) return
      
      const context = {
        chapterNumber: pendingChapter?.number || 1,
        chapterContent: content,
        rules: project!.settings.writingRules,
        worldSettings: worldSettings || undefined,
        characters: characters || []
      }
      
      const result = await executor.executeStep(validateStep, context)
      
      if (result.validationResult) {
        setValidationResult(result.validationResult)
        
        if (result.validationResult.isValid) {
          setExecutionLog(prev => [...prev, '✅ すべての問題が修正されました！'])
        } else {
          setExecutionLog(prev => [...prev, `⚠️ まだ${result.validationResult.issues.length}件の問題が残っています。`])
        }
      }
    } catch (error: any) {
      setExecutionLog(prev => [...prev, `再チェック中にエラーが発生しました: ${error.message}`])
    }
  }

  const handleFixSelectedIssues = async (selectedIssueIds: string[]) => {
    if (!pendingChapter || !validationResult) return
    
    setIsFixing(true)
    setFixingProgress(`選択された${selectedIssueIds.length}件の問題を修正中...`)
    setExecutionLog(prev => [...prev, `選択された${selectedIssueIds.length}件の問題を修正中...`])
    setShowValidationSelector(false)
    
    // 選択された問題のみをフィルタリング
    const selectedIssues = validationResult.issues.filter(issue => 
      selectedIssueIds.includes(issue.id)
    )
    
    try {
      // 修正プロンプトを構築
      const fixPrompt = `以下の問題を修正してください：

${selectedIssues.map(issue => 
  `【${issue.title}】
カテゴリ: ${issue.category}
重要度: ${issue.severity}
説明: ${issue.description}
${issue.suggestion ? `提案: ${issue.suggestion}` : ''}
${issue.location ? `該当箇所: ${issue.location}` : ''}`
).join('\n\n')}

元の章の内容:
${pendingChapter.content}

上記の問題を修正した章の内容を出力してください。修正した箇所以外は元の文章をそのまま保持してください。`

      const modelSettings = getFeatureModelSettings(projectId, 'validation')
      const response = await aiManager.complete({
        model: modelSettings.model,
        messages: [
          {
            role: 'system',
            content: '小説の編集者として、指摘された問題を修正してください。元の文章の良い部分は保持し、問題のある部分のみを修正してください。'
          },
          {
            role: 'user',
            content: fixPrompt
          }
        ],
        temperature: 0.5,
        maxTokens: modelSettings.maxTokens
      })
      
      // 修正された内容で章を更新
      const fixedChapter = {
        ...pendingChapter,
        content: response.content
      }
      
      setPendingChapter(fixedChapter)
      setValidationResult(null)
      setExecutionLog(prev => [...prev, '選択された問題を修正しました。'])
      setFixingProgress('修正完了！再度チェックを実行しています...')
      
      // 修正後に再度チェックを実行
      await handleRecheck(fixedChapter.content)
      
      // AI使用を記録
      if (userId) {
        await fetch('/api/ai-usage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'record' })
        })
      }
    } catch (error: any) {
      setExecutionLog(prev => [...prev, `修正中にエラーが発生しました: ${error.message}`])
    } finally {
      setIsFixing(false)
      setFixingProgress('')
    }
  }

  const handleFixAllIssues = async () => {
    if (!pendingChapter || !validationResult) return
    
    setExecutionLog(prev => [...prev, 'すべての問題を修正して再生成中...'])
    setShowValidationSelector(false)
    setShowChapterPreview(false)
    setPendingChapter(null)
    setValidationResult(null)
    
    // 再生成（検証結果を考慮）
    await handleExecuteFlow(true, validationResult.issues)
  }

  const handleExecuteFlow = async (isRegeneration = false, previousIssues: ValidationIssue[] = []) => {
    if (!project?.settings.aiSettings) {
      setShowAISettings(true)
      return
    }

    // AI使用制限をチェック
    if (userId) {
      try {
        const checkResponse = await fetch('/api/ai-usage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'check' })
        })
        
        if (checkResponse.ok) {
          const checkResult = await checkResponse.json()
          if (!checkResult.canGenerate) {
            setShowUsageWarning(true)
            setExecutionLog([`無料プランの使用制限に達しました。今月は残り0回です。`])
            return
          }
          
          // 使用可能回数を表示
          if (!checkResult.isUnlimited) {
            setExecutionLog([`AI生成を開始します... (今月の残り回数: ${checkResult.remaining}回)`])
          }
        }
      } catch (error) {
        console.error('Failed to check AI usage:', error)
      }
    }

    // LocalStorageから最新の章データを取得
    const storedChapters = localStorage.getItem(`shinwa-chapters-${projectId}`)
    let currentChapters: Chapter[] = []
    if (storedChapters) {
      try {
        currentChapters = JSON.parse(storedChapters)
        console.log('Chapters from localStorage:', currentChapters)
      } catch (error) {
        console.error('Failed to parse chapters from localStorage:', error)
      }
    }

    // デバッグ: 現在の章の状態を確認
    console.log('Current chapters from state:', chapters)
    console.log('Current chapters from localStorage:', currentChapters)
    console.log('Chapter numbers from localStorage:', currentChapters.map(ch => ch.number))

    // 既存の章番号の最大値を取得して +1 する（重複を防ぐため）
    const maxChapterNumber = currentChapters.length > 0 
      ? Math.max(...currentChapters.map(ch => ch.number)) 
      : 0
    const nextChapterNumber = maxChapterNumber + 1
    
    console.log('Next chapter number:', nextChapterNumber)
    
    setIsExecuting(true)
    setExecutionLog([`第${nextChapterNumber}章の執筆を開始します...`])

    try {
      const executor = new NovelFlowExecutor(
        projectId,
        project.settings.aiSettings.model,
        project.settings.aiSettings.temperature
      )
      const engine = new FlowEngine(mainWritingFlow, executor)
      
      // ExecutorにEngineの参照を設定
      executor.setFlowEngine(engine)

      engine.on('stepStart', (step) => {
        setExecutionLog(prev => [...prev, `実行中: ${step.name}`])
      })

      engine.on('stepComplete', (step) => {
        setExecutionLog(prev => [...prev, `完了: ${step.name}`])
      })
      
      // 詳細なログイベントをリッスン
      engine.on('log', (message, type) => {
        setExecutionLog(prev => [...prev, `[${type || 'info'}] ${message}`])
      })

      engine.on('flowComplete', (context) => {
        console.log('Flow complete with context:', context)
      })

      // 章立て情報をコンテキストに追加
      const chapterOutline = chapterStructure?.chapters?.find(
        (ch: any) => ch.number === nextChapterNumber
      )
      
      const context: any = {
        chapterNumber: nextChapterNumber,
        projectId: projectId,
        chapterOutline: chapterOutline || null
      }
      
      // 再生成時は前回の問題を含める
      if (isRegeneration && previousIssues.length > 0) {
        context.previousValidationIssues = previousIssues
        setExecutionLog(prev => [...prev, `前回の${previousIssues.length}件の問題を考慮して再生成します`])
      }
      
      const result = await engine.execute(context)

      if (result.chapterContent) {
        // 一意のIDを生成（タイムスタンプとランダム文字列）
        const chapterId = `chapter-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        
        const newChapter: Chapter = {
          id: chapterId,
          number: nextChapterNumber,
          title: result.chapterTitle || `第${nextChapterNumber}章`,
          summary: result.chapterSummary || '',
          content: result.chapterContent,
          backgroundEvents: result.backgroundEvents || [],
          state: result.newState || {
            time: result.chapterPlan?.time || '',
            location: result.chapterPlan?.location || '',
            charactersPresent: result.chapterPlan?.characters || [],
            plotProgress: result.plotProgress || [],
            worldChanges: result.worldChanges || [],
            foreshadowing: result.foreshadowing || []
          },
          createdAt: new Date(),
          updatedAt: new Date()
        }

        // 検証結果を保存
        if (result.validationResult) {
          setValidationResult(result.validationResult)
          if (!result.validationResult.isValid) {
            setExecutionLog(prev => [...prev, '⚠️ 検証で問題が見つかりました'])
            setExecutionLog(prev => [...prev, `検証結果: ${result.validationResult.issues.length}件の問題`])
            // 検証結果をコンソールにも出力（デバッグ用）
            console.log('Validation Result:', result.validationResult)
          }
        } else {
          // 検証結果がない場合もログに記録
          setExecutionLog(prev => [...prev, '✓ 検証結果: 問題なし'])
          setValidationResult(null)
        }
        
        // 章を一時的に保存してプレビューを表示
        setPendingChapter(newChapter)
        setShowChapterPreview(true)
        setExecutionLog(prev => [...prev, '執筆が完了しました！内容を確認してください。'])
        
        // AI使用を記録
        if (userId) {
          try {
            const recordResponse = await fetch('/api/ai-usage', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'record' })
            })
            
            if (recordResponse.ok) {
              const { stats } = await recordResponse.json()
              setAiUsageStats(stats)
            }
          } catch (error) {
            console.error('Failed to record AI usage:', error)
          }
        }
      }
    } catch (error: any) {
      setExecutionLog(prev => [...prev, `エラー: ${error.message}`])
      console.error('Flow execution error:', error)
    } finally {
      setIsExecuting(false)
    }
  }

  if (isLoading || !project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {project.name}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {project.description || '説明なし'}
              </p>
            </div>
            <div className="flex gap-3">
              <Link href="/projects">
                <Button variant="secondary">
                  プロジェクト一覧
                </Button>
              </Link>
              <Link href={`/projects/${projectId}/dashboard`}>
                <Button variant="primary">
                  🎯 統合ダッシュボード
                </Button>
              </Link>
              <Button variant="secondary" onClick={() => setShowAISettings(true)}>
                AI設定
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowAdvancedAISettings(true)}
                title="機能別AIモデル設定"
              >
                ⚙️ 高度なAI設定
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* メインコンテンツ */}
          <div className="lg:col-span-2 space-y-6">
            {/* 執筆コントロール */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">執筆コントロール</h2>
              
              <div className="flex gap-3 mb-4">
                <Button
                  onClick={() => setShowAISettings(true)}
                  variant="secondary"
                >
                  AI設定
                </Button>
                <Button
                  onClick={() => handleExecuteFlow()}
                  disabled={isExecuting || (!!aiUsageStats && !aiUsageStats.isUnlimited && aiUsageStats.remaining === 0)}
                >
                  {isExecuting ? '執筆中...' : 
                   aiUsageStats && !aiUsageStats.isUnlimited && aiUsageStats.remaining === 0 ? '使用制限に達しました' :
                   `第${chapters.length > 0 ? Math.max(...chapters.map(ch => ch.number)) + 1 : 1}章を執筆${aiUsageStats && !aiUsageStats.isUnlimited ? ` (残り${aiUsageStats.remaining}回)` : ''}`}
                </Button>
                {chapterStructure && (
                  <Link href={`/projects/${projectId}/setup-chapters`}>
                    <Button variant="secondary">
                      📚 章立てを編集
                    </Button>
                  </Link>
                )}
              </div>

              {executionLog.length > 0 && (
                <div className="bg-gray-100 dark:bg-gray-900 rounded p-4 max-h-40 overflow-y-auto">
                  <ul className="space-y-1 text-sm font-mono">
                    {executionLog.map((log, index) => (
                      <li key={index} className="text-gray-700 dark:text-gray-300">
                        {log}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* 章一覧 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">章一覧</h2>
              
              {chapters.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  まだ章がありません。執筆を開始してください。
                </p>
              ) : (
                <div className="space-y-3">
                  {chapters.sort((a, b) => a.number - b.number).map((chapter) => (
                    <div
                      key={chapter.id}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-lg font-medium">
                          {chapter.title}
                        </h3>
                        <span className="text-sm text-gray-500">
                          {countCharacters(chapter.content)}文字
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                        {chapter.content.substring(0, 100)}...
                      </p>
                      <div className="mt-3 flex gap-2">
                        <Link href={`/projects/${projectId}/chapters/${chapter.id}`}>
                          <Button size="sm">読む</Button>
                        </Link>
                        <Button size="sm" variant="secondary">
                          編集
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* サイドバー */}
          <div className="space-y-6">
            {/* 章立て情報 */}
            {chapterStructure && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">📚 章立て</h3>
                <div className="space-y-3">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <p>小説タイプ: {project.novelType === 'short' ? '短編' : project.novelType === 'medium' ? '中編' : project.novelType === 'long' ? '長編' : 'カスタム'}</p>
                    <p>構成: {chapterStructure.structure.type === 'three-act' ? '三幕構成' : chapterStructure.structure.type === 'four-act' ? '四幕構成' : chapterStructure.structure.type === 'hero-journey' ? 'ヒーローズジャーニー' : 'カスタム'}</p>
                    <p>総章数: {chapterStructure.totalChapters}章</p>
                  </div>
                  
                  {/* 現在の章情報 */}
                  {chapterStructure.chapters && (
                    <div className="mt-4">
                      <h4 className="font-medium mb-2">現在執筆中</h4>
                      {chapterStructure.chapters[chapters.length] && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded p-3">
                          <p className="font-medium text-sm">
                            第{chapters.length + 1}章: {chapterStructure.chapters[chapters.length].title || 'タイトル未設定'}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            {chapterStructure.chapters[chapters.length].purpose}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <Link href={`/projects/${projectId}/setup-chapters`}>
                    <Button variant="secondary" size="sm" className="w-full mt-3">
                      章立てを表示・編集
                    </Button>
                  </Link>
                </div>
              </div>
            )}
            {/* プロジェクト情報 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">プロジェクト情報</h3>
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-gray-500">作成日</dt>
                  <dd className="font-medium">{formatDate(project.createdAt)}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">更新日</dt>
                  <dd className="font-medium">{formatDate(project.updatedAt)}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">総章数</dt>
                  <dd className="font-medium">{chapters.length}章</dd>
                </div>
                <div>
                  <dt className="text-gray-500">総文字数</dt>
                  <dd className="font-medium">
                    {chapters.reduce((sum, ch) => sum + countCharacters(ch.content), 0).toLocaleString()}文字
                  </dd>
                </div>
              </dl>
            </div>

            {/* AI設定情報 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">AI設定</h3>
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-gray-500">モデル</dt>
                  <dd className="font-medium">{project.settings.aiSettings.model}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Temperature</dt>
                  <dd className="font-medium">{project.settings.aiSettings.temperature}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">最大トークン</dt>
                  <dd className="font-medium">{project.settings.aiSettings.maxTokens}</dd>
                </div>
              </dl>
            </div>

            {/* キャラクター位置情報 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">📍 キャラクター位置</h3>
              {Object.keys(characterLocations).length > 0 ? (
                <div className="space-y-3">
                  {/* キャラクターが読み込まれていない場合は、localStorageから再読み込み */}
                  {characters.length === 0 && (() => {
                    loadCharacters()
                    return null
                  })()}
                  {Object.entries(characterLocations).map(([charId, location]) => {
                    const characterName = getCharacterName(charId)
                    const locationName = getLocationName(location.currentLocation.locationId)
                    const lastHistory = location.locationHistory[location.locationHistory.length - 1]
                    
                    return (
                      <div key={charId} className="border-b border-gray-200 dark:border-gray-700 pb-2 last:border-0">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{characterName}</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              現在: {locationName}
                            </p>
                            {lastHistory && (
                              <p className="text-xs text-gray-500 mt-1">
                                第{lastHistory.arrivalChapter}章から
                              </p>
                            )}
                          </div>
                          {worldMapSystem && (
                            <Link 
                              href={`/projects/${projectId}/world?tab=map&location=${location.currentLocation.locationId}`}
                              className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400"
                            >
                              地図で見る →
                            </Link>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500">位置情報がまだ記録されていません</p>
                  {!worldMapSystem && (
                    <Link href={`/projects/${projectId}/world`}>
                      <Button size="sm" variant="secondary" className="mt-2">
                        世界地図を作成
                      </Button>
                    </Link>
                  )}
                </div>
              )}
            </div>

            {/* AI使用状況 */}
            {aiUsageStats && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">AI使用状況</h3>
                {aiUsageStats.isUnlimited ? (
                  <div className="text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      プラン: <span className="font-medium text-green-600">有料プラン</span>
                    </p>
                    <p className="text-2xl font-bold text-green-600">無制限</p>
                    <p className="text-xs text-gray-500 mt-1">AI生成に制限はありません</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      プラン: <span className="font-medium">無料プラン</span>
                    </p>
                    <div className="mb-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span>今月の使用回数</span>
                        <span className="font-medium">{aiUsageStats.used} / {aiUsageStats.limit}</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${(aiUsageStats.used / aiUsageStats.limit) * 100}%` }}
                        />
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      残り: <span className={`font-medium ${aiUsageStats.remaining === 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {aiUsageStats.remaining}回
                      </span>
                    </p>
                    {aiUsageStats.remaining === 0 && (
                      <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                        <p className="text-xs text-yellow-800 dark:text-yellow-200">
                          今月の無料枠を使い切りました。
                          継続して利用するには有料プランへのアップグレードをご検討ください。
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* プロジェクトメタ情報 */}
            {projectMeta && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">プロジェクト概要</h3>
                {projectMeta.genre && (
                  <div className="mb-3">
                    <dt className="text-sm text-gray-500 mb-1">ジャンル</dt>
                    <dd className="font-medium text-sm">{projectMeta.genre}</dd>
                  </div>
                )}
                {projectMeta.themes && projectMeta.themes.length > 0 && (
                  <div className="mb-3">
                    <dt className="text-sm text-gray-500 mb-1">テーマ</dt>
                    <dd className="flex flex-wrap gap-2">
                      {projectMeta.themes.map((theme, index) => (
                        <span key={index} className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs rounded-full">
                          {theme}
                        </span>
                      ))}
                    </dd>
                  </div>
                )}
                {projectMeta.plotOutline && (
                  <div>
                    <dt className="text-sm text-gray-500 mb-1">プロット概要</dt>
                    <dd className="text-sm text-gray-700 dark:text-gray-300">
                      {projectMeta.plotOutline}
                    </dd>
                  </div>
                )}
              </div>
            )}

            {/* クイックアクション */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">クイックアクション</h3>
              <div className="space-y-2">
                <Link href={`/projects/${projectId}/characters`} className="block">
                  <Button variant="secondary" className="w-full">
                    キャラクター管理
                  </Button>
                </Link>
                <Link href={`/projects/${projectId}/world`} className="block">
                  <Button variant="secondary" className="w-full">
                    世界観設定
                  </Button>
                </Link>
                <Link href={`/projects/${projectId}/rules`} className="block">
                  <Button variant="secondary" className="w-full">
                    執筆ルール
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        <AISettings
          isOpen={showAISettings}
          onClose={() => setShowAISettings(false)}
          onSave={handleAISettingsSave}
        />

        {/* 章プレビューモーダル */}
        {showChapterPreview && pendingChapter && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] m-4 flex flex-col">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-2xl font-bold">
                  {pendingChapter.title} - 内容確認
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  生成された章の内容を確認してください
                </p>
              </div>
              
              <div className="p-6 overflow-y-auto flex-1">
                <div className="space-y-6">
                  {/* 検証結果の警告 */}
                  {validationResult && !validationResult.isValid && !showValidationSelector && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                        ⚠️ 検証で{validationResult.issues.length}件の問題が見つかりました
                      </h3>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-3">
                        問題を個別に確認して、修正する項目を選択できます。
                      </p>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setShowValidationSelector(true)}
                      >
                        問題を確認
                      </Button>
                    </div>
                  )}
                  
                  {/* 修正中のローディング表示 */}
                  {isFixing && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-6">
                      <div className="flex items-center gap-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <div>
                          <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200">
                            {fixingProgress || '修正中...'}
                          </h3>
                          <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                            しばらくお待ちください...
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* 検証問題セレクター */}
                  {showValidationSelector && validationResult && !isFixing && (
                    <ValidationIssueSelector
                      validationResult={validationResult}
                      onFixSelected={async (selectedIssueIds) => {
                        // 選択された問題を修正
                        await handleFixSelectedIssues(selectedIssueIds)
                      }}
                      onFixAll={async () => {
                        // すべての問題を修正
                        await handleFixAllIssues()
                      }}
                      onDismiss={() => {
                        setShowValidationSelector(false)
                      }}
                    />
                  )}
                  
                  {/* 本文（検証セレクターが表示されていない場合のみ） */}
                  {!showValidationSelector && (
                    <>
                      <div>
                        <h3 className="text-lg font-semibold mb-3">本文</h3>
                        <div className="prose prose-lg max-w-none dark:prose-invert">
                          <div className="font-serif text-lg leading-relaxed whitespace-pre-wrap bg-gray-50 dark:bg-gray-900 p-6 rounded-lg">
                            {pendingChapter.content}
                          </div>
                        </div>
                        <p className="text-sm text-gray-500 mt-2">
                          文字数: {countCharacters(pendingChapter.content)}文字
                        </p>
                      </div>

                      {/* 背景イベント */}
                      {pendingChapter.backgroundEvents.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold mb-3">
                            裏側で起きている出来事
                          </h3>
                          <div className="space-y-2">
                            {pendingChapter.backgroundEvents.map((event, index) => (
                              <div key={event.id} className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
                                <p className="text-sm">{event.description}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  影響: {event.impact} | 可視性: {event.visibility}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 状態情報 */}
                      <div>
                        <h3 className="text-lg font-semibold mb-3">章の状態</h3>
                        <dl className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <dt className="text-gray-500">時間</dt>
                            <dd className="font-medium">{pendingChapter.state.time || '未設定'}</dd>
                          </div>
                          <div>
                            <dt className="text-gray-500">場所</dt>
                            <dd className="font-medium">{pendingChapter.state.location || '未設定'}</dd>
                          </div>
                        </dl>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-between">
                <Button
                  variant="danger"
                  onClick={() => {
                    if (window.confirm('この章を破棄してもよろしいですか？')) {
                      setPendingChapter(null)
                      setShowChapterPreview(false)
                      setIsExecuting(false)
                      setValidationResult(null)
                      setShowValidationSelector(false)
                    }
                  }}
                >
                  破棄して再生成
                </Button>
                <div className="flex gap-3">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      if (pendingChapter) {
                        // 編集ページへ移動する前に保存
                        // 重複チェック：同じ番号の章がないか確認
                        const existingChapterIndex = chapters.findIndex(ch => ch.number === pendingChapter.number)
                        let updatedChapters
                        if (existingChapterIndex >= 0) {
                          // 既存の章を更新
                          updatedChapters = [...chapters]
                          updatedChapters[existingChapterIndex] = pendingChapter
                        } else {
                          // 新規追加
                          updatedChapters = [...chapters, pendingChapter]
                        }
                        setChapters(updatedChapters)
                        localStorage.setItem(`shinwa-chapters-${projectId}`, JSON.stringify(updatedChapters))
                        setShowChapterPreview(false)
                        setPendingChapter(null)
                        setIsExecuting(false)
                        setValidationResult(null)
                        
                        // デバッグ: 編集保存後の章リストを確認
                        console.log('Saved chapters (edit):', updatedChapters)
                        console.log('Chapter numbers after save (edit):', updatedChapters.map(ch => ch.number))
                        
                        router.push(`/projects/${projectId}/chapters/${pendingChapter.id}`)
                      }
                    }}
                  >
                    編集して保存
                  </Button>
                  <Button
                    onClick={() => {
                      if (pendingChapter) {
                        // 重複チェック：同じ番号の章がないか確認
                        const existingChapterIndex = chapters.findIndex(ch => ch.number === pendingChapter.number)
                        let updatedChapters
                        if (existingChapterIndex >= 0) {
                          // 既存の章を更新
                          updatedChapters = [...chapters]
                          updatedChapters[existingChapterIndex] = pendingChapter
                        } else {
                          // 新規追加
                          updatedChapters = [...chapters, pendingChapter]
                        }
                        setChapters(updatedChapters)
                        localStorage.setItem(`shinwa-chapters-${projectId}`, JSON.stringify(updatedChapters))
                        setShowChapterPreview(false)
                        setPendingChapter(null)
                        setIsExecuting(false)
                        setValidationResult(null)
                        setExecutionLog(prev => [...prev, '章を保存しました。'])
                        
                        // デバッグ: 保存後の章リストを確認
                        console.log('Saved chapters:', updatedChapters)
                        console.log('Chapter numbers after save:', updatedChapters.map(ch => ch.number))
                        
                        // 保存後に章リストを再読み込み（念のため）
                        setTimeout(() => {
                          loadChapters()
                        }, 100)
                      }
                    }}
                  >
                    保存して次へ
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* AI設定モーダル */}
        <AISettings
          isOpen={showAISettings}
          onClose={() => setShowAISettings(false)}
          onSave={handleAISettingsSave}
        />
        
        {/* 高度なAI設定モーダル */}
        <AdvancedAISettings
          isOpen={showAdvancedAISettings}
          onClose={() => setShowAdvancedAISettings(false)}
          projectId={projectId}
        />

        {/* 使用制限警告モーダル */}
        {showUsageWarning && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full m-4 p-6">
              <h2 className="text-xl font-bold mb-4 text-red-600">
                使用制限に達しました
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-6">
                無料プランでは月間10回までAI章生成が可能です。
                今月の制限に達しました。
              </p>
              <div className="space-y-4 mb-6">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <h3 className="font-semibold mb-2">有料プランの特典</h3>
                  <ul className="text-sm space-y-1 text-gray-700 dark:text-gray-300">
                    <li>✓ 無制限のAI章生成</li>
                    <li>✓ 高度な執筆機能</li>
                    <li>✓ 優先サポート</li>
                  </ul>
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setShowUsageWarning(false)}
                  className="flex-1"
                >
                  閉じる
                </Button>
                <Link href="/account" className="flex-1">
                  <Button className="w-full">
                    プランをアップグレード
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}