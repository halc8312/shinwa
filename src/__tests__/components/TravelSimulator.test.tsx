import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import TravelSimulator from '@/components/world/TravelSimulator'
import { WorldMapSystem, Character, WorldSettings } from '@/lib/types'

describe('TravelSimulator', () => {
  const mockWorldMapSystem: WorldMapSystem = {
    worldMap: {
      id: 'world-1',
      name: 'Test World',
      description: 'A test world',
      locations: [
        {
          id: 'loc-1',
          name: 'City A',
          type: 'city',
          description: 'Starting city',
          coordinates: { x: 30, y: 30 },
          importance: 'high'
        },
        {
          id: 'loc-2',
          name: 'City B',
          type: 'city',
          description: 'Destination city',
          coordinates: { x: 70, y: 70 },
          importance: 'high'
        }
      ]
    },
    regions: [],
    localMaps: [],
    connections: [
      {
        id: 'conn-1',
        fromLocationId: 'loc-1',
        toLocationId: 'loc-2',
        type: 'road',
        bidirectional: true,
        difficulty: 'easy'
      }
    ],
    travelTimes: []
  }

  const mockCharacters: Character[] = [
    {
      id: 'char-1',
      name: 'Traveler',
      fullName: 'Test Traveler',
      age: 30,
      role: 'protagonist',
      personality: ['adventurous'],
      appearance: 'Weathered traveler',
      background: 'Merchant',
      goals: ['Trade goods'],
      relationships: [],
      arc: {
        start: 'Merchant',
        journey: ['Travel'],
        end: 'Success'
      }
    }
  ]

  const mockWorldSettings: WorldSettings = {
    name: 'Test World',
    description: 'A medieval fantasy world',
    era: '中世',
    geography: ['Mountains', 'Rivers'],
    cultures: []
  }

  describe('Travel Methods', () => {
    it('should display travel methods dropdown', () => {
      render(
        <TravelSimulator
          worldMapSystem={mockWorldMapSystem}
          characters={mockCharacters}
          projectId="test-project"
          worldSettings={mockWorldSettings}
        />
      )

      // キャラクターを選択
      const characterSelect = screen.getAllByRole('combobox')[0]
      fireEvent.change(characterSelect, { target: { value: 'char-1' } })

      // 現在地を選択
      const currentLocationSelect = screen.getAllByRole('combobox')[1]
      fireEvent.change(currentLocationSelect, { target: { value: 'loc-1' } })

      // 目的地を選択
      const destinationSelect = screen.getAllByRole('combobox')[2]
      fireEvent.change(destinationSelect, { target: { value: 'loc-2' } })

      // 移動手段のドロップダウンが有効になっていることを確認
      const travelMethodSelect = screen.getAllByRole('combobox')[3]
      expect(travelMethodSelect).not.toBeDisabled()
    })

    it('should display default travel methods when worldSettings is provided', () => {
      render(
        <TravelSimulator
          worldMapSystem={mockWorldMapSystem}
          characters={mockCharacters}
          projectId="test-project"
          worldSettings={mockWorldSettings}
        />
      )

      // キャラクターを選択
      const characterSelect = screen.getAllByRole('combobox')[0]
      fireEvent.change(characterSelect, { target: { value: 'char-1' } })

      // 現在地を選択
      const currentLocationSelect = screen.getAllByRole('combobox')[1]
      fireEvent.change(currentLocationSelect, { target: { value: 'loc-1' } })

      // 目的地を選択
      const destinationSelect = screen.getAllByRole('combobox')[2]
      fireEvent.change(destinationSelect, { target: { value: 'loc-2' } })

      // 移動手段のドロップダウンにオプションがあることを確認
      const travelMethodSelect = screen.getAllByRole('combobox')[3] as HTMLSelectElement
      const options = Array.from(travelMethodSelect.options)
      
      // 少なくとも徒歩オプションがあることを確認
      const walkOption = options.find(opt => opt.text.includes('徒歩'))
      expect(walkOption).toBeTruthy()
    })

    it('should display at least walk option when no travel methods are available', () => {
      const emptyWorldMap: WorldMapSystem = {
        ...mockWorldMapSystem,
        travelTimes: []
      }

      render(
        <TravelSimulator
          worldMapSystem={emptyWorldMap}
          characters={mockCharacters}
          projectId="test-project"
        />
      )

      // キャラクターを選択
      const characterSelect = screen.getAllByRole('combobox')[0]
      fireEvent.change(characterSelect, { target: { value: 'char-1' } })

      // 現在地を選択
      const currentLocationSelect = screen.getAllByRole('combobox')[1]
      fireEvent.change(currentLocationSelect, { target: { value: 'loc-1' } })

      // 目的地を選択
      const destinationSelect = screen.getAllByRole('combobox')[2]
      fireEvent.change(destinationSelect, { target: { value: 'loc-2' } })

      // 徒歩オプションが表示されることを確認
      expect(screen.getByText(/徒歩.*4 km\/h/)).toBeInTheDocument()
    })
  })

  describe('Travel Simulation', () => {
    it('should enable simulate button when all fields are selected', () => {
      render(
        <TravelSimulator
          worldMapSystem={mockWorldMapSystem}
          characters={mockCharacters}
          projectId="test-project"
          worldSettings={mockWorldSettings}
        />
      )

      // 全てのフィールドを選択
      fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'char-1' } })
      fireEvent.change(screen.getAllByRole('combobox')[1], { target: { value: 'loc-1' } })
      fireEvent.change(screen.getAllByRole('combobox')[2], { target: { value: 'loc-2' } })
      fireEvent.change(screen.getAllByRole('combobox')[3], { target: { value: 'walk' } })

      // シミュレート開始ボタンが有効になっていることを確認
      const simulateButton = screen.getByText('シミュレート開始')
      expect(simulateButton).not.toBeDisabled()
    })
  })
})