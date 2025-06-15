import { WorldMapService } from '../world-map-service'
import { WorldMapSystem } from '../../types'

describe('WorldMapService', () => {
  let service: WorldMapService
  const mockProjectId = 'test-project-123'
  
  const mockWorldMapSystem: WorldMapSystem = {
    worldMap: {
      id: 'world-1',
      name: 'テスト世界',
      description: '世界の説明',
      scale: 'world',
      locations: [
        {
          id: 'loc-1',
          name: '王都',
          type: 'capital',
          coordinates: { x: 50, y: 50 },
          description: '王国の首都',
          population: 100000,
          climate: '温帯',
          culturalAffiliation: '中央文化圏'
        },
        {
          id: 'loc-2',
          name: '港町',
          type: 'major_city',
          coordinates: { x: 70, y: 60 },
          description: '交易の中心地',
          population: 50000,
          climate: '温帯',
          culturalAffiliation: '海洋文化圏'
        },
        {
          id: 'loc-3',
          name: '密林',
          type: 'landmark',
          coordinates: { x: 30, y: 70 },
          description: '深い密林地帯',
          population: 0,
          climate: '熱帯',
          culturalAffiliation: '自然'
        }
      ],
      geography: []
    },
    regions: [
      {
        id: 'region-1',
        parentLocationId: 'loc-1',
        name: '王都地方',
        description: '王都を中心とした地域',
        scale: 'region',
        locations: [
          {
            id: 'reg-loc-1',
            name: '王都',
            type: 'city',
            coordinates: { x: 50, y: 50 },
            description: '王国の首都',
            population: 100000,
            importance: 'major',
            services: ['宿屋', '商店', '神殿']
          },
          {
            id: 'reg-loc-2',
            name: '王都の門',
            type: 'landmark',
            coordinates: { x: 52, y: 52 },
            description: '王都への入り口',
            importance: 'moderate',
            services: []
          }
        ],
        terrain: []
      }
    ],
    localMaps: [],
    connections: [
      {
        id: 'conn-1',
        fromLocationId: 'loc-1',
        toLocationId: 'loc-2',
        bidirectional: true,
        connectionType: 'road',
        difficulty: 'easy'
      }
    ],
    travelTimes: [
      {
        connectionId: 'conn-1',
        travelMethod: {
          type: 'walk',
          speed: 4,
          availability: 'common',
          requirements: []
        },
        baseTime: 480, // 8時間
        conditions: []
      }
    ]
  }

  beforeEach(() => {
    service = new WorldMapService(mockProjectId)
    // モックデータをlocalStorageに保存
    jest.spyOn(service, 'loadWorldMapSystem').mockReturnValue(mockWorldMapSystem)
  })

  describe('normalizeLocationName', () => {
    it('基本的な正規化', () => {
      expect((service as any).normalizeLocationName('王都')).toBe('王都')
      expect((service as any).normalizeLocationName('　王都　')).toBe('王都')
      expect((service as any).normalizeLocationName('王 都')).toBe('王都')
    })

    it('「の入り口」などの修飾語を除去', () => {
      expect((service as any).normalizeLocationName('王都の入り口')).toBe('王都')
      expect((service as any).normalizeLocationName('密林の出口')).toBe('密林')
      expect((service as any).normalizeLocationName('港町の近く')).toBe('港町')
      expect((service as any).normalizeLocationName('王都の周辺')).toBe('王都')
    })

    it('「にいる」などの述語を除去', () => {
      expect((service as any).normalizeLocationName('王都にいる')).toBe('王都')
      expect((service as any).normalizeLocationName('密林である')).toBe('密林')
    })

    it('記述的表現を除去', () => {
      expect((service as any).normalizeLocationName('火を囲んでいる場所')).toBe('火')
      expect((service as any).normalizeLocationName('キャンプファイヤーを囲んでる')).toBe('キャンプファイヤー')
    })
  })

  describe('isDescriptiveLocation', () => {
    it('記述的な場所名を検出', () => {
      expect((service as any).isDescriptiveLocation('火を囲んでいる場所')).toBe(true)
      expect((service as any).isDescriptiveLocation('焚火のまわり')).toBe(true)
      expect((service as any).isDescriptiveLocation('キャンプファイヤー')).toBe(true)
      expect((service as any).isDescriptiveLocation('野営地')).toBe(true)
    })

    it('具体的な地名は記述的でない', () => {
      expect((service as any).isDescriptiveLocation('王都')).toBe(false)
      expect((service as any).isDescriptiveLocation('港町')).toBe(false)
      expect((service as any).isDescriptiveLocation('密林')).toBe(false)
    })
  })

  describe('findLocationByName', () => {
    it('完全一致で場所を検索', () => {
      const result = (service as any).findLocationByName('王都', mockWorldMapSystem)
      expect(result).not.toBeNull()
      expect(result.location.name).toBe('王都')
      expect(result.mapLevel).toBe('world')
    })

    it('正規化後の名前で検索', () => {
      const result = (service as any).findLocationByName('王都の入り口', mockWorldMapSystem)
      expect(result).not.toBeNull()
      expect(result.location.name).toBe('王都')
    })

    it('部分一致で検索', () => {
      const result = (service as any).findLocationByName('港', mockWorldMapSystem)
      expect(result).not.toBeNull()
      expect(result.location.name).toBe('港町')
    })

    it('存在しない場所はnullを返す', () => {
      const result = (service as any).findLocationByName('存在しない場所', mockWorldMapSystem)
      expect(result).toBeNull()
    })
  })

  describe('validateTravel', () => {
    it('有効な移動を許可', async () => {
      const result = await service.validateTravel('王都', '港町', 'テストキャラ', 1)
      expect(result.isValid).toBe(true)
      expect(result.severity).toBe('info')
    })

    it('正規化された場所名でも移動を許可', async () => {
      const result = await service.validateTravel('王都の入り口', '港町', 'テストキャラ', 1)
      expect(result.isValid).toBe(true)
    })

    it('記述的な場所名の場合は警告レベルを下げる', async () => {
      const result = await service.validateTravel('火を囲んでいる場所', '王都', 'テストキャラ', 1)
      expect(result.isValid).toBe(true)
      expect(result.severity).toBe('info')
      expect(result.message).toContain('一般的な記述')
    })

    it('存在しない具体的な場所名はエラー', async () => {
      const result = await service.validateTravel('存在しない町', '王都', 'テストキャラ', 1)
      expect(result.isValid).toBe(false)
      expect(result.severity).toBe('error')
    })

    it('類似する場所名を提案', async () => {
      const result = await service.validateTravel('王', '港町', 'テストキャラ', 1)
      expect(result.isValid).toBe(false)
      expect(result.message).toContain('王都')
    })

    it('遠距離移動は警告', async () => {
      // 遠い場所を追加
      const farLocation = {
        id: 'loc-far',
        name: '遠い国',
        type: 'country' as const,
        coordinates: { x: 5, y: 5 },
        description: '遠い国',
        population: 100000,
        climate: '寒帯',
        culturalAffiliation: '北方文化圏'
      }
      mockWorldMapSystem.worldMap.locations.push(farLocation)

      const result = await service.validateTravel('王都', '遠い国', 'テストキャラ', 1)
      expect(result.isValid).toBe(false)
      expect(result.message).toContain('距離が遠すぎます')
    })
  })

  describe('getSimilarLocations', () => {
    it('類似する場所名を返す', () => {
      const similar = (service as any).getSimilarLocations('王', mockWorldMapSystem, 3)
      expect(similar).toContain('王都')
      expect(similar.length).toBeGreaterThan(0)
    })

    it('部分一致する場所を優先', () => {
      const similar = (service as any).getSimilarLocations('港', mockWorldMapSystem, 3)
      expect(similar[0]).toBe('港町')
    })
  })
})