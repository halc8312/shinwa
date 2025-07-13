'use client'

import { ChapterStructure, PlannedForeshadowing } from '@/lib/types'
import { calculateForeshadowingScopeRanges } from '@/lib/utils/foreshadowing-utils'

interface ForeshadowingMapProps {
  chapterStructure: ChapterStructure
}

export default function ForeshadowingMap({ chapterStructure }: ForeshadowingMapProps) {
  // 動的スコープ範囲を計算
  const scopeRanges = calculateForeshadowingScopeRanges(chapterStructure.totalChapters)
  
  // すべての伏線を収集
  const allForeshadowing: {
    hint: string
    plantChapter: number
    revealChapter?: number
    scope: 'short' | 'medium' | 'long'
    significance: 'minor' | 'moderate' | 'major'
    category?: string
  }[] = []

  // 章立てから伏線情報を収集
  chapterStructure.chapters.forEach(chapter => {
    // 設置する伏線
    chapter.foreshadowingToPlant?.forEach(f => {
      allForeshadowing.push({
        hint: f.hint,
        plantChapter: chapter.number,
        revealChapter: f.plannedRevealChapter,
        scope: f.scope,
        significance: f.significance,
        category: f.category
      })
    })
  })

  // 伏線回収情報を追加
  chapterStructure.chapters.forEach(chapter => {
    chapter.foreshadowingToReveal?.forEach(hint => {
      const existing = allForeshadowing.find(f => f.hint === hint)
      if (existing && !existing.revealChapter) {
        existing.revealChapter = chapter.number
      }
    })
  })

  // スコープごとに分類
  const shortTerm = allForeshadowing.filter(f => f.scope === 'short')
  const mediumTerm = allForeshadowing.filter(f => f.scope === 'medium')
  const longTerm = allForeshadowing.filter(f => f.scope === 'long')

  const renderForeshadowingLine = (
    foreshadowing: typeof allForeshadowing[0],
    index: number,
    totalChapters: number
  ) => {
    const startX = (foreshadowing.plantChapter / totalChapters) * 100
    const endX = foreshadowing.revealChapter 
      ? (foreshadowing.revealChapter / totalChapters) * 100
      : 100

    const color = foreshadowing.significance === 'major' ? '#ef4444' 
      : foreshadowing.significance === 'moderate' ? '#f59e0b'
      : '#10b981'

    return (
      <div key={index} className="relative h-8 mb-1">
        {/* 背景バー */}
        <div className="absolute inset-0 bg-gray-100 dark:bg-gray-800 rounded"></div>
        
        {/* 伏線のライン */}
        <div
          className="absolute h-full rounded"
          style={{
            left: `${startX}%`,
            width: `${endX - startX}%`,
            backgroundColor: color,
            opacity: 0.7
          }}
        >
          <div className="relative h-full">
            {/* 開始マーカー */}
            <div 
              className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full"
              title={`第${foreshadowing.plantChapter}章で設置`}
            />
            
            {/* 終了マーカー */}
            {foreshadowing.revealChapter && (
              <div 
                className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full"
                title={`第${foreshadowing.revealChapter}章で回収`}
              />
            )}
          </div>
        </div>
        
        {/* ヒントテキスト */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 ml-2 text-xs text-gray-700 dark:text-gray-300 truncate max-w-xs">
          {foreshadowing.hint}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">伏線マップ</h3>
      
      {/* 章番号の目盛り */}
      <div className="relative h-8 mb-4">
        <div className="absolute inset-0 flex justify-between items-center px-2">
          {Array.from({ length: Math.min(10, chapterStructure.totalChapters) }, (_, i) => {
            const chapterNum = Math.floor((i / 9) * (chapterStructure.totalChapters - 1)) + 1
            return (
              <span key={i} className="text-xs text-gray-500">
                {chapterNum}
              </span>
            )
          })}
        </div>
      </div>

      {/* 短期伏線 */}
      {shortTerm.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2 text-green-600 dark:text-green-400">
            {scopeRanges.short.label}
          </h4>
          <div className="space-y-1">
            {shortTerm.map((f, i) => renderForeshadowingLine(f, i, chapterStructure.totalChapters))}
          </div>
        </div>
      )}

      {/* 中期伏線 */}
      {mediumTerm.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2 text-yellow-600 dark:text-yellow-400">
            {scopeRanges.medium.label}
          </h4>
          <div className="space-y-1">
            {mediumTerm.map((f, i) => renderForeshadowingLine(f, i, chapterStructure.totalChapters))}
          </div>
        </div>
      )}

      {/* 長期伏線 */}
      {longTerm.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2 text-red-600 dark:text-red-400">
            {scopeRanges.long.label}
          </h4>
          <div className="space-y-1">
            {longTerm.map((f, i) => renderForeshadowingLine(f, i, chapterStructure.totalChapters))}
          </div>
        </div>
      )}

      {/* 凡例 */}
      <div className="flex items-center gap-4 text-xs text-gray-500 pt-4 border-t">
        <span>重要度:</span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-green-500 rounded"></span>
          低
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-yellow-500 rounded"></span>
          中
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-red-500 rounded"></span>
          高
        </span>
      </div>
    </div>
  )
}