'use client'

import { useState } from 'react'
import { Chapter, Character, WritingRules, WorldSettings } from '@/lib/types'
import { aiManager } from '@/lib/ai/manager'
import { useAppStore } from '@/lib/store'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import { getFeatureModelSettings } from '@/lib/utils/ai-settings'

interface AIAssistantProps {
  projectId: string
  projectName: string
  chapters: Chapter[]
  characters: Character[]
  worldSettings: WorldSettings | null
  writingRules: WritingRules | null
}

type AssistantMode = 
  | 'plot-suggestion'
  | 'character-development' 
  | 'foreshadowing-check'
  | 'consistency-check'
  | 'next-chapter-ideas'
  | 'tension-analysis'

export default function AIAssistant({
  projectId,
  projectName,
  chapters,
  characters,
  worldSettings,
  writingRules
}: AIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [mode, setMode] = useState<AssistantMode>('next-chapter-ideas')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<string>('')
  const [error, setError] = useState<string>('')

  const { currentProvider } = useAppStore()

  const modeOptions = [
    { value: 'next-chapter-ideas', label: '🎯 次章のアイデア提案' },
    { value: 'plot-suggestion', label: '📚 プロット展開の提案' },
    { value: 'character-development', label: '👥 キャラクター成長の提案' },
    { value: 'foreshadowing-check', label: '🕸️ 伏線の整合性チェック' },
    { value: 'consistency-check', label: '✅ 一貫性チェック' },
    { value: 'tension-analysis', label: '📈 テンション分析と改善案' }
  ]

  const performAnalysis = async () => {
    if (!currentProvider) {
      setError('AIプロバイダーが設定されていません')
      return
    }

    setIsAnalyzing(true)
    setError('')
    setAnalysis('')

    try {
      const systemPrompt = buildSystemPrompt(mode)
      const userPrompt = buildUserPrompt(mode)
      
      // AIアシスタント用のモデル設定を取得
      const modelSettings = getFeatureModelSettings(projectId, 'assistant')

      const response = await aiManager.complete({
        model: modelSettings.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: modelSettings.temperature,
        maxTokens: modelSettings.maxTokens
      })

      setAnalysis(response.content)
    } catch (err: any) {
      setError(err.message || 'AI分析に失敗しました')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const buildSystemPrompt = (mode: AssistantMode): string => {
    const basePrompt = `あなたは「${projectName}」という小説の執筆アシスタントです。
この作品は${chapters.length}章まで執筆されており、${characters.length}人のキャラクターが登場します。`

    switch (mode) {
      case 'next-chapter-ideas':
        return `${basePrompt}
最新の章の内容と全体の流れを分析し、次章で展開すべきアイデアを提案してください。
未解決のプロット、キャラクターの成長、伏線の処理などを考慮してください。`

      case 'plot-suggestion':
        return `${basePrompt}
現在のプロットの進行状況を分析し、物語をより魅力的にする展開を提案してください。
読者の期待を裏切りつつも納得感のある展開を心がけてください。`

      case 'character-development':
        return `${basePrompt}
各キャラクターの現在の成長段階を分析し、今後の成長の方向性を提案してください。
キャラクターアークの完成に向けて必要な出来事や変化を具体的に提示してください。`

      case 'foreshadowing-check':
        return `${basePrompt}
設置された伏線の管理状況を分析し、回収の優先順位や方法を提案してください。
長期間放置されている伏線や、相互に関連する伏線の効果的な処理方法を提示してください。`

      case 'consistency-check':
        return `${basePrompt}
物語全体の一貫性を分析し、矛盾や不整合を指摘してください。
キャラクターの行動、世界観、時系列、因果関係などの観点から検証してください。`

      case 'tension-analysis':
        return `${basePrompt}
物語のテンション曲線を分析し、改善点を提案してください。
読者の興味を維持し、適切なペースで物語を展開するための具体的な方法を提示してください。`

      default:
        return basePrompt
    }
  }

  const buildUserPrompt = (mode: AssistantMode): string => {
    // 最新章の情報
    const latestChapter = chapters[chapters.length - 1]
    const recentChapters = chapters.slice(-3)

    // 未回収の伏線
    const unrevealedForeshadowing = chapters
      .flatMap(ch => ch.state.foreshadowing || [])
      .filter(f => f.status === 'planted')

    // 進行中のプロット
    const ongoingPlots = chapters
      .flatMap(ch => ch.state.plotProgress || [])
      .filter(p => !p.resolved)

    const contextInfo = `
【最新章の情報】
章番号: 第${latestChapter?.number}章
タイトル: ${latestChapter?.title}
現在地: ${latestChapter?.state.location}
時間: ${latestChapter?.state.time}
登場キャラクター: ${latestChapter?.state.charactersPresent?.map(id => 
  characters.find(c => c.id === id)?.name
).filter(Boolean).join('、')}

【未回収の伏線】
${unrevealedForeshadowing.map(f => `- ${f.hint}`).join('\n')}

【進行中のプロット】
${ongoingPlots.map(p => `- ${p.description}`).join('\n')}

【世界観】
${worldSettings ? `${worldSettings.name} - ${worldSettings.era}` : '未設定'}

【執筆ルール】
視点: ${writingRules?.pov || '未設定'}
時制: ${writingRules?.tense || '未設定'}
文体: ${writingRules?.style || '未設定'}
`

    switch (mode) {
      case 'next-chapter-ideas':
        return `${contextInfo}

最近の章の内容:
${recentChapters.map(ch => `第${ch.number}章「${ch.title}」: ${ch.summary || ch.content.substring(0, 100)}`).join('\n')}

上記の情報を基に、次章（第${chapters.length + 1}章）のアイデアを3-5個提案してください。`

      case 'character-development':
        const characterInfo = characters.map(c => {
          const lastAppearance = chapters
            .filter(ch => ch.state.charactersPresent?.includes(c.id))
            .slice(-1)[0]
          return `${c.name}: ${c.role}、最終登場: 第${lastAppearance?.number || 0}章`
        }).join('\n')

        return `${contextInfo}

【キャラクター情報】
${characterInfo}

各キャラクターの成長段階を分析し、今後の展開を提案してください。`

      default:
        return contextInfo + '\n\n上記の情報を基に分析を行ってください。'
    }
  }

  return (
    <>
      {/* フローティングボタン */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-8 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110"
        title="AI執筆アシスタント"
      >
        <span className="text-2xl">🤖</span>
      </button>

      {/* AIアシスタントパネル */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            {/* ヘッダー */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">
                  🤖 AI執筆アシスタント
                </h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  ✕
                </button>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                作品の分析と執筆支援を行います
              </p>
            </div>

            {/* コンテンツ */}
            <div className="p-6 flex-1 overflow-y-auto">
              <div className="space-y-6">
                {/* モード選択 */}
                <div>
                  <Select
                    label="分析モード"
                    value={mode}
                    onChange={(e) => setMode(e.target.value as AssistantMode)}
                    options={modeOptions}
                  />
                </div>

                {/* 分析ボタン */}
                <div className="flex justify-center">
                  <Button
                    onClick={performAnalysis}
                    disabled={isAnalyzing}
                    className="px-8"
                  >
                    {isAnalyzing ? '分析中...' : '分析を開始'}
                  </Button>
                </div>

                {/* エラー表示 */}
                {error && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <p className="text-red-700 dark:text-red-300">{error}</p>
                  </div>
                )}

                {/* 分析結果 */}
                {analysis && (
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
                    <h3 className="font-semibold mb-3">分析結果</h3>
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <div className="whitespace-pre-wrap">{analysis}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* フッター */}
            <div className="p-6 border-t border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-500">
                  {/* モデル情報は動的に取得 */}
                  現在のモデル: {getFeatureModelSettings(projectId, 'assistant').model}
                </p>
                <Button
                  variant="secondary"
                  onClick={() => setIsOpen(false)}
                >
                  閉じる
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}