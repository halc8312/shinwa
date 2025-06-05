import { 
  ChapterStructure, 
  ChapterOutline, 
  StoryStructure, 
  Act,
  TensionPoint,
  NovelTypeConfig,
  WritingRules,
  WorldSettings,
  Character 
} from '../types'
import { aiManager } from '../ai/manager'
import { AIMessage } from '../ai/types'
import { getFeatureModelSettings } from '../utils/ai-settings'
import { generateId } from '../utils'
import { STORY_STRUCTURE_TEMPLATES } from '../config/novel-types'

export class ChapterStructureService {
  private projectId: string
  
  constructor(projectId: string) {
    this.projectId = projectId
  }

  /**
   * AIを使用して章立てを生成
   */
  async generateChapterStructure(params: {
    projectName: string
    description: string
    genre: string
    themes: string[]
    novelType: NovelTypeConfig
    structureType: StoryStructure['type']
    plotOutline?: string
  }): Promise<ChapterStructure> {
    const modelSettings = getFeatureModelSettings(this.projectId, 'chapterPlanning')
    const template = STORY_STRUCTURE_TEMPLATES[params.structureType]
    
    // プロジェクトの関連データを読み込む
    const projectData = await this.loadProjectData()
    
    // 章数の決定
    const chapterCount = this.calculateChapterCount(params.novelType)
    
    // 幕構成の作成
    const acts = this.createActs(template, chapterCount)
    
    // AIプロンプトの構築
    const messages: AIMessage[] = [
      {
        role: 'system',
        content: this.buildSystemPrompt(params.genre, params.structureType, projectData.writingRules)
      },
      {
        role: 'user',
        content: this.buildUserPrompt(params, acts, chapterCount, projectData)
      }
    ]
    
    try {
      const response = await aiManager.complete({
        model: modelSettings.model,
        messages,
        temperature: modelSettings.temperature,
        maxTokens: modelSettings.maxTokens
      })
      
      const chapters = this.parseChapterOutlines(response.content, chapterCount)
      const tensionCurve = this.generateTensionCurve(chapters)
      
      return {
        totalChapters: chapterCount,
        structure: {
          type: params.structureType,
          acts
        },
        chapters,
        tensionCurve
      }
    } catch (error) {
      console.error('Failed to generate chapter structure:', error)
      // フォールバック：基本的な章立てを生成
      return this.createFallbackStructure(params.novelType, params.structureType)
    }
  }

  /**
   * 章立ての更新
   */
  async updateChapterOutline(
    chapterStructure: ChapterStructure, 
    chapterNumber: number, 
    updates: Partial<ChapterOutline>
  ): Promise<ChapterStructure> {
    const chapterIndex = chapterStructure.chapters.findIndex(ch => ch.number === chapterNumber)
    if (chapterIndex === -1) return chapterStructure
    
    const updatedChapters = [...chapterStructure.chapters]
    updatedChapters[chapterIndex] = {
      ...updatedChapters[chapterIndex],
      ...updates
    }
    
    // テンション曲線を再計算
    const tensionCurve = this.generateTensionCurve(updatedChapters)
    
    return {
      ...chapterStructure,
      chapters: updatedChapters,
      tensionCurve
    }
  }

  /**
   * 章の追加
   */
  addChapter(
    chapterStructure: ChapterStructure,
    afterChapter: number,
    outline: Omit<ChapterOutline, 'number'>
  ): ChapterStructure {
    const newChapters = [...chapterStructure.chapters]
    
    // 章番号を調整
    newChapters.forEach(ch => {
      if (ch.number > afterChapter) {
        ch.number += 1
      }
    })
    
    // 新しい章を挿入
    const newChapter: ChapterOutline = {
      ...outline,
      number: afterChapter + 1
    }
    
    newChapters.splice(afterChapter, 0, newChapter)
    
    // 幕構成を調整
    const acts = this.adjustActs(chapterStructure.structure.acts, afterChapter + 1, 1)
    
    return {
      totalChapters: newChapters.length,
      structure: {
        ...chapterStructure.structure,
        acts
      },
      chapters: newChapters,
      tensionCurve: this.generateTensionCurve(newChapters)
    }
  }

  /**
   * プロジェクトデータの読み込み
   */
  private async loadProjectData(): Promise<{
    writingRules?: WritingRules
    worldSettings?: WorldSettings
    characters?: Character[]
  }> {
    const writingRules = this.loadWritingRules()
    const worldSettings = this.loadWorldSettings()
    const characters = this.loadCharacters()
    
    return { writingRules, worldSettings, characters }
  }
  
  private loadWritingRules(): WritingRules | undefined {
    const stored = localStorage.getItem(`shinwa-rules-${this.projectId}`)
    if (stored) {
      try {
        return JSON.parse(stored)
      } catch (error) {
        console.error('Failed to load writing rules:', error)
      }
    }
    return undefined
  }
  
  private loadWorldSettings(): WorldSettings | undefined {
    const stored = localStorage.getItem(`shinwa-world-${this.projectId}`)
    if (stored) {
      try {
        return JSON.parse(stored)
      } catch (error) {
        console.error('Failed to load world settings:', error)
      }
    }
    return undefined
  }
  
  private loadCharacters(): Character[] | undefined {
    const stored = localStorage.getItem(`shinwa-characters-${this.projectId}`)
    if (stored) {
      try {
        return JSON.parse(stored)
      } catch (error) {
        console.error('Failed to load characters:', error)
      }
    }
    return undefined
  }

  /**
   * システムプロンプトの構築
   */
  private buildSystemPrompt(genre: string, structureType: string, writingRules?: WritingRules): string {
    const template = STORY_STRUCTURE_TEMPLATES[structureType]
    
    let prompt = `あなたは${genre}小説の構成を専門とする編集者です。
${template.name}（${template.description}）に基づいて、魅力的で詳細な章立てを作成してください。

`

    if (writingRules) {
      prompt += `【執筆ルール】
`
      if (writingRules.pointOfView) prompt += `視点: ${writingRules.pointOfView}\n`
      if (writingRules.tense) prompt += `時制: ${writingRules.tense}\n`
      if (writingRules.style) prompt += `文体: ${writingRules.style}\n`
      prompt += '\n'
    }

    prompt += `各章について以下の要素を含めてください：
1. 章のタイトル（内容を表す具体的なタイトル）
2. 章の目的（その章で達成すべきこと）
3. 主要な出来事（3-5個の具体的な出来事）
4. コンフリクト（葛藤や障害）
5. 解決または次章への引き
6. テンションレベル（1-10）
7. 登場キャラクター（charactersInvolved: キャラクターIDの配列）
8. 場所（location: 具体的な場所）
9. 時間（time: 時間帯や経過時間）
10. 伏線の設置と回収計画

伏線について：
- 短期伏線（1-3章で回収）: キャラクターの秘密、小さな謎
- 中期伏線（4-10章で回収）: 重要な出来事の予兆、関係性の変化
- 長期伏線（11章以上で回収）: 物語の核心に関わる謎、最終的な解決への鍵

物語全体の緩急とペースを考慮し、伏線の設置と回収を計画的に行い、読者を引き込む構成を心がけてください。`
    
    return prompt
  }

  /**
   * ユーザープロンプトの構築
   */
  private buildUserPrompt(
    params: any,
    acts: Act[],
    chapterCount: number,
    projectData: { writingRules?: WritingRules, worldSettings?: WorldSettings, characters?: Character[] }
  ): string {
    let prompt = `
【作品情報】
タイトル: ${params.projectName}
説明: ${params.description}
ジャンル: ${params.genre}
テーマ: ${params.themes.join('、')}
小説タイプ: ${params.novelType.name}（${params.novelType.wordCountRange.min}〜${params.novelType.wordCountRange.max}字）
総章数: ${chapterCount}章

【プロット概要】
${params.plotOutline || '（未設定）'}
`

    // 世界観設定を追加
    if (projectData.worldSettings) {
      prompt += `\n【世界観設定】
世界名: ${projectData.worldSettings.name}
時代: ${projectData.worldSettings.era}
${projectData.worldSettings.description ? `説明: ${projectData.worldSettings.description}` : ''}
`
    }

    // キャラクター情報を追加
    if (projectData.characters && projectData.characters.length > 0) {
      prompt += `\n【主要キャラクター】
`
      projectData.characters.forEach(char => {
        const roleText = char.role ? `（${char.role}）` : ''
        const backgroundText = char.background ? ` - ${char.background}` : ''
        prompt += `・${char.name}${roleText} [ID: ${char.id}]: ${char.personality?.join('、') || ''}${backgroundText}\n`
      })
    }

    prompt += `
【幕構成】
${acts.map(act => `${act.name}（第${act.startChapter}章〜第${act.endChapter}章）: ${act.purpose}`).join('\n')}

上記の情報を基に、${chapterCount}章の詳細な章立てを作成してください。
キャラクターの成長や関係性の変化、世界観の深化、伏線の計画的な配置を考慮してください。

各章について、以下の形式のJSON配列で出力してください：

\`\`\`json
[
  {
    "number": 1,
    "title": "具体的な章タイトル（例：嵐の夜の出会い、約束の地へ）",
    "purpose": "この章の目的",
    "keyEvents": ["出来事1", "出来事2", "出来事3"],
    "conflict": "この章の葛藤や障害",
    "resolution": "解決または次への展開",
    "hook": "次章への引き",
    "tensionLevel": 5,
    "charactersInvolved": ["キャラクターID1", "キャラクターID2"],
    "location": "具体的な場所",
    "time": "時間帯または経過時間",
    "foreshadowingToPlant": [
      {
        "hint": "伏線の内容",
        "scope": "short/medium/long",
        "significance": "minor/moderate/major",
        "plannedRevealChapter": 5,
        "category": "character/plot/world/mystery"
      }
    ],
    "foreshadowingToReveal": ["回収する伏線のヒント"],
    "notes": "執筆時の注意点（省略可）"
  }
]
\`\`\`

重要：
- titleフィールドには「第X章」ではなく、内容を表す具体的なタイトルを入れてください
- charactersInvolvedには、上記で示したキャラクターIDを使用してください
- 伏線は物語全体のバランスを考えて配置してください
- 短期伏線は頻繁に、長期伏線は慎重に設置してください
`
    return prompt
  }

  /**
   * 章数の計算
   */
  private calculateChapterCount(novelType: NovelTypeConfig): number {
    const { chapterCountRange, averageChapterLength, wordCountRange } = novelType
    
    // 目標文字数から章数を推定
    const targetWordCount = (wordCountRange.min + wordCountRange.max) / 2
    const estimatedChapters = Math.round(targetWordCount / averageChapterLength)
    
    // 範囲内に収める
    return Math.max(
      chapterCountRange.min,
      Math.min(chapterCountRange.max, estimatedChapters)
    )
  }

  /**
   * 幕構成の作成
   */
  private createActs(template: any, totalChapters: number): Act[] {
    const acts: Act[] = []
    let currentChapter = 1
    
    template.actTemplates.forEach((actTemplate: any, index: number) => {
      const chaptersInAct = Math.round((actTemplate.percentageOfStory / 100) * totalChapters)
      const endChapter = Math.min(currentChapter + chaptersInAct - 1, totalChapters)
      
      acts.push({
        id: generateId(),
        name: actTemplate.name,
        description: actTemplate.description,
        startChapter: currentChapter,
        endChapter: endChapter,
        purpose: actTemplate.purpose,
        keyEvents: actTemplate.keyEvents
      })
      
      currentChapter = endChapter + 1
    })
    
    // 最後の幕を調整
    if (acts.length > 0) {
      acts[acts.length - 1].endChapter = totalChapters
    }
    
    return acts
  }

  /**
   * レスポンスから章立てを解析
   */
  private parseChapterOutlines(content: string, expectedCount: number): ChapterOutline[] {
    try {
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1])
        if (Array.isArray(parsed)) {
          return parsed.slice(0, expectedCount).map((ch, index) => ({
            number: ch.number || index + 1,
            title: ch.title && ch.title !== `第${index + 1}章` ? ch.title : '',
            purpose: ch.purpose || '',
            keyEvents: ch.keyEvents || [],
            conflict: ch.conflict,
            resolution: ch.resolution,
            hook: ch.hook,
            targetWordCount: ch.targetWordCount,
            tensionLevel: ch.tensionLevel || 5,
            notes: ch.notes,
            // 新しいフィールド
            charactersInvolved: ch.charactersInvolved || [],
            location: ch.location,
            time: ch.time,
            foreshadowingToPlant: ch.foreshadowingToPlant || [],
            foreshadowingToReveal: ch.foreshadowingToReveal || []
          }))
        }
      }
    } catch (error) {
      console.error('Failed to parse chapter outlines:', error)
    }
    
    // フォールバック: 基本的な章構成を生成
    return Array.from({ length: expectedCount }, (_, i) => {
      const chapterNum = i + 1
      const progress = i / (expectedCount - 1)
      
      // 章の位置に応じてテンションと目的を設定
      let tensionLevel = 5
      let purpose = '物語を展開する'
      let keyEvents: string[] = []
      
      if (progress <= 0.25) {
        // 序盤
        tensionLevel = 3 + Math.floor(progress * 8)
        purpose = '物語の導入と設定を行う'
        keyEvents = ['キャラクター紹介', '世界観の提示']
      } else if (progress <= 0.75) {
        // 中盤
        tensionLevel = 5 + Math.floor((progress - 0.25) * 6)
        purpose = '対立と葛藤を深める'
        keyEvents = ['新たな展開', '障害の発生']
      } else {
        // 終盤
        tensionLevel = 8 + Math.floor((progress - 0.75) * 8)
        purpose = 'クライマックスへ向けて展開する'
        keyEvents = ['最終局面', '解決への道筋']
      }
      
      return {
        number: chapterNum,
        title: '',
        purpose,
        keyEvents,
        tensionLevel: Math.max(1, Math.min(10, tensionLevel))
      }
    })
  }

  /**
   * テンション曲線の生成
   */
  private generateTensionCurve(chapters: ChapterOutline[]): TensionPoint[] {
    return chapters.map(ch => {
      const tension = (ch.tensionLevel || 5) * 10
      let type: TensionPoint['type'] = 'rising'
      
      if (tension <= 30) type = 'calm'
      else if (tension >= 80) type = 'peak'
      else if (ch.number > 1 && chapters[ch.number - 2]?.tensionLevel > ch.tensionLevel) {
        type = 'falling'
      }
      
      return {
        chapter: ch.number,
        tension,
        type
      }
    })
  }

  /**
   * 幕構成の調整
   */
  private adjustActs(acts: Act[], insertedChapter: number, count: number): Act[] {
    return acts.map(act => {
      if (act.endChapter >= insertedChapter) {
        return {
          ...act,
          endChapter: act.endChapter + count
        }
      }
      return act
    })
  }

  /**
   * フォールバック構造の作成
   */
  private createFallbackStructure(
    novelType: NovelTypeConfig,
    structureType: StoryStructure['type']
  ): ChapterStructure {
    const chapterCount = novelType.chapterCountRange.min
    const template = STORY_STRUCTURE_TEMPLATES[structureType]
    const acts = this.createActs(template, chapterCount)
    
    // 各章に適切なテンションと目的を設定
    const chapters: ChapterOutline[] = Array.from({ length: chapterCount }, (_, i) => {
      const chapterNum = i + 1
      
      // どの幕に属するか判定
      const act = acts.find(a => chapterNum >= a.startChapter && chapterNum <= a.endChapter)
      const actIndex = acts.findIndex(a => a === act)
      
      // 幕に応じたテンションレベルを設定
      let tensionLevel = 5
      let purpose = '物語を展開する'
      let keyEvents = ['出来事1', '出来事2']
      
      if (structureType === 'three-act') {
        if (actIndex === 0) { // 第一幕
          tensionLevel = 3 + Math.floor((chapterNum - act!.startChapter) / (act!.endChapter - act!.startChapter + 1) * 3)
          purpose = '設定と導入を行う'
          keyEvents = ['キャラクター紹介', '世界観の提示', '事件の予兆']
        } else if (actIndex === 1) { // 第二幕
          const progress = (chapterNum - act!.startChapter) / (act!.endChapter - act!.startChapter + 1)
          tensionLevel = 5 + Math.floor(progress * 3)
          purpose = '葛藤と成長を描く'
          keyEvents = ['試練に直面', '仲間との協力', '新たな発見']
        } else { // 第三幕
          tensionLevel = 8 + Math.floor((chapterNum - act!.startChapter) / (act!.endChapter - act!.startChapter + 1) * 2)
          purpose = 'クライマックスと解決を描く'
          keyEvents = ['最終対決', '伏線回収', '結末への道']
        }
      } else if (structureType === 'four-act') {
        if (actIndex === 0) { // 起
          tensionLevel = 2 + Math.floor((chapterNum - 1) * 2)
          purpose = '物語の導入と世界観の確立'
        } else if (actIndex === 1) { // 承
          tensionLevel = 4 + Math.floor((chapterNum - act!.startChapter) * 1.5)
          purpose = '事件の展開と問題の深化'
        } else if (actIndex === 2) { // 転
          tensionLevel = 7 + Math.floor((chapterNum - act!.startChapter) * 1)
          purpose = '転換点と最大の危機'
        } else { // 結
          tensionLevel = 8 - Math.floor((chapterNum - act!.startChapter) * 2)
          purpose = '解決と新たな日常'
        }
      } else { // hero-journey
        const totalProgress = (chapterNum - 1) / (chapterCount - 1)
        tensionLevel = Math.floor(3 + totalProgress * 5 + Math.sin(totalProgress * Math.PI) * 2)
        if (actIndex === 0) purpose = '冒険への旅立ち'
        else if (actIndex === 1) purpose = '試練と成長'
        else if (actIndex === 2) purpose = '帰還と変化'
        else purpose = '新たな世界での生活'
      }
      
      return {
        number: chapterNum,
        title: '',
        purpose,
        keyEvents,
        tensionLevel: Math.max(1, Math.min(10, tensionLevel))
      }
    })
    
    return {
      totalChapters: chapterCount,
      structure: {
        type: structureType,
        acts
      },
      chapters,
      tensionCurve: this.generateTensionCurve(chapters)
    }
  }

  /**
   * 章立てを保存
   */
  saveChapterStructure(projectId: string, structure: ChapterStructure): void {
    localStorage.setItem(`shinwa-chapter-structure-${projectId}`, JSON.stringify(structure))
  }

  /**
   * 章立てを読み込み
   */
  loadChapterStructure(projectId: string): ChapterStructure | null {
    const stored = localStorage.getItem(`shinwa-chapter-structure-${projectId}`)
    if (stored) {
      try {
        return JSON.parse(stored)
      } catch (error) {
        console.error('Failed to load chapter structure:', error)
      }
    }
    return null
  }
}

export const chapterStructureService = new ChapterStructureService('')