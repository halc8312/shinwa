import { 
  ChapterStructure, 
  ChapterOutline, 
  StoryStructure, 
  Act,
  TensionPoint,
  NovelTypeConfig,
  WritingRules,
  WorldSettings,
  Character,
  AIModelSettings
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
    const baseModelSettings = getFeatureModelSettings(this.projectId, 'chapterPlanning')
    const template = params.structureType === 'custom' 
      ? null 
      : STORY_STRUCTURE_TEMPLATES[params.structureType as keyof typeof STORY_STRUCTURE_TEMPLATES]
    
    // プロジェクトの関連データを読み込む
    const projectData = await this.loadProjectData()
    
    // 章数の決定
    const chapterCount = this.calculateChapterCount(params.novelType)
    
    // 章数に応じてAI設定を調整
    const modelSettings = this.adjustModelSettingsForChapterCount(baseModelSettings, chapterCount)
    
    // 幕構成の作成
    const acts = this.createActs(template, chapterCount)
    
    // AIプロンプトの構築
    const messages: AIMessage[] = [
      {
        role: 'system',
        content: this.buildSystemPrompt(params.genre, params.structureType, projectData.writingRules, chapterCount)
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
      console.warn('Using fallback structure with enhanced project data integration')
      // フォールバック：プロジェクトデータを活用した詳細な章立てを生成
      return this.createFallbackStructure(params, chapterCount, acts, projectData)
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
  private buildSystemPrompt(genre: string, structureType: string, writingRules?: WritingRules, chapterCount?: number): string {
    const template = structureType === 'custom' 
      ? null 
      : STORY_STRUCTURE_TEMPLATES[structureType as keyof typeof STORY_STRUCTURE_TEMPLATES]
    
    let prompt = `あなたは${genre}小説の構成を専門とする編集者です。
${template ? `${template.name}（${template.description}）に基づいて` : '独自の構成で'}、魅力的で詳細な章立てを作成してください。

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

${this.getForeshadowingGuidelines(chapterCount || 10)}

物語全体の緩急とペースを考慮し、伏線の設置と回収を計画的に行い、読者を引き込む構成を心がけてください。`
    
    return prompt
  }

  /**
   * 章数に応じてモデル設定を調整
   */
  private adjustModelSettingsForChapterCount(
    baseSettings: AIModelSettings[keyof AIModelSettings],
    chapterCount: number
  ): AIModelSettings[keyof AIModelSettings] {
    // 章数に応じてトークン制限を調整
    // 各章に必要な詳細情報を考慮して、より適切なトークン数を設定
    let maxTokens = baseSettings.maxTokens
    let temperature = baseSettings.temperature
    
    if (chapterCount <= 3) {
      // 短編：少ない章数でも詳細な情報を生成できるよう十分なトークンを確保
      maxTokens = 3000  // 2000から増加
      temperature = 0.7
    } else if (chapterCount <= 10) {
      // 中編：章数に応じて適切なトークン数を設定
      maxTokens = 4500  // 3500から増加
      temperature = 0.7
    } else if (chapterCount <= 20) {
      // 長編：さらにトークンを増やす
      maxTokens = 6000  // 5000から増加
      temperature = 0.7
    } else {
      // 超長編：最大限のトークンを使用
      maxTokens = 8000
      temperature = 0.7
    }
    
    return {
      ...baseSettings,
      maxTokens,
      temperature
    }
  }

  /**
   * 章数に応じた伏線ガイドラインの生成
   */
  private getForeshadowingGuidelines(chapterCount: number): string {
    if (chapterCount <= 3) {
      // 短編小説の場合
      return `伏線について（全${chapterCount}章）：
- 即効性伏線（同章内で回収）: 読者の興味を引く小さな謎、キャラクターの発言の真意
- 短期伏線（1-2章で回収）: キャラクターの秘密、物語の核心に関わる謎
- 各章で最低1つの伏線を設置し、最終章までに全て回収してください`
    } else if (chapterCount <= 5) {
      // 短めの中編
      return `伏線について（全${chapterCount}章）：
- 即効性伏線（同章内で回収）: 場面の緊張感を高める小さな謎
- 短期伏線（1-2章で回収）: キャラクターの行動の真意、隠された事実
- 中期伏線（3-${chapterCount}章で回収）: 物語の転換点に関わる秘密、最終的な解決への鍵`
    } else if (chapterCount <= 10) {
      // 中編小説
      const midPoint = Math.floor(chapterCount / 2)
      return `伏線について（全${chapterCount}章）：
- 短期伏線（1-2章で回収）: キャラクターの小さな秘密、日常の謎
- 中期伏線（3-${midPoint}章で回収）: 重要な出来事の予兆、関係性の変化の兆し
- 長期伏線（${midPoint + 1}-${chapterCount}章で回収）: 物語の核心に関わる謎、最終的な解決への鍵`
    } else {
      // 長編小説
      const shortRange = Math.floor(chapterCount * 0.2)
      const midRange = Math.floor(chapterCount * 0.5)
      return `伏線について（全${chapterCount}章）：
- 短期伏線（1-${shortRange}章で回収）: キャラクターの秘密、小さな謎、日常的な違和感
- 中期伏線（${shortRange + 1}-${midRange}章で回収）: 重要な出来事の予兆、関係性の変化、世界観の秘密
- 長期伏線（${midRange + 1}章以上で回収）: 物語の核心に関わる謎、主人公の運命、最終的な解決への鍵
- 超長期伏線（最終章付近で回収）: 物語全体を貫く謎、読者の予想を覆す真実`
    }
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

${this.getResponseFormatInstructions(chapterCount)}
`
    return prompt
  }

  /**
   * 章数に応じたレスポンスフォーマット指示の生成
   */
  private getResponseFormatInstructions(chapterCount: number): string {
    // 章数が少ない場合は詳細な情報を求める
    if (chapterCount <= 5) {
      return `各章について、以下の形式のJSON配列で出力してください：

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
- 短期伏線は頻繁に、長期伏線は慎重に設置してください`
    } else if (chapterCount <= 10) {
      // 中編の場合はバランスを重視
      return `各章について、以下の形式のJSON配列で出力してください：

\`\`\`json
[
  {
    "number": 1,
    "title": "具体的な章タイトル",
    "purpose": "この章の目的",
    "keyEvents": ["主要イベント1", "主要イベント2", "主要イベント3"],
    "conflict": "中心的な葛藤",
    "resolution": "章の結末",
    "hook": "次章への引き",
    "tensionLevel": 5,
    "charactersInvolved": ["キャラクターID"],
    "location": "主要な場所",
    "time": "時間設定",
    "foreshadowingToPlant": [
      {
        "hint": "伏線の内容",
        "scope": "short/medium/long",
        "significance": "minor/moderate/major",
        "plannedRevealChapter": 回収予定章
      }
    ],
    "foreshadowingToReveal": ["回収する伏線"]
  }
]
\`\`\`

重要：
- 各章が物語全体における役割を明確にしてください
- テンションの緩急を意識して構成してください
- 伏線はバランスよく配置してください`
    } else {
      // 長編の場合は効率的な情報提供を求める
      return `各章について、以下の形式のJSON配列で出力してください：

\`\`\`json
[
  {
    "number": 1,
    "title": "章タイトル",
    "purpose": "章の目的（簡潔に）",
    "keyEvents": ["イベント1", "イベント2"],
    "conflict": "主要な葛藤",
    "hook": "次章への引き",
    "tensionLevel": 5,
    "charactersInvolved": ["キャラID"],
    "location": "場所",
    "time": "時間",
    "foreshadowingToPlant": [
      {
        "hint": "重要な伏線のみ",
        "scope": "medium/long",
        "plannedRevealChapter": 回収章
      }
    ]
  }
]
\`\`\`

重要：
- 長編の全体構成を意識してください
- 各幕の役割を明確にしてください
- 重要な伏線のみを記載してください`
    }
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
    
    // テンプレートが存在しない場合は空の幕構成を返す
    if (!template || !template.actTemplates) {
      return acts
    }
    
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
          // キャラクター情報を取得
          const storedCharacters = localStorage.getItem(`shinwa-characters-${this.projectId}`)
          const characters: Character[] = storedCharacters ? JSON.parse(storedCharacters) : []
          
          return parsed.slice(0, expectedCount).map((ch, index) => {
            // キャラクター名をIDに変換
            let charactersInvolved = ch.charactersInvolved || []
            if (charactersInvolved.length > 0 && characters.length > 0) {
              charactersInvolved = this.convertCharacterNamesToIds(charactersInvolved, characters)
            }
            
            return {
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
              charactersInvolved: charactersInvolved,
              location: ch.location,
              time: ch.time,
              foreshadowingToPlant: ch.foreshadowingToPlant || [],
              foreshadowingToReveal: ch.foreshadowingToReveal || []
            }
          })
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
        tensionLevel: Math.max(1, Math.min(10, tensionLevel)),
        // デフォルトの空配列を設定
        charactersInvolved: [],
        foreshadowingToPlant: [],
        foreshadowingToReveal: []
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
      else if (ch.number > 1 && (chapters[ch.number - 2]?.tensionLevel ?? 5) > (ch.tensionLevel ?? 5)) {
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
   * キャラクター名の配列をIDの配列に変換
   */
  private convertCharacterNamesToIds(charactersArray: string[], availableCharacters: Character[]): string[] {
    const convertedIds: string[] = []
    
    charactersArray.forEach(item => {
      // すでにIDの場合
      const existingCharacter = availableCharacters.find(c => c.id === item)
      if (existingCharacter) {
        convertedIds.push(item)
        return
      }
      
      // 名前で検索
      const characterByName = availableCharacters.find(c => 
        c.name.toLowerCase() === item.toLowerCase() ||
        (c.aliases && c.aliases.some(alias => alias.toLowerCase() === item.toLowerCase()))
      )
      
      if (characterByName) {
        console.log(`[ChapterStructureService] Converting character name "${item}" to ID "${characterByName.id}"`)
        convertedIds.push(characterByName.id)
      } else {
        console.warn(`[ChapterStructureService] Could not find character for "${item}"`)
        // 見つからない場合は除外（章構造では厳密にIDのみを保持）
      }
    })
    
    return convertedIds
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
   * フォールバック構造の作成（改善版）
   */
  private createFallbackStructure(
    params: {
      projectName: string
      description: string
      genre: string
      themes: string[]
      novelType: NovelTypeConfig
      structureType: StoryStructure['type']
      plotOutline?: string
    },
    chapterCount: number,
    acts: Act[],
    projectData: { writingRules?: WritingRules, worldSettings?: WorldSettings, characters?: Character[] }
  ): ChapterStructure {
    // キャラクター情報の準備
    const mainCharacters = projectData.characters || []
    const mainCharacterIds = mainCharacters.map(c => c.id)
    const worldName = projectData.worldSettings?.name || params.projectName + 'の世界'
    
    // 各章に適切なテンションと目的を設定
    const chapters: ChapterOutline[] = Array.from({ length: chapterCount }, (_, i) => {
      const chapterNum = i + 1
      const progress = (chapterNum - 1) / (chapterCount - 1)
      
      // どの幕に属するか判定
      const act = acts.find(a => chapterNum >= a.startChapter && chapterNum <= a.endChapter)
      const actIndex = acts.findIndex(a => a === act)
      
      // 章のタイトルを生成（ジャンルとテーマを考慮）
      const chapterTitle = this.generateChapterTitle(chapterNum, progress, params.genre, params.themes, act)
      
      // 幕に応じたテンションレベルを設定
      let tensionLevel = 5
      let purpose = '物語を展開する'
      let keyEvents: string[] = []
      let conflict = ''
      let resolution = ''
      let hook = ''
      
      if (params.structureType === 'three-act') {
        if (actIndex === 0) { // 第一幕
          tensionLevel = 3 + Math.floor((chapterNum - act!.startChapter) / (act!.endChapter - act!.startChapter + 1) * 3)
          purpose = mainCharacters.length > 0 
            ? `${mainCharacters[0].name}の日常と${worldName}の世界観を確立する`
            : '主人公の日常と世界観を確立する'
          keyEvents = [
            mainCharacters.length > 0 ? `${mainCharacters[0].name}の登場` : '主人公の登場',
            `${worldName}の描写`,
            '物語の発端となる出来事'
          ]
          conflict = '日常と非日常の境界'
          resolution = '冒険への第一歩'
          hook = '予期せぬ出来事の予感'
        } else if (actIndex === 1) { // 第二幕
          const actProgress = (chapterNum - act!.startChapter) / (act!.endChapter - act!.startChapter + 1)
          tensionLevel = 5 + Math.floor(actProgress * 3)
          purpose = '主人公が試練に直面し、成長の機会を得る'
          keyEvents = [
            '新たな障害の出現',
            mainCharacters.length > 1 ? `${mainCharacters[1].name}との出会い` : '重要人物との出会い',
            '力の覚醒または新たな能力の獲得'
          ]
          conflict = '内なる葛藤と外的障害'
          resolution = '一時的な勝利または敗北'
          hook = 'より大きな脅威の示唆'
        } else { // 第三幕
          tensionLevel = 8 + Math.floor((chapterNum - act!.startChapter) / (act!.endChapter - act!.startChapter + 1) * 2)
          purpose = '全ての要素が収束し、物語が結末へ向かう'
          keyEvents = [
            '最終決戦への準備',
            '伏線の回収と真実の解明',
            'クライマックスと結末'
          ]
          conflict = '最大の危機と決断'
          resolution = '物語の主題の結実'
          hook = chapterNum === chapterCount ? '' : '最後の転換点'
        }
      } else if (params.structureType === 'four-act') {
        if (actIndex === 0) { // 起
          const actProgress = (chapterNum - act!.startChapter) / (act!.endChapter - act!.startChapter + 1)
          tensionLevel = 2 + Math.floor(actProgress * 3)
          purpose = `${worldName}の日常風景と登場人物の紹介`
          keyEvents = [
            '物語世界の日常描写',
            mainCharacters[0] ? `${mainCharacters[0].name}の生活` : '主人公の生活',
            '変化の予兆',
            '最初の違和感'
          ]
          conflict = '平穏な日常に潜む違和感'
          resolution = '日常の中での小さな変化'
          hook = '何かが始まる予感'
        } else if (actIndex === 1) { // 承
          const actProgress = (chapterNum - act!.startChapter) / (act!.endChapter - act!.startChapter + 1)
          tensionLevel = 4 + Math.floor(actProgress * 2)
          purpose = '事件が動き始め、物語が本格的に展開する'
          keyEvents = [
            '事件の発生と展開',
            mainCharacters.length > 1 ? `${mainCharacters[1].name}との関係深化` : '人間関係の深化',
            '問題の複雑化',
            '新たな謎の出現'
          ]
          conflict = '予想外の展開と新たな問題'
          resolution = '一時的な解決と新たな謎'
          hook = 'より深い真実への手がかり'
        } else if (actIndex === 2) { // 転
          const actProgress = (chapterNum - act!.startChapter) / (act!.endChapter - act!.startChapter + 1)
          tensionLevel = 7 + Math.floor(actProgress * 2)
          purpose = '物語の転換点、最も劇的な展開'
          keyEvents = [
            '衝撃的な真実の発覚',
            '最大の危機の到来',
            mainCharacters[0] ? `${mainCharacters[0].name}の決断` : '主人公の決断',
            '全てが変わる瞬間'
          ]
          conflict = '全てを失う危機'
          resolution = '覚悟と決意'
          hook = '最終決戦への道'
        } else { // 結
          const actProgress = (chapterNum - act!.startChapter) / (act!.endChapter - act!.startChapter + 1)
          tensionLevel = Math.max(3, 9 - Math.floor(actProgress * 3))
          purpose = '全ての結末と新たな始まり'
          keyEvents = [
            '最終対決の準備',
            '伏線の回収',
            '問題の解決',
            '新たな日常への回帰'
          ]
          conflict = '最後の障害'
          resolution = '大団円へ向けて'
          hook = chapterNum === chapterCount ? '' : 'エピローグへの架橋'
        }
      } else if (params.structureType === 'hero-journey') {
        const totalProgress = (chapterNum - 1) / (chapterCount - 1)
        const actProgress = (chapterNum - act!.startChapter) / (act!.endChapter - act!.startChapter + 1)
        tensionLevel = Math.floor(3 + totalProgress * 5 + Math.sin(totalProgress * Math.PI) * 2)
        
        if (actIndex === 0) { // 出発
          purpose = mainCharacters[0] 
            ? `${mainCharacters[0].name}の日常世界から冒険への旅立ち`
            : '日常世界から冒険への旅立ち'
          keyEvents = [
            '日常世界での主人公の描写',
            '冒険への誘いと拒絶',
            '賢者との出会い',
            '第一の敷居の通過'
          ]
          conflict = '冒険への躊躇と恐れ'
          resolution = '運命を受け入れる決意'
          hook = '未知の世界への扉が開く'
        } else if (actIndex === 1) { // 試練
          purpose = '未知の世界での試練と成長'
          keyEvents = [
            mainCharacters.length > 1 ? `${mainCharacters[1].name}との出会い` : '仲間との出会い',
            '敵対者との対峙',
            '数々の試練と成長',
            '最も深い洞窟への接近'
          ]
          conflict = '最大の恐怖との対峙'
          resolution = '内なる力の発見'
          hook = '最大の試練が待ち受ける'
        } else if (actIndex === 2) { // 帰還
          purpose = mainCharacters[0]
            ? `変化した${mainCharacters[0].name}の帰還`
            : '変化した主人公の帰還'
          keyEvents = [
            '報酬を手にしての帰路',
            '追跡者からの逃走',
            '復活と最終試練',
            '二つの世界の橋渡し'
          ]
          conflict = '二つの世界の間での葛藤'
          resolution = '両世界の調和と統合'
          hook = '新たな冒険の可能性'
        } else { // 再生
          purpose = '変容を遂げた主人公の新たな生活'
          keyEvents = [
            '日常世界の新たな見方',
            mainCharacters[0] ? `${mainCharacters[0].name}の新たな役割` : '主人公の新たな役割',
            '得た知恵の共有',
            '物語の意味の結実'
          ]
          conflict = '新旧の価値観の統合'
          resolution = '完全なる変容と新生'
          hook = ''
        }
      } else { // custom or default
        purpose = `第${chapterNum}章の展開`
        keyEvents = ['重要な出来事', '展開', '次への布石']
        tensionLevel = 5 + Math.floor(progress * 3)
        conflict = '章の中心的な葛藤'
        resolution = '章の結末'
        hook = chapterNum < chapterCount ? '次章への引き' : ''
      }
      
      // 伏線の設定（章数に応じて動的に）
      const foreshadowingToPlant = this.generateForeshadowingForChapter(
        chapterNum, 
        chapterCount, 
        progress,
        params.genre,
        mainCharacters
      )
      
      // 場所と時間の設定
      const location = this.generateLocation(chapterNum, worldName, act)
      const time = this.generateTimeframe(chapterNum, progress)
      
      // キャラクターの関与（章の進行に応じて増やす）
      const charactersInvolved = this.selectCharactersForChapter(
        chapterNum,
        chapterCount,
        mainCharacterIds
      )
      
      return {
        number: chapterNum,
        title: chapterTitle,
        purpose,
        keyEvents,
        conflict,
        resolution,
        hook,
        tensionLevel: Math.max(1, Math.min(10, tensionLevel)),
        charactersInvolved,
        location,
        time,
        foreshadowingToPlant,
        foreshadowingToReveal: [] // フォールバックでは回収は設定しない
      }
    })
    
    return {
      totalChapters: chapterCount,
      structure: {
        type: params.structureType,
        acts
      },
      chapters,
      tensionCurve: this.generateTensionCurve(chapters)
    }
  }

  /**
   * 章のタイトルを生成
   */
  private generateChapterTitle(
    chapterNum: number,
    progress: number,
    genre: string,
    themes: string[],
    act?: Act
  ): string {
    const titles: { [key: string]: string[] } = {
      'ファンタジー': [
        '始まりの予兆', '運命の出会い', '試練の道', '覚醒の時', '決戦の刻',
        '新たなる旅立ち', '隠された真実', '絆の力', '最後の希望', '永遠の誓い'
      ],
      'SF': [
        '第一接触', '未知との遭遇', '時空の裂け目', '進化の兆し', '最終プロトコル',
        '新世界の扉', '量子の揺らぎ', '意識の覚醒', '特異点', '星々の彼方へ'
      ],
      'ミステリー': [
        '最初の手がかり', '消えた証拠', '第二の事件', '容疑者たち', '真相への道',
        '隠された動機', '偽りの証言', '決定的瞬間', '全ての謎が解ける時', '事件の終幕'
      ],
      'ロマンス': [
        '偶然の出会い', '心の距離', 'すれ違う想い', '告白の時', '試される愛',
        '別れの予感', '再会の約束', '永遠の誓い', '新しい朝', '二人の未来'
      ]
    }
    
    const genreTitles = titles[genre] || titles['ファンタジー']
    const index = Math.min(Math.floor(progress * genreTitles.length), genreTitles.length - 1)
    
    // テーマを考慮してタイトルをカスタマイズ
    if (themes.includes('成長')) {
      return chapterNum === 1 ? '小さな一歩' : genreTitles[index]
    } else if (themes.includes('復讐')) {
      return chapterNum === 1 ? '失われた日々' : genreTitles[index]
    }
    
    return genreTitles[index]
  }

  /**
   * 章ごとの伏線を生成
   */
  private generateForeshadowingForChapter(
    chapterNum: number,
    totalChapters: number,
    progress: number,
    genre: string,
    characters: Character[]
  ): any[] {
    const foreshadowing = []
    
    // 序盤の章では伏線を多めに設置
    if (progress < 0.3) {
      foreshadowing.push({
        hint: characters.length > 0 
          ? `${characters[0].name}の過去に関する謎めいた言及`
          : '主人公の過去に関する謎めいた言及',
        scope: totalChapters <= 5 ? 'short' : 'medium',
        significance: 'moderate',
        plannedRevealChapter: Math.min(chapterNum + Math.floor(totalChapters * 0.5), totalChapters),
        category: 'character'
      })
    }
    
    // 中盤では物語の核心に関わる伏線
    if (progress > 0.3 && progress < 0.7) {
      foreshadowing.push({
        hint: `${genre}の世界観に関わる重要な秘密`,
        scope: totalChapters <= 10 ? 'medium' : 'long',
        significance: 'major',
        plannedRevealChapter: Math.min(chapterNum + Math.floor(totalChapters * 0.3), totalChapters),
        category: 'plot'
      })
    }
    
    return foreshadowing
  }

  /**
   * 場所を生成
   */
  private generateLocation(chapterNum: number, worldName: string, act?: Act): string {
    if (!act) return worldName
    
    const locations = [
      `${worldName}の中心部`,
      `${worldName}の辺境`,
      `${worldName}の聖地`,
      `${worldName}の隠れ里`,
      `${worldName}の古代遺跡`
    ]
    
    return locations[chapterNum % locations.length]
  }

  /**
   * 時間枠を生成
   */
  private generateTimeframe(chapterNum: number, progress: number): string {
    if (progress < 0.2) return '物語の始まり'
    else if (progress < 0.4) return '数日後'
    else if (progress < 0.6) return '一週間後'
    else if (progress < 0.8) return '数週間後'
    else return '物語のクライマックス'
  }

  /**
   * 章に関与するキャラクターを選択
   */
  private selectCharactersForChapter(
    chapterNum: number,
    totalChapters: number,
    characterIds: string[]
  ): string[] {
    if (characterIds.length === 0) return []
    
    // 最初は主人公のみ
    if (chapterNum === 1) return [characterIds[0]]
    
    // 徐々にキャラクターを増やす
    const progress = (chapterNum - 1) / (totalChapters - 1)
    const numCharacters = Math.min(
      Math.ceil(progress * characterIds.length),
      characterIds.length
    )
    
    return characterIds.slice(0, numCharacters)
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