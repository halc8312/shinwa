import {
  WorldMapSystem,
  WorldMap,
  RegionMap,
  LocalMap,
  MapConnection,
  TravelTime,
  TravelMethod,
  WorldLocation,
  RegionalLocation,
  LocalArea,
  GeographicalFeature,
  TerrainFeature,
  CharacterLocation,
  LocationHistoryEntry,
  WorldSettings
} from '../types'
import { aiManager } from '../ai/manager'
import { AIMessage } from '../ai/types'
import { getFeatureModelSettings } from '../utils/ai-settings'
import { generateId } from '../utils'

export class WorldMapService {
  private projectId: string

  constructor(projectId: string) {
    this.projectId = projectId
  }

  /**
   * 世界地図システムを生成
   */
  async generateWorldMapSystem(
    worldSettings: WorldSettings,
    genre: string,
    themes: string[]
  ): Promise<WorldMapSystem> {
    const modelSettings = getFeatureModelSettings(this.projectId, 'assistant')
    
    // まず世界地図を生成
    const worldMap = await this.generateWorldMap(worldSettings, genre, themes, modelSettings)
    
    // 主要な場所に対して地域マップを生成
    const regions: RegionMap[] = []
    const majorLocations = worldMap.locations.filter(
      loc => loc.type === 'capital' || loc.type === 'major_city'
    ).slice(0, 3) // 最初は3つの主要都市のみ

    for (const location of majorLocations) {
      const regionMap = await this.generateRegionMap(
        location,
        worldSettings,
        genre,
        modelSettings
      )
      regions.push(regionMap)
    }

    // 接続関係を生成
    const connections = this.generateConnections(worldMap, regions)
    
    // 移動時間を計算
    const travelTimes = this.calculateTravelTimes(connections, worldSettings)

    return {
      worldMap,
      regions,
      localMaps: [], // 初期は空、必要に応じて生成
      connections,
      travelTimes
    }
  }

  /**
   * 世界地図を生成
   */
  private async generateWorldMap(
    worldSettings: WorldSettings,
    genre: string,
    themes: string[],
    modelSettings: any
  ): Promise<WorldMap> {
    const messages: AIMessage[] = [
      {
        role: 'system',
        content: `あなたは${genre}ファンタジー世界の地図製作者です。
世界設定に基づいて、物語の舞台となる世界の地図情報を生成してください。
距離感覚を正確に保ち、移動にかかる時間を現実的に設定することが重要です。`
      },
      {
        role: 'user',
        content: `以下の世界設定に基づいて、世界地図の情報を生成してください。

【世界設定】
世界名: ${worldSettings.name}
時代: ${worldSettings.era}
説明: ${worldSettings.description || 'なし'}
地理: ${worldSettings.geography?.join('、') || '特に指定なし'}

【ジャンル】${genre}
【テーマ】${themes.join('、')}

以下の形式のJSON配列で、世界の主要な場所を10〜15個程度生成してください：

\`\`\`json
{
  "locations": [
    {
      "id": "一意のID",
      "name": "場所の名前",
      "type": "continent/country/capital/major_city/landmark",
      "coordinates": { "x": 0-100の数値, "y": 0-100の数値 },
      "description": "場所の説明",
      "population": 人口（該当する場合）,
      "climate": "気候",
      "culturalAffiliation": "文化圏"
    }
  ],
  "geography": [
    {
      "type": "mountain/river/forest/desert/ocean/plain",
      "name": "地形の名前",
      "description": "地形の説明",
      "area": {
        "topLeft": { "x": 数値, "y": 数値 },
        "bottomRight": { "x": 数値, "y": 数値 }
      }
    }
  ]
}
\`\`\`

重要：
- 座標は0-100の相対値で、左上が(0,0)、右下が(100,100)
- 場所間の距離を現実的に配置（隣接する都市は最低でも座標で5以上離す）
- 地理的特徴（山脈、河川など）を考慮した配置
- 文化圏や気候を考慮した論理的な配置`
      }
    ]

    try {
      const response = await aiManager.complete({
        model: modelSettings.model,
        messages,
        temperature: 0.7,
        maxTokens: 3000
      })

      const parsed = this.parseWorldMapResponse(response.content)
      
      return {
        id: generateId(),
        name: worldSettings.name,
        description: worldSettings.description || '',
        scale: 'world',
        locations: parsed.locations,
        geography: parsed.geography
      }
    } catch (error) {
      console.error('Failed to generate world map:', error)
      return this.createFallbackWorldMap(worldSettings)
    }
  }

  /**
   * 地域マップを生成
   */
  private async generateRegionMap(
    parentLocation: WorldLocation,
    worldSettings: WorldSettings,
    genre: string,
    modelSettings: any
  ): Promise<RegionMap> {
    const messages: AIMessage[] = [
      {
        role: 'system',
        content: `あなたは${genre}ファンタジー世界の地域地図製作者です。
世界の一部地域の詳細な地図を作成してください。`
      },
      {
        role: 'user',
        content: `${parentLocation.name}（${parentLocation.description}）周辺の地域地図を生成してください。

【世界設定】
世界名: ${worldSettings.name}
時代: ${worldSettings.era}

以下の形式のJSONで、地域の場所を10〜20個程度生成してください：

\`\`\`json
{
  "locations": [
    {
      "id": "一意のID",
      "name": "場所の名前",
      "type": "city/town/village/landmark/dungeon/wilderness",
      "coordinates": { "x": 0-100, "y": 0-100 },
      "description": "場所の説明",
      "population": 人口（該当する場合）,
      "importance": "major/moderate/minor",
      "services": ["宿屋", "商店", "神殿"]
    }
  ],
  "terrain": [
    {
      "type": "hill/valley/lake/road/bridge/ruin",
      "name": "地形の名前",
      "description": "説明",
      "position": { "x": 数値, "y": 数値 }
    }
  ]
}
\`\`\`

重要：
- ${parentLocation.name}を中心（50,50）に配置
- 徒歩での移動時間を考慮（隣接する村は半日〜1日の距離）
- 道路や地形を考慮した現実的な配置`
      }
    ]

    try {
      const response = await aiManager.complete({
        model: modelSettings.model,
        messages,
        temperature: 0.7,
        maxTokens: 2500
      })

      const parsed = this.parseRegionMapResponse(response.content)
      
      return {
        id: generateId(),
        parentLocationId: parentLocation.id,
        name: `${parentLocation.name}地方`,
        description: `${parentLocation.name}を中心とした地域`,
        scale: 'region',
        locations: parsed.locations,
        terrain: parsed.terrain
      }
    } catch (error) {
      console.error('Failed to generate region map:', error)
      return this.createFallbackRegionMap(parentLocation)
    }
  }

  /**
   * 接続関係を生成
   */
  private generateConnections(
    worldMap: WorldMap,
    regions: RegionMap[]
  ): MapConnection[] {
    const connections: MapConnection[] = []

    // 世界レベルの接続（主要都市間）
    const majorCities = worldMap.locations.filter(
      loc => loc.type === 'capital' || loc.type === 'major_city'
    )

    for (let i = 0; i < majorCities.length; i++) {
      for (let j = i + 1; j < majorCities.length; j++) {
        const distance = this.calculateDistance(
          majorCities[i].coordinates,
          majorCities[j].coordinates
        )

        // 距離が30以下なら道路接続
        if (distance <= 30) {
          connections.push({
            id: generateId(),
            fromLocationId: majorCities[i].id,
            toLocationId: majorCities[j].id,
            bidirectional: true,
            connectionType: 'road',
            difficulty: 'easy',
            description: `${majorCities[i].name}と${majorCities[j].name}を結ぶ街道`
          })
        }
      }
    }

    // 地域レベルの接続
    for (const region of regions) {
      const locations = region.locations.filter(
        loc => loc.type === 'city' || loc.type === 'town'
      )

      for (let i = 0; i < locations.length; i++) {
        for (let j = i + 1; j < locations.length; j++) {
          const distance = this.calculateDistance(
            locations[i].coordinates,
            locations[j].coordinates
          )

          if (distance <= 20) {
            connections.push({
              id: generateId(),
              fromLocationId: locations[i].id,
              toLocationId: locations[j].id,
              bidirectional: true,
              connectionType: distance <= 10 ? 'road' : 'path',
              difficulty: distance <= 10 ? 'easy' : 'moderate'
            })
          }
        }
      }
    }

    return connections
  }

  /**
   * 移動時間を計算
   */
  private calculateTravelTimes(
    connections: MapConnection[],
    worldSettings: WorldSettings
  ): TravelTime[] {
    const travelTimes: TravelTime[] = []
    
    // 時代設定に基づいて利用可能な移動手段を決定
    const availableMethods = this.getAvailableTravelMethods(worldSettings.era)

    for (const connection of connections) {
      for (const method of availableMethods) {
        // 接続タイプと移動手段の互換性をチェック
        if (this.isCompatibleTravelMethod(connection.connectionType, method.type)) {
          const baseTime = this.calculateBaseTime(
            connection,
            method,
            worldSettings
          )

          travelTimes.push({
            connectionId: connection.id,
            travelMethod: method,
            baseTime,
            conditions: []
          })
        }
      }
    }

    return travelTimes
  }

  /**
   * 距離を計算
   */
  private calculateDistance(
    coord1: { x: number; y: number },
    coord2: { x: number; y: number }
  ): number {
    const dx = coord2.x - coord1.x
    const dy = coord2.y - coord1.y
    return Math.sqrt(dx * dx + dy * dy)
  }

  /**
   * 利用可能な移動手段を取得
   */
  private getAvailableTravelMethods(era: string): TravelMethod[] {
    const methods: TravelMethod[] = [
      {
        type: 'walk',
        speed: 4,
        availability: 'common',
        requirements: []
      }
    ]

    // 時代に応じて移動手段を追加
    if (era !== '原始' && era !== '古代') {
      methods.push({
        type: 'horse',
        speed: 30,
        availability: 'common',
        requirements: ['馬']
      })
    }

    if (era === '中世' || era === '近世') {
      methods.push({
        type: 'carriage',
        speed: 15,
        availability: 'uncommon',
        requirements: ['馬車', '街道']
      })
    }

    if (era === '魔法時代' || era.includes('ファンタジー')) {
      methods.push({
        type: 'flight',
        speed: 60,
        availability: 'rare',
        requirements: ['飛行魔法', '飛竜']
      })
    }

    return methods
  }

  /**
   * 移動手段と接続タイプの互換性をチェック
   */
  private isCompatibleTravelMethod(
    connectionType: string,
    travelType: string
  ): boolean {
    if (travelType === 'walk') return true
    if (travelType === 'horse' && ['road', 'path'].includes(connectionType)) return true
    if (travelType === 'carriage' && connectionType === 'road') return true
    if (travelType === 'ship' && ['river', 'sea_route'].includes(connectionType)) return true
    if (travelType === 'flight') return true
    return false
  }

  /**
   * 基本移動時間を計算（分単位）
   */
  private calculateBaseTime(
    connection: MapConnection,
    method: TravelMethod,
    worldSettings: WorldSettings
  ): number {
    // 世界スケールでの1単位を50kmと仮定
    const worldScaleKm = 50
    // 地域スケールでの1単位を2kmと仮定
    const regionScaleKm = 2

    // 接続の距離を推定（簡易的に座標差から）
    let estimatedDistanceKm = 100 // デフォルト

    // 難易度による調整
    const difficultyMultiplier = {
      easy: 1.0,
      moderate: 1.5,
      difficult: 2.0,
      dangerous: 3.0
    }

    const adjustedSpeed = method.speed / difficultyMultiplier[connection.difficulty]
    const timeHours = estimatedDistanceKm / adjustedSpeed
    
    return Math.round(timeHours * 60) // 分に変換
  }

  /**
   * レスポンスをパース（世界地図）
   */
  private parseWorldMapResponse(content: string): {
    locations: WorldLocation[]
    geography: GeographicalFeature[]
  } {
    try {
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1])
        return {
          locations: parsed.locations.map((loc: any) => ({
            ...loc,
            id: loc.id || generateId()
          })),
          geography: parsed.geography || []
        }
      }
    } catch (error) {
      console.error('Failed to parse world map response:', error)
    }

    return {
      locations: [],
      geography: []
    }
  }

  /**
   * レスポンスをパース（地域地図）
   */
  private parseRegionMapResponse(content: string): {
    locations: RegionalLocation[]
    terrain: TerrainFeature[]
  } {
    try {
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1])
        return {
          locations: parsed.locations.map((loc: any) => ({
            ...loc,
            id: loc.id || generateId()
          })),
          terrain: parsed.terrain || []
        }
      }
    } catch (error) {
      console.error('Failed to parse region map response:', error)
    }

    return {
      locations: [],
      terrain: []
    }
  }

  /**
   * フォールバック世界地図
   */
  private createFallbackWorldMap(worldSettings: WorldSettings): WorldMap {
    return {
      id: generateId(),
      name: worldSettings.name,
      description: worldSettings.description || '',
      scale: 'world',
      locations: [
        {
          id: generateId(),
          name: '王都',
          type: 'capital',
          coordinates: { x: 50, y: 50 },
          description: 'この世界の中心となる大都市',
          population: 100000,
          climate: '温帯',
          culturalAffiliation: '中央文化圏'
        }
      ],
      geography: []
    }
  }

  /**
   * フォールバック地域地図
   */
  private createFallbackRegionMap(parentLocation: WorldLocation): RegionMap {
    return {
      id: generateId(),
      parentLocationId: parentLocation.id,
      name: `${parentLocation.name}地方`,
      description: `${parentLocation.name}を中心とした地域`,
      scale: 'region',
      locations: [
        {
          id: generateId(),
          name: parentLocation.name,
          type: 'city',
          coordinates: { x: 50, y: 50 },
          description: parentLocation.description,
          population: parentLocation.population,
          importance: 'major',
          services: ['宿屋', '商店', '神殿', '冒険者ギルド']
        }
      ],
      terrain: []
    }
  }

  /**
   * すべてのキャラクター位置を取得
   */
  getAllCharacterLocations(): Record<string, CharacterLocation> {
    const stored = localStorage.getItem(`shinwa-character-location-${this.projectId}`)
    return stored ? JSON.parse(stored) : {}
  }

  /**
   * 特定のキャラクターの現在位置を取得
   */
  getCharacterLocation(characterId: string): CharacterLocation | null {
    const locations = this.getAllCharacterLocations()
    return locations[characterId] || null
  }

  /**
   * キャラクター位置を更新
   */
  updateCharacterLocation(
    characterId: string,
    newLocationId: string,
    chapterNumber: number
  ): CharacterLocation {
    const stored = localStorage.getItem(`shinwa-character-location-${this.projectId}`)
    const locations: Record<string, CharacterLocation> = stored ? JSON.parse(stored) : {}
    
    const currentLocation = locations[characterId] || this.createNewCharacterLocation(characterId)
    
    // 位置履歴を更新
    if (currentLocation.currentLocation.locationId !== newLocationId) {
      // 前の位置の出発章を記録
      if (currentLocation.locationHistory.length > 0) {
        const lastEntry = currentLocation.locationHistory[currentLocation.locationHistory.length - 1]
        if (!lastEntry.departureChapter) {
          lastEntry.departureChapter = chapterNumber
        }
      }

      // 新しい位置を追加
      currentLocation.locationHistory.push({
        locationId: newLocationId,
        arrivalChapter: chapterNumber,
        significantEvents: []
      })
    }

    // 現在位置を更新
    currentLocation.currentLocation = {
      mapLevel: 'region', // TODO: 動的に判定
      locationId: newLocationId
    }

    locations[characterId] = currentLocation
    localStorage.setItem(
      `shinwa-character-location-${this.projectId}`,
      JSON.stringify(locations)
    )

    return currentLocation
  }

  /**
   * 新しいキャラクター位置情報を作成
   */
  private createNewCharacterLocation(characterId: string): CharacterLocation {
    return {
      characterId,
      currentLocation: {
        mapLevel: 'world',
        locationId: 'unknown'
      },
      locationHistory: []
    }
  }

  /**
   * 世界地図システムを保存
   */
  saveWorldMapSystem(mapSystem: WorldMapSystem): void {
    localStorage.setItem(
      `shinwa-world-map-${this.projectId}`,
      JSON.stringify(mapSystem)
    )
  }

  /**
   * 世界地図システムを読み込み
   */
  loadWorldMapSystem(): WorldMapSystem | null {
    const stored = localStorage.getItem(`shinwa-world-map-${this.projectId}`)
    if (stored) {
      try {
        return JSON.parse(stored)
      } catch (error) {
        console.error('Failed to load world map system:', error)
      }
    }
    return null
  }

  /**
   * 場所名の正規化ルール
   */
  private normalizeLocationName(name: string): string {
    return name
      .trim()
      .toLowerCase()
      .replace(/[　\s]+/g, '')
      // 「の入り口」「の出口」「の近く」などを除去
      .replace(/の(入り?口|出口|近く|周辺|付近|そば|傍|側)$/, '')
      // 「にいる」「にある」などを除去
      .replace(/(に|で)(いる|ある|居る|在る)$/, '')
      // 「を囲んでいる場所」などの記述的表現を除去
      .replace(/を(囲んで|取り囲んで)(いる|る)(場所|所|ところ)?$/, '')
  }

  /**
   * 記述的な場所名かどうかを判定
   */
  private isDescriptiveLocation(location: string): boolean {
    // 文字列を正規化（全角・半角スペースの統一、前後の空白除去）
    const normalizedLocation = location.trim().replace(/\s+/g, ' ')
    
    const descriptivePatterns = [
      /火を囲んで/,
      /焚火/,
      /焚き火/,
      /キャンプファイ[ヤア]/,
      /野営地/,
      /休憩所/,
      /を囲んで/,
      /の周り/,
      /集まって/,
      /学校/,
      /校庭/,
      /教室/,
      /廊下/,
      /体育館/,
      /船/,
      /甲板/,
      /船内/,
      /船上/,
      /車内/,
      /車中/,
      /列車/,
      /馬車/,
      /乗り物/,
      /している場所/,
      /いる場所/
    ]
    
    const isDescriptive = descriptivePatterns.some(pattern => pattern.test(normalizedLocation))
    
    return isDescriptive
  }

  /**
   * 場所名で場所を検索（柔軟な検索）
   */
  private findLocationByName(
    locationName: string,
    worldMapSystem: WorldMapSystem
  ): {
    location: WorldLocation | RegionalLocation | LocalArea
    mapLevel: 'world' | 'region' | 'local'
    regionId?: string
    localMapId?: string
  } | null {
    const normalized = this.normalizeLocationName(locationName)
    
    // 1. 完全一致で検索
    // 世界レベル
    let worldLocation = worldMapSystem.worldMap.locations.find(
      loc => this.normalizeLocationName(loc.name) === normalized
    )
    if (worldLocation) {
      return { location: worldLocation, mapLevel: 'world' }
    }

    // 地域レベル
    for (const region of worldMapSystem.regions) {
      const regionLocation = region.locations.find(
        loc => this.normalizeLocationName(loc.name) === normalized
      )
      if (regionLocation) {
        return { location: regionLocation, mapLevel: 'region', regionId: region.id }
      }
    }

    // ローカルレベル
    for (const localMap of worldMapSystem.localMaps) {
      const localArea = localMap.areas.find(
        area => this.normalizeLocationName(area.name) === normalized
      )
      if (localArea) {
        return { location: localArea, mapLevel: 'local', localMapId: localMap.id }
      }
    }

    // 2. 部分一致で検索（正規化された名前が含まれる）
    worldLocation = worldMapSystem.worldMap.locations.find(
      loc => this.normalizeLocationName(loc.name).includes(normalized) ||
             normalized.includes(this.normalizeLocationName(loc.name))
    )
    if (worldLocation) {
      return { location: worldLocation, mapLevel: 'world' }
    }

    for (const region of worldMapSystem.regions) {
      const regionLocation = region.locations.find(
        loc => this.normalizeLocationName(loc.name).includes(normalized) ||
               normalized.includes(this.normalizeLocationName(loc.name))
      )
      if (regionLocation) {
        return { location: regionLocation, mapLevel: 'region', regionId: region.id }
      }
    }

    // 3. キーワード一致で検索（説明文に含まれる場合）
    worldLocation = worldMapSystem.worldMap.locations.find(
      loc => loc.description.toLowerCase().includes(normalized)
    )
    if (worldLocation) {
      return { location: worldLocation, mapLevel: 'world' }
    }

    return null
  }

  /**
   * 最も近い場所の候補を取得
   */
  private getSimilarLocations(
    locationName: string,
    worldMapSystem: WorldMapSystem,
    limit: number = 3
  ): string[] {
    const allLocations: string[] = []
    
    // すべての場所名を収集
    allLocations.push(...worldMapSystem.worldMap.locations.map(loc => loc.name))
    
    for (const region of worldMapSystem.regions) {
      allLocations.push(...region.locations.map(loc => loc.name))
    }
    
    for (const localMap of worldMapSystem.localMaps) {
      allLocations.push(...localMap.areas.map(area => area.name))
    }
    
    // 重複を除去
    const uniqueLocations = Array.from(new Set(allLocations))
    
    // 類似度でソート（簡易的な実装）
    const normalized = this.normalizeLocationName(locationName)
    const scored = uniqueLocations.map(loc => {
      const locNormalized = this.normalizeLocationName(loc)
      let score = 0
      
      // 部分一致
      if (locNormalized.includes(normalized) || normalized.includes(locNormalized)) {
        score += 10
      }
      
      // 文字の共通度
      const commonChars = normalized.split('').filter(char => locNormalized.includes(char)).length
      score += commonChars
      
      return { name: loc, score }
    })
    
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .filter(item => item.score > 0)
      .map(item => item.name)
  }

  /**
   * キャラクターの移動を検証
   */
  async validateTravel(
    fromLocation: string,
    toLocation: string,
    characterName: string,
    chapterNumber: number
  ): Promise<{ isValid: boolean; message: string; severity?: 'error' | 'warning' | 'info' }> {
    const worldMapSystem = this.loadWorldMapSystem()
    if (!worldMapSystem) {
      return {
        isValid: true,
        message: '世界地図システムが未設定のため、移動検証をスキップしました',
        severity: 'info'
      }
    }

    // 初期位置が不明な場合は検証をスキップ
    if (fromLocation === '不明' || fromLocation === 'unknown') {
      return {
        isValid: true,
        message: `${characterName}の初期位置から${toLocation}へ移動しました`,
        severity: 'info'
      }
    }

    // 場所を検索
    const fromLocationData = this.findLocationByName(fromLocation, worldMapSystem)
    const toLocationData = this.findLocationByName(toLocation, worldMapSystem)

    // 場所が見つからない場合の処理
    if (!fromLocationData) {
      console.log(`[validateTravel] From location "${fromLocation}" not found in map for ${characterName}`)
      
      // 記述的な場所名の場合は警告レベルを下げる
      if (this.isDescriptiveLocation(fromLocation)) {
        console.log(`[validateTravel] "${fromLocation}" is descriptive, returning info level`)
        return {
          isValid: true,
          message: `${characterName}の移動元「${fromLocation}」は一般的な記述です。物語の文脈では問題ありませんが、具体的な地名の使用を推奨します。`,
          severity: 'info'
        }
      }
      
      console.log(`[validateTravel] "${fromLocation}" is NOT descriptive, returning error`)
      // 類似する場所名を提案
      const suggestions = this.getSimilarLocations(fromLocation, worldMapSystem)
      const suggestionText = suggestions.length > 0 
        ? `（候補: ${suggestions.join('、')}）` 
        : ''
      
      return {
        isValid: false,
        message: `${characterName}の移動元「${fromLocation}」が地図上に存在しません。${suggestionText}`,
        severity: 'error'
      }
    }

    if (!toLocationData) {
      // 記述的な場所名の場合は警告レベルを下げる
      if (this.isDescriptiveLocation(toLocation)) {
        return {
          isValid: true,
          message: `${characterName}の移動先「${toLocation}」は一般的な記述です。物語の文脈では問題ありませんが、具体的な地名の使用を推奨します。`,
          severity: 'info'
        }
      }
      
      // 類似する場所名を提案
      const suggestions = this.getSimilarLocations(toLocation, worldMapSystem)
      const suggestionText = suggestions.length > 0 
        ? `（候補: ${suggestions.join('、')}）` 
        : ''
      
      return {
        isValid: false,
        message: `${characterName}の移動先「${toLocation}」が地図上に存在しません。${suggestionText}`,
        severity: 'error'
      }
    }

    // 両方の場所が存在する場合、移動可能性をチェック
    if (fromLocationData && toLocationData) {
      // 場所のIDを取得
      const getLocationId = (locationData: typeof fromLocationData) => {
        if (!locationData) return null
        const loc = locationData.location as any
        return loc.id || null
      }
      
      const fromId = getLocationId(fromLocationData)
      const toId = getLocationId(toLocationData)
      
      if (!fromId || !toId) {
        return {
          isValid: true,
          message: `${characterName}は${fromLocation}から${toLocation}へ移動しました`
        }
      }
      
      // 直接接続があるかチェック
      const directConnection = worldMapSystem.connections.find(
        conn => (
          (conn.fromLocationId === fromId && 
           conn.toLocationId === toId) ||
          (conn.bidirectional && 
           conn.fromLocationId === toId && 
           conn.toLocationId === fromId)
        )
      )

      if (directConnection) {
        // 移動時間を計算
        const travelTime = worldMapSystem.travelTimes.find(
          tt => tt.connectionId === directConnection.id
        )

        if (travelTime) {
          const method = travelTime.travelMethod
          const timeHours = Math.round(travelTime.baseTime / 60)
          
          return {
            isValid: true,
            message: `${characterName}は${fromLocation}から${toLocation}へ${method.type === 'walk' ? '徒歩' : method.type === 'horse' ? '馬' : method.type}で約${timeHours}時間で移動しました`,
            severity: 'info'
          }
        }
      }

      // 直接接続がない場合、同じ地域内かチェック
      if (fromLocationData.mapLevel === 'region' && 
          toLocationData.mapLevel === 'region' &&
          fromLocationData.regionId === toLocationData.regionId) {
        return {
          isValid: true,
          message: `${characterName}は同じ地域内で${fromLocation}から${toLocation}へ移動しました`,
          severity: 'info'
        }
      }

      // 距離を計算して妥当性をチェック
      const getCoordinates = (locationData: typeof fromLocationData) => {
        if (!locationData) return null
        const loc = locationData.location as any
        return loc.coordinates || null
      }
      
      const fromCoords = getCoordinates(fromLocationData)
      const toCoords = getCoordinates(toLocationData)
      
      if (fromCoords && toCoords) {
        const distance = this.calculateDistance(fromCoords, toCoords)

        // 世界レベルで50単位以上離れている場合は1章では移動困難
        if (fromLocationData.mapLevel === 'world' && toLocationData.mapLevel === 'world' && distance > 50) {
          return {
            isValid: false,
            message: `${characterName}が${fromLocation}から${toLocation}へ1章で移動するのは距離が遠すぎます（推定${Math.round(distance * 50)}km）。段階的な移動を描写してください`,
            severity: 'error'
          }
        }
      }
    }

    // デフォルトは許可（柔軟性のため）
    return {
      isValid: true,
      message: `${characterName}は${fromLocation}から${toLocation}へ移動しました`,
      severity: 'info'
    }
  }

  /**
   * 二つの場所間の推定移動時間を取得
   */
  async getEstimatedTravelTime(
    fromLocation: string,
    toLocation: string,
    travelMethod: string = 'walk'
  ): Promise<{ time: number; unit: string } | null> {
    const worldMapSystem = this.loadWorldMapSystem()
    if (!worldMapSystem) {
      return null
    }

    // 場所を検索
    const fromLocationData = this.findLocationByName(fromLocation, worldMapSystem)
    const toLocationData = this.findLocationByName(toLocation, worldMapSystem)
    
    if (!fromLocationData || !toLocationData) {
      return null
    }
    
    const fromId = (fromLocationData.location as any).id
    const toId = (toLocationData.location as any).id

    if (!fromId || !toId) {
      return null
    }

    // 接続を検索
    const connection = worldMapSystem.connections.find(
      conn => (
        (conn.fromLocationId === fromId && conn.toLocationId === toId) ||
        (conn.bidirectional && conn.fromLocationId === toId && conn.toLocationId === fromId)
      )
    )

    if (!connection) {
      return null
    }

    // 移動時間を取得
    const travelTime = worldMapSystem.travelTimes.find(
      tt => tt.connectionId === connection.id && tt.travelMethod.type === travelMethod
    )

    if (!travelTime) {
      return null
    }

    const hours = Math.round(travelTime.baseTime / 60)
    if (hours < 24) {
      return { time: hours, unit: '時間' }
    } else {
      return { time: Math.round(hours / 24), unit: '日' }
    }
  }
}