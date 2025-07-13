'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Project, Chapter, Character, WorldSettings, WritingRules, WorldMapSystem, PlotThread } from '@/lib/types'
import { projectService } from '@/lib/services/project-service'
import { characterService } from '@/lib/services/character-service'
import { worldService } from '@/lib/services/world-service'
import { WorldMapService } from '@/lib/services/world-map-service'
import Button from '@/components/ui/Button'
import { useAppStore } from '@/lib/store'
import { countCharacters } from '@/lib/utils'
import { calculateForeshadowingScopeRanges, isForeshadowingOverdue } from '@/lib/utils/foreshadowing-utils'
import AIAssistant from '@/components/dashboard/AIAssistant'
import WritingNotes from '@/components/collaboration/WritingNotes'
import ForeshadowingHealthReport from '@/components/dashboard/ForeshadowingHealthReport'
import PlotThreadManager from '@/components/dashboard/PlotThreadManager'
import PlotThreadVisualizer from '@/components/dashboard/PlotThreadVisualizer'
import PlotDensityAnalyzer from '@/components/dashboard/PlotDensityAnalyzer'

type TabType = 'overview' | 'state' | 'timeline' | 'foreshadowing' | 'characters' | 'plot'

export default function ProjectDashboard() {
  const params = useParams()
  const projectId = params.id as string
  
  const [project, setProject] = useState<Project | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [worldSettings, setWorldSettings] = useState<WorldSettings | null>(null)
  const [writingRules, setWritingRules] = useState<WritingRules | null>(null)
  const [characters, setCharacters] = useState<Character[]>([])
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [chapterStructure, setChapterStructure] = useState<any>(null)
  const [worldMapSystem, setWorldMapSystem] = useState<WorldMapSystem | null>(null)
  const [worldMapService, setWorldMapService] = useState<WorldMapService | null>(null)
  const [characterLocations, setCharacterLocations] = useState<Record<string, any>>({})

  useEffect(() => {
    // 既存データのマイグレーション（キャラクター名をIDに変換）
    import('@/lib/utils/character-data-migration').then(module => {
      module.migrateProjectCharacterData(projectId)
      module.cleanupCharacterLocations(projectId)
    })
    
    loadProjectData()
    loadChapters()
    loadChapterStructure()
    loadCharacterLocations()
    
    // WorldMapServiceを初期化
    const service = new WorldMapService(projectId)
    setWorldMapService(service)
    loadWorldMap(service)
  }, [projectId])
  
  const loadChapters = () => {
    const stored = localStorage.getItem(`shinwa-chapters-${projectId}`)
    if (stored) {
      try {
        const loadedChapters = JSON.parse(stored).map((ch: any) => ({
          ...ch,
          createdAt: new Date(ch.createdAt),
          updatedAt: new Date(ch.updatedAt)
        }))
        setChapters(loadedChapters)
      } catch (error) {
        console.error('Failed to load chapters:', error)
      }
    }
  }

  const loadChapterStructure = () => {
    const stored = localStorage.getItem(`shinwa-chapter-structure-${projectId}`)
    if (stored) {
      try {
        setChapterStructure(JSON.parse(stored))
      } catch (error) {
        console.error('Failed to load chapter structure:', error)
      }
    }
  }

  const loadWorldMap = async (service: WorldMapService) => {
    try {
      const mapSystem = service.loadWorldMapSystem()
      if (mapSystem) {
        setWorldMapSystem(mapSystem)
      }
    } catch (error) {
      console.error('Failed to load world map:', error)
    }
  }

  const loadCharacterLocations = () => {
    const stored = localStorage.getItem(`shinwa-character-location-${projectId}`)
    if (stored) {
      try {
        const locations = JSON.parse(stored)
        setCharacterLocations(locations)
      } catch (error) {
        console.error('Failed to load character locations:', error)
      }
    }
  }

  const loadProjectData = async () => {
    setIsLoading(true)
    try {
      const loadedProject = await projectService.getProject(projectId)
      if (!loadedProject) return
      
      setProject(loadedProject)
      
      // World settings
      const storedWorld = localStorage.getItem(`shinwa-world-${projectId}`)
      if (storedWorld) {
        setWorldSettings(JSON.parse(storedWorld))
      }
      
      // Writing rules
      const storedRules = localStorage.getItem(`shinwa-rules-${projectId}`)
      if (storedRules) {
        setWritingRules(JSON.parse(storedRules))
      }
      
      // Characters
      const loadedCharacters = await characterService.getCharacters(projectId)
      setCharacters(loadedCharacters)
    } catch (error) {
      console.error('Failed to load project data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'overview', label: '概要', icon: '📊' },
    { id: 'state', label: '状態管理', icon: '🔄' },
    { id: 'timeline', label: 'タイムライン', icon: '📅' },
    { id: 'foreshadowing', label: '伏線マップ', icon: '🕸️' },
    { id: 'characters', label: 'キャラクター', icon: '👥' },
    { id: 'plot', label: 'プロット', icon: '📈' }
  ]

  if (isLoading || !project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-4 sm:py-6 lg:py-8">
        {/* ヘッダー */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                {project.name} - 統合ダッシュボード
              </h1>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
                すべての執筆情報を一元管理
              </p>
            </div>
            <Link href={`/projects/${projectId}`}>
              <Button variant="secondary" size="sm" className="sm:text-base">
                プロジェクトホームへ
              </Button>
            </Link>
          </div>

          {/* タブナビゲーション */}
          <div className="border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
            <nav className="-mb-px flex space-x-4 sm:space-x-8 min-w-max">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    py-2 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap
                    ${activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <span className="mr-1 sm:mr-2">{tab.icon}</span>
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.label.slice(0, 3)}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* コンテンツエリア */}
        <div className="mt-6">
          {activeTab === 'overview' && (
            <OverviewTab 
              project={project} 
              chapters={chapters}
              characters={characters}
              worldSettings={worldSettings}
              writingRules={writingRules}
            />
          )}
          {activeTab === 'state' && (
            <StateManagementTab 
              chapters={chapters}
              characters={characters}
              worldSettings={worldSettings}
              worldMapSystem={worldMapSystem}
              projectId={projectId}
              characterLocations={characterLocations}
            />
          )}
          {activeTab === 'timeline' && (
            <TimelineTab chapters={chapters} />
          )}
          {activeTab === 'foreshadowing' && (
            <ForeshadowingTab chapters={chapters} projectId={projectId} />
          )}
          {activeTab === 'characters' && (
            <CharacterOverviewTab characters={characters} chapters={chapters} />
          )}
          {activeTab === 'plot' && (
            <PlotManagementTab chapters={chapters} chapterStructure={chapterStructure} projectId={projectId} />
          )}
        </div>
        
        {/* AIアシスタント */}
        <AIAssistant
          projectId={projectId}
          projectName={project.name}
          chapters={chapters}
          characters={characters}
          worldSettings={worldSettings}
          writingRules={writingRules}
        />
      </div>
    </div>
  )
}

// 概要タブコンポーネント
function OverviewTab({ project, chapters, characters, worldSettings, writingRules }: {
  project: Project
  chapters: Chapter[]
  characters: Character[]
  worldSettings: WorldSettings | null
  writingRules: WritingRules | null
}) {
  const totalWords = chapters.reduce((sum, ch) => sum + countCharacters(ch.content), 0)
  const averageChapterLength = chapters.length > 0 ? Math.round(totalWords / chapters.length) : 0
  
  // 伏線の統計
  const allForeshadowing = chapters.flatMap(ch => ch.state.foreshadowing || [])
  const plantedCount = allForeshadowing.filter(f => f.status === 'planted').length
  const revealedCount = allForeshadowing.filter(f => f.status === 'revealed').length
  
  // 背景イベントの統計
  const totalBackgroundEvents = chapters.reduce((sum, ch) => sum + (ch.backgroundEvents?.length || 0), 0)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      {/* 執筆統計 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">📊 執筆統計</h3>
        <dl className="space-y-2">
          <div className="flex justify-between">
            <dt className="text-gray-600 dark:text-gray-400">総章数</dt>
            <dd className="font-medium">{chapters.length}章</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600 dark:text-gray-400">総文字数</dt>
            <dd className="font-medium">{totalWords.toLocaleString()}文字</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600 dark:text-gray-400">平均章文字数</dt>
            <dd className="font-medium">{averageChapterLength.toLocaleString()}文字</dd>
          </div>
        </dl>
      </div>

      {/* キャラクター統計 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">👥 キャラクター統計</h3>
        <dl className="space-y-2">
          <div className="flex justify-between">
            <dt className="text-gray-600 dark:text-gray-400">総キャラクター数</dt>
            <dd className="font-medium">{characters.length}人</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600 dark:text-gray-400">主要キャラクター</dt>
            <dd className="font-medium">{characters.filter(c => c.role === 'protagonist' || c.role === 'main').length}人</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600 dark:text-gray-400">関係性の数</dt>
            <dd className="font-medium">{characters.reduce((sum, c) => sum + (c.relationships?.length || 0), 0)}個</dd>
          </div>
        </dl>
      </div>

      {/* 伏線統計 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">🕸️ 伏線統計</h3>
        <dl className="space-y-2">
          <div className="flex justify-between">
            <dt className="text-gray-600 dark:text-gray-400">総伏線数</dt>
            <dd className="font-medium">{allForeshadowing.length}個</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600 dark:text-gray-400">未回収</dt>
            <dd className="font-medium text-yellow-600">{plantedCount}個</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600 dark:text-gray-400">回収済み</dt>
            <dd className="font-medium text-green-600">{revealedCount}個</dd>
          </div>
        </dl>
      </div>

      {/* 世界観情報 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">🌍 世界観</h3>
        <dl className="space-y-2">
          <div className="flex justify-between">
            <dt className="text-gray-600 dark:text-gray-400">時代設定</dt>
            <dd className="font-medium">{worldSettings?.era || '未設定'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600 dark:text-gray-400">文化圏</dt>
            <dd className="font-medium">{worldSettings?.cultures?.length || 0}個</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600 dark:text-gray-400">地理要素</dt>
            <dd className="font-medium">{worldSettings?.geography?.length || 0}個</dd>
          </div>
        </dl>
      </div>

      {/* 執筆ルール */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">📝 執筆ルール</h3>
        <dl className="space-y-2">
          <div className="flex justify-between">
            <dt className="text-gray-600 dark:text-gray-400">視点</dt>
            <dd className="font-medium">
              {writingRules?.pointOfView === 'first' ? '一人称' 
                : writingRules?.pointOfView === 'third' ? '三人称' 
                : writingRules?.pointOfView === 'omniscient' ? '神視点' 
                : '未設定'}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600 dark:text-gray-400">時制</dt>
            <dd className="font-medium">
              {writingRules?.tense === 'past' ? '過去形' 
                : writingRules?.tense === 'present' ? '現在形' 
                : '未設定'}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600 dark:text-gray-400">文体</dt>
            <dd className="font-medium text-xs">
              {writingRules?.style ? 
                (writingRules.style.length > 20 ? writingRules.style.substring(0, 20) + '...' : writingRules.style)
                : '未設定'}
            </dd>
          </div>
        </dl>
      </div>

      {/* イベント統計 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">🎭 イベント統計</h3>
        <dl className="space-y-2">
          <div className="flex justify-between">
            <dt className="text-gray-600 dark:text-gray-400">背景イベント総数</dt>
            <dd className="font-medium">{totalBackgroundEvents}個</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600 dark:text-gray-400">平均イベント/章</dt>
            <dd className="font-medium">{chapters.length > 0 ? (totalBackgroundEvents / chapters.length).toFixed(1) : 0}個</dd>
          </div>
        </dl>
      </div>
      
      {/* 執筆メモ・共有ノート */}
      <WritingNotes 
        projectId={project.id} 
        currentChapter={chapters.length} 
      />
    </div>
  )
}

// 状態管理タブ
function StateManagementTab({ chapters, characters, worldSettings, worldMapSystem, projectId, characterLocations }: {
  chapters: Chapter[]
  characters: Character[]
  worldSettings: WorldSettings | null
  worldMapSystem: WorldMapSystem | null
  projectId: string
  characterLocations: Record<string, any>
}) {
  const latestChapter = chapters[chapters.length - 1]
  const currentState = latestChapter?.state

  // キャラクターごとの現在位置と状態を集計
  // getLocationName関数を定義
  const getLocationName = (locationId: string): string => {
    if (!worldMapSystem || !locationId || locationId === 'unknown') {
      return '不明'
    }

    // 世界地図から検索
    const worldLocation = worldMapSystem.worldMap.locations.find(loc => loc.id === locationId)
    if (worldLocation) {
      return worldLocation.name
    }

    // 地域地図から検索
    for (const region of worldMapSystem.regions) {
      const regionLocation = region.locations.find(loc => loc.id === locationId)
      if (regionLocation) {
        return regionLocation.name
      }
    }

    // ローカル地図から検索
    for (const localMap of worldMapSystem.localMaps) {
      const localArea = localMap.areas.find(area => area.id === locationId)
      if (localArea) {
        return localArea.name
      }
    }

    return '不明'
  }

  const characterStates = characters.map(character => {
    const isPresent = currentState?.charactersPresent?.includes(character.id) || false
    
    // キャラクターの位置追跡システムから位置情報を取得
    const characterLocation = characterLocations[character.id]
    let locationId = '不明'
    let locationName = '不明'
    
    if (characterLocation && characterLocation.currentLocation) {
      locationId = characterLocation.currentLocation.locationId
      locationName = getLocationName(locationId)
    } else if (isPresent && currentState?.location) {
      // 位置追跡システムにデータがない場合は、章の状態から取得
      locationId = currentState.location
      locationName = getLocationName(locationId)
    } else {
      // 最後に登場した章を探す
      const chaptersWithCharacter = chapters
        .filter(ch => ch.state.charactersPresent?.includes(character.id))
        .sort((a, b) => a.number - b.number)
      
      const lastMentionedChapter = chaptersWithCharacter[chaptersWithCharacter.length - 1]
      if (lastMentionedChapter?.state.location) {
        locationId = lastMentionedChapter.state.location
        locationName = getLocationName(locationId)
      }
    }
    
    // 最後に登場した章番号を取得
    const lastChapterNumber = characterLocation?.locationHistory?.length > 0 
      ? characterLocation.locationHistory[characterLocation.locationHistory.length - 1].arrivalChapter
      : chapters.filter(ch => ch.state.charactersPresent?.includes(character.id))
               .map(ch => ch.number)
               .sort((a, b) => b - a)[0] || 0
    
    return {
      character,
      isPresent,
      lastLocation: locationId,
      lastLocationName: locationName,
      lastChapter: lastChapterNumber
    }
  })

  // 矛盾検出：同じ場所に同時にいるはずのないキャラクター
  const detectConflicts = () => {
    const conflicts: string[] = []
    
    // 例: 敵対関係にあるキャラクターが同じ場所にいる
    characterStates.forEach((state1, i) => {
      characterStates.slice(i + 1).forEach(state2 => {
        if (state1.isPresent && state2.isPresent && state1.lastLocation === state2.lastLocation) {
          const rel = state1.character.relationships?.find(
            r => r.characterId === state2.character.id && r.type === 'enemy'
          )
          if (rel) {
            conflicts.push(
              `⚠️ ${state1.character.name}と${state2.character.name}（敵対関係）が同じ場所にいます`
            )
          }
        }
      })
    })
    
    return conflicts
  }

  const conflicts = detectConflicts()

  return (
    <div className="space-y-6">
      {/* 現在の状態サマリー */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">📍 現在の状態（第{latestChapter?.number || 0}章時点）</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">時間・場所</h3>
            <dl className="space-y-1 text-sm">
              <div className="flex">
                <dt className="text-gray-500 mr-2">時間:</dt>
                <dd className="font-medium">{currentState?.time || '不明'}</dd>
              </div>
              <div className="flex">
                <dt className="text-gray-500 mr-2">場所:</dt>
                <dd className="font-medium">{currentState?.location || '不明'}</dd>
              </div>
            </dl>
          </div>
          
          <div>
            <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">進行中の要素</h3>
            <dl className="space-y-1 text-sm">
              <div className="flex">
                <dt className="text-gray-500 mr-2">プロット進行:</dt>
                <dd className="font-medium">{currentState?.plotProgress?.length || 0}個</dd>
              </div>
              <div className="flex">
                <dt className="text-gray-500 mr-2">伏線:</dt>
                <dd className="font-medium">{currentState?.foreshadowing?.length || 0}個</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* 矛盾検出 */}
      {conflicts.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-3">
            🚨 矛盾の可能性
          </h3>
          <ul className="space-y-2">
            {conflicts.map((conflict, i) => (
              <li key={i} className="text-sm text-red-700 dark:text-red-300">
                {conflict}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* キャラクター位置マップ */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">👥 キャラクター位置マップ</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {characterStates.map(({ character, isPresent, lastLocation, lastLocationName, lastChapter }) => (
            <div 
              key={character.id}
              className={`border rounded-lg p-4 ${
                isPresent 
                  ? 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/20'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
            >
              <h4 className="font-medium mb-2">{character.name}</h4>
              <dl className="space-y-1 text-sm">
                <div>
                  <dt className="text-gray-500 inline">状態:</dt>
                  <dd className={`inline ml-2 font-medium ${
                    isPresent ? 'text-green-600 dark:text-green-400' : 'text-gray-600'
                  }`}>
                    {isPresent ? '登場中' : '不在'}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500 inline">現在地:</dt>
                  <dd className="inline ml-2">{lastLocationName}</dd>
                </div>
                <div>
                  <dt className="text-gray-500 inline">最終登場:</dt>
                  <dd className="inline ml-2">第{lastChapter}章</dd>
                </div>
              </dl>
              {worldMapSystem && lastLocation && lastLocation !== '不明' && (
                <div className="mt-3">
                  <Link 
                    href={`/projects/${projectId}/world?tab=map&location=${lastLocation}`}
                    className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 flex items-center gap-1"
                  >
                    <span>地図で見る</span>
                    <span>→</span>
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 世界の変化 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">🌍 世界の変化</h3>
        
        {currentState?.worldChanges && currentState.worldChanges.length > 0 ? (
          <ul className="space-y-2">
            {currentState.worldChanges.map((change, i) => (
              <li key={i} className="flex items-start">
                <span className="text-blue-500 mr-2">•</span>
                <span className="text-sm">{change}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500 text-sm">まだ大きな変化は記録されていません</p>
        )}
      </div>
    </div>
  )
}

// タイムラインタブ
function TimelineTab({ chapters }: { chapters: Chapter[] }) {
  // すべてのイベントを時系列に集約
  const timelineEvents: {
    chapterNumber: number
    type: 'chapter' | 'background' | 'foreshadowing'
    title: string
    description: string
    time?: string
    location?: string
    impact?: string
  }[] = []

  chapters.forEach(chapter => {
    // 章自体をイベントとして追加
    timelineEvents.push({
      chapterNumber: chapter.number,
      type: 'chapter',
      title: chapter.title,
      description: chapter.summary || chapter.content.substring(0, 100) + '...',
      time: chapter.state.time,
      location: chapter.state.location
    })

    // 背景イベントを追加
    chapter.backgroundEvents?.forEach(event => {
      if (event.impact === 'high' || event.visibility !== 'hidden') {
        timelineEvents.push({
          chapterNumber: chapter.number,
          type: 'background',
          title: '🎭 背景イベント',
          description: event.description,
          impact: event.impact
        })
      }
    })

    // 重要な伏線を追加
    chapter.state.foreshadowing?.forEach(f => {
      if (f.status === 'planted') {
        timelineEvents.push({
          chapterNumber: chapter.number,
          type: 'foreshadowing',
          title: '🕸️ 伏線設置',
          description: f.hint
        })
      } else if (f.status === 'revealed') {
        timelineEvents.push({
          chapterNumber: chapter.number,
          type: 'foreshadowing',
          title: '✨ 伏線回収',
          description: f.payoff || f.hint
        })
      }
    })
  })

  // 章番号でソート
  timelineEvents.sort((a, b) => a.chapterNumber - b.chapterNumber)

  // 現在のタイムライン位置を計算（最新章）
  const currentChapter = chapters[chapters.length - 1]?.number || 0

  return (
    <div className="space-y-6">
      {/* タイムラインヘッダー */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">📅 物語のタイムライン</h2>
        <p className="text-gray-600 dark:text-gray-400">
          物語内での出来事を時系列で表示します。重要な背景イベントや伏線も含まれます。
        </p>
      </div>

      {/* タイムライン本体 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="relative">
          {/* 中央のライン */}
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-300 dark:bg-gray-600"></div>
          
          {/* イベントリスト */}
          <div className="space-y-6">
            {timelineEvents.map((event, index) => (
              <div key={index} className="relative flex items-start">
                {/* マーカー */}
                <div className={`
                  absolute left-6 w-4 h-4 rounded-full border-2 z-10
                  ${event.type === 'chapter' 
                    ? 'bg-blue-500 border-white' 
                    : event.type === 'background'
                    ? 'bg-purple-500 border-white'
                    : 'bg-yellow-500 border-white'
                  }
                `}></div>
                
                {/* コンテンツ */}
                <div className="ml-16 flex-1">
                  <div className={`
                    p-4 rounded-lg
                    ${event.type === 'chapter'
                      ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                      : event.type === 'background'
                      ? 'bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800'
                      : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
                    }
                  `}>
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium">
                        {event.title}
                      </h4>
                      <span className="text-sm text-gray-500">
                        第{event.chapterNumber}章
                      </span>
                    </div>
                    
                    {(event.time || event.location) && (
                      <div className="flex gap-4 text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {event.time && (
                          <span>🕰️ {event.time}</span>
                        )}
                        {event.location && (
                          <span>📍 {event.location}</span>
                        )}
                      </div>
                    )}
                    
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {event.description}
                    </p>
                    
                    {event.impact && (
                      <div className="mt-2">
                        <span className={`
                          text-xs px-2 py-1 rounded-full
                          ${event.impact === 'high'
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
                            : event.impact === 'medium'
                            ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                          }
                        `}>
                          影響度: {event.impact}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* タイムライン統計 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">📚 章数</h4>
          <p className="text-2xl font-bold">{chapters.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">🎭 背景イベント</h4>
          <p className="text-2xl font-bold">
            {timelineEvents.filter(e => e.type === 'background').length}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">🕸️ 伏線</h4>
          <p className="text-2xl font-bold">
            {timelineEvents.filter(e => e.type === 'foreshadowing').length}
          </p>
        </div>
      </div>
    </div>
  )
}

// 伏線タブ
function ForeshadowingTab({ chapters, projectId }: { chapters: Chapter[]; projectId: string }) {
  const [isReevaluating, setIsReevaluating] = useState(false)
  const [reevaluationProgress, setReevaluationProgress] = useState('')
  const [refreshKey, setRefreshKey] = useState(0) // 再描画用のキー
  
  // 総章数を計算（最大の章番号）
  const totalChapters = Math.max(...chapters.map(c => c.number), 10)
  const currentChapter = Math.max(...chapters.map(c => c.number), 1)
  const scopeRanges = calculateForeshadowingScopeRanges(totalChapters)
  
  // すべての伏線を集約
  const allForeshadowing: {
    foreshadowing: any
    plantedChapter: number
    revealedChapter?: number
    chapters: number[] // 言及された章
    isOverdue?: boolean
  }[] = []

  chapters.forEach(chapter => {
    chapter.state.foreshadowing?.forEach(f => {
      const existing = allForeshadowing.find(item => item.foreshadowing.id === f.id)
      if (existing) {
        existing.chapters.push(chapter.number)
        if (f.status === 'revealed' && !existing.revealedChapter) {
          existing.revealedChapter = chapter.number
        }
      } else {
        const isOverdue = isForeshadowingOverdue(f, currentChapter)
        allForeshadowing.push({
          foreshadowing: f,
          plantedChapter: chapter.number,
          revealedChapter: f.status === 'revealed' ? chapter.number : undefined,
          chapters: [chapter.number],
          isOverdue
        })
      }
    })
  })

  // 伏線をカテゴリー分け
  const plantedForeshadowing = allForeshadowing.filter(f => f.foreshadowing.status === 'planted')
  const revealedForeshadowing = allForeshadowing.filter(f => f.foreshadowing.status === 'revealed')
  const reinforcedForeshadowing = allForeshadowing.filter(f => f.foreshadowing.status === 'reinforced')

  // 平均回収章数を計算
  const averageRevealChapters = revealedForeshadowing.length > 0
    ? revealedForeshadowing.reduce((sum, f) => {
        return sum + (f.revealedChapter! - f.plantedChapter)
      }, 0) / revealedForeshadowing.length
    : 0

  // 重要度を判定（言及回数や回収までの章数で判断）
  const calculateImportance = (item: typeof allForeshadowing[0]) => {
    const mentionCount = item.chapters.length
    const chapterSpan = item.revealedChapter 
      ? item.revealedChapter - item.plantedChapter 
      : chapters.length - item.plantedChapter
    return mentionCount * 2 + chapterSpan
  }

  // 重要度でソート
  allForeshadowing.sort((a, b) => calculateImportance(b) - calculateImportance(a))
  
  // 伏線の再評価機能
  const reevaluateForeshadowing = async () => {
    setIsReevaluating(true)
    setReevaluationProgress('伏線の再評価を開始...')
    
    try {
      // ForeshadowingResolutionValidatorをインポート
      const { ForeshadowingResolutionValidator } = await import('@/lib/services/foreshadowing-resolution-validator')
      
      let updatedCount = 0
      const updatedChapters: Chapter[] = [...chapters]
      
      // 各章を順番に処理
      for (let i = 0; i < updatedChapters.length; i++) {
        const chapter = updatedChapters[i]
        setReevaluationProgress(`第${chapter.number}章を処理中... (${i + 1}/${updatedChapters.length})`)
        
        if (!chapter.state.foreshadowing || chapter.state.foreshadowing.length === 0) {
          continue
        }
        
        let hasUpdates = false
        const updatedForeshadowing = chapter.state.foreshadowing.map(f => {
          // 既に回収済みの伏線はスキップ
          if (f.status === 'revealed') {
            return f
          }
          
          // 現在の章以降の全ての章で回収チェック
          for (let j = i; j < updatedChapters.length; j++) {
            const checkChapter = updatedChapters[j]
            const quickCheck = ForeshadowingResolutionValidator.quickCheck(
              checkChapter.content,
              f.hint
            )
            
            if (quickCheck.likelyResolved) {
              console.log(`伏線「${f.hint}」が第${checkChapter.number}章で回収されていることを検出`)
              hasUpdates = true
              updatedCount++
              
              return {
                ...f,
                status: 'revealed' as const,
                chapterRevealed: checkChapter.number,
                payoff: f.payoff || `第${checkChapter.number}章で回収（再評価により検出）`
              }
            }
          }
          
          return f
        })
        
        if (hasUpdates) {
          chapter.state.foreshadowing = updatedForeshadowing
        }
      }
      
      // 更新されたデータを保存
      if (updatedCount > 0) {
        localStorage.setItem(`shinwa-chapters-${projectId}`, JSON.stringify(updatedChapters))
        setReevaluationProgress(`${updatedCount}個の伏線の状態を更新しました`)
        
        // 3秒後にリフレッシュ
        setTimeout(() => {
          setRefreshKey(prev => prev + 1)
          window.location.reload() // 完全にリロードして状態を更新
        }, 3000)
      } else {
        setReevaluationProgress('更新が必要な伏線はありませんでした')
      }
    } catch (error) {
      console.error('Failed to reevaluate foreshadowing:', error)
      setReevaluationProgress('エラーが発生しました')
    } finally {
      setTimeout(() => {
        setIsReevaluating(false)
        setReevaluationProgress('')
      }, 3000)
    }
  }

  return (
    <div className="space-y-6">
      {/* 伏線健全性レポート */}
      <ForeshadowingHealthReport projectId={projectId} />
      
      {/* 伏線統計 */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">🌱 未回収</h4>
            <p className="text-3xl font-bold text-yellow-600">{plantedForeshadowing.length}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">✨ 回収済み</h4>
            <p className="text-3xl font-bold text-green-600">{revealedForeshadowing.length}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">🔄 強化中</h4>
            <p className="text-3xl font-bold text-blue-600">{reinforcedForeshadowing.length}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">📊 平均回収章数</h4>
            <p className="text-3xl font-bold">{averageRevealChapters.toFixed(1)}</p>
          </div>
        </div>
        
        {/* 再評価ボタン */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">🔍 伏線の再評価</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                既存の章を再スキャンして、回収済みの伏線を検出します
              </p>
            </div>
            <Button
              onClick={reevaluateForeshadowing}
              disabled={isReevaluating || chapters.length === 0}
              variant="secondary"
              size="sm"
            >
              {isReevaluating ? '処理中...' : '再評価を実行'}
            </Button>
          </div>
          {reevaluationProgress && (
            <div className="mt-3 text-sm text-blue-600 dark:text-blue-400">
              {reevaluationProgress}
            </div>
          )}
        </div>
      </div>

      {/* 伏線マップ */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">🕸️ 伏線関連性マップ</h3>
        
        <div className="space-y-4">
          {allForeshadowing.map((item, index) => {
            const importance = calculateImportance(item)
            const isImportant = importance > 10
            
            return (
              <div 
                key={index}
                className={`
                  border rounded-lg p-4
                  ${item.foreshadowing.status === 'revealed'
                    ? 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/20'
                    : item.foreshadowing.status === 'reinforced'
                    ? 'border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20'
                    : 'border-yellow-300 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-900/20'
                  }
                `}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">
                      {item.foreshadowing.hint}
                    </h4>
                    {isImportant && (
                      <span className="text-xs px-2 py-1 bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 rounded-full">
                        重要
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`
                      text-sm px-2 py-1 rounded-full
                      ${item.foreshadowing.status === 'revealed'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                        : item.foreshadowing.status === 'reinforced'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                        : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300'
                      }
                    `}>
                      {item.foreshadowing.status === 'revealed' ? '回収済み' 
                        : item.foreshadowing.status === 'reinforced' ? '強化中' 
                        : '未回収'}
                    </span>
                    
                    {/* 期限切れ警告 */}
                    {item.isOverdue && (
                      <span className="text-xs px-2 py-1 bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 rounded-full">
                        ⚠️ 期限切れ
                      </span>
                    )}
                    
                    {/* スコープと重要度の表示 */}
                    {item.foreshadowing.scope && (
                      <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full">
                        {item.foreshadowing.scope === 'short' ? scopeRanges.short.label.split('（')[0]
                          : item.foreshadowing.scope === 'medium' ? scopeRanges.medium.label.split('（')[0]
                          : scopeRanges.long.label.split('（')[0]}
                      </span>
                    )}
                    
                    {item.foreshadowing.significance && (
                      <span className={`
                        text-xs px-2 py-1 rounded-full
                        ${item.foreshadowing.significance === 'major' 
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
                          : item.foreshadowing.significance === 'moderate'
                          ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                        }
                      `}>
                        {item.foreshadowing.significance === 'major' ? '重要' 
                          : item.foreshadowing.significance === 'moderate' ? '中' 
                          : '低'}
                      </span>
                    )}
                  </div>
                </div>
                
                {item.foreshadowing.payoff && (
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                    💡 回収: {item.foreshadowing.payoff}
                  </p>
                )}
                
                {/* 章のタイムライン */}
                <div className="mt-3">
                  <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <span>📖 第{item.plantedChapter}章で設置</span>
                    {item.chapters.length > 1 && (
                      <span>→ 第{item.chapters.slice(1, -1).join(', ')}章で言及</span>
                    )}
                    {item.foreshadowing.plannedRevealChapter && !item.revealedChapter && (
                      <span className="text-blue-600 dark:text-blue-400">
                        → 第{item.foreshadowing.plannedRevealChapter}章で回収予定
                      </span>
                    )}
                    {item.revealedChapter && (
                      <span className="text-green-600 dark:text-green-400">
                        → 第{item.revealedChapter}章で回収
                      </span>
                    )}
                  </div>
                  
                  {/* 進捗バー */}
                  <div className="mt-2 relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="absolute left-0 top-0 h-full bg-gradient-to-r from-yellow-400 to-green-400"
                      style={{
                        width: item.revealedChapter 
                          ? '100%' 
                          : `${((chapters.length - item.plantedChapter) / chapters.length) * 100}%`
                      }}
                    />
                    {/* マーカー */}
                    {item.chapters.map(chapterNum => {
                      const position = ((chapterNum - 1) / (chapters.length - 1)) * 100
                      return (
                        <div
                          key={chapterNum}
                          className="absolute top-1/2 -translate-y-1/2 w-1 h-3 bg-gray-600 dark:bg-gray-400 rounded-full"
                          style={{ left: `${position}%` }}
                        />
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 推奨アクション */}
      {plantedForeshadowing.length > 3 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
            ⚠️ 未回収の伏線が多いようです
          </h4>
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            {plantedForeshadowing.length}個の伏線が未回収です。
            特に重要なものから優先的に回収することを検討してください。
          </p>
        </div>
      )}
    </div>
  )
}

// キャラクタータブ
function CharacterOverviewTab({ characters, chapters }: { 
  characters: Character[]
  chapters: Chapter[] 
}) {
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(
    characters.length > 0 ? characters[0] : null
  )

  // キャラクターの登場頻度を計算
  const characterAppearances = characters.map(character => {
    const chaptersWithCharacter = chapters
      .filter(ch => {
        const isPresent = ch.state.charactersPresent?.includes(character.id)
        return isPresent
      })
      .sort((a, b) => a.number - b.number)
    
    const appearances = chaptersWithCharacter.map(ch => ch.number)
    
    return {
      character,
      appearances,
      frequency: appearances.length,
      lastAppearance: appearances.length > 0 ? appearances[appearances.length - 1] : 0
    }
  }).sort((a, b) => b.frequency - a.frequency)

  // 選択されたキャラクターの成長曲線データを作成
  const getCharacterGrowthData = (character: Character) => {
    // キャラクターアークに基づいた成長データ
    const hasArc = character.arc && character.arc.start && character.arc.journey && character.arc.end
    
    // キャラクターが登場する章のみを取得
    const chaptersWithCharacter = chapters
      .filter(ch => ch.state.charactersPresent?.includes(character.id))
      .sort((a, b) => a.number - b.number)
    
    if (chaptersWithCharacter.length === 0) {
      return []
    }
    
    const growthPoints = chapters.map((ch, index) => {
      const isPresent = ch.state.charactersPresent?.includes(character.id)
      
      if (!isPresent) {
        return {
          chapter: ch.number,
          growth: null,
          isPresent: false
        }
      }
      
      // このキャラクターが登場する章の中での進行度を計算
      const characterChapterIndex = chaptersWithCharacter.findIndex(c => c.number === ch.number)
      const characterProgress = chaptersWithCharacter.length > 1 
        ? characterChapterIndex / (chaptersWithCharacter.length - 1)
        : 0.5
      
      // アークに基づいた成長度計算
      let growth = 50 // デフォルトは中間値
      if (hasArc) {
        if (characterProgress < 0.3) {
          growth = 0 + 30 * (characterProgress / 0.3)
        } else if (characterProgress < 0.7) {
          growth = 30 + 40 * ((characterProgress - 0.3) / 0.4)
        } else {
          growth = 70 + 30 * ((characterProgress - 0.7) / 0.3)
        }
      }
      
      return {
        chapter: ch.number,
        growth: Math.round(growth),
        isPresent
      }
    })
    return growthPoints
  }
  
  // 感情曲線データを作成（新規追加）
  const getEmotionData = (character: Character) => {
    // 感情タイプ
    const emotions = ['happy', 'sad', 'angry', 'fearful', 'confident']
    const emotionColors = {
      happy: '#22c55e',
      sad: '#3b82f6', 
      angry: '#ef4444',
      fearful: '#a855f7',
      confident: '#f59e0b'
    }
    
    // 簡易的な感情データ生成（実際は章の内容やイベントから分析）
    const emotionData = chapters.map((ch, index) => {
      const isPresent = ch.state.charactersPresent?.includes(character.id)
      if (!isPresent) return null
      
      // ダミーデータ（実際はAIで分析）
      const emotionScores = {
        happy: Math.random() * 50 + 25,
        sad: Math.random() * 30,
        angry: Math.random() * 40,
        fearful: Math.random() * 35,
        confident: Math.random() * 60 + 20
      }
      
      return {
        chapter: ch.number,
        emotions: emotionScores,
        dominant: Object.entries(emotionScores).reduce((a, b) => 
          emotionScores[a[0] as keyof typeof emotionScores] > b[1] ? a : b
        )[0]
      }
    }).filter(Boolean)
    
    return { emotionData, emotionColors }
  }

  // 関係性マップのデータを作成
  const relationshipMap = selectedCharacter?.relationships?.map(rel => {
    const targetChar = characters.find(c => c.id === rel.characterId)
    return {
      source: selectedCharacter.name,
      target: targetChar?.name || 'Unknown',
      type: rel.type,
      description: rel.description
    }
  }) || []

  return (
    <div className="space-y-6">
      {/* キャラクター選択 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">👥 キャラクター一覧</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {characterAppearances.map(({ character, frequency, lastAppearance }) => (
            <button
              key={character.id}
              onClick={() => setSelectedCharacter(character)}
              className={`
                text-left p-4 rounded-lg border transition-all
                ${selectedCharacter?.id === character.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                }
              `}
            >
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-medium">{character.name}</h4>
                <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full">
                  {character.role === 'protagonist' ? '主人公' 
                    : character.role === 'antagonist' ? '敵役'
                    : character.role === 'supporting' ? '脇役'
                    : 'その他'}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {character.age}歳 / {character.occupation || '職業不明'}
              </p>
              <div className="flex justify-between text-xs text-gray-500">
                <span>登場: {frequency}回</span>
                <span>最終: 第{lastAppearance}章</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {selectedCharacter && (
        <>
          {/* キャラクター詳細 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">
              📈 {selectedCharacter.name}の成長曲線
            </h3>
            
            {/* アーク情報 */}
            {selectedCharacter.arc && (
              <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <h4 className="font-medium mb-2">キャラクターアーク</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <dt className="text-gray-500">始まり:</dt>
                    <dd className="mt-1">{selectedCharacter.arc.start}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">旅路:</dt>
                    <dd className="mt-1">{selectedCharacter.arc.journey}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">終わり:</dt>
                    <dd className="mt-1">{selectedCharacter.arc.end}</dd>
                  </div>
                </div>
              </div>
            )}
            
            {/* 成長曲線グラフ */}
            <div className="h-48 bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <div className="relative h-full">
                {/* Y軸 */}
                <div className="absolute left-0 top-0 bottom-0 w-px bg-gray-300"></div>
                {/* X軸 */}
                <div className="absolute left-0 right-0 bottom-0 h-px bg-gray-300"></div>
                
                {/* グラフ線（成長曲線） */}
                <svg className="absolute inset-0" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <polyline
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2"
                    points={getCharacterGrowthData(selectedCharacter)
                      .filter(p => p.growth !== null)
                      .map((point, index, arr) => 
                        `${(index / (arr.length - 1)) * 100},${100 - point.growth!}`
                      )
                      .join(' ')}
                  />
                  {/* ポイントマーカー */}
                  {getCharacterGrowthData(selectedCharacter)
                    .filter(p => p.growth !== null)
                    .map((point, index, arr) => (
                      <circle
                        key={index}
                        cx={(index / (arr.length - 1)) * 100}
                        cy={100 - point.growth!}
                        r="3"
                        fill={point.isPresent ? '#3b82f6' : '#9ca3af'}
                        className="cursor-pointer"
                      >
                        <title>第{point.chapter}章: {point.growth}%</title>
                      </circle>
                    ))}
                </svg>
                
                {/* ラベル */}
                <div className="absolute -bottom-6 left-0 text-xs text-gray-500">第1章</div>
                <div className="absolute -bottom-6 right-0 text-xs text-gray-500">第{chapters.length}章</div>
                <div className="absolute -left-8 top-0 text-xs text-gray-500">成長</div>
              </div>
            </div>
            
            {/* 感情曲線グラフ（新規追加） */}
            <div className="mt-6">
              <h4 className="font-medium mb-3">🌈 感情の推移</h4>
              <div className="h-32 bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <div className="relative h-full">
                  {(() => {
                    const { emotionData, emotionColors } = getEmotionData(selectedCharacter)
                    return (
                      <>
                        {/* 各章の主要感情を表示 */}
                        <div className="absolute inset-0 flex items-end">
                          {emotionData.map((data, index) => (
                            <div
                              key={index}
                              className="flex-1 flex flex-col items-center justify-end"
                            >
                              <div
                                className="w-8 h-8 rounded-full mb-1"
                                style={{ 
                                  backgroundColor: data ? emotionColors[data.dominant as keyof typeof emotionColors] : 'transparent'
                                }}
                                title={data ? `第${data.chapter}章: ${data.dominant}` : ''}
                              />
                              <span className="text-xs text-gray-500">
                                {data?.chapter}
                              </span>
                            </div>
                          ))}
                        </div>
                        
                        {/* 凡例 */}
                        <div className="absolute top-0 right-0 flex gap-2 text-xs">
                          {Object.entries(emotionColors).map(([emotion, color]) => (
                            <div key={emotion} className="flex items-center gap-1">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: color }}
                              />
                              <span className="text-gray-600 dark:text-gray-400">
                                {emotion === 'happy' ? '喜' : 
                                 emotion === 'sad' ? '悲' :
                                 emotion === 'angry' ? '怒' :
                                 emotion === 'fearful' ? '恐' : '自信'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </>
                    )
                  })()}
                </div>
              </div>
            </div>
          </div>

          {/* 関係性マップ */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">
              🤝 {selectedCharacter.name}の関係性
            </h3>
            
            {relationshipMap.length > 0 ? (
              <div className="space-y-3">
                {relationshipMap.map((rel, index) => (
                  <div 
                    key={index}
                    className={`
                      p-3 rounded-lg border
                      ${rel.type === 'ally' ? 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/20'
                        : rel.type === 'enemy' ? 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/20'
                        : rel.type === 'romantic' ? 'border-pink-300 bg-pink-50 dark:border-pink-700 dark:bg-pink-900/20'
                        : 'border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/20'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{rel.target}</span>
                      <span className={`
                        text-xs px-2 py-1 rounded-full
                        ${rel.type === 'ally' ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                          : rel.type === 'enemy' ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
                          : rel.type === 'romantic' ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                        }
                      `}>
                        {rel.type === 'ally' ? '味方' 
                          : rel.type === 'enemy' ? '敵' 
                          : rel.type === 'romantic' ? '恋愛'
                          : 'その他'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {rel.description}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">関係性が設定されていません</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// プロットタブ
function PlotManagementTab({ chapters, chapterStructure, projectId }: { chapters: Chapter[], chapterStructure: any, projectId: string }) {
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'threads' | 'density'>('overview')
  const [plotThreads, setPlotThreads] = useState<PlotThread[]>([])
  
  // 複線データを読み込み
  useEffect(() => {
    const storedThreads = localStorage.getItem(`shinwa-plot-threads-${projectId}`)
    if (storedThreads) {
      setPlotThreads(JSON.parse(storedThreads))
    }
  }, [projectId])
  
  // テンションレベルを章立てから取得、もしくは計算
  const tensionData = chapters.map(chapter => {
    // まず章立てからテンションレベルを取得
    const structureChapter = chapterStructure?.chapters?.find((ch: any) => ch.number === chapter.number)
    let tension = 50 // デフォルト値
    
    if (structureChapter?.tensionLevel) {
      // 章立てのテンションレベル（1-10）を0-100に変換
      tension = structureChapter.tensionLevel * 10
    } else {
      // 章立てがない場合は従来の計算方法
      const highImpactEvents = chapter.backgroundEvents?.filter(e => e.impact === 'high').length || 0
      const mediumImpactEvents = chapter.backgroundEvents?.filter(e => e.impact === 'medium').length || 0
      const foreshadowingCount = chapter.state.foreshadowing?.length || 0
      
      tension = Math.min(100, 
        highImpactEvents * 30 + 
        mediumImpactEvents * 15 + 
        foreshadowingCount * 10 +
        20 // ベースライン
      )
    }
    
    return {
      chapter: chapter.number,
      tension,
      title: chapter.title || structureChapter?.title || `第${chapter.number}章`
    }
  })

  // プロットポイントを集計
  const allPlotPoints = chapters.flatMap(ch => 
    ch.state.plotProgress?.map(plot => ({
      ...plot,
      chapter: ch.number
    })) || []
  )
  
  const resolvedPlots = allPlotPoints.filter(p => p.resolved).length
  const unresolvedPlots = allPlotPoints.filter(p => !p.resolved).length

  // プロットホール（矛盾や未解決の問題）を検出
  const detectPlotHoles = () => {
    const holes: string[] = []
    
    // 長期間未解決のプロット
    const longUnresolved = allPlotPoints.filter(p => 
      !p.resolved && (chapters.length - p.chapter) > 5
    )
    
    if (longUnresolved.length > 0) {
      holes.push(`${longUnresolved.length}個のプロットが5章以上未解決です`)
    }
    
    // テンションの急激な変化
    tensionData.forEach((data, index) => {
      if (index > 0) {
        const diff = Math.abs(data.tension - tensionData[index - 1].tension)
        if (diff > 50) {
          holes.push(`第${tensionData[index - 1].chapter}章から第${data.chapter}章でテンションが急変しています`)
        }
      }
    })
    
    return holes
  }

  const plotHoles = detectPlotHoles()

  // 平均テンションを計算
  const averageTension = tensionData.reduce((sum, d) => sum + d.tension, 0) / tensionData.length

  return (
    <div className="space-y-6">
      {/* サブタブナビゲーション */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-6">
          <button
            onClick={() => setActiveSubTab('overview')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeSubTab === 'overview'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            📊 概要
          </button>
          <button
            onClick={() => setActiveSubTab('threads')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeSubTab === 'threads'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            🧵 複線管理
          </button>
          <button
            onClick={() => setActiveSubTab('density')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeSubTab === 'density'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            📈 密度分析
          </button>
        </nav>
      </div>

      {/* 概要タブ */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          {/* プロット統計 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">🎯 総プロット数</h4>
              <p className="text-2xl font-bold">{allPlotPoints.length}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">✅ 解決済み</h4>
              <p className="text-2xl font-bold text-green-600">{resolvedPlots}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">🔄 進行中</h4>
              <p className="text-2xl font-bold text-yellow-600">{unresolvedPlots}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">🧵 複線数</h4>
              <p className="text-2xl font-bold text-purple-600">{plotThreads.length}</p>
            </div>
          </div>

      {/* テンション曲線 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">📈 テンション曲線</h3>
        
        <div className="h-64 bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <div className="relative h-full">
            {/* グラフの枠 */}
            <div className="absolute left-0 top-0 bottom-0 w-px bg-gray-300"></div>
            <div className="absolute left-0 right-0 bottom-0 h-px bg-gray-300"></div>
            
            {/* Y軸ラベル */}
            <div className="absolute -left-8 top-0 text-xs text-gray-500">100</div>
            <div className="absolute -left-8 top-1/2 text-xs text-gray-500">50</div>
            <div className="absolute -left-8 bottom-0 text-xs text-gray-500">0</div>
            
            {/* 平均ライン */}
            <div 
              className="absolute left-0 right-0 border-t-2 border-dashed border-gray-400"
              style={{ bottom: `${averageTension}%` }}
            >
              <span className="absolute -right-16 -top-2.5 text-xs text-gray-500">
                平均: {Math.round(averageTension)}
              </span>
            </div>
            
            {/* テンションバー */}
            <div className="absolute inset-0 flex items-end">
              {tensionData.map((data, index) => (
                <div
                  key={index}
                  className="flex-1 flex justify-center group relative"
                >
                  <div 
                    className="w-full mx-0.5 bg-gradient-to-t from-blue-600 to-blue-400 rounded-t hover:opacity-80 transition-opacity cursor-pointer"
                    style={{ height: `${data.tension}%` }}
                  />
                  
                  {/* ツールチップ */}
                  <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                    <div className="bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                      {data.title}<br/>
                      テンション: {data.tension}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* X軸ラベル */}
            <div className="absolute -bottom-6 left-0 text-xs text-gray-500">第1章</div>
            <div className="absolute -bottom-6 right-0 text-xs text-gray-500">第{chapters.length}章</div>
          </div>
        </div>
        
        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          ※ テンションレベルは背景イベントの影響度や伏線の数から自動計算されています。
        </div>
      </div>

      {/* プロットホール警告 */}
      {plotHoles.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
            🕳️ プロットホールの可能性
          </h4>
          <ul className="space-y-1 text-sm text-yellow-700 dark:text-yellow-300">
            {plotHoles.map((hole, index) => (
              <li key={index}>• {hole}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 進行中のプロット */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">🔄 進行中のプロットポイント</h3>
        
        <div className="space-y-3">
          {allPlotPoints
            .filter(p => !p.resolved)
            .sort((a, b) => a.chapter - b.chapter)
            .map((plot, index) => (
              <div 
                key={index}
                className="p-3 border border-yellow-300 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-900/20 rounded-lg"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium mb-1">{plot.description}</h4>
                    <div className="flex gap-3 text-xs text-gray-600 dark:text-gray-400">
                      <span>📖 第{plot.chapter}章で発生</span>
                      <span>⏱️ {chapters.length - plot.chapter}章経過</span>
                      <span>
                        {plot.type === 'setup' ? '📌 セットアップ'
                          : plot.type === 'conflict' ? '⚔️ コンフリクト' 
                          : plot.type === 'climax' ? '🎯 クライマックス' 
                          : plot.type === 'resolution' ? '✨ 解決' 
                          : '📌 その他'}
                      </span>
                    </div>
                  </div>
                  {(chapters.length - plot.chapter) > 5 && (
                    <span className="text-xs px-2 py-1 bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 rounded-full">
                      長期未解決
                    </span>
                  )}
                </div>
              </div>
            ))}
        </div>
        
        {unresolvedPlots === 0 && (
          <p className="text-gray-500 text-center">進行中のプロットはありません</p>
        )}
      </div>
      
      {/* 複線ビジュアライザー */}
      {plotThreads.length > 0 && (
        <PlotThreadVisualizer plotThreads={plotThreads} chapters={chapters} />
      )}
    </div>
  )}

  {/* 複線管理タブ */}
  {activeSubTab === 'threads' && (
    <PlotThreadManager 
      projectId={projectId} 
      chapters={chapters}
      onUpdate={setPlotThreads}
    />
  )}

  {/* 密度分析タブ */}
  {activeSubTab === 'density' && (
    <PlotDensityAnalyzer
      plotThreads={plotThreads}
      chapters={chapters}
    />
  )}
</div>
)
}