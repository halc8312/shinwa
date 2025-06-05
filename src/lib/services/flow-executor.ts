import { FlowStep, FlowContext, FlowExecutor } from './flow-engine'
import { aiManager } from '../ai/manager'
import { AIMessage } from '../ai/types'
import { 
  WritingRules, 
  WorldSettings, 
  Character, 
  Chapter,
  ChapterState,
  BackgroundEvent,
  Foreshadowing
} from '../types'
import { generateId } from '../utils'
import { RulesEngine, getProjectRulesEngine } from './rules-engine'
import { getFeatureModelSettings } from '../utils/ai-settings'

export class NovelFlowExecutor implements FlowExecutor {
  private projectId: string
  private aiModel: string
  private temperature: number
  private rulesEngine?: RulesEngine
  private availableCharacters: Character[] = []

  constructor(projectId: string, aiModel: string, temperature: number = 0.7) {
    this.projectId = projectId
    this.aiModel = aiModel
    this.temperature = temperature
  }

  async executeStep(step: FlowStep, context: FlowContext): Promise<FlowContext> {
    console.log(`Executing step: ${step.name} (${step.type})`)

    // ルールエンジンを初期化（初回のみ）
    if (!this.rulesEngine) {
      this.rulesEngine = await getProjectRulesEngine(this.projectId)
    }

    switch (step.type) {
      case 'read':
        return this.executeReadStep(step, context)
      case 'analyze':
        return this.executeAnalyzeStep(step, context)
      case 'write':
        return this.executeWriteStep(step, context)
      case 'validate':
        return this.executeValidateStep(step, context)
      case 'update':
        return this.executeUpdateStep(step, context)
      default:
        throw new Error(`Unknown step type: ${step.type}`)
    }
  }

  private async executeReadStep(step: FlowStep, context: FlowContext): Promise<FlowContext> {
    const result: FlowContext = {}

    for (const input of step.input) {
      switch (input) {
        case 'projectInfo':
          result.projectInfo = await this.loadProjectInfo()
          break
        case 'projectMeta':
          result.projectMeta = await this.loadProjectMeta()
          break
        case 'writingRules':
          result.rules = await this.loadWritingRules()
          break
        case 'worldSettings':
          result.worldSettings = await this.loadWorldSettings()
          break
        case 'characters':
          const characters = await this.loadCharacters()
          this.availableCharacters = characters
          result.characters = characters
          break
        case 'previousChapter':
          result.previousChapter = await this.loadPreviousChapter(context.chapterNumber - 1)
          break
        case 'previousState':
          result.previousState = await this.loadChapterState(context.chapterNumber - 1)
          break
      }
    }

    return result
  }

  private async executeAnalyzeStep(step: FlowStep, context: FlowContext): Promise<FlowContext> {
    // 章の計画・分析用のモデル設定を取得
    const modelSettings = getFeatureModelSettings(this.projectId, 'chapterPlanning')
    
    const messages: AIMessage[] = [
      {
        role: 'system',
        content: this.buildAnalysisSystemPrompt(step, context)
      },
      {
        role: 'user',
        content: this.buildAnalysisUserPrompt(step, context)
      }
    ]

    const response = await aiManager.complete({
      model: modelSettings.model,
      messages,
      temperature: modelSettings.temperature,
      maxTokens: modelSettings.maxTokens
    })

    return this.parseAnalysisResponse(step.id, response.content)
  }

  private async executeWriteStep(step: FlowStep, context: FlowContext): Promise<FlowContext> {
    const userPrompt = await this.buildWritingUserPrompt(step, context)
    const messages: AIMessage[] = [
      {
        role: 'system',
        content: this.buildWritingSystemPrompt(step, context)
      },
      {
        role: 'user',
        content: userPrompt
      }
    ]

    // 機能に応じたモデル設定を取得
    let modelSettings
    if (step.id === 'generate-background') {
      modelSettings = getFeatureModelSettings(this.projectId, 'backgroundEvents')
    } else if (step.id === 'write-chapter') {
      modelSettings = getFeatureModelSettings(this.projectId, 'chapterWriting')
    } else {
      // デフォルト設定を使用
      modelSettings = getFeatureModelSettings(this.projectId, 'defaultModel')
    }

    console.log(`Executing ${step.id} with model: ${modelSettings.model}, maxTokens: ${modelSettings.maxTokens}, temperature: ${modelSettings.temperature}`)

    const response = await aiManager.complete({
      model: modelSettings.model,
      messages,
      temperature: modelSettings.temperature,
      maxTokens: modelSettings.maxTokens
    })

    console.log(`${step.id} response length: ${response.content.length} characters`)

    return this.parseWritingResponse(step.id, response.content)
  }

  private async executeValidateStep(step: FlowStep, context: FlowContext): Promise<FlowContext> {
    // 検証用のモデル設定を取得
    const modelSettings = getFeatureModelSettings(this.projectId, 'validation')
    
    // ルールエンジンによるチェック
    let rulesCheckResult = { isValid: true, issues: null }
    
    if (context.chapterContent && this.rulesEngine) {
      const chapter: Chapter = {
        id: generateId(),
        number: context.chapterNumber || 1,
        title: `第${context.chapterNumber || 1}章`,
        summary: '',
        content: context.chapterContent,
        backgroundEvents: [],
        state: {
          time: '',
          location: '',
          charactersPresent: [],
          plotProgress: [],
          worldChanges: [],
          foreshadowing: []
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      const violations = this.rulesEngine.checkChapter(chapter)
      if (violations.length > 0) {
        const suggestions = this.rulesEngine.generateSuggestions(violations)
        rulesCheckResult = {
          isValid: violations.filter(v => v.severity === 'error').length === 0,
          issues: suggestions
        }
      }
    }

    // AI による一貫性チェック
    const messages: AIMessage[] = [
      {
        role: 'system',
        content: 'あなたは小説の一貫性をチェックする編集者です。キャラクターの性格、世界観、時系列の整合性を検証してください。'
      },
      {
        role: 'user',
        content: this.buildValidationPrompt(context)
      }
    ]

    const response = await aiManager.complete({
      model: modelSettings.model,
      messages,
      temperature: modelSettings.temperature,
      maxTokens: modelSettings.maxTokens
    })

    const aiValidationResult = this.parseValidationResponse(response.content)
    
    // ルールチェックとAIチェックの結果を統合
    const validationResult = {
      isValid: rulesCheckResult.isValid && aiValidationResult.isValid,
      issues: [rulesCheckResult.issues, aiValidationResult.issues].filter(Boolean).join('\n\n')
    }
    
    return { validationResult }
  }

  private async executeUpdateStep(step: FlowStep, context: FlowContext): Promise<FlowContext> {
    if (step.id === 'update-state') {
      // 章のコンテンツから登場キャラクターを抽出
      const appearingCharacters = await this.extractCharactersFromContent(context)
      console.log('Extracted characters from content:', appearingCharacters)
      
      // 時間と場所のデフォルト値を設定
      let time = context.chapterPlan?.time || context.previousState?.time || '不明'
      let location = context.chapterPlan?.location || context.previousState?.location || '不明'
      
      // もし時間や場所が空文字列の場合はデフォルト値を設定
      if (!time || time.trim() === '') {
        time = '不明'
      }
      if (!location || location.trim() === '') {
        location = '不明'
      }
      
      const newState: ChapterState = {
        time: time,
        location: location,
        charactersPresent: appearingCharacters.length > 0 ? appearingCharacters : (context.chapterPlan?.characters || []),
        plotProgress: this.updatePlotProgress(context),
        worldChanges: this.extractWorldChanges(context),
        foreshadowing: this.updateForeshadowing(context)
      }

      console.log('New state charactersPresent:', newState.charactersPresent)

      return { newState }
    }
    
    if (step.id === 'save-chapter') {
      // 章の保存はメインのページで処理されるので、ここでは何もしない
      return {
        savedChapter: true
      }
    }
    
    return {}
  }

  private buildAnalysisSystemPrompt(step: FlowStep, context: FlowContext): string {
    const genre = context.projectMeta?.genre || 'ファンタジー'
    const projectName = context.projectInfo?.name || '未設定'
    
    if (step.id === 'analyze-previous') {
      const currentChapter = context.chapterNumber || 2
      const previousChapter = currentChapter - 1
      
      return `あなたは${genre}小説「${projectName}」の執筆アシスタントです。
      
第${previousChapter}章の内容と状態を分析し、第${currentChapter}章への継続性を確保してください。

以下の点に注意して分析してください：
- キャラクターの心理状態と位置
- 未解決の出来事や伏線
- 時間と場所の流れ
- 物語の勢いとペース
- ${genre}のジャンル特性を踏まえた展開
- 第${previousChapter}章の終わりの状況から、第${currentChapter}章をどのように始めるべきか`
    }
    
    if (step.id === 'plan-chapter') {
      const chapterNumber = context.chapterNumber || 1
      
      return `あなたは${genre}小説「${projectName}」の構成を計画する編集者です。

【作品情報】
タイトル: ${projectName}
説明: ${context.projectInfo?.description || '未設定'}
ジャンル: ${genre}

【現在計画する章】
第${chapterNumber}章

与えられた情報を基に、第${chapterNumber}章の詳細な計画を立ててください。
${chapterNumber > 1 ? '前章からの流れを踏まえて、物語を自然に展開させてください。' : '物語の導入として魅力的な始まりを計画してください。'}

必ず以下の形式のJSONを出力してください：
{
  "title": "章のタイトル（第${chapterNumber}章: 具体的なタイトル）",
  "summary": "章の概要（2-3文）",
  "time": "時間設定（例：早朝、正午、夕暮れ、深夜など）",
  "location": "場所設定",
  "characters": ["登場キャラクターIDのリスト"],
  "mainEvents": ["主要イベント1", "主要イベント2"],
  "foreshadowingToPlant": ["新たに設置する伏線"],
  "foreshadowingToResolve": ["回収する伏線"],
  "openingHook": "章の出だしのフック",
  "closingHook": "章の終わりのフック"
}

${genre}小説として適切な展開を心がけてください。`
    }

    return '小説執筆の分析を行ってください。'
  }

  private buildAnalysisUserPrompt(step: FlowStep, context: FlowContext): string {
    const parts: string[] = []

    parts.push(`【現在の章】\n第${context.chapterNumber || 1}章を執筆予定`)

    if (context.projectInfo) {
      parts.push(`プロジェクト情報:\nタイトル: ${context.projectInfo.name}\n説明: ${context.projectInfo.description}`)
    }

    if (context.projectMeta) {
      parts.push(`プロジェクトメタ情報:\n${JSON.stringify(context.projectMeta, null, 2)}`)
    }

    if (context.worldSettings) {
      parts.push(`世界観設定:\n${JSON.stringify(context.worldSettings, null, 2)}`)
    }

    if (context.characters) {
      parts.push(`キャラクター一覧:\n${JSON.stringify(context.characters, null, 2)}`)
    }

    if (context.previousChapter) {
      parts.push(`第${(context.chapterNumber || 2) - 1}章の内容:\n${context.previousChapter.content}`)
    }

    if (context.previousState) {
      parts.push(`第${(context.chapterNumber || 2) - 1}章の終了時の状態:\n${JSON.stringify(context.previousState, null, 2)}`)
    }

    if (context.plotOutline || context.projectMeta?.plotOutline) {
      parts.push(`プロットの概要:\n${context.plotOutline || context.projectMeta?.plotOutline}`)
    }

    if (context.foreshadowing) {
      parts.push(`管理中の伏線:\n${JSON.stringify(context.foreshadowing, null, 2)}`)
    }

    // 章立て情報も追加
    if (context.chapterOutline) {
      parts.push(`第${context.chapterNumber || 1}章の計画:\n${JSON.stringify(context.chapterOutline, null, 2)}`)
    }

    return parts.join('\n\n')
  }

  private buildWritingSystemPrompt(step: FlowStep, context: FlowContext): string {
    if (step.id === 'write-chapter') {
      if (!this.rulesEngine) {
        throw new Error('Rules engine not initialized')
      }
      
      const rulesPrompt = this.rulesEngine.generateRulesPrompt()
      const genre = context.projectMeta?.genre || 'ファンタジー'
      const themes = context.projectMeta?.themes?.join('、') || ''
      const chapterNumber = context.chapterNumber || 1
      
      return `あなたは${genre}小説を専門とする優れた小説家です。

【作品情報】
タイトル: ${context.projectInfo?.name || '不明'}
説明: ${context.projectInfo?.description || '不明'}
ジャンル: ${genre}
テーマ: ${themes}

【現在執筆する章】
第${chapterNumber}章

【執筆ルール】
${rulesPrompt}

与えられた章の計画に基づいて、${genre}らしい魅力的で読者を引き込む文章を書いてください。
前章の内容を踏まえて物語を継続し、新しい展開を加えてください。
キャラクターの感情や行動を通じて物語を展開し、読者が場面を鮮明にイメージできるような描写を心がけてください。

重要：これは第${chapterNumber}章です。前章とは異なる新しい内容を執筆してください。
タイトルと要約は計画に従ってください。文章のみを出力し、不要な説明やメタ情報は含めないでください。`
    }
    
    if (step.id === 'generate-background') {
      const genre = context.projectMeta?.genre || 'ファンタジー'
      const worldName = context.worldSettings?.name || '物語世界'
      
      return `${genre}小説の背景イベント生成。

本編の裏側で起きている重要な出来事を3-5個生成。
必ず以下のJSON形式で出力:

\`\`\`json
[
  {
    "description": "出来事の説明(20-50文字)",
    "characters": [],
    "impact": "high",
    "visibility": "hidden"
  }
]
\`\`\`

ルール:
- descriptionは具体的で明確に
- impactは"high"/"medium"/"low"
- visibilityは"hidden"/"hinted"/"revealed"
- ${genre}のジャンルに適合
- 物語に影響を与える内容
- JSON以外の文章は不要`
    }
    
    return '小説執筆の処理を行ってください。'
  }

  private buildWritingUserPrompt(step: FlowStep, context: FlowContext): string {
    const parts: string[] = []

    if (step.id === 'generate-background') {
      // 背景イベント生成用の簡潔なプロンプト
      if (context.chapterContent) {
        parts.push(`今書かれた章の内容（最初の500文字）:\n${context.chapterContent.substring(0, 500)}...`)
      }
      if (context.projectMeta?.genre) {
        parts.push(`ジャンル: ${context.projectMeta.genre}`)
      }
      parts.push('\n上記の章の裏側で起きている重要な出来事を生成してください。')
    } else {
      // 通常の章執筆用プロンプト
      parts.push(`【現在執筆する章】\n第${context.chapterNumber || 1}章`)
      
      if (context.projectInfo) {
        parts.push(`プロジェクト情報:\nタイトル: ${context.projectInfo.name}\n説明: ${context.projectInfo.description}`)
      }

      if (context.projectMeta) {
        parts.push(`プロジェクトメタ情報:\n${JSON.stringify(context.projectMeta, null, 2)}`)
      }

      // 前章の内容と状態を追加（第2章以降の場合）
      if (context.chapterNumber > 1) {
        if (context.previousChapter) {
          parts.push(`前章（第${context.chapterNumber - 1}章）の内容:\n${context.previousChapter.content.substring(0, 1000)}...`)
        }
        
        if (context.previousState) {
          parts.push(`前章の状態:\n時間: ${context.previousState.time}\n場所: ${context.previousState.location}\n登場キャラクター: ${context.previousState.charactersPresent?.join('、')}`)
        }
        
        // 前章の分析結果も追加
        if (context.context) {
          parts.push(`前章からの分析結果:\n${JSON.stringify(context.context, null, 2)}`)
        }
      }

      if (context.chapterPlan) {
        parts.push(`章の計画:\n${JSON.stringify(context.chapterPlan, null, 2)}`)
      }
      
      // 章立てからの詳細情報を追加
      if (context.chapterOutline) {
        parts.push(`【第${context.chapterNumber || 1}章の詳細計画】
タイトル: ${context.chapterOutline.title || '未設定'}
目的: ${context.chapterOutline.purpose}
主要イベント: ${context.chapterOutline.keyEvents?.join('、')}
葛藤: ${context.chapterOutline.conflict || '未設定'}
解決: ${context.chapterOutline.resolution || '未設定'}
次章への引き: ${context.chapterOutline.hook || '未設定'}
テンションレベル: ${context.chapterOutline.tensionLevel || 5}/10

【章の設定】
場所: ${context.chapterOutline.location || '未設定'}
時間: ${context.chapterOutline.time || '未設定'}
登場キャラクター: ${context.chapterOutline.charactersInvolved?.join('、') || '未設定'}

【伏線情報】
設置する伏線:
${context.chapterOutline.foreshadowingToPlant?.map(f => 
  `- ${f.hint} (${f.scope}伏線, 重要度: ${f.significance}, 回収予定: 第${f.plannedRevealChapter || '未定'}章)`
).join('\n') || '- なし'}

回収する伏線:
${context.chapterOutline.foreshadowingToReveal?.map(hint => `- ${hint}`).join('\n') || '- なし'}

執筆時の注意: ${context.chapterOutline.notes || 'なし'}`)
      }

      if (context.settings) {
        parts.push(`物語の設定:\n${JSON.stringify(context.settings, null, 2)}`)
      }

      parts.push(`上記の情報を基に、第${context.chapterNumber || 1}章を執筆してください。前章とは異なる新しい展開で物語を進めてください。`)
    }

    return parts.join('\n\n')
  }

  private buildValidationPrompt(context: FlowContext): string {
    return `以下の章の内容を検証してください：

章の内容:
${context.chapterContent}

設定:
${JSON.stringify(context.settings, null, 2)}

前章までの情報:
${JSON.stringify(context.previousChapters, null, 2)}

一貫性の問題があれば指摘してください。`
  }

  private parseAnalysisResponse(stepId: string, content: string): FlowContext {
    try {
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1])
        
        if (stepId === 'plan-chapter') {
          return {
            chapterPlan: parsed,
            chapterTitle: parsed.title,
            chapterSummary: parsed.summary
          }
        }
        
        return parsed
      }
    } catch (error) {
      console.error('Failed to parse analysis response:', error)
    }

    if (stepId === 'analyze-previous') {
      return { context: { summary: content } }
    } else if (stepId === 'plan-chapter') {
      return { chapterPlan: { description: content } }
    }

    return { result: content }
  }

  private parseWritingResponse(stepId: string, content: string): FlowContext {
    if (stepId === 'write-chapter') {
      return { chapterContent: content }
    } else if (stepId === 'generate-background') {
      const events = this.extractBackgroundEvents(content)
      return { backgroundEvents: events }
    }

    return { content }
  }

  private parseValidationResponse(content: string): any {
    const hasIssues = content.toLowerCase().includes('問題') || 
                     content.toLowerCase().includes('矛盾') ||
                     content.toLowerCase().includes('不整合')
    
    return {
      isValid: !hasIssues,
      issues: hasIssues ? content : null
    }
  }

  private extractBackgroundEvents(content: string): BackgroundEvent[] {
    console.log('Extracting background events from:', content.substring(0, 200) + '...')
    
    try {
      // JSONブロックを探す
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/)
      if (jsonMatch) {
        const jsonString = jsonMatch[1].trim()
        console.log('Found JSON block:', jsonString.substring(0, 100) + '...')
        
        // JSONをパース
        const parsed = JSON.parse(jsonString)
        const events = Array.isArray(parsed) ? parsed : [parsed]
        
        // 有効なイベントのみフィルタリング
        const validEvents = events
          .filter(event => {
            // 基本的な検証
            if (!event || typeof event !== 'object') return false
            if (!event.description || typeof event.description !== 'string') return false
            if (event.description.includes('#') || event.description.includes('[')) return false
            return true
          })
          .map(event => ({
            id: generateId(),
            description: String(event.description).trim(),
            characters: Array.isArray(event.characters) ? event.characters : [],
            impact: ['low', 'medium', 'high'].includes(event.impact) ? event.impact : 'medium',
            visibility: ['hidden', 'hinted', 'revealed'].includes(event.visibility) ? event.visibility : 'hidden'
          }))
        
        console.log(`Extracted ${validEvents.length} valid events`)
        
        if (validEvents.length > 0) {
          return validEvents
        }
      }
    } catch (error) {
      console.error('Failed to parse background events JSON:', error)
      console.error('Content that failed to parse:', content)
    }

    // フォールバック：別の形式を試す
    try {
      // 単純なJSON配列として解析を試みる
      const directParse = JSON.parse(content)
      if (Array.isArray(directParse)) {
        return directParse
          .filter(event => event && event.description)
          .slice(0, 5)
          .map(event => ({
            id: generateId(),
            description: String(event.description).trim(),
            characters: event.characters || [],
            impact: event.impact || 'medium',
            visibility: event.visibility || 'hidden'
          }))
      }
    } catch (e) {
      // 無視
    }

    // 最終フォールバック：デフォルトイベントを返す
    console.warn('Using fallback background events')
    return [
      {
        id: generateId(),
        description: '物語の裏側で重要な出来事が進行している',
        characters: [],
        impact: 'medium' as const,
        visibility: 'hidden' as const
      }
    ]
  }

  private updatePlotProgress(context: FlowContext): any[] {
    const previousProgress = context.previousState?.plotProgress || []
    const newProgress: any[] = []
    
    // 章の計画から主要イベントをプロットポイントとして追加
    if (context.chapterPlan?.mainEvents) {
      context.chapterPlan.mainEvents.forEach((event: string) => {
        newProgress.push({
          id: generateId(),
          type: 'conflict',
          description: event,
          resolved: false,
          chapterIntroduced: context.chapterNumber || 1
        })
      })
    }
    
    // 解決されたプロットポイントを更新
    const updatedProgress = previousProgress.map((plot: any) => {
      if (context.chapterPlan?.foreshadowingToResolve?.some(
        (resolved: string) => plot.description.includes(resolved)
      )) {
        return {
          ...plot,
          resolved: true,
          chapterResolved: context.chapterNumber || 1
        }
      }
      return plot
    })
    
    return [...updatedProgress, ...newProgress]
  }

  private extractWorldChanges(context: FlowContext): string[] {
    const changes: string[] = []
    
    // 背景イベントから世界の変化を抽出
    if (context.backgroundEvents) {
      context.backgroundEvents
        .filter(event => event.impact === 'high')
        .forEach(event => {
          changes.push(event.description)
        })
    }
    
    return changes
  }

  private updateForeshadowing(context: FlowContext): Foreshadowing[] {
    const previousForeshadowing = context.previousState?.foreshadowing || []
    const newForeshadowing: Foreshadowing[] = []
    const chapterNumber = context.chapterNumber || 1
    
    // 章立てから伏線情報を取得
    const chapterOutline = context.chapterOutline
    
    // 計画で新たに設置する伏線を追加（chapterPlanから）
    if (context.chapterPlan?.foreshadowingToPlant) {
      context.chapterPlan.foreshadowingToPlant.forEach((hint: string) => {
        newForeshadowing.push({
          id: generateId(),
          hint: hint,
          payoff: '',
          status: 'planted',
          scope: 'medium', // デフォルト
          significance: 'moderate' // デフォルト
        })
      })
    }
    
    // 章立てから詳細な伏線情報を追加
    if (chapterOutline?.foreshadowingToPlant) {
      chapterOutline.foreshadowingToPlant.forEach((planned) => {
        // 重複チェック（同じヒントがすでに存在しないか）
        const exists = newForeshadowing.some(f => f.hint === planned.hint) || 
                      previousForeshadowing.some(f => f.hint === planned.hint)
        
        if (!exists) {
          newForeshadowing.push({
            id: generateId(),
            hint: planned.hint,
            payoff: '',
            status: 'planted',
            scope: planned.scope,
            significance: planned.significance,
            plannedRevealChapter: planned.plannedRevealChapter,
            category: planned.category
          })
        }
      })
    }
    
    // 既存の伏線の状態を更新
    const updatedForeshadowing = previousForeshadowing.map(f => {
      // chapterPlanからの回収
      if (context.chapterPlan?.foreshadowingToResolve?.includes(f.hint)) {
        return {
          ...f,
          status: 'revealed' as const,
          chapterRevealed: chapterNumber
        }
      }
      
      // 章立てからの回収
      if (chapterOutline?.foreshadowingToReveal?.includes(f.hint)) {
        return {
          ...f,
          status: 'revealed' as const,
          chapterRevealed: chapterNumber
        }
      }
      
      // 回収予定章に到達した場合の処理
      if (f.plannedRevealChapter && f.plannedRevealChapter === chapterNumber && f.status === 'planted') {
        console.log(`伏線 "${f.hint}" が第${chapterNumber}章で回収予定です`)
        // 実際の回収は章の内容次第なので、ここではステータスは変更しない
      }
      
      return f
    })
    
    return [...updatedForeshadowing, ...newForeshadowing]
  }

  private async extractCharactersFromContent(context: FlowContext): Promise<string[]> {
    if (!context.chapterContent || this.availableCharacters.length === 0) {
      console.log('No chapter content or no available characters')
      return []
    }
    
    const content = context.chapterContent.toLowerCase()
    const appearingCharacterIds: string[] = []
    
    console.log('Available characters for extraction:', this.availableCharacters.map(c => ({ id: c.id, name: c.name })))
    
    // 各キャラクターの名前が本文に含まれているかチェック
    this.availableCharacters.forEach(character => {
      if (character.name && content.includes(character.name.toLowerCase())) {
        console.log(`Found character ${character.name} in content`)
        appearingCharacterIds.push(character.id)
      }
      // 別名もチェック
      if (character.aliases && character.aliases.length > 0) {
        const hasAlias = character.aliases.some(alias => 
          content.includes(alias.toLowerCase())
        )
        if (hasAlias && !appearingCharacterIds.includes(character.id)) {
          console.log(`Found character ${character.name} by alias in content`)
          appearingCharacterIds.push(character.id)
        }
      }
    })
    
    console.log('Extracted character IDs:', appearingCharacterIds)
    return appearingCharacterIds
  }

  private async loadWritingRules(): Promise<WritingRules> {
    const stored = localStorage.getItem(`shinwa-rules-${this.projectId}`)
    if (stored) {
      return JSON.parse(stored)
    }
    
    const { defaultWritingRules } = await import('../../data/rules/default-rules')
    return defaultWritingRules
  }

  private async loadWorldSettings(): Promise<WorldSettings> {
    const stored = localStorage.getItem(`shinwa-world-${this.projectId}`)
    if (stored) {
      return JSON.parse(stored)
    }
    
    return {
      name: 'Default World',
      description: '',
      era: 'Modern',
      geography: [],
      cultures: []
    }
  }

  private async loadCharacters(): Promise<Character[]> {
    const stored = localStorage.getItem(`shinwa-characters-${this.projectId}`)
    if (stored) {
      return JSON.parse(stored)
    }
    
    return []
  }

  private async loadPreviousChapter(chapterNumber: number): Promise<Chapter | null> {
    console.log(`Loading previous chapter ${chapterNumber} for project ${this.projectId}`)
    const stored = localStorage.getItem(`shinwa-chapters-${this.projectId}`)
    if (stored) {
      try {
        const chapters = JSON.parse(stored)
        console.log(`Found ${chapters.length} chapters, looking for chapter ${chapterNumber}`)
        const previousChapter = chapters.find((ch: any) => ch.number === chapterNumber)
        if (previousChapter) {
          console.log(`Found previous chapter ${chapterNumber}, title: ${previousChapter.title}`)
          return {
            ...previousChapter,
            createdAt: new Date(previousChapter.createdAt),
            updatedAt: new Date(previousChapter.updatedAt)
          }
        } else {
          console.log(`Previous chapter ${chapterNumber} not found`)
        }
      } catch (error) {
        console.error('Failed to load previous chapter:', error)
      }
    } else {
      console.log('No chapters found in storage')
    }
    
    return null
  }

  private async loadChapterState(chapterNumber: number): Promise<ChapterState | null> {
    const previousChapter = await this.loadPreviousChapter(chapterNumber)
    if (previousChapter && previousChapter.state) {
      return previousChapter.state
    }
    
    return null
  }

  private async loadProjectInfo(): Promise<any> {
    const stored = localStorage.getItem('shinwa-projects')
    if (stored) {
      const projects = JSON.parse(stored)
      const project = projects.find((p: any) => p.id === this.projectId)
      if (project) {
        return {
          id: project.id,
          name: project.name,
          description: project.description
        }
      }
    }
    return null
  }

  private async loadProjectMeta(): Promise<any> {
    const stored = localStorage.getItem(`shinwa-project-meta-${this.projectId}`)
    if (stored) {
      return JSON.parse(stored)
    }
    return null
  }
}