import { Character, Relationship } from '../types'
import { generateId } from '../utils'

class CharacterService {
  private getStorageKey(projectId: string): string {
    return `shinwa-characters-${projectId}`
  }

  async getCharacters(projectId: string): Promise<Character[]> {
    if (typeof window === 'undefined') return []
    
    const stored = localStorage.getItem(this.getStorageKey(projectId))
    if (!stored) return []
    
    try {
      return JSON.parse(stored)
    } catch (error) {
      console.error('Failed to load characters:', error)
      return []
    }
  }

  async getCharacter(projectId: string, characterId: string): Promise<Character | null> {
    const characters = await this.getCharacters(projectId)
    return characters.find(c => c.id === characterId) || null
  }

  async createCharacter(projectId: string, data: Omit<Character, 'id'>): Promise<Character> {
    const character: Character = {
      ...data,
      id: generateId()
    }

    const characters = await this.getCharacters(projectId)
    characters.push(character)
    this.saveCharacters(projectId, characters)

    return character
  }

  async updateCharacter(
    projectId: string, 
    characterId: string, 
    updates: Partial<Character>
  ): Promise<Character | null> {
    const characters = await this.getCharacters(projectId)
    const index = characters.findIndex(c => c.id === characterId)
    
    if (index === -1) return null
    
    characters[index] = {
      ...characters[index],
      ...updates,
      id: characters[index].id
    }
    
    this.saveCharacters(projectId, characters)
    return characters[index]
  }

  async deleteCharacter(projectId: string, characterId: string): Promise<boolean> {
    const characters = await this.getCharacters(projectId)
    const filtered = characters.filter(c => c.id !== characterId)
    
    if (filtered.length === characters.length) return false
    
    // 他のキャラクターの関係性からも削除
    const updatedCharacters = filtered.map(char => ({
      ...char,
      relationships: char.relationships.filter(rel => rel.characterId !== characterId)
    }))
    
    this.saveCharacters(projectId, updatedCharacters)
    return true
  }

  async addRelationship(
    projectId: string,
    characterId: string,
    relationship: Relationship
  ): Promise<Character | null> {
    const character = await this.getCharacter(projectId, characterId)
    if (!character) return null

    const updatedRelationships = [
      ...character.relationships.filter(r => r.characterId !== relationship.characterId),
      relationship
    ]

    return this.updateCharacter(projectId, characterId, {
      relationships: updatedRelationships
    })
  }

  async removeRelationship(
    projectId: string,
    characterId: string,
    targetCharacterId: string
  ): Promise<Character | null> {
    const character = await this.getCharacter(projectId, characterId)
    if (!character) return null

    const updatedRelationships = character.relationships.filter(
      r => r.characterId !== targetCharacterId
    )

    return this.updateCharacter(projectId, characterId, {
      relationships: updatedRelationships
    })
  }

  async getCharactersByIds(projectId: string, ids: string[]): Promise<Character[]> {
    const characters = await this.getCharacters(projectId)
    return characters.filter(char => ids.includes(char.id))
  }

  async searchCharacters(projectId: string, query: string): Promise<Character[]> {
    const characters = await this.getCharacters(projectId)
    const lowercaseQuery = query.toLowerCase()
    
    return characters.filter(char => 
      char.name.toLowerCase().includes(lowercaseQuery) ||
      char.fullName?.toLowerCase().includes(lowercaseQuery) ||
      char.background.toLowerCase().includes(lowercaseQuery) ||
      char.personality.some(trait => trait.toLowerCase().includes(lowercaseQuery))
    )
  }

  private saveCharacters(projectId: string, characters: Character[]): void {
    if (typeof window === 'undefined') return
    
    localStorage.setItem(this.getStorageKey(projectId), JSON.stringify(characters))
  }

  // キャラクターテンプレート
  getCharacterTemplates(): Partial<Character>[] {
    return [
      {
        name: '主人公',
        personality: ['勇敢', '正義感が強い', '成長途上'],
        goals: ['大切な人を守る', '自分の力を証明する'],
        arc: {
          start: '普通の若者',
          journey: ['試練に直面', '仲間との出会い', '挫折と成長'],
          end: '真の英雄へ'
        }
      },
      {
        name: 'メンター',
        personality: ['賢明', '経験豊富', '謎めいている'],
        goals: ['後継者を育てる', '過去の過ちを償う'],
        arc: {
          start: '隠遁した賢者',
          journey: ['主人公との出会い', '知識の伝授', '最後の戦い'],
          end: '役目を果たす'
        }
      },
      {
        name: '宿敵',
        personality: ['冷酷', '知的', '信念がある'],
        goals: ['世界を変える', '復讐を果たす'],
        arc: {
          start: '影の支配者',
          journey: ['計画の実行', '主人公との対峙', '過去の真実'],
          end: '最終決戦'
        }
      }
    ]
  }
}

export const characterService = new CharacterService()