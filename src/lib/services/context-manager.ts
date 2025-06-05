import { Chapter, BackgroundEvent, Foreshadowing, Character, WorldSettings } from '../types'
import { AIModel, getModelById } from '../ai/models'

interface ContextWindow {
  maxTokens: number
  reservedForOutput: number
  availableForContext: number
}

interface ContextItem {
  type: 'chapter' | 'background' | 'foreshadowing' | 'character' | 'world'
  content: string
  priority: number
  estimatedTokens: number
  metadata?: any
}

export class ContextManager {
  private model: AIModel
  private contextWindow: ContextWindow

  constructor(modelId: string) {
    this.model = getModelById(modelId) || {
      id: modelId,
      name: 'Unknown',
      provider: 'openai',
      contextWindow: 8192,
      description: '',
      capabilities: []
    }
    
    // コンテキストウィンドウの計算
    this.contextWindow = {
      maxTokens: this.model.contextWindow,
      reservedForOutput: 4000, // 出力用に予約
      availableForContext: this.model.contextWindow - 4000
    }
  }

  /**
   * トークン数を推定（簡易版）
   * 日本語: 1文字 ≈ 2トークン
   * 英語: 1単語 ≈ 1.3トークン
   */
  private estimateTokens(text: string): number {
    const japaneseChars = (text.match(/[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/g) || []).length
    const englishWords = (text.match(/[a-zA-Z]+/g) || []).length
    return Math.ceil(japaneseChars * 2 + englishWords * 1.3)
  }

  /**
   * 章の要約を生成（実際はAIで生成すべきだが、ここでは簡易版）
   */
  private summarizeChapter(chapter: Chapter): string {
    const summary = chapter.summary || chapter.content.substring(0, 200) + '...'
    return `第${chapter.number}章「${chapter.title}」
時間: ${chapter.state.time || '不明'}
場所: ${chapter.state.location || '不明'}
要約: ${summary}
主要な出来事: ${chapter.state.plotProgress?.map(p => p.description).join('、') || 'なし'}`
  }

  /**
   * 背景イベントをまとめる
   */
  private summarizeBackgroundEvents(events: BackgroundEvent[]): string {
    const highImpact = events.filter(e => e.impact === 'high')
    const visible = events.filter(e => e.visibility !== 'hidden')
    
    let summary = '【重要な背景イベント】\n'
    
    // 高影響度のイベント
    if (highImpact.length > 0) {
      summary += '高影響度:\n'
      highImpact.forEach(e => {
        summary += `- ${e.description}\n`
      })
    }
    
    // 可視化されているイベント
    if (visible.length > 0) {
      summary += '\n既に示唆/明らかになったイベント:\n'
      visible.forEach(e => {
        summary += `- ${e.description} (${e.visibility})\n`
      })
    }
    
    return summary
  }

  /**
   * 執筆用のコンテキストを構築
   */
  async buildWritingContext(params: {
    currentChapterNumber: number
    chapters: Chapter[]
    characters: Character[]
    worldSettings?: WorldSettings
    projectInfo?: any
    projectMeta?: any
  }): Promise<string> {
    const { currentChapterNumber, chapters, characters, worldSettings, projectInfo, projectMeta } = params
    const contextItems: ContextItem[] = []
    
    // 1. プロジェクト基本情報（高優先度）
    if (projectInfo) {
      contextItems.push({
        type: 'world',
        content: `【作品情報】
タイトル: ${projectInfo.name}
説明: ${projectInfo.description}
ジャンル: ${projectMeta?.genre || '未設定'}`,
        priority: 10,
        estimatedTokens: 100
      })
    }

    // 2. 直近3章の詳細情報（高優先度）
    const recentChapters = chapters
      .filter(ch => ch.number >= currentChapterNumber - 3 && ch.number < currentChapterNumber)
      .sort((a, b) => b.number - a.number)
    
    recentChapters.forEach((chapter, index) => {
      const content = index === 0 
        ? `【前章の詳細】\n${chapter.content.substring(0, 1000)}...` // 直前章は詳細に
        : this.summarizeChapter(chapter) // それ以前は要約
      
      contextItems.push({
        type: 'chapter',
        content,
        priority: 9 - index,
        estimatedTokens: this.estimateTokens(content),
        metadata: { chapterNumber: chapter.number }
      })
      
      // 背景イベント
      if (chapter.backgroundEvents && chapter.backgroundEvents.length > 0) {
        const bgSummary = this.summarizeBackgroundEvents(chapter.backgroundEvents)
        contextItems.push({
          type: 'background',
          content: `【第${chapter.number}章の背景イベント】\n${bgSummary}`,
          priority: 8 - index,
          estimatedTokens: this.estimateTokens(bgSummary)
        })
      }
    })

    // 3. 未回収の伏線（中優先度）
    const unrevealedForeshadowing = chapters
      .flatMap(ch => ch.state.foreshadowing || [])
      .filter(f => f.status === 'planted' || f.status === 'reinforced')
    
    if (unrevealedForeshadowing.length > 0) {
      const foreshadowingContent = `【未回収の伏線】
${unrevealedForeshadowing.map(f => `- ${f.hint}`).join('\n')}`
      
      contextItems.push({
        type: 'foreshadowing',
        content: foreshadowingContent,
        priority: 7,
        estimatedTokens: this.estimateTokens(foreshadowingContent)
      })
    }

    // 4. 登場予定のキャラクター情報（中優先度）
    const recentCharacterIds = recentChapters
      .flatMap(ch => ch.state.charactersPresent || [])
      .filter((id, index, self) => self.indexOf(id) === index)
    
    const relevantCharacters = characters.filter(c => recentCharacterIds.includes(c.id))
    
    if (relevantCharacters.length > 0) {
      const characterInfo = `【関連キャラクター】
${relevantCharacters.map(c => `${c.name}: ${c.role}, ${c.personality}`).join('\n')}`
      
      contextItems.push({
        type: 'character',
        content: characterInfo,
        priority: 6,
        estimatedTokens: this.estimateTokens(characterInfo)
      })
    }

    // 5. 重要な過去の章（低優先度）
    const importantPastChapters = chapters
      .filter(ch => ch.number < currentChapterNumber - 3)
      .filter(ch => 
        // 重要な伏線が設置された章
        ch.state.foreshadowing?.some(f => f.status === 'planted') ||
        // 高影響度の背景イベントがある章
        ch.backgroundEvents?.some(e => e.impact === 'high')
      )
      .slice(-3) // 最大3章まで
    
    importantPastChapters.forEach(chapter => {
      const summary = this.summarizeChapter(chapter)
      contextItems.push({
        type: 'chapter',
        content: `【重要な過去の章】\n${summary}`,
        priority: 3,
        estimatedTokens: this.estimateTokens(summary)
      })
    })

    // 優先度順にソートし、トークン制限内で選択
    contextItems.sort((a, b) => b.priority - a.priority)
    
    let totalTokens = 0
    const selectedItems: string[] = []
    
    for (const item of contextItems) {
      if (totalTokens + item.estimatedTokens <= this.contextWindow.availableForContext) {
        selectedItems.push(item.content)
        totalTokens += item.estimatedTokens
      } else {
        console.warn(`コンテキストサイズ超過: ${item.type} をスキップ`)
      }
    }
    
    // デバッグ情報
    console.log(`コンテキスト構築完了: ${totalTokens}/${this.contextWindow.availableForContext} トークン使用`)
    
    return selectedItems.join('\n\n')
  }

  /**
   * 分析用のコンテキストを構築（より詳細な情報を含む）
   */
  async buildAnalysisContext(params: {
    chapters: Chapter[]
    characters: Character[]
    worldSettings?: WorldSettings
  }): Promise<string> {
    // 分析時はより多くの情報を含める実装
    // （省略）
    return ''
  }
}