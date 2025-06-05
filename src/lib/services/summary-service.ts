import { Chapter, BackgroundEvent } from '../types'
import { aiManager } from '../ai/manager'
import { AIMessage } from '../ai/types'
import { getFeatureModelSettings } from '../utils/ai-settings'

export class SummaryService {
  private projectId: string
  private modelId: string

  constructor(projectId: string, modelId?: string) {
    this.projectId = projectId
    // モデルが指定されていない場合は、要約用の設定を使用
    const modelSettings = getFeatureModelSettings(projectId, 'summarization')
    this.modelId = modelId || modelSettings.model
  }

  /**
   * 章の要約を生成
   */
  async generateChapterSummary(chapter: Chapter): Promise<string> {
    const messages: AIMessage[] = [
      {
        role: 'system',
        content: `あなたは小説の要約を作成する専門家です。
与えられた章の内容を簡潔に要約してください。
要約には以下の要素を含めてください：
- 主要な出来事（3-5個）
- キャラクターの重要な行動や決定
- 物語の進行における重要な変化
- 新たに設置された伏線（あれば）
- 解決された問題（あれば）

要約は200-300文字程度でまとめてください。`
      },
      {
        role: 'user',
        content: `第${chapter.number}章「${chapter.title}」の内容：\n\n${chapter.content}`
      }
    ]

    try {
      const modelSettings = getFeatureModelSettings(this.projectId, 'summarization')
      const response = await aiManager.complete({
        model: this.modelId,
        messages,
        temperature: modelSettings.temperature,
        maxTokens: modelSettings.maxTokens
      })

      return response.content
    } catch (error) {
      console.error('Failed to generate chapter summary:', error)
      // フォールバック: 最初の200文字を返す
      return chapter.content.substring(0, 200) + '...'
    }
  }

  /**
   * 背景イベントの重要度を評価
   */
  async evaluateBackgroundEvents(events: BackgroundEvent[], context: {
    genre?: string
    currentChapterNumber: number
    plotSummary?: string
  }): Promise<BackgroundEvent[]> {
    if (events.length === 0) return []

    const messages: AIMessage[] = [
      {
        role: 'system',
        content: `あなたは${context.genre || '小説'}の編集者です。
背景で起きている出来事の重要度を評価してください。
今後の物語展開への影響を考慮し、各イベントの重要度を再評価してください。`
      },
      {
        role: 'user',
        content: `現在第${context.currentChapterNumber}章です。
${context.plotSummary ? `物語の概要: ${context.plotSummary}\n` : ''}
以下の背景イベントの重要度を評価してください：
${events.map((e, i) => `${i + 1}. ${e.description}`).join('\n')}

各イベントについて、1（低）から10（高）の重要度スコアを付けてください。
形式: 番号:スコア（例: 1:7, 2:3）`
      }
    ]

    try {
      const modelSettings = getFeatureModelSettings(this.projectId, 'characterAnalysis')
      const response = await aiManager.complete({
        model: modelSettings.model,
        messages,
        temperature: modelSettings.temperature,
        maxTokens: modelSettings.maxTokens
      })

      // レスポンスを解析してスコアを抽出
      const scores = new Map<number, number>()
      const matches = response.content.matchAll(/(\d+):(\d+)/g)
      for (const match of matches) {
        scores.set(parseInt(match[1]) - 1, parseInt(match[2]))
      }

      // スコアに基づいてimpactを更新
      return events.map((event, index) => {
        const score = scores.get(index) || 5
        let impact: 'low' | 'medium' | 'high' = 'medium'
        if (score <= 3) impact = 'low'
        else if (score >= 7) impact = 'high'
        
        return { ...event, impact }
      })
    } catch (error) {
      console.error('Failed to evaluate background events:', error)
      return events
    }
  }

  /**
   * 複数章の統合要約を生成
   */
  async generateMultiChapterSummary(chapters: Chapter[], maxTokens: number = 1000): Promise<string> {
    const chapterSummaries = await Promise.all(
      chapters.map(ch => this.generateChapterSummary(ch))
    )

    const messages: AIMessage[] = [
      {
        role: 'system',
        content: `複数章の要約を統合して、物語の流れがわかる総合的な要約を作成してください。
重要な出来事、キャラクターの成長、伏線の展開を中心にまとめてください。
${maxTokens / 4}文字程度でまとめてください。`
      },
      {
        role: 'user',
        content: chapterSummaries.map((summary, i) => 
          `第${chapters[i].number}章: ${summary}`
        ).join('\n\n')
      }
    ]

    try {
      const modelSettings = getFeatureModelSettings(this.projectId, 'summarization')
      const response = await aiManager.complete({
        model: this.modelId,
        messages,
        temperature: modelSettings.temperature,
        maxTokens: Math.min(maxTokens, modelSettings.maxTokens)
      })

      return response.content
    } catch (error) {
      console.error('Failed to generate multi-chapter summary:', error)
      return chapterSummaries.join('\n\n')
    }
  }
}