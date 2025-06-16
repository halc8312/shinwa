import { aiManager } from '../ai/manager'
import { AIMessage } from '../ai/types'
import { 
  Project, 
  WritingRules, 
  WorldSettings, 
  Character, 
  Culture,
  MagicSystem,
  WorldMapSystem
} from '../types'
import { generateId } from '../utils'
import { WorldMapService } from './world-map-service'
import { CharacterLocation } from '../types'

export interface GenerationProgress {
  step: string
  progress: number
  total: number
  message: string
}

export interface GenerationConfig {
  projectId: string
  title: string
  description: string
  aiModel: string
  temperature?: number
  onProgress?: (progress: GenerationProgress) => void
}

export interface GeneratedContent {
  writingRules: WritingRules
  worldSettings: WorldSettings
  characters: Character[]
  worldMapSystem?: WorldMapSystem
  plotOutline?: string
  themes?: string[]
  genre?: string
}

export class ProjectGeneratorService {
  private async generateWithAI(
    systemPrompt: string,
    userPrompt: string,
    model: string,
    temperature: number = 0.7
  ): Promise<string> {
    const messages: AIMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]

    const response = await aiManager.complete({
      model,
      messages,
      temperature,
      maxTokens: 4000
    })

    return response.content
  }

  async generateProjectContent(config: GenerationConfig): Promise<GeneratedContent> {
    const steps = [
      { name: 'プロジェクト分析', weight: 1 },
      { name: '執筆ルール生成', weight: 1 },
      { name: '世界観設定生成', weight: 2 },
      { name: '世界地図生成', weight: 2 },
      { name: 'キャラクター生成', weight: 3 },
      { name: '関係性構築', weight: 1 },
      { name: '初期位置設定', weight: 1 }
    ]

    const totalWeight = steps.reduce((sum, step) => sum + step.weight, 0)
    let currentProgress = 0

    const updateProgress = (stepIndex: number, stepProgress: number = 1) => {
      const completedWeight = steps.slice(0, stepIndex).reduce((sum, step) => sum + step.weight, 0)
      const currentWeight = steps[stepIndex].weight * stepProgress
      currentProgress = (completedWeight + currentWeight) / totalWeight

      if (config.onProgress) {
        config.onProgress({
          step: steps[stepIndex].name,
          progress: Math.round(currentProgress * 100),
          total: 100,
          message: `${steps[stepIndex].name}を実行中...`
        })
      }
    }

    try {
      // Step 1: プロジェクト分析
      updateProgress(0, 0)
      const analysis = await this.analyzeProject(config.title, config.description, config.aiModel, config.temperature)
      updateProgress(0, 1)

      // Step 2: 執筆ルール生成
      updateProgress(1, 0)
      const writingRules = await this.generateWritingRules(analysis, config.aiModel, config.temperature)
      updateProgress(1, 1)

      // Step 3: 世界観設定生成
      updateProgress(2, 0)
      const worldSettings = await this.generateWorldSettings(analysis, config.aiModel, config.temperature)
      updateProgress(2, 1)

      // Step 4: 世界地図生成
      updateProgress(3, 0)
      let worldMapSystem: WorldMapSystem | undefined
      try {
        const worldMapService = new WorldMapService(config.projectId)
        worldMapSystem = await worldMapService.generateWorldMapSystem(
          worldSettings,
          analysis.genre || 'ファンタジー',
          analysis.themes || []
        )
        // 生成した地図をlocalStorageに保存
        worldMapService.saveWorldMapSystem(worldMapSystem)
      } catch (error) {
        console.error('Failed to generate world map:', error)
        // マップ生成に失敗してもプロジェクト生成は続行
      }
      updateProgress(3, 1)

      // Step 5: キャラクター生成
      updateProgress(4, 0)
      const characters = await this.generateCharacters(analysis, worldSettings, config.aiModel, config.temperature)
      updateProgress(4, 1)

      // Step 6: 関係性構築
      updateProgress(5, 0)
      const charactersWithRelationships = await this.generateRelationships(characters, analysis, config.aiModel, config.temperature)
      updateProgress(5, 1)

      // Step 7: キャラクターの初期位置を設定
      updateProgress(6, 0)
      if (worldMapSystem) {
        this.assignInitialLocations(charactersWithRelationships, worldMapSystem, analysis, config.projectId)
      }
      updateProgress(6, 1)

      return {
        writingRules,
        worldSettings,
        characters: charactersWithRelationships,
        worldMapSystem,
        plotOutline: analysis.plotOutline,
        themes: analysis.themes,
        genre: analysis.genre
      }
    } catch (error) {
      console.error('Project generation failed:', error)
      throw error
    }
  }

  private async analyzeProject(
    title: string, 
    description: string, 
    model: string,
    temperature?: number
  ): Promise<any> {
    const systemPrompt = `あなたは経験豊富な小説プロジェクト分析家です。与えられた情報から物語の核心を正確に把握し、詳細な分析を行う必要があります。

【分析指針】
1. タイトルと概要から、著者の意図を正確に読み取る
2. 明示されていない要素も論理的に推測する
3. 一貫性のある世界観構築のための土台を作る

【出力必須項目】
以下のすべての項目を含むJSONオブジェクトを出力してください：

{
  "genre": "メインジャンル（ファンタジー/SF/ミステリー/恋愛/ホラー/歴史/日常/青春等）",
  "tone": "物語の雰囲気（ダーク/シリアス/明るい/コミカル/感動的/スリリング等）",
  "themes": ["テーマ1", "テーマ2", "テーマ3"],
  "setting": "舞台設定の詳細（時代、場所、環境の特徴を含む）",
  "plotOutline": "予想されるストーリーの流れ（起承転結を意識して3-4文で）",
  "characterTypes": ["主人公", "副主人公/相棒", "敵対者/ライバル", "師匠/メンター", "恋愛対象", "コミックリリーフ"],
  "worldComplexity": "simple/moderate/complex のいずれか",
  "suggestedLength": "short（10章以下）/medium（10-30章）/long（30章以上）",
  "coreConflict": "物語の中核となる対立構造を2文で説明",
  "targetAudience": "想定読者層（年齢層、趣向など）",
  "narrativeStyle": "推奨される語り方（一人称/三人称、時制、文体の特徴）"
}

【重要な注意事項】
- すべての項目に具体的な値を入れる
- themesは必ず3つ以上含める
- characterTypesは必ず3種類以上含める
- 曖昧な表現を避け、具体的に記述する`

    const userPrompt = `タイトル: ${title}
概要: ${description}

このプロジェクトを分析してください。`

    const response = await this.generateWithAI(systemPrompt, userPrompt, model, temperature)
    
    try {
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1])
      }
      return JSON.parse(response)
    } catch (error) {
      console.error('Failed to parse analysis:', error)
      // フォールバックの分析結果
      return {
        genre: 'ファンタジー',
        tone: 'シリアス',
        themes: ['成長', '冒険'],
        setting: description,
        plotOutline: '主人公が困難を乗り越えて成長する物語',
        characterTypes: ['主人公', '仲間', '敵対者'],
        worldComplexity: 'moderate',
        suggestedLength: 'medium'
      }
    }
  }

  private async generateWritingRules(
    analysis: any,
    model: string,
    temperature?: number
  ): Promise<WritingRules> {
    const systemPrompt = `あなたはベストセラー作家を指導する文章技法の専門家です。ジャンルとトーンに最適化された執筆ルールを策定する必要があります。

【ルール策定の指針】
1. ジャンル固有の慣習を尊重する
2. ターゲット読者の期待に応える
3. 一貫性と読みやすさを両立させる
4. 物語の没入感を高める技法を含める

【出力形式】
以下の構造を持つJSONオブジェクトを出力してください：

{
  "pointOfView": "first/third/omniscientのいずれか",
  "tense": "past/presentのいずれか",
  "chapterLength": {
    "min": 最小文字数（数値）,
    "max": 最大文字数（数値）
  },
  "language": "ja",
  "style": "文体ルール（複数行の詳細な説明）"
}

【視点選択の基準】
- first（一人称）: 感情移入を重視、恋愛・青春・ミステリーに適する
- third（三人称）: バランスが良く、ほとんどのジャンルで有効
- omniscient（神視点）: 壮大なスケールの物語、歴史・ファンタジー大作に適する

【時制選択の基準】
- past（過去形）: 伝統的で安定、ほとんどのジャンルで推奨
- present（現在形）: 臨場感を重視、スリラー・アクションに適する

【文体ルールの要素】
styleフィールドには以下を含めてください：
1. 文章のリズムとテンポ
2. 描写の詳細度とバランス
3. 会話文の特徴
4. 感情表現の方法
5. 場面転換の技法
6. 章の始まりと終わりのパターン
7. ジャンル固有の文体要素`

    const userPrompt = `分析結果:
ジャンル: ${analysis.genre}
トーン: ${analysis.tone}
テーマ: ${analysis.themes.join(', ')}
推奨長さ: ${analysis.suggestedLength}

この物語に最適な執筆ルールを生成してください。`

    const response = await this.generateWithAI(systemPrompt, userPrompt, model, temperature)
    
    try {
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1])
      }
      return JSON.parse(response)
    } catch (error) {
      console.error('Failed to parse writing rules:', error)
      // デフォルトの執筆ルール
      return {
        pointOfView: 'third',
        tense: 'past',
        chapterLength: { min: 3000, max: 5000 },
        language: 'ja',
        style: '読みやすく、感情豊かな文体で執筆する。'
      }
    }
  }

  private async generateWorldSettings(
    analysis: any,
    model: string,
    temperature?: number
  ): Promise<WorldSettings> {
    const systemPrompt = `あなたはプロフェッショナルな世界観デザイナーです。読者を引き込む魅力的で一貫性のある世界を構築する任務があります。

【世界構築の指針】
1. ジャンルとトーンに適した世界を設計する
2. 現実世界でもファンタジー世界でも、独自性を持たせる
3. 各要素が有機的に結びつくようにする
4. 物語の舞台として機能する実用的な設定を作る

【出力形式】
以下の構造を持つJSONオブジェクトを出力してください：

{
  "name": "世界の名前（オリジナルで印象的な名前）",
  "description": "世界の概要を3-5文で詳細に説明。特徴的な要素を必ず含める",
  "era": "時代設定（古代/中世/近世/近代/現代/近未来/未来/その他）",
  "geography": [
    "主要都市・地域1（特徴を含む説明）",
    "主要都市・地域2（特徴を含む説明）",
    "主要都市・地域3（特徴を含む説明）",
    "重要な地形・ランドマーク"
  ],
  "cultures": [
    {
      "name": "主要文化の名前",
      "description": "その文化の特徴を2-3文で説明",
      "values": ["価値観1", "価値観2", "価値観3"],
      "customs": ["習慣・伝統1", "習慣・伝統2", "習慣・伝統3"]
    }
  ],
  "magicSystem": {
    "name": "システムの名前",
    "rules": [
      "基本ルール1：どのように機能するか",
      "基本ルール2：誰が使えるか",
      "基本ルール3：発動条件"
    ],
    "limitations": [
      "制霄1：使用時の制約",
      "制霄2：代償やリスク",
      "制霄3：範囲や威力の限界"
    ],
    "sources": [
      "力の源1：どこから力を得るか",
      "力の源2：何が必要か"
    ]
  }
}

【重要な注意事項】
- geographyは必ず4つ以上の場所を含める
- 各地域には特徴や重要性を説明した詳細を付ける
- ファンタジー/SF以外のジャンルでは、magicSystemをnullにする
- 現代・日常設定でも、独自の文化や地域特性を加える
- すべての要素が相互に関連し、物語に影響を与えるようにする`

    const userPrompt = `分析結果:
ジャンル: ${analysis.genre}
設定: ${analysis.setting}
世界の複雑さ: ${analysis.worldComplexity}

この物語の世界観を生成してください。`

    const response = await this.generateWithAI(systemPrompt, userPrompt, model, temperature)
    
    try {
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1])
        // magicSystemがnullの場合は除外
        if (parsed.magicSystem === null) {
          delete parsed.magicSystem
        }
        return parsed
      }
      return JSON.parse(response)
    } catch (error) {
      console.error('Failed to parse world settings:', error)
      // デフォルトの世界観設定
      return {
        name: '新しい世界',
        description: analysis.setting || '物語の舞台',
        era: '現代',
        geography: ['主要都市', '郊外', '自然地域'],
        cultures: []
      }
    }
  }

  private async generateCharacters(
    analysis: any,
    worldSettings: WorldSettings,
    model: string,
    temperature?: number
  ): Promise<Character[]> {
    const systemPrompt = `あなたは優秀なキャラクター創造の専門家です。物語に必要な魅力的で多面的なキャラクターを生成する任務があります。

【重要な指示】
1. 各キャラクターは独自の個性と深みを持つ必要があります
2. キャラクター同士の対比や補完関係を意識してください
3. 物語のテーマを体現するキャラクターを含めてください
4. 必ず以下のJSON形式に厳密に従ってください

【出力形式】
各キャラクターは必ず以下の構造を持つJSONオブジェクトとして出力してください：
{
  "name": "キャラクターの通称・呼び名",
  "fullName": "正式なフルネーム（nameと同じ場合も可）",
  "age": 年齢（数値）,
  "gender": "性別（男性/女性/その他/不明）",
  "role": "protagonist/antagonist/mentor/sidekick/love_interest/rival/supporting",
  "personality": ["性格特性1", "性格特性2", "性格特性3", "性格特性4", "性格特性5"],
  "background": "そのキャラクターの生い立ちや経歴を2-3文で説明",
  "appearance": "外見的特徴（髪色、体格、特徴的な装飾品など）を1-2文で説明",
  "goals": ["短期的な目標", "長期的な目標"],
  "conflicts": "内的葛藤や外的障害を1-2文で説明",
  "growthArc": "物語を通じての成長や変化の方向性を1文で説明",
  "skills": ["能力1", "能力2", "能力3"],
  "weaknesses": ["弱点1", "弱点2"],
  "relationships": []
}

【personality配列の指針】
- 必ず5つの性格特性を配列として含める
- 例: ["勇敢", "正義感が強い", "頑固", "情に厚い", "直感的"]
- 肯定的な特性と否定的な特性をバランスよく含める
- 各特性は2-4文字の簡潔な形容詞や形容動詞で表現

【生成するキャラクター数】
- 主人公（protagonist）: 1名
- 敵対者（antagonist）: 物語に必要な場合
- その他の重要キャラクター: 物語の規模と複雑さに応じて適切な人数
- 合計: 物語に必要な人数を柔軟に生成（最低3名以上）

必ずJSON配列として、上記の形式に完全に準拠したキャラクターデータを返してください。`

    const userPrompt = `分析結果:
必要なキャラクタータイプ: ${analysis.characterTypes.join(', ')}
ジャンル: ${analysis.genre}
テーマ: ${analysis.themes.join(', ')}

世界観:
${worldSettings.name} - ${worldSettings.description}

物語の規模と複雑さに応じて必要な主要キャラクターを生成してください。`

    const response = await this.generateWithAI(systemPrompt, userPrompt, model, temperature)
    
    try {
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/)
      let characters: any[]
      if (jsonMatch) {
        characters = JSON.parse(jsonMatch[1])
      } else {
        characters = JSON.parse(response)
      }

      // IDを追加して正式なCharacter型に変換
      return characters.map(char => ({
        ...char,
        id: generateId(),
        // personalityが文字列の場合は配列に変換
        personality: Array.isArray(char.personality) 
          ? char.personality 
          : typeof char.personality === 'string'
            ? char.personality.split('、').map((trait: string) => trait.trim())
            : [],
        // goalsが文字列の場合は配列に変換
        goals: Array.isArray(char.goals)
          ? char.goals
          : typeof char.goals === 'string'
            ? [char.goals]
            : [],
        // 不足しているフィールドのデフォルト値
        arc: char.arc || {
          start: char.background || '',
          journey: [char.conflicts || ''],
          end: char.growthArc || ''
        }
      }))
    } catch (error) {
      console.error('Failed to parse characters:', error)
      // 最小限のキャラクター
      return [{
        id: generateId(),
        name: '主人公',
        age: 20,
        role: 'protagonist',
        personality: ['勇敢', '正義感が強い', '直感的', '楽観的', '行動的'],
        background: '普通の生活を送っていたが、運命に導かれて冒険に出る',
        appearance: '平均的な体格で、明るい瞳を持つ',
        goals: ['仲間を守る', '世界を救う'],
        relationships: [],
        arc: {
          start: '普通の生活を送る若者',
          journey: ['仲間との出会い', '試練の克服', '自己の発見'],
          end: '真の英雄への成長'
        }
      }]
    }
  }

  private async generateRelationships(
    characters: Character[],
    analysis: any,
    model: string,
    temperature?: number
  ): Promise<Character[]> {
    const systemPrompt = `あなたはキャラクター関係性の専門家です。
与えられたキャラクターリストから、物語を豊かにする関係性を構築してください。

以下の形式で各キャラクターの関係性を出力してください：
{
  "characterId": "キャラクターID",
  "relationships": [
    {
      "targetId": "相手のキャラクターID",
      "type": "friend" | "rival" | "family" | "mentor" | "love" | "enemy" | "colleague" | "other",
      "description": "関係性の詳細な説明",
      "strength": 1-10の数値（関係の強さ）
    }
  ]
}

キャラクター全員分の関係性を含む配列をJSON形式で返してください。
関係性は双方向に定義する必要はありません（A→Bを定義したら、B→Aは不要）。`

    const characterList = characters.map(c => ({
      id: c.id,
      name: c.name,
      role: c.role
    }))

    const userPrompt = `キャラクターリスト:
${JSON.stringify(characterList, null, 2)}

テーマ: ${analysis.themes.join(', ')}

これらのキャラクター間の関係性を構築してください。`

    const response = await this.generateWithAI(systemPrompt, userPrompt, model, temperature)
    
    try {
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/)
      let relationshipData: any[]
      if (jsonMatch) {
        relationshipData = JSON.parse(jsonMatch[1])
      } else {
        relationshipData = JSON.parse(response)
      }

      // キャラクターに関係性を追加
      const updatedCharacters = characters.map(char => {
        const charRelations = relationshipData.find(r => r.characterId === char.id)
        if (charRelations && charRelations.relationships) {
          return {
            ...char,
            relationships: charRelations.relationships.map((rel: any) => ({
              ...rel,
              id: generateId()
            }))
          }
        }
        return char
      })

      return updatedCharacters
    } catch (error) {
      console.error('Failed to parse relationships:', error)
      return characters
    }
  }

  // 生成されたコンテンツのプレビュー用テキストを作成
  private assignInitialLocations(
    characters: Character[],
    worldMapSystem: WorldMapSystem,
    analysis: any,
    projectId: string
  ): void {
    // キャラクター位置を保存するためのマップ
    const characterLocations: Record<string, CharacterLocation> = {}
    const worldMap = worldMapSystem.worldMap

    // 世界地図の場所を種類別に分類
    const capitals = worldMap.locations.filter(loc => loc.type === 'capital')
    const majorCities = worldMap.locations.filter(loc => loc.type === 'major_city')
    
    // 地域地図からの場所を収集
    const regionalLocations = worldMapSystem.regions.flatMap(region => region.locations)
    const towns = regionalLocations.filter(loc => loc.type === 'town')
    const villages = regionalLocations.filter(loc => loc.type === 'village')
    const sacredSites = regionalLocations.filter(loc => 
      loc.description && (loc.description.includes('聖地') || loc.description.includes('神殿') || loc.description.includes('学院'))
    )
    const fortresses = regionalLocations.filter(loc => 
      loc.description && (loc.description.includes('要塞') || loc.description.includes('城'))
    )

    // すべての場所のリスト（優先度順）
    const allWorldLocations = [...capitals, ...majorCities]
    const allRegionalLocations = [...towns, ...sacredSites, ...fortresses, ...villages]

    characters.forEach(character => {
      let assignedLocation: string | null = null
      let mapLevel: 'world' | 'region' = 'world'

      // 役割に基づいて適切な場所を選択
      switch (character.role) {
        case 'protagonist':
          // 主人公は首都または主要都市に配置
          if (capitals.length > 0) {
            assignedLocation = capitals[0].id
          } else if (majorCities.length > 0) {
            assignedLocation = majorCities[0].id
          } else if (allWorldLocations.length > 0) {
            assignedLocation = allWorldLocations[0].id
          } else if (allRegionalLocations.length > 0) {
            assignedLocation = allRegionalLocations[0].id
            mapLevel = 'region'
          }
          break

        case 'mentor':
          // メンターは聖地、学術都市、または離れた場所に配置
          if (sacredSites.length > 0) {
            assignedLocation = sacredSites[Math.floor(Math.random() * sacredSites.length)].id
            mapLevel = 'region'
          } else if (towns.length > 0) {
            assignedLocation = towns[Math.floor(Math.random() * towns.length)].id
            mapLevel = 'region'
          } else if (allWorldLocations.length > 1) {
            // 主人公とは別の場所に
            assignedLocation = allWorldLocations[1].id
          } else if (allRegionalLocations.length > 0) {
            assignedLocation = allRegionalLocations[0].id
            mapLevel = 'region'
          }
          break

        case 'antagonist':
          // 敵対者は要塞、辺境、または主人公から離れた場所に配置
          if (fortresses.length > 0) {
            assignedLocation = fortresses[Math.floor(Math.random() * fortresses.length)].id
            mapLevel = 'region'
          } else if (villages.length > 0) {
            // 辺境の村
            assignedLocation = villages[villages.length - 1].id
            mapLevel = 'region'
          } else if (allWorldLocations.length > 2) {
            // できるだけ離れた場所
            assignedLocation = allWorldLocations[allWorldLocations.length - 1].id
          } else if (allRegionalLocations.length > 0) {
            assignedLocation = allRegionalLocations[allRegionalLocations.length - 1].id
            mapLevel = 'region'
          }
          break

        case 'supporting':
                  // 仲間は主人公と同じか近くの場所、または様々な場所に分散
          const randomChoice = Math.random()
          if (randomChoice < 0.3 && capitals.length > 0) {
            // 30%の確率で首都
            assignedLocation = capitals[0].id
          } else if (randomChoice < 0.6 && majorCities.length > 0) {
            // 30%の確率で主要都市
            assignedLocation = majorCities[Math.floor(Math.random() * majorCities.length)].id
          } else if (towns.length > 0) {
            // それ以外は町
            assignedLocation = towns[Math.floor(Math.random() * towns.length)].id
            mapLevel = 'region'
          } else if (allWorldLocations.length > 0) {
            // ランダムな場所
            assignedLocation = allWorldLocations[Math.floor(Math.random() * allWorldLocations.length)].id
          } else if (allRegionalLocations.length > 0) {
            assignedLocation = allRegionalLocations[Math.floor(Math.random() * allRegionalLocations.length)].id
            mapLevel = 'region'
          }
          break

        case 'love_interest':
          // 恋愛対象は主人公と同じか近くの場所
          if (capitals.length > 0) {
            assignedLocation = capitals[0].id
          } else if (majorCities.length > 0) {
            assignedLocation = majorCities[0].id
          } else if (allWorldLocations.length > 0) {
            assignedLocation = allWorldLocations[0].id
          } else if (allRegionalLocations.length > 0) {
            assignedLocation = allRegionalLocations[0].id
            mapLevel = 'region'
          }
          break

        case 'rival':
          // ライバルは主人公と同じか別の主要都市
          if (majorCities.length > 1) {
            assignedLocation = majorCities[1].id
          } else if (capitals.length > 0 && majorCities.length > 0) {
            assignedLocation = majorCities[0].id
          } else if (allWorldLocations.length > 1) {
            assignedLocation = allWorldLocations[1].id
          } else if (allRegionalLocations.length > 0) {
            assignedLocation = allRegionalLocations[0].id
            mapLevel = 'region'
          }
          break

        default:
          // その他のキャラクターはランダムに配置
          if (allWorldLocations.length > 0) {
            assignedLocation = allWorldLocations[Math.floor(Math.random() * allWorldLocations.length)].id
          } else if (allRegionalLocations.length > 0) {
            assignedLocation = allRegionalLocations[Math.floor(Math.random() * allRegionalLocations.length)].id
            mapLevel = 'region'
          }
      }

      // 初期位置を設定
      if (assignedLocation) {
        characterLocations[character.id] = {
          characterId: character.id,
          currentLocation: {
            mapLevel: mapLevel,
            locationId: assignedLocation
          },
          locationHistory: [
            {
              locationId: assignedLocation,
              arrivalChapter: 0, // プロローグまたは第1章
              significantEvents: ['物語の開始']
            }
          ]
        }
      } else {
        // デフォルトの場所が見つからない場合、最初の利用可能な場所を割り当てる
        if (allWorldLocations.length > 0) {
          characterLocations[character.id] = {
            characterId: character.id,
            currentLocation: {
              mapLevel: 'world',
              locationId: allWorldLocations[0].id
            },
            locationHistory: [
              {
                locationId: allWorldLocations[0].id,
                arrivalChapter: 0,
                significantEvents: ['物語の開始']
              }
            ]
          }
        } else if (allRegionalLocations.length > 0) {
          characterLocations[character.id] = {
            characterId: character.id,
            currentLocation: {
              mapLevel: 'region',
              locationId: allRegionalLocations[0].id
            },
            locationHistory: [
              {
                locationId: allRegionalLocations[0].id,
                arrivalChapter: 0,
                significantEvents: ['物語の開始']
              }
            ]
          }
        }
        // それでも場所が見つからない場合は、unknownのままになる
      }
    })

    // localStorageに保存
    if (Object.keys(characterLocations).length > 0) {
      localStorage.setItem(
        `shinwa-character-location-${projectId}`,
        JSON.stringify(characterLocations)
      )
    }
  }

  // 生成されたコンテンツのプレビュー用テキストを作成
  generatePreviewText(content: GeneratedContent): string {
    const sections: string[] = []

    sections.push('## 執筆ルール')
    sections.push(`- 視点: ${content.writingRules.pointOfView === 'first' ? '一人称' : content.writingRules.pointOfView === 'third' ? '三人称' : '神視点'}`)
    sections.push(`- 時制: ${content.writingRules.tense === 'past' ? '過去形' : '現在形'}`)
    sections.push(`- 章の文字数: ${content.writingRules.chapterLength.min}〜${content.writingRules.chapterLength.max}文字`)
    sections.push(`\n### 文体\n${content.writingRules.style}`)

    sections.push('\n## 世界観設定')
    sections.push(`### ${content.worldSettings.name}`)
    sections.push(content.worldSettings.description)
    sections.push(`時代: ${content.worldSettings.era}`)
    
    if (content.worldSettings.geography.length > 0) {
      sections.push(`\n主要な場所: ${content.worldSettings.geography.join(', ')}`)
    }

    // 世界地図情報を追加
    if (content.worldMapSystem) {
      sections.push('\n### 世界地図')
      sections.push(`生成された場所: ${content.worldMapSystem.worldMap.locations.length}箇所`)
      const capitals = content.worldMapSystem.worldMap.locations.filter(loc => loc.type === 'capital')
      const cities = content.worldMapSystem.worldMap.locations.filter(loc => loc.type === 'major_city')
      if (capitals.length > 0) {
        sections.push(`首都: ${capitals.map(c => c.name).join(', ')}`)
      }
      if (cities.length > 0) {
        sections.push(`主要都市: ${cities.map(c => c.name).join(', ')}`)
      }
      if (content.worldMapSystem.regions.length > 0) {
        sections.push(`詳細な地域マップ: ${content.worldMapSystem.regions.length}地域`)
      }
    }

    if (content.worldSettings.cultures.length > 0) {
      sections.push('\n### 文化')
      content.worldSettings.cultures.forEach(culture => {
        sections.push(`- ${culture.name}: ${culture.description}`)
      })
    }

    sections.push('\n## キャラクター')
    content.characters.forEach(char => {
      sections.push(`\n### ${char.name}（${char.age}歳）`)
      sections.push(`役割: ${char.role}`)
      sections.push(`性格: ${char.personality}`)
      sections.push(`目標: ${char.goals}`)
      
      // 初期位置情報を表示（プレビュー時にはprojectIdが不明なため、マップから直接探す）
      if (content.worldMapSystem) {
        // 役割に基づいた推定位置を表示
        let estimatedLocation = null
        const worldMap = content.worldMapSystem.worldMap
        const capitals = worldMap.locations.filter(loc => loc.type === 'capital')
        const majorCities = worldMap.locations.filter(loc => loc.type === 'major_city')
        const regionalLocations = content.worldMapSystem.regions.flatMap(region => region.locations)
        const sacredSites = regionalLocations.filter(loc => 
          loc.description && (loc.description.includes('聖地') || loc.description.includes('神殿') || loc.description.includes('学院'))
        )
        const fortresses = regionalLocations.filter(loc => 
          loc.description && (loc.description.includes('要塞') || loc.description.includes('城'))
        )
        
        switch (char.role) {
          case 'protagonist':
            if (capitals.length > 0) estimatedLocation = capitals[0].name
            else if (majorCities.length > 0) estimatedLocation = majorCities[0].name
            break
          case 'mentor':
            if (sacredSites.length > 0) estimatedLocation = sacredSites[0].name
            break
          case 'antagonist':
            if (fortresses.length > 0) estimatedLocation = fortresses[0].name
            break
          case 'love_interest':
            if (capitals.length > 0) estimatedLocation = capitals[0].name
            else if (majorCities.length > 0) estimatedLocation = majorCities[0].name
            break
        }
        
        if (estimatedLocation) {
          sections.push(`初期位置: ${estimatedLocation}（推定）`)
        }
      }
      
      if (char.relationships.length > 0) {
        sections.push('関係性:')
        char.relationships.forEach(rel => {
          const target = content.characters.find(c => c.id === rel.characterId)
          if (target) {
            sections.push(`- ${target.name}との関係: ${rel.description}`)
          }
        })
      }
    })

    if (content.plotOutline) {
      sections.push('\n## プロット概要')
      sections.push(content.plotOutline)
    }

    if (content.themes && content.themes.length > 0) {
      sections.push('\n## テーマ')
      sections.push(content.themes.join(', '))
    }

    return sections.join('\n')
  }
}

export const projectGeneratorService = new ProjectGeneratorService()