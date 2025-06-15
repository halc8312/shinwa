import { WorldSettings, TravelMethod } from '../types'

// 時代設定に基づくデフォルトの移動手段
const ERA_TRANSPORT_PRESETS: Record<string, TravelMethod[]> = {
  '古代': [
    { type: 'walk', speed: 4, availability: '全キャラクター' },
    { type: 'horse', speed: 20, availability: '騎馬可能なキャラクター' },
    { type: 'carriage', speed: 10, availability: '馬車所有時' },
    { type: 'ship', speed: 15, availability: '海路・河川' }
  ],
  '中世': [
    { type: 'walk', speed: 4, availability: '全キャラクター' },
    { type: 'horse', speed: 20, availability: '騎馬可能なキャラクター' },
    { type: 'carriage', speed: 10, availability: '馬車所有時' },
    { type: 'ship', speed: 15, availability: '海路・河川' },
    { type: 'wagon', speed: 8, availability: '商人・旅人' }
  ],
  '近世': [
    { type: 'walk', speed: 4, availability: '全キャラクター' },
    { type: 'horse', speed: 20, availability: '騎馬可能なキャラクター' },
    { type: 'carriage', speed: 12, availability: '馬車所有時' },
    { type: 'ship', speed: 20, availability: '海路・河川' },
    { type: 'train', speed: 60, availability: '鉄道路線' }
  ],
  '現代': [
    { type: 'walk', speed: 4, availability: '全キャラクター' },
    { type: 'bicycle', speed: 15, availability: '自転車所有時' },
    { type: 'car', speed: 80, availability: '自動車所有時' },
    { type: 'train', speed: 120, availability: '鉄道路線' },
    { type: 'airplane', speed: 800, availability: '空港間' },
    { type: 'ship', speed: 40, availability: '海路' }
  ],
  '近未来': [
    { type: 'walk', speed: 4, availability: '全キャラクター' },
    { type: 'bicycle', speed: 15, availability: '自転車所有時' },
    { type: 'car', speed: 100, availability: '自動車所有時' },
    { type: 'maglev', speed: 500, availability: '磁気浮上鉄道' },
    { type: 'airplane', speed: 1000, availability: '空港間' },
    { type: 'hyperloop', speed: 1200, availability: 'ハイパーループ路線' }
  ],
  'ファンタジー': [
    { type: 'walk', speed: 4, availability: '全キャラクター' },
    { type: 'horse', speed: 20, availability: '騎馬可能なキャラクター' },
    { type: 'carriage', speed: 10, availability: '馬車所有時' },
    { type: 'ship', speed: 15, availability: '海路・河川' },
    { type: 'flight', speed: 50, availability: '飛行魔法・飛竜' },
    { type: 'teleport', speed: 9999, availability: '転移魔法' }
  ]
}

export class TransportService {
  private projectId: string

  constructor(projectId: string) {
    this.projectId = projectId
  }

  /**
   * 世界設定から利用可能な移動手段を取得
   */
  getAvailableTransports(worldSettings: WorldSettings): TravelMethod[] {
    const storageKey = `shinwa-transports-${this.projectId}`
    const stored = localStorage.getItem(storageKey)
    
    if (stored) {
      try {
        return JSON.parse(stored)
      } catch (error) {
        console.error('Failed to parse stored transports:', error)
      }
    }

    // 保存されていない場合は時代設定から推測
    return this.getTransportsForEra(worldSettings.era)
  }

  /**
   * 時代設定に基づく移動手段を取得
   */
  getTransportsForEra(era: string): TravelMethod[] {
    // 完全一致を試みる
    if (ERA_TRANSPORT_PRESETS[era]) {
      return ERA_TRANSPORT_PRESETS[era]
    }

    // 部分一致を試みる
    for (const [key, transports] of Object.entries(ERA_TRANSPORT_PRESETS)) {
      if (era.includes(key) || key.includes(era)) {
        return transports
      }
    }

    // デフォルト（中世相当）
    return ERA_TRANSPORT_PRESETS['中世']
  }

  /**
   * カスタム移動手段を保存
   */
  saveCustomTransports(transports: TravelMethod[]): void {
    const storageKey = `shinwa-transports-${this.projectId}`
    localStorage.setItem(storageKey, JSON.stringify(transports))
  }

  /**
   * 章の内容から移動手段を抽出（オプション機能）
   */
  extractTransportsFromChapter(chapterContent: string): string[] {
    const transportKeywords = [
      { keyword: '馬', type: 'horse' },
      { keyword: '馬車', type: 'carriage' },
      { keyword: '船', type: 'ship' },
      { keyword: '舟', type: 'ship' },
      { keyword: '自転車', type: 'bicycle' },
      { keyword: '車', type: 'car' },
      { keyword: '自動車', type: 'car' },
      { keyword: '電車', type: 'train' },
      { keyword: '列車', type: 'train' },
      { keyword: '飛行機', type: 'airplane' },
      { keyword: '飛竜', type: 'flight' },
      { keyword: '転移', type: 'teleport' },
      { keyword: 'テレポート', type: 'teleport' }
    ]

    const foundTypes = new Set<string>()
    
    transportKeywords.forEach(({ keyword, type }) => {
      if (chapterContent.includes(keyword)) {
        foundTypes.add(type)
      }
    })

    return Array.from(foundTypes)
  }

  /**
   * キャラクターの利用可能な移動手段を取得
   */
  getCharacterTransports(characterId: string): string[] {
    const storageKey = `shinwa-character-transports-${this.projectId}-${characterId}`
    const stored = localStorage.getItem(storageKey)
    
    if (stored) {
      try {
        return JSON.parse(stored)
      } catch (error) {
        console.error('Failed to parse character transports:', error)
      }
    }

    // デフォルトは徒歩のみ
    return ['walk']
  }

  /**
   * キャラクターの移動手段を更新
   */
  updateCharacterTransports(characterId: string, transports: string[]): void {
    const storageKey = `shinwa-character-transports-${this.projectId}-${characterId}`
    localStorage.setItem(storageKey, JSON.stringify(transports))
  }
}