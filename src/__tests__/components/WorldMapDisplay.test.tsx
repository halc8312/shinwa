import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import WorldMapDisplay from '@/components/world/WorldMapDisplay'
import { WorldMapSystem } from '@/lib/types'

describe('WorldMapDisplay', () => {
  const mockWorldMapSystem: WorldMapSystem = {
    worldMap: {
      id: 'world-1',
      name: 'Test World',
      description: 'A test world',
      locations: [
        {
          id: 'loc-1',
          name: 'Capital City',
          type: 'capital',
          description: 'The capital',
          coordinates: { x: 50, y: 50 }
        }
      ]
    },
    regions: [
      {
        id: 'region-1',
        parentLocationId: 'loc-1',
        name: 'Northern Region',
        description: 'The north',
        scale: 'region',
        locations: [
          {
            id: 'region-loc-1',
            name: 'Northern Town',
            type: 'town',
            description: 'A northern town',
            coordinates: { x: 60, y: 40 },
            importance: 'minor',
            services: []
          }
        ],
        terrain: []
      },
      {
        id: 'region-2',
        parentLocationId: 'loc-1',
        name: 'Southern Region',
        description: 'The south',
        scale: 'region',
        locations: [
          {
            id: 'region-loc-2',
            name: 'Southern Village',
            type: 'village',
            description: 'A southern village',
            coordinates: { x: 40, y: 60 },
            importance: 'minor',
            services: []
          }
        ],
        terrain: []
      }
    ],
    localMaps: [],
    connections: [],
    travelTimes: []
  }

  describe('Region View', () => {
    it('should initialize with the first region selected', () => {
      render(<WorldMapDisplay worldMapSystem={mockWorldMapSystem} />)
      
      // Region Viewタブをクリック
      const regionTab = screen.getByText('Region View')
      fireEvent.click(regionTab)
      
      // 最初のリージョンが選択されているか確認
      const select = screen.getByRole('combobox') as HTMLSelectElement
      expect(select.value).toBe('region-1')
    })

    it('should switch between regions without error', () => {
      render(<WorldMapDisplay worldMapSystem={mockWorldMapSystem} />)
      
      // Region Viewタブをクリック
      const regionTab = screen.getByText('Region View')
      fireEvent.click(regionTab)
      
      // ドロップダウンを取得
      const select = screen.getByRole('combobox') as HTMLSelectElement
      
      // 2番目のリージョンに切り替え
      fireEvent.change(select, { target: { value: 'region-2' } })
      
      // エラーが発生しないことを確認
      expect(select.value).toBe('region-2')
      expect(screen.getByText('Southern Village')).toBeInTheDocument()
    })

    it('should handle empty regions gracefully', () => {
      const emptyWorldMap: WorldMapSystem = {
        ...mockWorldMapSystem,
        regions: []
      }
      
      render(<WorldMapDisplay worldMapSystem={emptyWorldMap} />)
      
      // Region Viewタブをクリック
      const regionTab = screen.getByText('Region View')
      fireEvent.click(regionTab)
      
      // エラーメッセージが表示されることを確認
      expect(screen.getByText('地域データがありません')).toBeInTheDocument()
    })
  })
})