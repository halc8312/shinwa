import { Character } from '@/lib/types'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { useEffect, useState } from 'react'
import { characterService } from '@/lib/services/character-service'

interface CharacterDetailModalProps {
  isOpen: boolean
  onClose: () => void
  character: Character | null
  projectId: string
  onEdit?: (character: Character) => void
}

export default function CharacterDetailModal({
  isOpen,
  onClose,
  character,
  projectId,
  onEdit
}: CharacterDetailModalProps) {
  const [relatedCharacters, setRelatedCharacters] = useState<Character[]>([])
  const [allCharacters, setAllCharacters] = useState<Character[]>([])

  useEffect(() => {
    if (isOpen && projectId) {
      loadAllCharacters()
    }
  }, [isOpen, projectId])

  useEffect(() => {
    if (character && character.relationships.length > 0 && allCharacters.length > 0) {
      loadRelatedCharacters()
    } else {
      setRelatedCharacters([])
    }
  }, [character, character?.relationships, allCharacters])

  const loadAllCharacters = async () => {
    const characters = await characterService.getCharacters(projectId)
    setAllCharacters(characters)
  }

  const loadRelatedCharacters = async () => {
    if (!character || allCharacters.length === 0) return
    
    const characterIds = character.relationships.map(r => r.characterId)
    const related = allCharacters.filter(char => characterIds.includes(char.id))
    
    setRelatedCharacters(related)
  }

  if (!character) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={character.name}
      className="max-w-4xl"
    >
      <div className="space-y-6">
        {/* 基本情報 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold mb-3">基本情報</h3>
            <dl className="space-y-2">
              {character.fullName && character.fullName !== character.name && (
                <div>
                  <dt className="text-sm text-gray-500">フルネーム</dt>
                  <dd className="font-medium">{character.fullName}</dd>
                </div>
              )}
              {character.age && (
                <div>
                  <dt className="text-sm text-gray-500">年齢</dt>
                  <dd className="font-medium">{character.age}歳</dd>
                </div>
              )}
              {character.gender && (
                <div>
                  <dt className="text-sm text-gray-500">性別</dt>
                  <dd className="font-medium">{character.gender}</dd>
                </div>
              )}
            </dl>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3">性格</h3>
            <div className="flex flex-wrap gap-2">
              {character.personality.map((trait, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-sm"
                >
                  {trait}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* 外見 */}
        {character.appearance && (
          <div>
            <h3 className="text-lg font-semibold mb-3">外見</h3>
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {character.appearance}
            </p>
          </div>
        )}

        {/* 背景 */}
        <div>
          <h3 className="text-lg font-semibold mb-3">背景・経歴</h3>
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {character.background}
          </p>
        </div>

        {/* 目標 */}
        {character.goals.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3">目標・動機</h3>
            <ul className="space-y-2">
              {character.goals.map((goal, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-blue-500 mr-2 mt-0.5">▸</span>
                  <span className="text-gray-700 dark:text-gray-300">{goal}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* キャラクターアーク */}
        <div>
          <h3 className="text-lg font-semibold mb-3">キャラクターアーク</h3>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3">
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-1">物語開始時</h4>
              <p className="text-gray-700 dark:text-gray-300">{character.arc.start || '未設定'}</p>
            </div>
            
            {character.arc.journey.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">成長の過程</h4>
                <ol className="space-y-1">
                  {character.arc.journey.map((step, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-gray-400 mr-2">{index + 1}.</span>
                      <span className="text-gray-700 dark:text-gray-300">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
            
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-1">物語終了時</h4>
              <p className="text-gray-700 dark:text-gray-300">{character.arc.end || '未設定'}</p>
            </div>
          </div>
        </div>

        {/* 関係性 */}
        {character.relationships.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3">関係性</h3>
            <div className="space-y-3">
              {character.relationships.map((rel, index) => {
                const relatedChar = relatedCharacters.find(c => c.id === rel.characterId)
                return (
                  <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium">
                        {relatedChar?.name || 'Unknown'}
                      </h4>
                      <span className="text-sm text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                        {rel.type}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {rel.description}
                    </p>
                    {rel.dynamic && (
                      <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                        関係性の変化: {rel.dynamic}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t">
          {onEdit && (
            <Button
              variant="secondary"
              onClick={() => {
                onEdit(character)
                onClose()
              }}
            >
              編集
            </Button>
          )}
          <Button onClick={onClose}>
            閉じる
          </Button>
        </div>
      </div>
    </Modal>
  )
}