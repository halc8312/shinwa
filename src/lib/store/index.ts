import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { Project, Chapter, Character, Flow } from '@/lib/types'

interface AppState {
  currentProject: Project | null
  characters: Character[]
  currentChapterIndex: number
  isWriting: boolean
  executionHistory: string[]
  currentProvider: 'openai' | 'anthropic' | 'genspark' | null
  apiKeys: {
    openai?: string
    anthropic?: string
    genspark?: string
  }
  
  setCurrentProject: (project: Project | null) => void
  addCharacter: (character: Character) => void
  updateCharacter: (characterId: string, updates: Partial<Character>) => void
  setCharacters: (characters: Character[]) => void
  setCurrentChapterIndex: (index: number) => void
  setIsWriting: (isWriting: boolean) => void
  addToExecutionHistory: (step: string) => void
  clearExecutionHistory: () => void
  setCurrentProvider: (provider: 'openai' | 'anthropic' | 'genspark' | null) => void
  setApiKey: (provider: 'openai' | 'anthropic' | 'genspark', key: string) => void
}

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set) => ({
        currentProject: null,
        characters: [],
        currentChapterIndex: 0,
        isWriting: false,
        executionHistory: [],
        currentProvider: null,
        apiKeys: {},

        setCurrentProject: (project) => set({ currentProject: project }),
        
        addCharacter: (character) => set((state) => ({
          characters: [...state.characters, character]
        })),
        
        updateCharacter: (characterId, updates) => set((state) => ({
          characters: state.characters.map(char =>
            char.id === characterId ? { ...char, ...updates } : char
          )
        })),
        
        setCharacters: (characters) => set({ characters }),
        
        setCurrentChapterIndex: (index) => set({ currentChapterIndex: index }),
        
        setIsWriting: (isWriting) => set({ isWriting }),
        
        addToExecutionHistory: (step) => set((state) => ({
          executionHistory: [...state.executionHistory, step]
        })),
        
        clearExecutionHistory: () => set({ executionHistory: [] }),
        
        setCurrentProvider: (provider) => set({ currentProvider: provider }),
        
        setApiKey: (provider, key) => set((state) => ({
          apiKeys: { ...state.apiKeys, [provider]: key }
        }))
      }),
      {
        name: 'shinwa-storage',
        partialize: (state) => ({
          currentProject: state.currentProject,
          characters: state.characters,
          currentChapterIndex: state.currentChapterIndex,
          currentProvider: state.currentProvider,
          apiKeys: state.apiKeys
        })
      }
    )
  )
)