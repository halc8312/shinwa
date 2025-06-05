import { useState, useEffect } from 'react'
import { Character, Relationship } from '@/lib/types'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import Input from '@/components/ui/Input'
import { characterService } from '@/lib/services/character-service'

interface RelationshipManagerProps {
  isOpen: boolean
  onClose: () => void
  character: Character
  projectId: string
  onUpdate: () => void
}

const RELATIONSHIP_TYPES = [
  '家族',
  '友人',
  '恋人',
  'ライバル',
  '師匠',
  '弟子',
  '同僚',
  '敵',
  'その他'
]

export default function RelationshipManager({
  isOpen,
  onClose,
  character,
  projectId,
  onUpdate
}: RelationshipManagerProps) {
  const [allCharacters, setAllCharacters] = useState<Character[]>([])
  const [selectedCharacterId, setSelectedCharacterId] = useState('')
  const [relationshipType, setRelationshipType] = useState('')
  const [description, setDescription] = useState('')
  const [dynamic, setDynamic] = useState('')
  const [editingRelationship, setEditingRelationship] = useState<Relationship | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadCharacters()
    }
  }, [isOpen])

  const loadCharacters = async () => {
    const characters = await characterService.getCharacters(projectId)
    setAllCharacters(characters.filter(c => c.id !== character.id))
  }

  const handleAddRelationship = async () => {
    if (!selectedCharacterId || !relationshipType || !description) {
      alert('すべての必須項目を入力してください')
      return
    }

    const newRelationship: Relationship = {
      characterId: selectedCharacterId,
      type: relationshipType,
      description: description.trim(),
      dynamic: dynamic.trim()
    }

    await characterService.addRelationship(projectId, character.id, newRelationship)

    // 相手側にも関係性を追加（双方向）
    const reciprocalRelationship: Relationship = {
      characterId: character.id,
      type: relationshipType,
      description: `${character.name}との関係: ${description}`,
      dynamic: dynamic.trim()
    }
    await characterService.addRelationship(projectId, selectedCharacterId, reciprocalRelationship)

    resetForm()
    onUpdate()
  }

  const handleUpdateRelationship = async () => {
    if (!editingRelationship || !relationshipType || !description) {
      return
    }

    // 既存の関係を削除
    await characterService.removeRelationship(
      projectId,
      character.id,
      editingRelationship.characterId
    )

    // 新しい関係を追加
    const updatedRelationship: Relationship = {
      characterId: editingRelationship.characterId,
      type: relationshipType,
      description: description.trim(),
      dynamic: dynamic.trim()
    }

    await characterService.addRelationship(projectId, character.id, updatedRelationship)

    resetForm()
    onUpdate()
  }

  const handleDeleteRelationship = async (targetCharacterId: string) => {
    if (!window.confirm('この関係性を削除しますか？')) return

    await characterService.removeRelationship(projectId, character.id, targetCharacterId)
    await characterService.removeRelationship(projectId, targetCharacterId, character.id)

    onUpdate()
  }

  const resetForm = () => {
    setSelectedCharacterId('')
    setRelationshipType('')
    setDescription('')
    setDynamic('')
    setEditingRelationship(null)
  }

  const startEditRelationship = (relationship: Relationship) => {
    setEditingRelationship(relationship)
    setSelectedCharacterId(relationship.characterId)
    setRelationshipType(relationship.type)
    setDescription(relationship.description)
    setDynamic(relationship.dynamic || '')
  }

  const availableCharacters = allCharacters.filter(
    c => !character.relationships.some(r => r.characterId === c.id) || 
         c.id === editingRelationship?.characterId
  )

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${character.name} の関係性管理`}
      className="max-w-3xl"
    >
      <div className="space-y-6">
        {/* 新規/編集フォーム */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-medium mb-4">
            {editingRelationship ? '関係性を編集' : '新しい関係性を追加'}
          </h3>
          
          <div className="space-y-4">
            <Select
              value={selectedCharacterId}
              onChange={(e) => setSelectedCharacterId(e.target.value)}
              options={[
                { value: '', label: 'キャラクターを選択' },
                ...availableCharacters.map(c => ({
                  value: c.id,
                  label: c.name
                }))
              ]}
              disabled={!!editingRelationship}
            />

            <Select
              value={relationshipType}
              onChange={(e) => setRelationshipType(e.target.value)}
              options={[
                { value: '', label: '関係性のタイプを選択' },
                ...RELATIONSHIP_TYPES.map(type => ({
                  value: type,
                  label: type
                }))
              ]}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                関係性の説明（必須）
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="例: 幼なじみで、主人公の良き理解者"
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-base shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                rows={2}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                関係性の変化（任意）
              </label>
              <textarea
                value={dynamic}
                onChange={(e) => setDynamic(e.target.value)}
                placeholder="例: 物語が進むにつれて、恋愛感情が芽生える"
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-base shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                rows={2}
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={editingRelationship ? handleUpdateRelationship : handleAddRelationship}
                disabled={!selectedCharacterId || !relationshipType || !description}
              >
                {editingRelationship ? '更新' : '追加'}
              </Button>
              {editingRelationship && (
                <Button
                  variant="secondary"
                  onClick={resetForm}
                >
                  キャンセル
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* 既存の関係性一覧 */}
        <div>
          <h3 className="text-lg font-medium mb-4">現在の関係性</h3>
          
          {character.relationships.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              まだ関係性が設定されていません
            </p>
          ) : (
            <div className="space-y-3">
              {character.relationships.map((rel, index) => {
                const relatedChar = allCharacters.find(c => c.id === rel.characterId)
                if (!relatedChar) return null

                return (
                  <div
                    key={index}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium text-lg">{relatedChar.name}</h4>
                        <span className="text-sm text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                          {rel.type}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => startEditRelationship(rel)}
                        >
                          編集
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleDeleteRelationship(rel.characterId)}
                        >
                          削除
                        </Button>
                      </div>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 mb-1">
                      {rel.description}
                    </p>
                    {rel.dynamic && (
                      <p className="text-sm text-gray-500 dark:text-gray-500">
                        変化: {rel.dynamic}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={onClose}>
            閉じる
          </Button>
        </div>
      </div>
    </Modal>
  )
}