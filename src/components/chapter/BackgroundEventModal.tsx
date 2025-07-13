import { useState, useEffect } from 'react'
import { BackgroundEvent, Character } from '@/lib/types'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import { generateId } from '@/lib/utils'

interface BackgroundEventModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (event: BackgroundEvent) => void
  event?: BackgroundEvent | null
  characters: Character[]
}

export default function BackgroundEventModal({
  isOpen,
  onClose,
  onSave,
  event,
  characters
}: BackgroundEventModalProps) {
  const [formData, setFormData] = useState({
    description: '',
    impact: '',
    visibility: 'hidden' as BackgroundEvent['visibility'],
    characters: [] as string[]
  })

  useEffect(() => {
    if (event) {
      setFormData({
        description: event.description,
        impact: event.impact,
        visibility: event.visibility,
        characters: event.characters
      })
    } else {
      resetForm()
    }
  }, [event, isOpen])

  const resetForm = () => {
    setFormData({
      description: '',
      impact: '',
      visibility: 'hidden',
      characters: []
    })
  }

  const handleSubmit = () => {
    if (!formData.description.trim() || !formData.impact.trim()) {
      alert('説明と影響を入力してください')
      return
    }

    const eventData: BackgroundEvent = {
      id: event?.id || generateId(),
      description: formData.description.trim(),
      impact: formData.impact.trim(),
      visibility: formData.visibility,
      characters: formData.characters
    }

    onSave(eventData)
    handleClose()
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const toggleCharacter = (characterId: string) => {
    setFormData(prev => ({
      ...prev,
      characters: prev.characters.includes(characterId)
        ? prev.characters.filter(id => id !== characterId)
        : [...prev.characters, characterId]
    }))
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={event ? '背景イベントを編集' : '背景イベントを追加'}
      className="max-w-2xl"
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            イベントの説明（必須）
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="章の裏側で起きている出来事を記述..."
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-base shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            rows={3}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            物語への影響（必須）
          </label>
          <textarea
            value={formData.impact}
            onChange={(e) => setFormData({ ...formData, impact: e.target.value })}
            placeholder="このイベントが今後の展開にどう影響するか..."
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-base shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            rows={2}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            可視性
          </label>
          <Select
            value={formData.visibility}
            onChange={(e) => setFormData({ 
              ...formData, 
              visibility: e.target.value as BackgroundEvent['visibility'] 
            })}
            options={[
              { value: 'hidden', label: '隠れている（読者には見えない）' },
              { value: 'hinted', label: '示唆されている（ヒントがある）' },
              { value: 'revealed', label: '明らかになった（読者も知っている）' }
            ]}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            関連キャラクター
          </label>
          <div className="border border-gray-300 rounded-md p-3 max-h-40 overflow-y-auto">
            {characters.length === 0 ? (
              <p className="text-sm text-gray-500">キャラクターがありません</p>
            ) : (
              <div className="space-y-2">
                {characters.map((character) => (
                  <label
                    key={character.id}
                    className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={formData.characters.includes(character.id)}
                      onChange={() => toggleCharacter(character.id)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm">{character.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="secondary" onClick={handleClose}>
            キャンセル
          </Button>
          <Button onClick={handleSubmit}>
            {event ? '更新' : '追加'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}