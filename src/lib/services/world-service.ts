import { WorldSettings, Culture, MagicSystem } from '../types'
import { generateId } from '../utils'

class WorldService {
  private getStorageKey(projectId: string): string {
    return `shinwa-world-${projectId}`
  }

  async getWorldSettings(projectId: string): Promise<WorldSettings | null> {
    if (typeof window === 'undefined') return null
    
    const stored = localStorage.getItem(this.getStorageKey(projectId))
    if (!stored) return null
    
    try {
      return JSON.parse(stored)
    } catch (error) {
      console.error('Failed to load world settings:', error)
      return null
    }
  }

  async saveWorldSettings(projectId: string, settings: WorldSettings): Promise<void> {
    if (typeof window === 'undefined') return
    
    localStorage.setItem(this.getStorageKey(projectId), JSON.stringify(settings))
  }

  async updateWorldSettings(
    projectId: string,
    updates: Partial<WorldSettings>
  ): Promise<WorldSettings | null> {
    const current = await this.getWorldSettings(projectId)
    if (!current) {
      const newSettings: WorldSettings = {
        name: updates.name || 'Unnamed World',
        description: updates.description || '',
        era: updates.era || 'Modern',
        geography: updates.geography || [],
        cultures: updates.cultures || [],
        magicSystem: updates.magicSystem
      }
      await this.saveWorldSettings(projectId, newSettings)
      return newSettings
    }

    const updated = {
      ...current,
      ...updates
    }
    await this.saveWorldSettings(projectId, updated)
    return updated
  }

  // 文化の追加
  async addCulture(projectId: string, culture: Culture): Promise<WorldSettings | null> {
    const settings = await this.getWorldSettings(projectId)
    if (!settings) return null

    const updated = {
      ...settings,
      cultures: [...settings.cultures, culture]
    }
    await this.saveWorldSettings(projectId, updated)
    return updated
  }

  // 文化の更新
  async updateCulture(
    projectId: string,
    cultureName: string,
    updates: Partial<Culture>
  ): Promise<WorldSettings | null> {
    const settings = await this.getWorldSettings(projectId)
    if (!settings) return null

    const updated = {
      ...settings,
      cultures: settings.cultures.map(c =>
        c.name === cultureName ? { ...c, ...updates } : c
      )
    }
    await this.saveWorldSettings(projectId, updated)
    return updated
  }

  // 文化の削除
  async removeCulture(projectId: string, cultureName: string): Promise<WorldSettings | null> {
    const settings = await this.getWorldSettings(projectId)
    if (!settings) return null

    const updated = {
      ...settings,
      cultures: settings.cultures.filter(c => c.name !== cultureName)
    }
    await this.saveWorldSettings(projectId, updated)
    return updated
  }

  // 魔法システムの更新
  async updateMagicSystem(
    projectId: string,
    magicSystem: MagicSystem | undefined
  ): Promise<WorldSettings | null> {
    const settings = await this.getWorldSettings(projectId)
    if (!settings) return null

    const updated = {
      ...settings,
      magicSystem
    }
    await this.saveWorldSettings(projectId, updated)
    return updated
  }

  // 地理情報の更新
  async updateGeography(
    projectId: string,
    geography: string[]
  ): Promise<WorldSettings | null> {
    const settings = await this.getWorldSettings(projectId)
    if (!settings) return null

    const updated = {
      ...settings,
      geography
    }
    await this.saveWorldSettings(projectId, updated)
    return updated
  }

  // 世界観テンプレート
  getWorldTemplates(): Partial<WorldSettings>[] {
    return [
      {
        name: 'ファンタジー世界',
        description: '魔法と剣の世界',
        era: '中世',
        geography: ['大陸', '王国', '森', '山脈', '海'],
        cultures: [
          {
            name: '王国民',
            description: '王国に住む一般的な人々',
            values: ['秩序', '伝統', '忠誠'],
            customs: ['収穫祭', '騎士叙任式', '王の誕生日']
          },
          {
            name: 'エルフ族',
            description: '森に住む長命な種族',
            values: ['自然', '知恵', '美'],
            customs: ['月の祭り', '成人の儀式', '精霊との交流']
          }
        ],
        magicSystem: {
          name: '元素魔法',
          rules: ['詠唱が必要', '魔力の消費', '属性の相性'],
          limitations: ['一日の使用回数制限', '精神力の消耗', '反動ダメージ'],
          sources: ['生まれつきの才能', '魔法石', '精霊の加護']
        }
      },
      {
        name: 'SF世界',
        description: '高度な科学技術が発達した未来',
        era: '未来（2XXX年）',
        geography: ['地球', '月面都市', '火星コロニー', '宇宙ステーション'],
        cultures: [
          {
            name: '地球市民',
            description: '地球に住む人々',
            values: ['効率', '進歩', '多様性'],
            customs: ['統一記念日', 'AIとの共生', 'バーチャル会議']
          },
          {
            name: 'スペースコロニスト',
            description: '宇宙開拓者たち',
            values: ['開拓精神', '自立', '協力'],
            customs: ['船出の儀式', '資源分配会議', '地球との通信日']
          }
        ]
      },
      {
        name: '現代日本',
        description: '現代の日本を舞台にした世界',
        era: '現代（202X年）',
        geography: ['東京', '地方都市', '田舎町', '学校', '会社'],
        cultures: [
          {
            name: '都市生活者',
            description: '都市部に住む人々',
            values: ['便利さ', '個人主義', '効率'],
            customs: ['初詣', '花見', '忘年会']
          },
          {
            name: '地方生活者',
            description: '地方に住む人々',
            values: ['伝統', 'コミュニティ', '自然'],
            customs: ['祭り', '農作業', '地域の集まり']
          }
        ]
      }
    ]
  }
}

export const worldService = new WorldService()