import { Character } from '@/lib/types'
import SwipeableCard from '@/components/ui/SwipeableCard'
import Button from '@/components/ui/Button'

interface MobileCharacterCardProps {
  character: Character
  onEdit?: () => void
  onDelete?: () => void
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
}

export default function MobileCharacterCard({ 
  character, 
  onEdit, 
  onDelete,
  onSwipeLeft,
  onSwipeRight
}: MobileCharacterCardProps) {
  return (
    <SwipeableCard
      onSwipeLeft={onSwipeLeft}
      onSwipeRight={onSwipeRight}
      className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4"
    >
      <div className="flex items-start gap-3">
        {/* アバター */}
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
          {character.name.charAt(0)}
        </div>

        {/* 情報 */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white truncate">
            {character.name}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {character.age}歳 • {character.occupation || '職業不明'}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            {character.role === 'protagonist' ? '主人公' 
              : character.role === 'antagonist' ? '敵役'
              : character.role === 'supporting' ? '脇役'
              : 'その他'}
          </p>
        </div>

        {/* アクションメニュー */}
        <div className="flex flex-col gap-1">
          {onEdit && (
            <button
              onClick={onEdit}
              className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* 性格や説明の一部を表示 */}
      {character.personality && (
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-3 line-clamp-2">
          {character.personality}
        </p>
      )}

      {/* 関係性バッジ */}
      {character.relationships && character.relationships.length > 0 && (
        <div className="flex gap-1 mt-3 overflow-x-auto">
          {character.relationships.slice(0, 3).map((rel, index) => (
            <span
              key={index}
              className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${
                rel.type === 'ally' 
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                  : rel.type === 'enemy'
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
                  : rel.type === 'romantic'
                  ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              {rel.type === 'ally' ? '味方' 
                : rel.type === 'enemy' ? '敵' 
                : rel.type === 'romantic' ? '恋愛'
                : 'その他'}
            </span>
          ))}
          {character.relationships.length > 3 && (
            <span className="text-xs text-gray-500">
              +{character.relationships.length - 3}
            </span>
          )}
        </div>
      )}
    </SwipeableCard>
  )
}