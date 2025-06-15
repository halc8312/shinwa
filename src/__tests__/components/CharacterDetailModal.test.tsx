import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import CharacterDetailModal from '@/components/character/CharacterDetailModal'
import { Character } from '@/lib/types'
import { characterService } from '@/lib/services/character-service'

// characterServiceをモック化
jest.mock('@/lib/services/character-service', () => ({
  characterService: {
    getCharacters: jest.fn()
  }
}))

describe('CharacterDetailModal', () => {
  const mockCharacter: Character = {
    id: 'char-1',
    name: 'Hero',
    fullName: 'Hero of the Story',
    age: 25,
    role: 'protagonist',
    personality: ['brave', 'kind'],
    appearance: 'Tall with dark hair',
    background: 'Orphan raised by monks',
    goals: ['Save the world'],
    relationships: [
      {
        characterId: 'char-2',
        type: 'friend',
        description: 'Best friend since childhood'
      },
      {
        characterId: 'char-3',
        type: 'rival',
        description: 'Competing for the same goal'
      }
    ],
    arc: {
      start: 'Naive youth',
      journey: ['Learns about the world', 'Faces challenges'],
      end: 'Becomes a true hero'
    }
  }

  const mockRelatedCharacters: Character[] = [
    {
      id: 'char-2',
      name: 'Sidekick',
      fullName: 'Loyal Sidekick',
      age: 23,
      role: 'support',
      personality: ['loyal', 'funny'],
      appearance: 'Short with red hair',
      background: 'Town jester',
      goals: ['Support the hero'],
      relationships: [],
      arc: {
        start: 'Comic relief',
        journey: ['Proves worth'],
        end: 'Trusted companion'
      }
    },
    {
      id: 'char-3',
      name: 'Rival',
      fullName: 'Dark Rival',
      age: 26,
      role: 'antagonist',
      personality: ['ambitious', 'cunning'],
      appearance: 'Tall with silver hair',
      background: 'Noble family',
      goals: ['Gain power'],
      relationships: [],
      arc: {
        start: 'Arrogant noble',
        journey: ['Falls from grace'],
        end: 'Redemption or defeat'
      }
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    ;(characterService.getCharacters as jest.Mock).mockResolvedValue([
      mockCharacter,
      ...mockRelatedCharacters
    ])
  })

  describe('Relationship Display', () => {
    it('should display related character names correctly', async () => {
      render(
        <CharacterDetailModal
          isOpen={true}
          onClose={() => {}}
          character={mockCharacter}
          projectId="test-project"
        />
      )

      // 関係性セクションが表示されるまで待つ
      await waitFor(() => {
        expect(screen.getByText('関係性')).toBeInTheDocument()
      })

      // 関連キャラクターの名前が正しく表示されることを確認
      await waitFor(() => {
        expect(screen.getByText('Sidekick')).toBeInTheDocument()
        expect(screen.getByText('Rival')).toBeInTheDocument()
      })

      // "Unknown"が表示されていないことを確認
      expect(screen.queryByText('Unknown')).not.toBeInTheDocument()
    })

    it('should display relationship types and descriptions', async () => {
      render(
        <CharacterDetailModal
          isOpen={true}
          onClose={() => {}}
          character={mockCharacter}
          projectId="test-project"
        />
      )

      await waitFor(() => {
        expect(screen.getByText('friend')).toBeInTheDocument()
        expect(screen.getByText('rival')).toBeInTheDocument()
        expect(screen.getByText('Best friend since childhood')).toBeInTheDocument()
        expect(screen.getByText('Competing for the same goal')).toBeInTheDocument()
      })
    })

    it('should handle missing related characters gracefully', async () => {
      // 関連キャラクターが見つからない場合のテスト
      ;(characterService.getCharacters as jest.Mock).mockResolvedValue([mockCharacter])

      render(
        <CharacterDetailModal
          isOpen={true}
          onClose={() => {}}
          character={mockCharacter}
          projectId="test-project"
        />
      )

      await waitFor(() => {
        expect(screen.getByText('関係性')).toBeInTheDocument()
      })

      // Unknownも表示されるが、関係性の説明は表示される
      await waitFor(() => {
        expect(screen.getByText('Best friend since childhood')).toBeInTheDocument()
      })
    })
  })
})