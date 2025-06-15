'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Project, WorldSettings, Culture, MagicSystem, WorldMapSystem, Character } from '@/lib/types'
import { projectService } from '@/lib/services/project-service'
import { worldService } from '@/lib/services/world-service'
import { WorldMapService } from '@/lib/services/world-map-service'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import CultureForm from '@/components/world/CultureForm'
import WorldMapDisplay from '@/components/world/WorldMapDisplay'
import TravelSimulator from '@/components/world/TravelSimulator'

export default function WorldSettingsPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [worldSettings, setWorldSettings] = useState<WorldSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'basic' | 'geography' | 'cultures' | 'magic' | 'map' | 'travel'>('basic')
  const [showTemplates, setShowTemplates] = useState(false)
  const [worldMap, setWorldMap] = useState<WorldMapSystem | null>(null)
  const [isRegeneratingMap, setIsRegeneratingMap] = useState(false)
  const [projectMeta, setProjectMeta] = useState<{ plotOutline?: string; themes?: string[]; genre?: string } | null>(null)
  const [characters, setCharacters] = useState<Character[]>([])

  // 基本情報フォーム
  const [basicForm, setBasicForm] = useState({
    name: '',
    description: '',
    era: ''
  })

  // 地理情報フォーム
  const [geographyForm, setGeographyForm] = useState<string[]>([])
  const [newLocation, setNewLocation] = useState('')

  // 文化フォーム
  const [cultures, setCultures] = useState<Culture[]>([])
  const [editingCulture, setEditingCulture] = useState<Culture | null>(null)
  const [showCultureForm, setShowCultureForm] = useState(false)

  // 魔法システムフォーム
  const [hasMagic, setHasMagic] = useState(false)
  const [magicSystem, setMagicSystem] = useState<MagicSystem>({
    name: '',
    rules: [''],
    limitations: [''],
    sources: ['']
  })

  useEffect(() => {
    loadData()
    loadProjectMeta()
    loadCharacters()
  }, [projectId])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [loadedProject, loadedWorldSettings] = await Promise.all([
        projectService.getProject(projectId),
        worldService.getWorldSettings(projectId)
      ])
      
      // マップデータを読み込み
      const mapService = new WorldMapService(projectId)
      const loadedMap = mapService.loadWorldMapSystem()
      setWorldMap(loadedMap)

      if (!loadedProject) {
        router.push('/projects')
        return
      }

      setProject(loadedProject)
      
      if (loadedWorldSettings) {
        setWorldSettings(loadedWorldSettings)
        setBasicForm({
          name: loadedWorldSettings.name,
          description: loadedWorldSettings.description,
          era: loadedWorldSettings.era
        })
        setGeographyForm(loadedWorldSettings.geography)
        setCultures(loadedWorldSettings.cultures)
        if (loadedWorldSettings.magicSystem) {
          setHasMagic(true)
          setMagicSystem(loadedWorldSettings.magicSystem)
        }
      } else {
        // デフォルト値を設定
        const defaultSettings: WorldSettings = {
          name: `${loadedProject.name}の世界`,
          description: '',
          era: '現代',
          geography: [],
          cultures: []
        }
        setWorldSettings(defaultSettings)
        setBasicForm({
          name: defaultSettings.name,
          description: defaultSettings.description,
          era: defaultSettings.era
        })
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadProjectMeta = () => {
    const stored = localStorage.getItem(`shinwa-project-meta-${projectId}`)
    if (stored) {
      try {
        setProjectMeta(JSON.parse(stored))
      } catch (error) {
        console.error('Failed to load project meta:', error)
      }
    }
  }

  const loadCharacters = () => {
    const stored = localStorage.getItem(`shinwa-characters-${projectId}`)
    if (stored) {
      try {
        setCharacters(JSON.parse(stored))
      } catch (error) {
        console.error('Failed to load characters:', error)
      }
    }
  }

  const handleSaveBasicInfo = async () => {
    setIsSaving(true)
    try {
      const updated = await worldService.updateWorldSettings(projectId, {
        name: basicForm.name,
        description: basicForm.description,
        era: basicForm.era
      })
      if (updated) {
        setWorldSettings(updated)
        alert('基本情報を保存しました')
      }
    } catch (error) {
      console.error('Failed to save basic info:', error)
      alert('保存に失敗しました')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveGeography = async () => {
    setIsSaving(true)
    try {
      const updated = await worldService.updateGeography(projectId, geographyForm)
      if (updated) {
        setWorldSettings(updated)
        alert('地理情報を保存しました')
      }
    } catch (error) {
      console.error('Failed to save geography:', error)
      alert('保存に失敗しました')
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddLocation = () => {
    if (newLocation.trim()) {
      setGeographyForm([...geographyForm, newLocation.trim()])
      setNewLocation('')
    }
  }

  const handleRemoveLocation = (index: number) => {
    setGeographyForm(geographyForm.filter((_, i) => i !== index))
  }

  const handleSaveMagicSystem = async () => {
    setIsSaving(true)
    try {
      const updated = await worldService.updateMagicSystem(
        projectId,
        hasMagic ? magicSystem : undefined
      )
      if (updated) {
        setWorldSettings(updated)
        alert('魔法システムを保存しました')
      }
    } catch (error) {
      console.error('Failed to save magic system:', error)
      alert('保存に失敗しました')
    } finally {
      setIsSaving(false)
    }
  }

  const applyTemplate = (template: Partial<WorldSettings>) => {
    if (template.name) setBasicForm(prev => ({ ...prev, name: template.name! }))
    if (template.description) setBasicForm(prev => ({ ...prev, description: template.description! }))
    if (template.era) setBasicForm(prev => ({ ...prev, era: template.era! }))
    if (template.geography) setGeographyForm(template.geography)
    if (template.cultures) setCultures(template.cultures)
    if (template.magicSystem) {
      setHasMagic(true)
      setMagicSystem(template.magicSystem)
    }
    setShowTemplates(false)
  }

  if (isLoading || !project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    )
  }

  const templates = worldService.getWorldTemplates()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <nav className="text-sm mb-4">
            <Link href="/projects" className="text-blue-600 hover:underline">
              プロジェクト一覧
            </Link>
            <span className="mx-2 text-gray-500">/</span>
            <Link href={`/projects/${projectId}`} className="text-blue-600 hover:underline">
              {project.name}
            </Link>
            <span className="mx-2 text-gray-500">/</span>
            <span className="text-gray-700 dark:text-gray-300">世界観設定</span>
          </nav>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                世界観設定
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {project.name} の世界観を設定します
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={() => setShowTemplates(!showTemplates)}
            >
              テンプレートから選択
            </Button>
          </div>
        </div>

        {/* テンプレート選択 */}
        {showTemplates && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">テンプレートを選択</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {templates.map((template, index) => (
                <button
                  key={index}
                  onClick={() => applyTemplate(template)}
                  className="text-left p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 transition-colors"
                >
                  <h3 className="font-medium mb-1">{template.name}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {template.description}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    時代: {template.era}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* タブナビゲーション */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('basic')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'basic'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              基本情報
            </button>
            <button
              onClick={() => setActiveTab('geography')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'geography'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              地理
            </button>
            <button
              onClick={() => setActiveTab('cultures')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'cultures'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              文化
            </button>
            <button
              onClick={() => setActiveTab('magic')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'magic'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              魔法・特殊能力
            </button>
            <button
              onClick={() => setActiveTab('map')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'map'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              地図
            </button>
            <button
              onClick={() => setActiveTab('travel')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'travel'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              旅行シミュレーター
            </button>
          </div>

          <div className="p-6">
            {/* 基本情報タブ */}
            {activeTab === 'basic' && (
              <div className="space-y-4">
                <Input
                  label="世界の名前"
                  value={basicForm.name}
                  onChange={(e) => setBasicForm({ ...basicForm, name: e.target.value })}
                  placeholder="例: アルカディア"
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    時代設定
                  </label>
                  <select
                    value={basicForm.era}
                    onChange={(e) => setBasicForm({ ...basicForm, era: e.target.value })}
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="古代">古代</option>
                    <option value="中世">中世</option>
                    <option value="近世">近世</option>
                    <option value="近代">近代</option>
                    <option value="現代">現代</option>
                    <option value="近未来">近未来</option>
                    <option value="未来">未来</option>
                    <option value="その他">その他</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    世界の説明
                  </label>
                  <textarea
                    value={basicForm.description}
                    onChange={(e) => setBasicForm({ ...basicForm, description: e.target.value })}
                    placeholder="この世界の概要や特徴を記述..."
                    className="block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400 px-3 py-2 text-base shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    rows={5}
                  />
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleSaveBasicInfo} disabled={isSaving}>
                    {isSaving ? '保存中...' : '保存'}
                  </Button>
                </div>
              </div>
            )}

            {/* 地理タブ */}
            {activeTab === 'geography' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium mb-2">地理・場所</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    物語の舞台となる場所や地域を追加してください
                  </p>
                  
                  <div className="flex gap-2 mb-4">
                    <Input
                      value={newLocation}
                      onChange={(e) => setNewLocation(e.target.value)}
                      placeholder="例: 王都アルカディア"
                      onKeyPress={(e) => e.key === 'Enter' && handleAddLocation()}
                    />
                    <Button onClick={handleAddLocation} disabled={!newLocation.trim()}>
                      追加
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {geographyForm.map((location, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded">
                        <span>{location}</span>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleRemoveLocation(index)}
                        >
                          削除
                        </Button>
                      </div>
                    ))}
                    {geographyForm.length === 0 && (
                      <p className="text-gray-500 text-center py-4">
                        まだ場所が追加されていません
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleSaveGeography} disabled={isSaving}>
                    {isSaving ? '保存中...' : '保存'}
                  </Button>
                </div>
              </div>
            )}

            {/* 文化タブ */}
            {activeTab === 'cultures' && (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium">文化・民族</h3>
                    <Button
                      size="sm"
                      onClick={() => {
                        setEditingCulture(null)
                        setShowCultureForm(true)
                      }}
                    >
                      新規追加
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {cultures.map((culture, index) => (
                      <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <h4 className="font-medium text-lg mb-2">{culture.name}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {culture.description}
                        </p>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="font-medium">価値観:</span>{' '}
                            {culture.values.join('、')}
                          </div>
                          <div>
                            <span className="font-medium">習慣:</span>{' '}
                            {culture.customs.join('、')}
                          </div>
                        </div>
                        <div className="mt-3 flex gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setEditingCulture(culture)
                              setShowCultureForm(true)
                            }}
                          >
                            編集
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={async () => {
                              if (window.confirm(`「${culture.name}」を削除しますか？`)) {
                                const updated = await worldService.removeCulture(projectId, culture.name)
                                if (updated) {
                                  setCultures(updated.cultures)
                                }
                              }
                            }}
                          >
                            削除
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {cultures.length === 0 && (
                    <p className="text-gray-500 text-center py-8">
                      まだ文化が設定されていません
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* 魔法・特殊能力タブ */}
            {activeTab === 'magic' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <input
                    type="checkbox"
                    id="hasMagic"
                    checked={hasMagic}
                    onChange={(e) => setHasMagic(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="hasMagic" className="font-medium">
                    この世界に魔法や特殊能力が存在する
                  </label>
                </div>

                {hasMagic && (
                  <div className="space-y-4">
                    <Input
                      label="システム名"
                      value={magicSystem.name}
                      onChange={(e) => setMagicSystem({ ...magicSystem, name: e.target.value })}
                      placeholder="例: 元素魔法"
                    />

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        ルール・仕組み
                      </label>
                      {magicSystem.rules.map((rule, index) => (
                        <div key={index} className="flex gap-2 mb-2">
                          <Input
                            value={rule}
                            onChange={(e) => {
                              const newRules = [...magicSystem.rules]
                              newRules[index] = e.target.value
                              setMagicSystem({ ...magicSystem, rules: newRules })
                            }}
                            placeholder="例: 詠唱が必要"
                          />
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => {
                              setMagicSystem({
                                ...magicSystem,
                                rules: magicSystem.rules.filter((_, i) => i !== index)
                              })
                            }}
                          >
                            削除
                          </Button>
                        </div>
                      ))}
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setMagicSystem({
                          ...magicSystem,
                          rules: [...magicSystem.rules, '']
                        })}
                      >
                        ルールを追加
                      </Button>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        制限・制約
                      </label>
                      {magicSystem.limitations.map((limitation, index) => (
                        <div key={index} className="flex gap-2 mb-2">
                          <Input
                            value={limitation}
                            onChange={(e) => {
                              const newLimitations = [...magicSystem.limitations]
                              newLimitations[index] = e.target.value
                              setMagicSystem({ ...magicSystem, limitations: newLimitations })
                            }}
                            placeholder="例: 魔力の消耗"
                          />
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => {
                              setMagicSystem({
                                ...magicSystem,
                                limitations: magicSystem.limitations.filter((_, i) => i !== index)
                              })
                            }}
                          >
                            削除
                          </Button>
                        </div>
                      ))}
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setMagicSystem({
                          ...magicSystem,
                          limitations: [...magicSystem.limitations, '']
                        })}
                      >
                        制限を追加
                      </Button>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        力の源
                      </label>
                      {magicSystem.sources.map((source, index) => (
                        <div key={index} className="flex gap-2 mb-2">
                          <Input
                            value={source}
                            onChange={(e) => {
                              const newSources = [...magicSystem.sources]
                              newSources[index] = e.target.value
                              setMagicSystem({ ...magicSystem, sources: newSources })
                            }}
                            placeholder="例: 生まれつきの才能"
                          />
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => {
                              setMagicSystem({
                                ...magicSystem,
                                sources: magicSystem.sources.filter((_, i) => i !== index)
                              })
                            }}
                          >
                            削除
                          </Button>
                        </div>
                      ))}
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setMagicSystem({
                          ...magicSystem,
                          sources: [...magicSystem.sources, '']
                        })}
                      >
                        源を追加
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button onClick={handleSaveMagicSystem} disabled={isSaving}>
                    {isSaving ? '保存中...' : '保存'}
                  </Button>
                </div>
              </div>
            )}

            {/* 地図タブ */}
            {activeTab === 'map' && (
              <div className="space-y-4">
                {worldMap ? (
                  <div>
                    {/* Map controls */}
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-medium">世界地図</h3>
                      <Button
                        variant="secondary"
                        onClick={async () => {
                          if (window.confirm('マップを再生成しますか？現在のマップデータは失われます。')) {
                            setIsRegeneratingMap(true)
                            try {
                              const mapService = new WorldMapService(projectId)
                              const newMap = await mapService.generateWorldMapSystem(
                                worldSettings!,
                                projectMeta?.genre || 'ファンタジー',
                                projectMeta?.themes || []
                              )
                              mapService.saveWorldMapSystem(newMap)
                              setWorldMap(newMap)
                              alert('マップを再生成しました')
                            } catch (error) {
                              console.error('Failed to regenerate map:', error)
                              alert('マップの再生成に失敗しました')
                            } finally {
                              setIsRegeneratingMap(false)
                            }
                          }
                        }}
                        disabled={isRegeneratingMap}
                      >
                        {isRegeneratingMap ? '生成中...' : 'マップを再生成'}
                      </Button>
                    </div>

                    {/* World Map Display Component */}
                    <WorldMapDisplay worldMapSystem={worldMap} />
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-4">
                      マップは自動生成時に作成されます
                    </p>
                    <p className="text-sm text-gray-400">
                      プロジェクトの自動生成を実行すると、世界設定に基づいてマップが生成されます
                    </p>
                    <div className="mt-6">
                      <Button
                        onClick={async () => {
                          if (!worldSettings) {
                            alert('世界設定を先に保存してください')
                            return
                          }
                          setIsRegeneratingMap(true)
                          try {
                            const mapService = new WorldMapService(projectId)
                            const newMap = await mapService.generateWorldMapSystem(
                              worldSettings,
                              projectMeta?.genre || 'ファンタジー',
                              projectMeta?.themes || []
                            )
                            mapService.saveWorldMapSystem(newMap)
                            setWorldMap(newMap)
                            alert('マップを生成しました')
                          } catch (error) {
                            console.error('Failed to generate map:', error)
                            alert('マップの生成に失敗しました')
                          } finally {
                            setIsRegeneratingMap(false)
                          }
                        }}
                        disabled={isRegeneratingMap || !worldSettings}
                      >
                        {isRegeneratingMap ? '生成中...' : '今すぐマップを生成'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 旅行シミュレータータブ */}
            {activeTab === 'travel' && (
              <div className="space-y-4">
                {worldMap && characters.length > 0 ? (
                  <TravelSimulator
                    worldMapSystem={worldMap}
                    characters={characters}
                    onTravelComplete={(characterId, locationId) => {
                      // Store character location separately
                      const characterLocations = JSON.parse(
                        localStorage.getItem(`shinwa-character-locations-${projectId}`) || '{}'
                      )
                      characterLocations[characterId] = {
                        locationId,
                        updatedAt: new Date().toISOString()
                      }
                      localStorage.setItem(
                        `shinwa-character-locations-${projectId}`,
                        JSON.stringify(characterLocations)
                      )
                      
                      // Show notification
                      const character = characters.find(c => c.id === characterId)
                      const location = [...worldMap.worldMap.locations, ...worldMap.regions.flatMap(r => r.locations)]
                        .find(loc => loc.id === locationId)
                      if (character && location) {
                        alert(`${character.name}が${location.name}に到着しました`)
                      }
                    }}
                  />
                ) : (
                  <div className="text-center py-12">
                    {!worldMap ? (
                      <>
                        <p className="text-gray-500 mb-4">
                          旅行シミュレーターを使用するには、まず地図を生成する必要があります
                        </p>
                        <Button
                          onClick={() => setActiveTab('map')}
                        >
                          地図タブへ移動
                        </Button>
                      </>
                    ) : (
                      <>
                        <p className="text-gray-500 mb-4">
                          旅行シミュレーターを使用するには、キャラクターが必要です
                        </p>
                        <Link href={`/projects/${projectId}/characters`}>
                          <Button>
                            キャラクター設定へ
                          </Button>
                        </Link>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 文化フォームモーダル */}
        <CultureForm
          isOpen={showCultureForm}
          onClose={() => {
            setShowCultureForm(false)
            setEditingCulture(null)
          }}
          onSave={async (cultureData) => {
            if (editingCulture) {
              const updated = await worldService.updateCulture(projectId, editingCulture.name, cultureData)
              if (updated) {
                setCultures(updated.cultures)
              }
            } else {
              const updated = await worldService.addCulture(projectId, cultureData)
              if (updated) {
                setCultures(updated.cultures)
              }
            }
            setShowCultureForm(false)
            setEditingCulture(null)
          }}
          culture={editingCulture}
        />
      </div>
    </div>
  )
}