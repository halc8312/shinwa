import { TransportService } from '@/lib/services/transport-service'
import { WorldSettings } from '@/lib/types'

describe('TransportService', () => {
  const projectId = 'test-project'
  let transportService: TransportService

  beforeEach(() => {
    transportService = new TransportService(projectId)
    // localStorageをクリア
    localStorage.clear()
  })

  describe('getTransportsForEra', () => {
    it('should return correct transport methods for different eras', () => {
      // 古代
      const ancientTransports = transportService.getTransportsForEra('古代')
      expect(ancientTransports).toHaveLength(4)
      expect(ancientTransports.map(t => t.type)).toContain('walk')
      expect(ancientTransports.map(t => t.type)).toContain('horse')
      expect(ancientTransports.map(t => t.type)).not.toContain('car')

      // 現代
      const modernTransports = transportService.getTransportsForEra('現代')
      expect(modernTransports.map(t => t.type)).toContain('car')
      expect(modernTransports.map(t => t.type)).toContain('train')
      expect(modernTransports.map(t => t.type)).toContain('airplane')

      // ファンタジー
      const fantasyTransports = transportService.getTransportsForEra('ファンタジー')
      expect(fantasyTransports.map(t => t.type)).toContain('flight')
      expect(fantasyTransports.map(t => t.type)).toContain('teleport')
    })

    it('should handle partial matches', () => {
      const transports = transportService.getTransportsForEra('中世ファンタジー')
      expect(transports).toBeDefined()
      expect(transports.length).toBeGreaterThan(0)
    })

    it('should return default (medieval) transports for unknown eras', () => {
      const transports = transportService.getTransportsForEra('未知の時代')
      expect(transports).toBeDefined()
      expect(transports.map(t => t.type)).toContain('walk')
      expect(transports.map(t => t.type)).toContain('horse')
    })
  })

  describe('getAvailableTransports', () => {
    const mockWorldSettings: WorldSettings = {
      name: 'Test World',
      description: 'Test',
      era: '現代',
      geography: [],
      cultures: []
    }

    it('should return era-based transports when no custom transports are saved', () => {
      const transports = transportService.getAvailableTransports(mockWorldSettings)
      expect(transports.map(t => t.type)).toContain('car')
      expect(transports.map(t => t.type)).toContain('train')
    })

    it('should return saved custom transports when available', () => {
      const customTransports = [
        { type: 'dragon', speed: 100, availability: 'Dragon riders only' },
        { type: 'portal', speed: 9999, availability: 'Mages only' }
      ]
      
      transportService.saveCustomTransports(customTransports)
      
      const transports = transportService.getAvailableTransports(mockWorldSettings)
      expect(transports).toEqual(customTransports)
    })
  })

  describe('extractTransportsFromChapter', () => {
    it('should extract transport keywords from chapter content', () => {
      const chapterContent = `
        主人公は馬に乗って街を出発した。
        途中で船に乗り換えて川を渡り、
        最終的には飛竜に乗って山を越えた。
      `
      
      const foundTransports = transportService.extractTransportsFromChapter(chapterContent)
      expect(foundTransports).toContain('horse')
      expect(foundTransports).toContain('ship')
      expect(foundTransports).toContain('flight')
    })

    it('should not duplicate transport types', () => {
      const chapterContent = `
        馬で移動し、また馬に乗って帰った。
        馬は素晴らしい移動手段だ。
      `
      
      const foundTransports = transportService.extractTransportsFromChapter(chapterContent)
      expect(foundTransports).toEqual(['horse'])
    })

    it('should handle modern transports', () => {
      const chapterContent = `
        彼は自転車で駅まで行き、電車に乗った。
        空港からは飛行機で目的地へ向かった。
      `
      
      const foundTransports = transportService.extractTransportsFromChapter(chapterContent)
      expect(foundTransports).toContain('bicycle')
      expect(foundTransports).toContain('train')
      expect(foundTransports).toContain('airplane')
    })
  })

  describe('Character transports', () => {
    const characterId = 'char-1'

    it('should return default walk transport when no custom transports are saved', () => {
      const transports = transportService.getCharacterTransports(characterId)
      expect(transports).toEqual(['walk'])
    })

    it('should save and retrieve character transports', () => {
      const customTransports = ['walk', 'horse', 'ship']
      transportService.updateCharacterTransports(characterId, customTransports)
      
      const retrieved = transportService.getCharacterTransports(characterId)
      expect(retrieved).toEqual(customTransports)
    })
  })
})