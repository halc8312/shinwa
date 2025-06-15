/**
 * 既存のキャラクターデータを修正するユーティリティ
 * charactersPresent に格納されている名前をIDに変換
 */

import { Chapter, Character } from '../types'

/**
 * すべてのプロジェクトの章データを修正
 */
export function migrateAllCharacterData() {
  // すべてのプロジェクトIDを取得
  const projectsData = localStorage.getItem('shinwa-projects')
  if (!projectsData) return
  
  const projects = JSON.parse(projectsData)
  projects.forEach((project: any) => {
    migrateProjectCharacterData(project.id)
  })
}

/**
 * 特定のプロジェクトの章データを修正
 */
export function migrateProjectCharacterData(projectId: string) {
  // キャラクターデータを取得
  const charactersData = localStorage.getItem(`shinwa-characters-${projectId}`)
  if (!charactersData) return
  
  const characters: Character[] = JSON.parse(charactersData)
  
  // 章データを取得
  const chaptersData = localStorage.getItem(`shinwa-chapters-${projectId}`)
  if (!chaptersData) return
  
  try {
    const chapters: Chapter[] = JSON.parse(chaptersData)
    let modified = false
    
    // 各章のcharactersPresentを修正
    const updatedChapters = chapters.map(chapter => {
      if (chapter.state?.charactersPresent && Array.isArray(chapter.state.charactersPresent)) {
        const convertedIds: string[] = []
        let hasChanges = false
        
        chapter.state.charactersPresent.forEach(item => {
          // すでにIDの場合
          const existingCharacter = characters.find(c => c.id === item)
          if (existingCharacter) {
            convertedIds.push(item)
            return
          }
          
          // 名前で検索
          const characterByName = characters.find(c => 
            c.name === item ||
            c.name.toLowerCase() === item.toLowerCase() ||
            (c.aliases && c.aliases.some(alias => 
              alias === item || alias.toLowerCase() === item.toLowerCase()
            ))
          )
          
          if (characterByName) {
            console.log(`[Migration] Converting character name "${item}" to ID "${characterByName.id}" in chapter ${chapter.number}`)
            convertedIds.push(characterByName.id)
            hasChanges = true
          } else {
            console.warn(`[Migration] Could not find character for "${item}" in chapter ${chapter.number}`)
            // 見つからない場合は除外
            hasChanges = true
          }
        })
        
        if (hasChanges) {
          modified = true
          return {
            ...chapter,
            state: {
              ...chapter.state,
              charactersPresent: convertedIds
            }
          }
        }
      }
      
      return chapter
    })
    
    // 変更があった場合のみ保存
    if (modified) {
      localStorage.setItem(`shinwa-chapters-${projectId}`, JSON.stringify(updatedChapters))
      console.log(`[Migration] Updated character data for project ${projectId}`)
    }
  } catch (error) {
    console.error(`[Migration] Failed to migrate character data for project ${projectId}:`, error)
  }
}

/**
 * キャラクター名をIDに変換するヘルパー関数
 */
export function convertCharacterNameToId(
  nameOrId: string, 
  characters: Character[]
): string | null {
  // すでにIDの場合
  const existingCharacter = characters.find(c => c.id === nameOrId)
  if (existingCharacter) {
    return nameOrId
  }
  
  // 名前で検索
  const characterByName = characters.find(c => 
    c.name === nameOrId ||
    c.name.toLowerCase() === nameOrId.toLowerCase() ||
    (c.aliases && c.aliases.some(alias => 
      alias === nameOrId || alias.toLowerCase() === nameOrId.toLowerCase()
    ))
  )
  
  return characterByName ? characterByName.id : null
}

/**
 * キャラクター位置データのクリーンアップ
 */
export function cleanupCharacterLocations(projectId: string) {
  const locationsData = localStorage.getItem(`shinwa-character-location-${projectId}`)
  if (!locationsData) return
  
  const charactersData = localStorage.getItem(`shinwa-characters-${projectId}`)
  if (!charactersData) return
  
  const characters: Character[] = JSON.parse(charactersData)
  const locations = JSON.parse(locationsData)
  
  // 存在しないキャラクターIDのエントリを削除
  const validLocations: Record<string, any> = {}
  
  Object.keys(locations).forEach(charId => {
    if (characters.some(c => c.id === charId)) {
      validLocations[charId] = locations[charId]
    } else {
      console.log(`[Cleanup] Removing invalid character location entry: ${charId}`)
    }
  })
  
  localStorage.setItem(`shinwa-character-location-${projectId}`, JSON.stringify(validLocations))
}