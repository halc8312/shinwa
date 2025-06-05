import { aiManager } from '../ai/manager'
import { AIMessage } from '../ai/types'
import { 
  Project, 
  WritingRules, 
  WorldSettings, 
  Character, 
  CharacterRelationship,
  Culture,
  MagicSystem
} from '../types'
import { generateId } from '../utils'

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
  plotOutline?: string
  themes?: string[]
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
      { name: 'キャラクター生成', weight: 3 },
      { name: '関係性構築', weight: 1 }
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

      // Step 4: キャラクター生成
      updateProgress(3, 0)
      const characters = await this.generateCharacters(analysis, worldSettings, config.aiModel, config.temperature)
      updateProgress(3, 1)

      // Step 5: 関係性構築
      updateProgress(4, 0)
      const charactersWithRelationships = await this.generateRelationships(characters, analysis, config.aiModel, config.temperature)
      updateProgress(4, 1)

      return {
        writingRules,
        worldSettings,
        characters: charactersWithRelationships,
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
- 敵対者（antagonist）: 1名（物語によっては不要な場合あり）
- その他の重要キャラクター: 3-6名
- 合計: 5-8名

必ずJSON配列として、上記の形式に完全に準拠したキャラクターデータを返してください。`

    const userPrompt = `分析結果:
必要なキャラクタータイプ: ${analysis.characterTypes.join(', ')}
ジャンル: ${analysis.genre}
テーマ: ${analysis.themes.join(', ')}

世界観:
${worldSettings.name} - ${worldSettings.description}

5-8人程度の主要キャラクターを生成してください。`

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
        conflicts: '自分の力への疑い',
        growthArc: '弱さを受け入れ、真の強さを見つける',
        skills: ['決断力', '適応力', 'リーダーシップ'],
        weaknesses: ['経験不足', '感情的になりやすい'],
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
      
      if (char.relationships.length > 0) {
        sections.push('関係性:')
        char.relationships.forEach(rel => {
          const target = content.characters.find(c => c.id === rel.targetId)
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