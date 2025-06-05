import { Character } from '@/lib/types'
import Button from '@/components/ui/Button'
import { useState } from 'react'

interface CharacterCardProps {
  character: Character
  onEdit?: (character: Character) => void
  onDelete?: (id: string) => void
  onViewDetails?: (character: Character) => void
  onManageRelationships?: (character: Character) => void
}

export default function CharacterCard({ 
  character, 
  onEdit, 
  onDelete, 
  onViewDetails,
  onManageRelationships
}: CharacterCardProps) {
  const [showFullInfo, setShowFullInfo] = useState(false)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            {character.name}
          </h3>
          {character.fullName && character.fullName !== character.name && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {character.fullName}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          {character.age && <span>{character.age}歳</span>}
          {character.gender && <span>{character.gender}</span>}
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            性格
          </h4>
          <div className="flex flex-wrap gap-1">
            {(() => {
              const personalityTraits = Array.isArray(character.personality) 
                ? character.personality 
                : typeof character.personality === 'string' 
                  ? [character.personality]
                  : [];
              
              return personalityTraits.slice(0, showFullInfo ? undefined : 3).map((trait, index) => (
                <span
                  key={index}
                  className="inline-block px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full"
                >
                  {trait}
                </span>
              ));
            })()}
            {(() => {
              const personalityTraits = Array.isArray(character.personality) 
                ? character.personality 
                : typeof character.personality === 'string' 
                  ? [character.personality]
                  : [];
              
              return !showFullInfo && personalityTraits.length > 3 && (
                <button
                  onClick={() => setShowFullInfo(true)}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  +{personalityTraits.length - 3}
                </button>
              );
            })()}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            背景
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
            {character.background}
          </p>
        </div>

        {character.goals.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              目標
            </h4>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              {character.goals.slice(0, showFullInfo ? undefined : 2).map((goal, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-gray-400 mr-2">•</span>
                  <span className="line-clamp-1">{goal}</span>
                </li>
              ))}
              {!showFullInfo && character.goals.length > 2 && (
                <button
                  onClick={() => setShowFullInfo(true)}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  他{character.goals.length - 2}件
                </button>
              )}
            </ul>
          </div>
        )}

        {character.relationships.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              関係性
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {character.relationships.length}人のキャラクターと関係あり
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        {onViewDetails && (
          <Button
            size="sm"
            variant="primary"
            onClick={() => onViewDetails(character)}
          >
            詳細
          </Button>
        )}
        {onManageRelationships && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onManageRelationships(character)}
          >
            関係性
          </Button>
        )}
        {onEdit && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onEdit(character)}
          >
            編集
          </Button>
        )}
        {onDelete && (
          <Button
            size="sm"
            variant="danger"
            onClick={() => {
              if (window.confirm(`「${character.name}」を削除しますか？`)) {
                onDelete(character.id)
              }
            }}
          >
            削除
          </Button>
        )}
      </div>
    </div>
  )
}