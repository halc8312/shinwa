import { useState, useEffect } from 'react'
import { Character, CharacterArc, WorldLocation, RegionalLocation, LocalArea } from '@/lib/types'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import { characterService } from '@/lib/services/character-service'
import { WorldMapService } from '@/lib/services/world-map-service'

interface CharacterFormProps {
  isOpen: boolean
  onClose: () => void
  onSave: (character: Omit<Character, 'id'>) => void | Promise<void>
  character?: Character
  projectId: string
}

export default function CharacterForm({
  isOpen,
  onClose,
  onSave,
  character,
  projectId
}: CharacterFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    fullName: '',
    age: '',
    gender: '',
    appearance: '',
    personality: [''],
    background: '',
    goals: [''],
    arc: {
      start: '',
      journey: [''],
      end: ''
    } as CharacterArc,
    initialLocationId: ''
  })
  const [useTemplate, setUseTemplate] = useState(false)
  const [availableLocations, setAvailableLocations] = useState<{
    world: WorldLocation[]
    regional: { regionName: string; locations: RegionalLocation[] }[]
    local: { mapName: string; areas: LocalArea[] }[]
  }>({ world: [], regional: [], local: [] })

  useEffect(() => {
    if (character) {
      setFormData({
        name: character.name,
        fullName: character.fullName || '',
        age: character.age?.toString() || '',
        gender: character.gender || '',
        appearance: character.appearance,
        personality: character.personality.length > 0 ? character.personality : [''],
        background: character.background,
        goals: character.goals.length > 0 ? character.goals : [''],
        arc: character.arc,
        initialLocationId: character.initialLocationId || ''
      })
    } else {
      resetForm()
    }
  }, [character])

  useEffect(() => {
    if (isOpen && projectId) {
      loadAvailableLocations()
    }
  }, [isOpen, projectId])

  const resetForm = () => {
    setFormData({
      name: '',
      fullName: '',
      age: '',
      gender: '',
      appearance: '',
      personality: [''],
      background: '',
      goals: [''],
      arc: {
        start: '',
        journey: [''],
        end: ''
      },
      initialLocationId: ''
    })
  }

  const loadAvailableLocations = () => {
    const worldMapService = new WorldMapService(projectId)
    const mapSystem = worldMapService.loadWorldMapSystem()
    
    if (mapSystem) {
      const worldLocations = mapSystem.worldMap.locations || []
      const regionalGroups = mapSystem.regions.map(region => ({
        regionName: region.name,
        locations: region.locations || []
      }))
      const localGroups = mapSystem.localMaps.map(localMap => ({
        mapName: localMap.name,
        areas: localMap.areas || []
      }))
      
      setAvailableLocations({
        world: worldLocations,
        regional: regionalGroups,
        local: localGroups
      })
    }
  }

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      alert('キャラクター名を入力してください')
      return
    }

    const characterData: Omit<Character, 'id'> = {
      name: formData.name.trim(),
      fullName: formData.fullName.trim() || undefined,
      age: formData.age ? parseInt(formData.age) : undefined,
      gender: formData.gender.trim() || undefined,
      appearance: formData.appearance.trim(),
      personality: formData.personality.filter(p => p.trim()),
      background: formData.background.trim(),
      goals: formData.goals.filter(g => g.trim()),
      relationships: character?.relationships || [],
      arc: {
        start: formData.arc.start.trim(),
        journey: formData.arc.journey.filter(j => j.trim()),
        end: formData.arc.end.trim()
      },
      initialLocationId: formData.initialLocationId || undefined
    }

    await onSave(characterData)
    handleClose()
  }

  const handleClose = () => {
    resetForm()
    setUseTemplate(false)
    onClose()
  }

  const addArrayItem = (field: 'personality' | 'goals' | 'journey') => {
    if (field === 'journey') {
      setFormData({
        ...formData,
        arc: {
          ...formData.arc,
          journey: [...formData.arc.journey, '']
        }
      })
    } else {
      setFormData({
        ...formData,
        [field]: [...formData[field], '']
      })
    }
  }

  const updateArrayItem = (field: 'personality' | 'goals' | 'journey', index: number, value: string) => {
    if (field === 'journey') {
      const newJourney = [...formData.arc.journey]
      newJourney[index] = value
      setFormData({
        ...formData,
        arc: {
          ...formData.arc,
          journey: newJourney
        }
      })
    } else {
      const newArray = [...formData[field]]
      newArray[index] = value
      setFormData({
        ...formData,
        [field]: newArray
      })
    }
  }

  const removeArrayItem = (field: 'personality' | 'goals' | 'journey', index: number) => {
    if (field === 'journey') {
      setFormData({
        ...formData,
        arc: {
          ...formData.arc,
          journey: formData.arc.journey.filter((_, i) => i !== index)
        }
      })
    } else {
      setFormData({
        ...formData,
        [field]: formData[field].filter((_, i) => i !== index)
      })
    }
  }

  const applyTemplate = (template: Partial<Character>) => {
    setFormData({
      ...formData,
      name: template.name || formData.name,
      personality: template.personality || formData.personality,
      goals: template.goals || formData.goals,
      arc: template.arc || formData.arc
    })
    setUseTemplate(false)
  }

  const templates = characterService.getCharacterTemplates()

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={character ? 'キャラクター編集' : '新規キャラクター作成'}
      className="max-w-3xl"
    >
      <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
        {!character && (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                テンプレートから始めることもできます
              </p>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setUseTemplate(!useTemplate)}
              >
                {useTemplate ? 'キャンセル' : 'テンプレートを使用'}
              </Button>
            </div>
            
            {useTemplate && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-3">
                {templates.map((template, index) => (
                  <button
                    key={index}
                    onClick={() => applyTemplate(template)}
                    className="text-left p-3 bg-white dark:bg-gray-800 rounded border border-blue-200 dark:border-blue-700 hover:border-blue-400 transition-colors"
                  >
                    <h4 className="font-medium text-sm mb-1">{template.name}</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {template.arc?.start}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="キャラクター名（必須）"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="例: 太郎"
          />
          <Input
            label="フルネーム"
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            placeholder="例: 山田太郎"
          />
          <Input
            label="年齢"
            type="number"
            value={formData.age}
            onChange={(e) => setFormData({ ...formData, age: e.target.value })}
            placeholder="例: 25"
          />
          <Select
            value={formData.gender}
            onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
            options={[
              { value: '', label: '性別を選択' },
              { value: '男性', label: '男性' },
              { value: '女性', label: '女性' },
              { value: 'その他', label: 'その他' },
              { value: '不明', label: '不明' }
            ]}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            外見
          </label>
          <textarea
            value={formData.appearance}
            onChange={(e) => setFormData({ ...formData, appearance: e.target.value })}
            placeholder="キャラクターの外見的特徴を記述..."
            className="block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400 px-3 py-2 text-base shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            rows={3}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            性格
          </label>
          {formData.personality.map((trait, index) => (
            <div key={index} className="flex gap-2 mb-2">
              <Input
                value={trait}
                onChange={(e) => updateArrayItem('personality', index, e.target.value)}
                placeholder="例: 勇敢"
              />
              {formData.personality.length > 1 && (
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => removeArrayItem('personality', index)}
                >
                  削除
                </Button>
              )}
            </div>
          ))}
          <Button
            size="sm"
            variant="secondary"
            onClick={() => addArrayItem('personality')}
          >
            性格を追加
          </Button>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            背景・経歴
          </label>
          <textarea
            value={formData.background}
            onChange={(e) => setFormData({ ...formData, background: e.target.value })}
            placeholder="キャラクターの背景や経歴を記述..."
            className="block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400 px-3 py-2 text-base shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            rows={3}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            目標・動機
          </label>
          {formData.goals.map((goal, index) => (
            <div key={index} className="flex gap-2 mb-2">
              <Input
                value={goal}
                onChange={(e) => updateArrayItem('goals', index, e.target.value)}
                placeholder="例: 世界を救う"
              />
              {formData.goals.length > 1 && (
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => removeArrayItem('goals', index)}
                >
                  削除
                </Button>
              )}
            </div>
          ))}
          <Button
            size="sm"
            variant="secondary"
            onClick={() => addArrayItem('goals')}
          >
            目標を追加
          </Button>
        </div>

        <div className="border-t pt-4">
          <h3 className="text-lg font-medium mb-3">キャラクターアーク</h3>
          
          <Input
            label="物語開始時"
            value={formData.arc.start}
            onChange={(e) => setFormData({
              ...formData,
              arc: { ...formData.arc, start: e.target.value }
            })}
            placeholder="例: 平凡な会社員"
          />

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              成長の過程
            </label>
            {formData.arc.journey.map((step, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <Input
                  value={step}
                  onChange={(e) => updateArrayItem('journey', index, e.target.value)}
                  placeholder="例: 試練に直面"
                />
                {formData.arc.journey.length > 1 && (
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => removeArrayItem('journey', index)}
                  >
                    削除
                  </Button>
                )}
              </div>
            ))}
            <Button
              size="sm"
              variant="secondary"
              onClick={() => addArrayItem('journey')}
            >
              ステップを追加
            </Button>
          </div>

          <Input
            label="物語終了時"
            value={formData.arc.end}
            onChange={(e) => setFormData({
              ...formData,
              arc: { ...formData.arc, end: e.target.value }
            })}
            placeholder="例: 真の英雄"
            className="mt-4"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            初期位置（オプション）
          </label>
          <Select
            value={formData.initialLocationId}
            onChange={(e) => setFormData({ ...formData, initialLocationId: e.target.value })}
            options={[
              { value: '', label: '未設定' },
              // 世界レベルの場所
              ...(availableLocations.world.length > 0 ? [
                { value: 'world-header', label: '--- 世界マップ ---', disabled: true }
              ] : []),
              ...availableLocations.world.map(loc => ({
                value: loc.id,
                label: `${loc.name}${loc.type === 'capital' ? ' (首都)' : loc.type === 'major_city' ? ' (主要都市)' : ''}`
              })),
              // 地域レベルの場所
              ...availableLocations.regional.flatMap(group => [
                ...(group.locations.length > 0 ? [
                  { value: `region-header-${group.regionName}`, label: `--- ${group.regionName} ---`, disabled: true }
                ] : []),
                ...group.locations.map(loc => ({
                  value: loc.id,
                  label: `${loc.name}${loc.importance === 'major' ? ' (重要)' : ''}`
                }))
              ]),
              // ローカルレベルの場所
              ...availableLocations.local.flatMap(group => [
                ...(group.areas.length > 0 ? [
                  { value: `local-header-${group.mapName}`, label: `--- ${group.mapName} ---`, disabled: true }
                ] : []),
                ...group.areas.map(area => ({
                  value: area.id,
                  label: area.name
                }))
              ])
            ]}
          />
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            キャラクターが物語開始時にいる場所を選択できます
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="secondary" onClick={handleClose}>
            キャンセル
          </Button>
          <Button onClick={handleSubmit}>
            {character ? '更新' : '作成'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}