import { FlowContext, FlowExecutor } from './flow-engine'
import { FlowStep } from '@/lib/types'
import { aiManager } from '../ai/manager'
import { AIMessage } from '../ai/types'
import { 
  WritingRules, 
  WorldSettings, 
  Character, 
  Chapter,
  ChapterState,
  BackgroundEvent,
  Foreshadowing,
  ValidationIssue,
  ValidationResult
} from '../types'
import { generateId } from '../utils'
import { RulesEngine, getProjectRulesEngine } from './rules-engine'
import { getFeatureModelSettings } from '../utils/ai-settings'
import { WorldMapService } from './world-map-service'
import { ForeshadowingTrackerService } from './foreshadowing-tracker-service'
import { ForeshadowingContextBuilder, ForeshadowingContext } from './foreshadowing-context-builder'
import { ForeshadowingResolutionValidator } from './foreshadowing-resolution-validator'

export class NovelFlowExecutor implements FlowExecutor {
  private projectId: string
  private aiModel: string
  private temperature: number
  private rulesEngine?: RulesEngine
  private availableCharacters: Character[] = []
  private flowEngine?: any // FlowEngineの参照を保持
  private worldMapService: WorldMapService

  constructor(projectId: string, aiModel: string, temperature: number = 0.7) {
    this.projectId = projectId
    this.aiModel = aiModel
    this.temperature = temperature
    this.worldMapService = new WorldMapService(projectId)
  }

  // FlowEngineを設定するメソッド
  setFlowEngine(engine: any): void {
    this.flowEngine = engine
  }

  async executeStep(step: FlowStep, context: FlowContext): Promise<FlowContext> {
    this.flowEngine?.log(`ステップの詳細: ${step.name} (${step.type})`, 'info')

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
          this.flowEngine?.log('プロジェクト情報を読み込み中...', 'info')
          result.projectInfo = await this.loadProjectInfo()
          break
        case 'projectMeta':
          this.flowEngine?.log('プロジェクトメタデータを読み込み中...', 'info')
          result.projectMeta = await this.loadProjectMeta()
          break
        case 'writingRules':
          this.flowEngine?.log('執筆ルールを読み込み中...', 'info')
          result.rules = await this.loadWritingRules()
          break
        case 'worldSettings':
          this.flowEngine?.log('世界設定を読み込み中...', 'info')
          result.worldSettings = await this.loadWorldSettings()
          break
        case 'characters':
          this.flowEngine?.log('キャラクター情報を読み込み中...', 'info')
          const characters = await this.loadCharacters()
          this.availableCharacters = characters
          result.characters = characters
          this.flowEngine?.log(`${characters.length}人のキャラクターを読み込みました`, 'info')
          break
        case 'previousChapter':
          this.flowEngine?.log(`第${context.chapterNumber - 1}章を読み込み中...`, 'info')
          result.previousChapter = await this.loadPreviousChapter(context.chapterNumber - 1)
          break
        case 'previousState':
          this.flowEngine?.log('前章の状態を読み込み中...', 'info')
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

    this.flowEngine?.log(`AI設定 - モデル: ${modelSettings.model}, トークン上限: ${modelSettings.maxTokens}, 温度: ${modelSettings.temperature}`, 'info')

    const response = await aiManager.complete({
      model: modelSettings.model,
      messages,
      temperature: modelSettings.temperature,
      maxTokens: modelSettings.maxTokens
    })

    this.flowEngine?.log(`生成完了 - 文字数: ${response.content.length}`, 'info')

    const result = this.parseWritingResponse(step.id, response.content)

    // 章を書いた後、キャラクターの移動を検証
    if (step.id === 'write-chapter' && result.chapterContent) {
      const travelValidation = await this.validateCharacterMovements(result.chapterContent, context)
      if (travelValidation.warnings.length > 0) {
        this.flowEngine?.log('移動の警告が検出されました', 'warning')
        result.travelWarnings = travelValidation.warnings
      }
      // キャラクターの位置を更新
      if (travelValidation.movements.length > 0) {
        result.characterMovements = travelValidation.movements
      }
    }

    return result
  }

  private async executeValidateStep(step: FlowStep, context: FlowContext): Promise<FlowContext> {
    // 伏線検証の特別処理
    if (step.id === 'validate-foreshadowing') {
      return this.executeForeshadowingValidation(context)
    }
    
    this.flowEngine?.log(`検証ステップを開始: 第${context.chapterNumber || 1}章`, 'info')
    
    // 検証用のモデル設定を取得
    const modelSettings = getFeatureModelSettings(this.projectId, 'validation')
    
    const issues: ValidationIssue[] = []
    
    // ルールエンジンによるチェック
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
      violations.forEach(violation => {
        issues.push({
          id: generateId(),
          category: this.categorizeRuleViolation(violation.rule),
          severity: violation.severity as 'error' | 'warning' | 'info',
          title: violation.rule,
          description: violation.description,
          suggestion: violation.suggestion
        })
      })
    }

    // AI による一貫性チェック
    const messages: AIMessage[] = [
      {
        role: 'system',
        content: `あなたは小説の一貫性をチェックする編集者です。以下の観点から問題を検出してください：
- キャラクターの性格の一貫性
- 世界観の矛盾
- 時系列の整合性
- 文章の流れ
- 会話文の自然さ

問題を見つけた場合は、以下の形式のJSONで出力してください：
{
  "issues": [
    {
      "category": "consistency" | "character" | "dialogue" | "plot" | "other",
      "severity": "error" | "warning" | "info",
      "title": "問題の簡潔なタイトル",
      "description": "問題の詳細な説明",
      "suggestion": "改善案（オプション）",
      "location": "該当箇所の抜粋（オプション）"
    }
  ]
}`
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

    // AIの検証結果をパース
    try {
      const aiResult = this.parseAIValidationResponse(response.content)
      aiResult.issues.forEach(issue => {
        issues.push({
          ...issue,
          id: generateId()
        })
      })
    } catch (error) {
      console.error('Failed to parse AI validation response:', error)
    }
    
    // 移動の警告を追加
    const travelWarnings = context.travelWarnings || []
    travelWarnings.forEach((warning: string) => {
      issues.push({
        id: generateId(),
        category: 'travel',
        severity: 'warning',
        title: 'キャラクターの移動に関する警告',
        description: warning
      })
    })
    
    // 検証結果を構造化して返す
    const validationResult: ValidationResult = {
      isValid: issues.filter(issue => issue.severity === 'error').length === 0,
      issues: issues
    }
    
    this.flowEngine?.log(`検証完了: ${issues.length}件の問題を発見 (エラー: ${issues.filter(i => i.severity === 'error').length}件)`, 'info')
    
    return { validationResult }
  }

  private async executeUpdateStep(step: FlowStep, context: FlowContext): Promise<FlowContext> {
    if (step.id === 'update-state') {
      // 章のコンテンツから登場キャラクターを抽出
      const appearingCharacters = await this.extractCharactersFromContent(context)
      
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
      
      // キャラクター配列を確実にIDに変換
      let charactersPresent: string[] = []
      if (appearingCharacters.length > 0) {
        charactersPresent = appearingCharacters
      } else if (context.chapterPlan?.characters) {
        // chapterPlanのキャラクターが名前の場合もIDに変換
        charactersPresent = this.convertCharacterNamesToIds(context.chapterPlan.characters)
      }
      
      const newState: ChapterState = {
        time: time,
        location: location,
        charactersPresent: charactersPresent,
        plotProgress: this.updatePlotProgress(context),
        worldChanges: this.extractWorldChanges(context),
        foreshadowing: this.updateForeshadowing(context)
      }

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
  "characters": ["登場キャラクターIDのリスト（重要：キャラクター名ではなく、必ずIDを使用してください）"],
  "mainEvents": ["主要イベント1", "主要イベント2"],
  "foreshadowingToPlant": ["新たに設置する伏線"],
  "foreshadowingToResolve": ["回収する伏線（ヒントの文字列を正確に記載）"],
  "foreshadowingResolutionNotes": {
    "伏線のヒント": "どのように回収するかの具体的な説明"
  },
  "openingHook": "章の出だしのフック",
  "closingHook": "章の終わりのフック"
}

重要な注意事項:
- charactersフィールドには、キャラクター名ではなく、必ずキャラクターIDを使用してください
- キャラクターIDは、提供されたキャラクター一覧のidフィールドの値です
- 例: ["char-123", "char-456"] のような形式で指定してください

伏線回収の重要な注意事項:
- 【必ず回収すべき伏線】に記載された伏線は、必ずforeshadowingToResolveに含めてください
- 回収する際は、伏線のヒントの文字列を正確に記載してください
- foreshadowingResolutionNotesで、各伏線をどのように物語に組み込んで回収するか具体的に説明してください
- 無理やり回収するのではなく、章の流れに自然に組み込んでください
- 読者が「なるほど！」と思えるような回収方法を心がけてください

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

    // 伏線コンテキストの構築
    if (context.chapters && context.chapterNumber) {
      const totalChapters = context.projectMeta?.totalChapters || context.chapters.length
      const foreshadowingContext = ForeshadowingContextBuilder.buildContext(
        context.chapters,
        context.chapterNumber,
        totalChapters
      )
      
      const foreshadowingPrompt = ForeshadowingContextBuilder.generatePrompt(
        foreshadowingContext,
        context.chapterNumber
      )
      
      if (foreshadowingPrompt) {
        parts.push('【伏線の状況】')
        parts.push(foreshadowingPrompt)
      }
    } else if (context.foreshadowing) {
      // フォールバック：旧形式
      parts.push(`管理中の伏線:\n${JSON.stringify(context.foreshadowing, null, 2)}`)
    }

    // 章立て情報も追加
    if (context.chapterOutline) {
      this.flowEngine?.log(`章立て情報を使用: 第${context.chapterNumber}章 - ${context.chapterOutline.title || '無題'}`, 'info')
      parts.push(`第${context.chapterNumber || 1}章の計画:\n${JSON.stringify(context.chapterOutline, null, 2)}`)
    } else {
      this.flowEngine?.log('章立て情報が見つかりません。自由に執筆します。', 'warning')
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

  private async buildWritingUserPrompt(step: FlowStep, context: FlowContext): Promise<string> {
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

      // 世界地図情報を追加
      const worldMapSystem = this.worldMapService.loadWorldMapSystem()
      if (worldMapSystem) {
        const allLocations: { name: string; type: string; mapLevel: string }[] = []
        
        // 世界レベルの場所
        worldMapSystem.worldMap.locations.forEach(loc => {
          allLocations.push({
            name: loc.name,
            type: loc.type,
            mapLevel: '世界'
          })
        })
        
        // 地域レベルの場所
        worldMapSystem.regions.forEach(region => {
          region.locations.forEach(loc => {
            allLocations.push({
              name: loc.name,
              type: loc.type,
              mapLevel: `地域(${region.name})`
            })
          })
        })
        
        // ローカルレベルの場所
        worldMapSystem.localMaps.forEach(localMap => {
          localMap.areas.forEach(area => {
            allLocations.push({
              name: area.name,
              type: area.type,
              mapLevel: `ローカル(${localMap.name})`
            })
          })
        })
        
        parts.push(`【利用可能な場所】
${allLocations.map(loc => `- ${loc.name} (${loc.type}, ${loc.mapLevel})`).join('\n')}

※キャラクターが移動する際は、必ず上記の利用可能な場所リストから選んでください。`)
      }

      // キャラクターの現在位置情報を追加
      if (this.availableCharacters.length > 0) {
        const characterLocations = localStorage.getItem(`shinwa-character-location-${this.projectId}`)
        const locations: Record<string, any> = characterLocations ? JSON.parse(characterLocations) : {}
        
        const characterPositions: string[] = []
        this.availableCharacters.forEach(char => {
          const charLocation = locations[char.id]
          if (charLocation && charLocation.currentLocation) {
            // 現在の場所名を特定
            let locationName = '不明'
            if (worldMapSystem) {
              const locationId = charLocation.currentLocation.locationId
              // 世界レベルで検索
              const worldLoc = worldMapSystem.worldMap.locations.find(l => l.id === locationId)
              if (worldLoc) {
                locationName = worldLoc.name
              } else {
                // 地域レベルで検索
                for (const region of worldMapSystem.regions) {
                  const regionLoc = region.locations.find(l => l.id === locationId)
                  if (regionLoc) {
                    locationName = regionLoc.name
                    break
                  }
                }
                // ローカルレベルで検索
                if (locationName === '不明') {
                  for (const localMap of worldMapSystem.localMaps) {
                    const localArea = localMap.areas.find(a => a.id === locationId)
                    if (localArea) {
                      locationName = localArea.name
                      break
                    }
                  }
                }
              }
            }
            characterPositions.push(`- ${char.name}: ${locationName}`)
          } else if (context.previousState?.charactersPresent?.includes(char.id)) {
            // 前章の状態から場所を推定
            characterPositions.push(`- ${char.name}: ${context.previousState.location || '不明'}`)
          } else {
            characterPositions.push(`- ${char.name}: 不明`)
          }
        })
        
        if (characterPositions.length > 0) {
          parts.push(`【各キャラクターの現在位置】
${characterPositions.join('\n')}`)
        }
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
${context.chapterOutline.foreshadowingToPlant?.map((f: any) => 
  `- ${f.hint} (${f.scope}伏線, 重要度: ${f.significance}, 回収予定: 第${f.plannedRevealChapter || '未定'}章)`
).join('\n') || '- なし'}

回収する伏線:
${context.chapterOutline.foreshadowingToReveal?.map((hint: any) => `- ${hint}`).join('\n') || '- なし'}

執筆時の注意: ${context.chapterOutline.notes || 'なし'}`)
      }

      if (context.settings) {
        parts.push(`物語の設定:\n${JSON.stringify(context.settings, null, 2)}`)
      }

      // 前回の検証問題がある場合は追加
      if (context.previousValidationIssues && context.previousValidationIssues.length > 0) {
        parts.push(`【重要：前回の執筆で以下の問題が指摘されました。これらを回避して執筆してください】
${context.previousValidationIssues.map((issue: ValidationIssue) => 
  `- ${issue.title}: ${issue.description}${issue.suggestion ? ` (提案: ${issue.suggestion})` : ''}`
).join('\n')}`)
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
          // キャラクター名をIDに変換
          if (parsed.characters && Array.isArray(parsed.characters)) {
            parsed.characters = this.convertCharacterNamesToIds(parsed.characters)
          }
          
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
    try {
      // JSONブロックを探す
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/)
      if (jsonMatch) {
        const jsonString = jsonMatch[1].trim()
        
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
        
        if (validEvents.length > 0) {
          return validEvents
        }
      }
    } catch (error) {
      console.error('Failed to parse background events JSON:', error)
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
        .filter((event: any) => event.impact === 'high')
        .forEach((event: any) => {
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
      chapterOutline.foreshadowingToPlant.forEach((planned: any) => {
        // 重複チェック（同じヒントがすでに存在しないか）
        const exists = newForeshadowing.some((f: any) => f.hint === planned.hint) || 
                      previousForeshadowing.some((f: any) => f.hint === planned.hint)
        
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
    const updatedForeshadowing = previousForeshadowing.map((f: any) => {
      // 章の内容がある場合は実際に回収されたか簡易チェック
      const shouldResolve = context.chapterPlan?.foreshadowingToResolve?.includes(f.hint) ||
                           chapterOutline?.foreshadowingToReveal?.includes(f.hint)
      
      if (shouldResolve && context.chapterContent) {
        // 簡易チェックで回収の可能性を確認
        const quickCheck = ForeshadowingResolutionValidator.quickCheck(
          context.chapterContent,
          f.hint
        )
        
        if (quickCheck.likelyResolved) {
          return {
            ...f,
            status: 'revealed' as const,
            chapterRevealed: chapterNumber,
            payoff: context.chapterPlan?.foreshadowingResolutionNotes?.[f.hint] || 
                   `第${chapterNumber}章で明らかになった`
          }
        } else {
          console.warn(`伏線 "${f.hint}" は回収予定でしたが、本文中で確認できませんでした。`)
          // 回収されなかった場合は状態を変更しない
          return f
        }
      }
      
      // 回収予定章に到達した場合の処理（本文がまだない場合）
      if (f.plannedRevealChapter && f.plannedRevealChapter === chapterNumber && 
          f.status === 'planted' && !context.chapterContent) {
        // まだ本文がない場合は状態を変更しない（後で検証される）
        return f
      }
      
      return f
    })
    
    return [...updatedForeshadowing, ...newForeshadowing]
  }

  private async extractCharactersFromContent(context: FlowContext): Promise<string[]> {
    if (!context.chapterContent || this.availableCharacters.length === 0) {
      return []
    }
    
    const content = context.chapterContent.toLowerCase()
    const appearingCharacterIds: string[] = []
    
    // 各キャラクターの名前が本文に含まれているかチェック
    this.availableCharacters.forEach(character => {
      if (character.name && content.includes(character.name.toLowerCase())) {
        appearingCharacterIds.push(character.id)
      }
      // 別名もチェック
      if (character.aliases && character.aliases.length > 0) {
        const hasAlias = character.aliases.some(alias => 
          content.includes(alias.toLowerCase())
        )
        if (hasAlias && !appearingCharacterIds.includes(character.id)) {
          appearingCharacterIds.push(character.id)
        }
      }
    })
    
    return appearingCharacterIds
  }

  /**
   * キャラクター名の配列をIDの配列に変換
   * 名前とIDが混在している場合も適切に処理
   */
  private convertCharacterNamesToIds(charactersArray: string[]): string[] {
    if (!this.availableCharacters || this.availableCharacters.length === 0) {
      return charactersArray
    }

    const convertedIds: string[] = []
    
    charactersArray.forEach(item => {
      // すでにIDの場合（IDは通常UUIDまたは特定の形式）
      const existingCharacter = this.availableCharacters.find(c => c.id === item)
      if (existingCharacter) {
        convertedIds.push(item)
        return
      }
      
      // 名前で検索
      const characterByName = this.availableCharacters.find(c => 
        c.name.toLowerCase() === item.toLowerCase() ||
        (c.aliases && c.aliases.some(alias => alias.toLowerCase() === item.toLowerCase()))
      )
      
      if (characterByName) {
        convertedIds.push(characterByName.id)
      } else {
        console.warn(`Could not find character for "${item}", keeping as-is`)
        // IDでも名前でもマッチしない場合、元の値を保持（後方互換性のため）
        convertedIds.push(item)
      }
    })
    
    return convertedIds
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
    const stored = localStorage.getItem(`shinwa-chapters-${this.projectId}`)
    if (stored) {
      try {
        const chapters = JSON.parse(stored)
        const previousChapter = chapters.find((ch: any) => ch.number === chapterNumber)
        if (previousChapter) {
          return {
            ...previousChapter,
            createdAt: new Date(previousChapter.createdAt),
            updatedAt: new Date(previousChapter.updatedAt)
          }
        }
      } catch (error) {
        console.error('Failed to load previous chapter:', error)
      }
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

  /**
   * 章の内容からキャラクターの移動を抽出し、検証する
   */
  private async validateCharacterMovements(
    chapterContent: string,
    context: FlowContext
  ): Promise<{
    movements: Array<{ characterId: string; characterName: string; from: string; to: string }>
    warnings: string[]
  }> {
    const movements = await this.extractCharacterMovements(chapterContent, context)
    const warnings: string[] = []

    // 世界地図システムを読み込む
    const worldMapSystem = this.worldMapService.loadWorldMapSystem()
    if (!worldMapSystem) {
      return { movements, warnings }
    }

    // 各移動を検証
    for (const movement of movements) {
      const validationResult = await this.worldMapService.validateTravel(
        movement.from,
        movement.to,
        movement.characterName,
        context.chapterNumber || 1
      )

      if (!validationResult.isValid) {
        warnings.push(validationResult.message)
        this.flowEngine?.log(
          `移動の警告: ${movement.characterName} - ${validationResult.message}`,
          'warning'
        )
      }

      // キャラクターの位置を更新
      if (movement.characterId) {
        this.worldMapService.updateCharacterLocation(
          movement.characterId,
          movement.to,
          context.chapterNumber || 1
        )
      }
    }

    return { movements, warnings }
  }

  /**
   * 章のテキストからキャラクターの移動を抽出
   */
  private async extractCharacterMovements(
    chapterContent: string,
    context: FlowContext
  ): Promise<Array<{ characterId: string; characterName: string; from: string; to: string }>> {
    const movements: Array<{ characterId: string; characterName: string; from: string; to: string }> = []
    
    // 移動を示すパターン（改行を含まないように修正）
    const movementPatterns = [
      /([^。、\n]+?)は([^。、\n]+?)から([^。、\n]+?)へ(?:向かった|出発した|旅立った|移動した)/g,
      /([^。、\n]+?)は([^。、\n]+?)を(?:出て|離れて|後にして)、([^。、\n]+?)へ/g,
      /([^。、\n]+?)は([^。、\n]+?)に(?:到着した|着いた|辿り着いた)/g,
      /([^。、\n]+?)を(?:訪れた|訪問した)([^。、\n]+)/g,
      /([^。、\n]+?)から([^。、\n]+?)への(?:旅|道のり|移動)/g
    ]

    // 利用可能なキャラクターのマップを作成
    const characterMap = new Map<string, string>()
    if (this.availableCharacters) {
      this.availableCharacters.forEach(char => {
        characterMap.set(char.name.toLowerCase(), char.id)
        // 別名もマップに追加
        if (char.aliases) {
          char.aliases.forEach(alias => {
            characterMap.set(alias.toLowerCase(), char.id)
          })
        }
      })
    }

    // キャラクターの現在位置を取得（character-locationデータを優先）
    const currentLocations = new Map<string, string>()
    
    // まずcharacter-locationデータから取得を試みる
    const stored = localStorage.getItem(`shinwa-character-location-${this.projectId}`)
    if (stored) {
      try {
        const locationData: Record<string, any> = JSON.parse(stored)
        Object.entries(locationData).forEach(([charId, location]) => {
          if (location.currentLocation?.locationId) {
            currentLocations.set(charId, location.currentLocation.locationId)
          }
        })
      } catch (error) {
        console.error('Failed to parse character location data:', error)
      }
    }
    
    // character-locationデータがない場合は前章の状態から取得
    if (context.previousState?.charactersPresent && context.previousState?.location) {
      context.previousState.charactersPresent.forEach((charId: string) => {
        if (!currentLocations.has(charId)) {
          currentLocations.set(charId, context.previousState.location)
        }
      })
    }

    // パターンマッチングで移動を抽出
    for (const pattern of movementPatterns) {
      let match
      while ((match = pattern.exec(chapterContent)) !== null) {
        const matchText = match[0]
        
        // キャラクター名を特定
        let characterName: string | null = null
        let characterId: string | null = null
        
        // マッチしたテキストからキャラクター名を探す
        for (const [name, id] of Array.from(characterMap.entries())) {
          if (matchText.toLowerCase().includes(name)) {
            characterName = this.availableCharacters.find(c => c.id === id)?.name || name
            characterId = id
            break
          }
        }

        if (characterName && characterId) {
          // 移動先を特定（場所名は最後のキャプチャグループと仮定）
          const destination = match[match.length - 1]?.trim()
          
          if (destination) {
            // 移動元を特定（unknownの場合は不明に変換）
            let origin = currentLocations.get(characterId) || '不明'
            if (origin === 'unknown') {
              origin = '不明'
            }
            
            // パターンによって移動元が明示されている場合
            if (match.length >= 3 && match[2]) {
              origin = match[2].trim()
            }

            // 同じ場所への移動でない場合のみ追加
            if (origin !== destination) {
              movements.push({
                characterId,
                characterName,
                from: origin,
                to: destination
              })

              // 現在位置を更新
              currentLocations.set(characterId, destination)
            }
          }
        }
      }
    }

    // AIを使って補完的な移動抽出を行う
    if (movements.length === 0 && this.availableCharacters.length > 0) {
      const aiMovements = await this.extractMovementsWithAI(chapterContent, context)
      movements.push(...aiMovements)
    }

    return movements
  }

  /**
   * AIを使ってキャラクターの移動を抽出
   */
  private async extractMovementsWithAI(
    chapterContent: string,
    context: FlowContext
  ): Promise<Array<{ characterId: string; characterName: string; from: string; to: string }>> {
    const modelSettings = getFeatureModelSettings(this.projectId, 'validation')
    
    const messages: AIMessage[] = [
      {
        role: 'system',
        content: '小説のテキストからキャラクターの移動を抽出してください。移動とは、ある場所から別の場所への物理的な移動を指します。'
      },
      {
        role: 'user',
        content: `以下の章からキャラクターの移動を抽出してください。

【登場可能なキャラクター】
${this.availableCharacters.map(c => `- ${c.name}${c.aliases?.length ? ` (別名: ${c.aliases.join(', ')})` : ''}`).join('\n')}

【前章の終了時の状態】
場所: ${context.previousState?.location || '不明'}
登場キャラクター: ${context.previousState?.charactersPresent?.map((id: string) => 
  this.availableCharacters.find(c => c.id === id)?.name || id
).join('、') || '不明'}

【今回の章の内容】
${chapterContent.substring(0, 2000)}${chapterContent.length > 2000 ? '...' : ''}

以下の形式のJSONで、検出された移動を出力してください：
\`\`\`json
[
  {
    "characterName": "キャラクター名",
    "from": "移動元の場所",
    "to": "移動先の場所"
  }
]
\`\`\`

注意：
- 実際に場所を移動している場合のみ抽出
- 同じ場所内での移動は含めない
- 明確に移動が記述されている場合のみ抽出`
      }
    ]

    try {
      const response = await aiManager.complete({
        model: modelSettings.model,
        messages,
        temperature: 0.3,
        maxTokens: 1000
      })

      const jsonMatch = response.content.match(/```json\n([\s\S]*?)\n```/)
      if (jsonMatch) {
        const movements = JSON.parse(jsonMatch[1])
        
        // キャラクターIDを特定して返す
        return movements.map((m: any) => {
          const character = this.availableCharacters.find(
            c => c.name === m.characterName || 
            c.aliases?.includes(m.characterName)
          )
          
          return {
            characterId: character?.id || '',
            characterName: m.characterName,
            from: m.from,
            to: m.to
          }
        }).filter((m: any) => m.characterId) // IDが特定できたもののみ
      }
    } catch (error) {
      console.error('Failed to extract movements with AI:', error)
    }

    return []
  }

  /**
   * ルール違反をカテゴリに分類
   */
  private categorizeRuleViolation(rule: string): ValidationIssue['category'] {
    const lowerRule = rule.toLowerCase()
    
    if (lowerRule.includes('文字数') || lowerRule.includes('長さ')) {
      return 'word-count'
    }
    if (lowerRule.includes('会話') || lowerRule.includes('対話') || lowerRule.includes('セリフ')) {
      return 'dialogue'
    }
    if (lowerRule.includes('キャラクター') || lowerRule.includes('性格')) {
      return 'character'
    }
    if (lowerRule.includes('プロット') || lowerRule.includes('物語')) {
      return 'plot'
    }
    if (lowerRule.includes('移動') || lowerRule.includes('場所')) {
      return 'travel'
    }
    if (lowerRule.includes('一貫性') || lowerRule.includes('矛盾')) {
      return 'consistency'
    }
    
    return 'rule'
  }

  /**
   * AIの検証レスポンスをパース
   */
  private parseAIValidationResponse(content: string): { issues: Omit<ValidationIssue, 'id'>[] } {
    try {
      // JSONブロックを探す
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1])
        if (parsed.issues && Array.isArray(parsed.issues)) {
          return parsed
        }
      }
      
      // 直接JSONをパース
      const directParse = JSON.parse(content)
      if (directParse.issues && Array.isArray(directParse.issues)) {
        return directParse
      }
    } catch (error) {
      console.error('Failed to parse AI validation response as JSON:', error)
    }
    
    // フォールバック：テキストから問題を抽出
    const issues: Omit<ValidationIssue, 'id'>[] = []
    const lines = content.split('\n')
    
    for (const line of lines) {
      if (line.includes('問題') || line.includes('矛盾') || line.includes('不整合')) {
        issues.push({
          category: 'consistency',
          severity: 'warning',
          title: '一貫性の問題',
          description: line.trim()
        })
      }
    }
    
    return { issues }
  }

  private async executeForeshadowingValidation(context: FlowContext): Promise<FlowContext> {
    this.flowEngine?.log('伏線回収の検証を開始', 'info')
    
    if (!context.chapterContent || !context.chapterPlan) {
      this.flowEngine?.log('章の内容または計画が見つかりません。伏線検証をスキップします。', 'warning')
      return { foreshadowingValidation: { valid: true, warnings: [] } }
    }

    const warnings: string[] = []
    const adjustments: string[] = []

    try {
      // 伏線回収の検証を実施
      const validation = await ForeshadowingTrackerService.validateAndAdjustForeshadowing(
        this.projectId,
        context.chapterId || generateId(),
        context.chapterContent,
        context.chapterPlan,
        context.chapters || [],
        this.aiModel
      )

      warnings.push(...validation.warnings)
      adjustments.push(...validation.adjustments)

      // 検証結果をログ出力
      if (warnings.length > 0) {
        this.flowEngine?.log(`伏線検証で${warnings.length}件の警告が見つかりました`, 'warning')
        warnings.forEach(warning => {
          this.flowEngine?.log(warning, 'warning')
        })
      }

      if (adjustments.length > 0) {
        this.flowEngine?.log(`伏線検証で${adjustments.length}件の調整を行いました`, 'info')
        adjustments.forEach(adjustment => {
          this.flowEngine?.log(adjustment, 'info')
        })
      }

    } catch (error) {
      console.error('伏線検証中にエラーが発生しました:', error)
      this.flowEngine?.log('伏線検証中にエラーが発生しました', 'error')
    }

    return {
      foreshadowingValidation: {
        valid: warnings.length === 0,
        warnings,
        adjustments
      }
    }
  }
}